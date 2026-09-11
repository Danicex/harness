

from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from sqlmodel import Session, select
from typing import List, Union
import random
import redis.asyncio as redis
import json
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.model import AuthIdentity, Company, StaffProfile, UserProfile, Role, StaffRole
from app.database import get_session # your SQLModel engine/session dependency
import secrets
import pydantic
from app.services.mailer import send_mail

router = APIRouter(prefix="/auth")

# --- config ---
ALGORITHM = "HS256"
REDIS_PORT = os.getenv("REDIS_PORT")
ACCESS_TOKEN_EXPIRE_DAYS = 30
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

redis_client = redis.Redis(
    host='localhost',
    port=REDIS_PORT,
    db=int(0),
    decode_responses=True
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/auth", tags=["auth"])


# --- request/response schemas (plain pydantic — these aren't tables) ---
class SignupUser(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None


class SignupCompany(BaseModel):
    email: EmailStr
    password: str
    company_name: str


class StaffInvite(BaseModel):
    email: EmailStr
    temp_password: str
    staff_role: StaffRole = StaffRole.MEMBER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    id: str
    email: EmailStr
    role: Role
    company_id: Optional[str] = None
    staff_role: Optional[StaffRole] = None


# --- password helpers ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# --- token helpers ---
def create_access_token(claims: dict) -> str:
    to_encode = claims.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def build_claims(identity: AuthIdentity, db: Session) -> dict:
    """companyId/staffRole only appear for staff/company roles — user and
    admin tokens never carry a tenant scope."""
    claims = {"sub": identity.id, "email": identity.email, "role": identity.role.value}

    if identity.role == Role.COMPANY:
        company = db.exec(select(Company).where(Company.auth_identity_id == identity.id)).first()
        claims["companyId"] = company.id

    elif identity.role == Role.STAFF:
        staff = db.exec(select(StaffProfile).where(StaffProfile.auth_identity_id == identity.id)).first()
        claims["companyId"] = staff.company_id
        claims["staffRole"] = staff.staff_role.value

    return claims


# --- dependencies ---
def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub, role = payload.get("sub"), payload.get("role")
        if sub is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return CurrentUser(
        id=sub,
        email=payload.get("email", ""),
        role=Role(role),
        company_id=payload.get("companyId"),
        staff_role=payload.get("staffRole"),
    )


def require_role(*roles: Role):
    """Route dependency: e.g. Depends(require_role(Role.COMPANY, Role.STAFF))"""
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return dependency


def scope_to_company(user: CurrentUser = Depends(get_current_user)) -> Optional[str]:
    """Returns the companyId every tenant-scoped query must filter by.
    Admin returns None -> caller treats that as 'no filter, sees everything'.
    Everyone else must have a companyId on their token or gets rejected —
    never trust a companyId passed in the request itself."""
    if user.role == Role.ADMIN:
        return None
    if not user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company scope on this account")
    return user.company_id


# --- routes ---
@router.post("/signup/user", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_user(payload: SignupUser, db: Session = Depends(get_session)):
    existing = db.exec(select(AuthIdentity).where(AuthIdentity.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    identity = AuthIdentity(email=payload.email, password_hash=hash_password(payload.password), role=Role.USER)
    db.add(identity)
    db.flush()  # populates identity.id before commit

    db.add(UserProfile(auth_identity_id=identity.id, display_name=payload.display_name))
    db.commit()
    db.refresh(identity)

    return TokenResponse(access_token=create_access_token(build_claims(identity, db)))


@router.post("/signup/company", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_company(payload: SignupCompany, db: Session = Depends(get_session)):
    existing = db.exec(select(AuthIdentity).where(AuthIdentity.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    identity = AuthIdentity(email=payload.email, password_hash=hash_password(payload.password), role=Role.COMPANY)
    db.add(identity)
    db.flush()

    db.add(Company(auth_identity_id=identity.id, name=payload.company_name))
    db.commit()
    db.refresh(identity)

    return TokenResponse(access_token=create_access_token(build_claims(identity, db)))


@router.post("/staff/invite", status_code=status.HTTP_201_CREATED)
def invite_staff(
    payload: StaffInvite,
    db: Session = Depends(get_session),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
):
    """Only a company can create staff. No emailing here — in production
    this issues a set-password link instead of a temp password."""
    existing = db.exec(select(AuthIdentity).where(AuthIdentity.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    identity = AuthIdentity(email=payload.email, password_hash=hash_password(payload.temp_password), role=Role.STAFF)
    db.add(identity)
    db.flush()

    db.add(StaffProfile(
        auth_identity_id=identity.id,
        company_id=current_user.company_id,  # taken from the token, not the request body
        staff_role=payload.staff_role,
        invited_by=current_user.id,
    ))
    db.commit()

    return {"message": "Staff account created", "staff_id": identity.id}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_session)):
    identity = db.exec(select(AuthIdentity).where(AuthIdentity.email == payload.email)).first()
    if not identity or not verify_password(payload.password, identity.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not identity.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return TokenResponse(access_token=create_access_token(build_claims(identity, db)))


@router.get("/me", response_model=CurrentUser)
def me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user

    
    
class OTPVerification(BaseModel):
    email: EmailStr
    otp: str    

# Email configuration (set these as environment variables in production)
class EmailRequest(BaseModel):
    to: EmailStr

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

@router.post("/send-verification-email")
async def send_verification_email(email_request: EmailRequest):
    try:
        otp_code = generate_otp()
        redis_client.delete(f"otp:{email_request.to}") #delete the data attached to the prev key
        key = f"otp:{email_request.to}"

        data = {
            "email": email_request.to,
            "otp_code": otp_code,
            "attempts": 0
        }

        await redis_client.set(
            key,
            json.dumps(data),
            ex=600  # 10 minutes
        )
        # Create email content
        subject = "Your Verification Code"
        message =  f"""
        <html>
            <body>
                <h2>Email Verification</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">{otp_code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            </body>
        </html>
        """
        
        # Send email
        email_sent = await send_mail(
            to= email_request.to,
            subject=subject,
            html=message,
            )
        
        return {
                    "message": "Verification code sent successfully",
                    "email": email_request.to,
                    "expires_in": "10 minutes",
                    "status": email_sent
         }
   
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending verification email: {str(e)}")
     
MAX_ATTEMPTS = 5
 
@router.post("/verify-otp")
async def verify_otp(verification: OTPVerification):
    email = verification.email
    user_otp = verification.otp

    key = f"otp:{email}"

    stored_data = await redis_client.get(key)

    # Check if OTP exists
    if not stored_data:
        raise HTTPException(status_code=404, detail="OTP expired or not found")

    otp_data = json.loads(stored_data)

    # Check attempt limit
    if otp_data["attempts"] >= MAX_ATTEMPTS:
        await redis_client.delete(key)
        raise HTTPException(status_code=400, detail="Too many failed attempts")

    # Check OTP
    if user_otp == otp_data["otp_code"]:
        await redis_client.delete(key)
        return {
            "message": "OTP verified successfully",
            "email": email,
            "verified": True
        }

    # Wrong OTP → increment attempts
    otp_data["attempts"] += 1
    remaining_attempts = MAX_ATTEMPTS - otp_data["attempts"]

    await redis_client.set(
        key,
        json.dumps(otp_data),
        ex=600  # keep expiration
    )

    raise HTTPException(
        status_code=400,
        detail=f"Invalid OTP. {remaining_attempts} attempts remaining"
    )

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
RESET_TOKEN_TTL_SECONDS = 3600  # 1 hour


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = pydantic.Field(min_length=6)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_session)):
    identity = db.exec(select(AuthIdentity).where(AuthIdentity.email == payload.email)).first()

    # Same response whether or not the account exists — confirming an
    # email's existence here is an enumeration leak.
    generic_response = {
        "message": "If an account exists with this email, a password reset link has been sent."
    }
    if not identity:
        return generic_response

    reset_token = secrets.token_urlsafe(32)
    await redis_client.set(f"pwreset:{reset_token}", identity.id, ex=RESET_TOKEN_TTL_SECONDS)

    reset_link = f"{FRONTEND_URL}/auth/reset-password?token={reset_token}"
    html = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Click below to set a new password. This link expires in 1 hour.</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        </body>
    </html>
    """
    await send_mail(to=identity.email, subject="Reset your password", html=html)

    return generic_response


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_session)):
    key = f"pwreset:{payload.token}"
    identity_id = await redis_client.get(key)
    if not identity_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    identity = db.get(AuthIdentity, identity_id)
    if not identity:
        await redis_client.delete(key)
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    identity.password_hash = hash_password(payload.new_password)
    db.add(identity)
    db.commit()
    db.refresh(identity)

    # Single-use — burn the token immediately so the link can't be replayed.
    await redis_client.delete(key)

    # Log them straight in with a fresh token, same shape as /login.
    return TokenResponse(access_token=create_access_token(build_claims(identity, db)))