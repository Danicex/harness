"""
Authentication for hotel admins and staff.

Model
-----
* Two account types, stored in two tables: ``Admin`` (the hotel owner / tenant)
  and ``Staff`` (belongs to exactly one admin).
* The account TYPE ("admin" | "staff") decides what you may do.  The staff
  job ROLE ("receptionist", "manager", ...) is free text managed by the admin and
  is only used by ``require_roles``.  A staff member can never become an admin,
  whatever string is stored in ``Staff.role``.
* Every authenticated request resolves to one ``AuthUser`` dict.  ``admin_id`` is
  ALWAYS set (for staff it is their employer), so it is the tenant key to scope
  every query with.

Token
-----
JWT (HS256) with claims: ``sub`` = account id, ``typ`` = "admin" | "staff",
``role``, ``iat``, ``exp``, ``jti``.  The token is also stored in
``<table>.jwt_token`` and must match on every request, so logging in again,
logging out, resetting a password or editing a staff member's credentials
revokes the previous session (one active session per account).

Use in routers
--------------
    auth: AuthUser = Depends(require_admin)       # admins only
    auth: AuthUser = Depends(require_staff)       # staff only
    auth: AuthUser = Depends(get_current_user)    # admin or staff
    auth: Optional[AuthUser] = Depends(get_optional_user)   # public + optional login
    auth: AuthUser = Depends(require_roles("manager", "supervisor"))
"""
import hashlib
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional, TypedDict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.database import SessionDep, engine
from app.model import Admin, AdminCredentials, Staff
from app.redis import redis_client
from app.services.mailer import send_mail

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
RESET_TOKEN_TTL = timedelta(hours=1)
MIN_PASSWORD_LENGTH = 8

ADMIN = "admin"
STAFF = "staff"

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
class AuthUser(TypedDict):
    user_id: int                          # Admin.id or Staff.id
    account_type: Literal["admin", "staff"]
    email: str
    role: str                             # "admin" for admins, job role for staff
    admin_id: int                         # tenant key, always set
    staff_id: Optional[int]               # None for admins


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
def _bcrypt_input(password: str) -> bytes:
    # bcrypt only looks at the first 72 bytes; do it the same way everywhere
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return pwd_context.hash(_bcrypt_input(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(_bcrypt_input(plain_password), hashed_password)
    except (ValueError, TypeError):
        return False


# verified against when the email is unknown, so "no such user" and "wrong
# password" take the same time
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _tokens_equal(stored: Optional[str], presented: str) -> bool:
    return bool(stored) and secrets.compare_digest(stored.encode(), presented.encode())


def create_access_token(*, user_id: int, account_type: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "typ": account_type,
        "role": role,
        "iat": now,
        "exp": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def _staff_role(staff: Staff) -> str:
    role = (staff.role or STAFF).strip().lower()
    # "admin" is reserved for the Admin table; never let a staff row claim it
    return STAFF if role in ("", ADMIN) else role


def _inactive(status_value: Optional[str]) -> bool:
    return (status_value or "active") != "active"


def authenticate_token(token: str, session: Session) -> AuthUser:
    """Validate a bearer token and return the account it belongs to.

    Raises HTTPException (401 bad/expired/revoked token, 403 suspended account).
    """
    try:
        claims = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require_exp": True, "require_sub": True},
        )
    except ExpiredSignatureError:
        raise _unauthorized("Token has expired")
    except JWTError:
        raise _unauthorized("Invalid token")

    try:
        user_id = int(claims["sub"])
    except (KeyError, TypeError, ValueError):
        raise _unauthorized("Invalid token")

    account_type = claims.get("typ")

    if account_type == ADMIN:
        admin = session.get(Admin, user_id)
        if not admin or not _tokens_equal(admin.jwt_token, token):
            raise _unauthorized("Session is no longer valid, please log in again")
        if _inactive(admin.account_status):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not active")
        return AuthUser(
            user_id=admin.id,
            account_type=ADMIN,
            email=admin.email,
            role=ADMIN,
            admin_id=admin.id,
            staff_id=None,
        )

    if account_type == STAFF:
        # inner join: a staff row without an employer can never authenticate
        row = session.exec(
            select(Staff, Admin.account_status)
            .join(Admin, Admin.id == Staff.admin_id)
            .where(Staff.id == user_id)
        ).first()
        if not row:
            raise _unauthorized("Session is no longer valid, please log in again")
        staff, employer_status = row
        if not _tokens_equal(staff.jwt_token, token):
            raise _unauthorized("Session is no longer valid, please log in again")
        if _inactive(employer_status):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This hotel account is not active")
        return AuthUser(
            user_id=staff.id,
            account_type=STAFF,
            email=staff.email,
            role=_staff_role(staff),
            admin_id=staff.admin_id,
            staff_id=staff.id,
        )

    raise _unauthorized("Invalid token")


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------
def get_optional_user(
    session: SessionDep,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AuthUser]:
    """No Authorization header -> None.  A header that is present must be valid."""
    if credentials is None:
        return None
    return authenticate_token(credentials.credentials, session)


def get_current_user(user: Optional[AuthUser] = Depends(get_optional_user)) -> AuthUser:
    """Any logged-in admin or staff member."""
    if user is None:
        raise _unauthorized("Not authenticated")
    return user


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user["account_type"] != ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def require_staff(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user["account_type"] != STAFF:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")
    return user


def require_roles(*allowed: str):
    """Allow only the listed roles.  Admins pass only if "admin" is listed."""
    allowed_roles = {r.strip().lower() for r in allowed}

    def checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user["role"] not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return checker


def get_current_admin_id(user: AuthUser = Depends(get_current_user)) -> int:
    """The tenant id for whoever is logged in (an admin's own id, or a staff member's employer)."""
    return user["admin_id"]


def isAuthorized(token: str) -> Optional[Dict[str, Any]]:
    """Deprecated: kept so code outside this package keeps importing.  Use the dependencies."""
    with Session(engine) as session:
        try:
            return dict(authenticate_token(token, session))
        except HTTPException:
            return None


def get_admin_cred(admin_id: int, session: Session) -> AdminCredentials:
    """The admin's messaging credentials (SMS / mail keys)."""
    credentials = session.exec(
        select(AdminCredentials).where(AdminCredentials.admin_id == admin_id)
    ).first()
    if not credentials:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Messaging credentials are not configured for this account"
        )
    return credentials


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class LoginData(BaseModel):
    email: EmailStr
    password: str
    # "admin" logs in against the Admin table; anything else (or nothing) against Staff
    role: Optional[str] = None


class AdminSignUp(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    role: Optional[str] = None  # accepted for older clients, ignored: admins are always "admin"


class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    email: str
    role: str
    admin_id: Optional[int] = None
    staff_id: Optional[int] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login(data: LoginData, session: SessionDep):
    as_admin = (data.role or "").strip().lower() == ADMIN
    model = Admin if as_admin else Staff
    account = session.exec(select(model).where(model.email == data.email)).first()

    password_ok = verify_password(data.password, account.password if account else _DUMMY_HASH)
    if not account or not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if as_admin:
        if _inactive(account.account_status):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not active")
        role, admin_id, staff_id = ADMIN, account.id, None
    else:
        employer = session.get(Admin, account.admin_id) if account.admin_id else None
        if not employer:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This staff account is not linked to a hotel")
        if _inactive(employer.account_status):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This hotel account is not active")
        role, admin_id, staff_id = _staff_role(account), account.admin_id, account.id

    token = create_access_token(
        user_id=account.id, account_type=ADMIN if as_admin else STAFF, role=role
    )
    account.jwt_token = token  # replaces any previous session
    session.add(account)
    session.commit()

    return TokenResponse(
        token=token, email=account.email, role=role, admin_id=admin_id, staff_id=staff_id
    )


@router.post("/signup", response_model=TokenResponse)
def sign_up(data: AdminSignUp, session: SessionDep):
    if session.exec(select(Admin).where(Admin.email == data.email)).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admin with this email already exists")

    admin = Admin(email=data.email, password=hash_password(data.password), role=ADMIN)
    session.add(admin)
    try:
        session.flush()  # assigns admin.id
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admin with this email already exists")

    token = create_access_token(user_id=admin.id, account_type=ADMIN, role=ADMIN)
    admin.jwt_token = token
    session.commit()

    return TokenResponse(token=token, email=admin.email, role=ADMIN, admin_id=admin.id)


@router.post("/logout")
def logout(session: SessionDep, user: AuthUser = Depends(get_current_user)):
    """Revoke the current session server-side."""
    model = Admin if user["account_type"] == ADMIN else Staff
    account = session.get(model, user["user_id"])
    if account:
        account.jwt_token = None
        session.add(account)
        session.commit()
    return {"message": "Logged out"}


@router.get("/me")
def me(user: AuthUser = Depends(get_current_user)):
    return user


# --- password reset (admins) -------------------------------------------------
# The reset link carries a short-lived signed token (typ="reset"): nothing is stored
# in the database.  It embeds a fingerprint of the current password hash, so it stops
# working the moment the password changes (single use) and can never be used as a login
# token (authenticate_token only accepts typ "admin" / "staff").
_RESET_MESSAGE = "If an account exists with this email, a password reset link has been sent."


def _password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()[:24]


def _create_reset_token(admin: Admin) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(admin.id),
            "typ": "reset",
            "pwf": _password_fingerprint(admin.password),
            "iat": now,
            "exp": now + RESET_TOKEN_TTL,
            "jti": uuid.uuid4().hex,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


@router.post("/send_reset_password_link")
async def send_reset_password_link(request: PasswordResetRequest, session: SessionDep):
    admin = session.exec(select(Admin).where(Admin.email == request.email)).first()
    if not admin:
        return {"message": _RESET_MESSAGE}

    reset_link = f"{FRONTEND_URL}/password_reset?token={_create_reset_token(admin)}&email={request.email}"
    html = f"""
    <html>
        <body>
            <h1>Password Reset Request</h1>
            <p>You requested to reset your password. Click the link below to proceed:</p>
            <a href="{reset_link}">{reset_link}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>Your App Team</p>
        </body>
    </html>
    """
    try:
        await send_mail(to=request.email, subject="Reset Your Password", html=html)
    except Exception:
        # same response either way, otherwise this endpoint reveals which emails have accounts
        log.exception("Failed to send password reset email")

    return {"message": _RESET_MESSAGE}


@router.post("/reset_password")
def reset_password(data: ResetPassword, session: SessionDep):
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token.")

    try:
        claims = jwt.decode(
            data.token, SECRET_KEY, algorithms=[ALGORITHM],
            options={"require_exp": True, "require_sub": True},
        )
        admin_id = int(claims["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise invalid
    if claims.get("typ") != "reset":
        raise invalid

    admin = session.get(Admin, admin_id)
    if (
        not admin
        or admin.email != data.email
        or not secrets.compare_digest(
            str(claims.get("pwf", "")).encode(), _password_fingerprint(admin.password).encode()
        )
    ):
        raise invalid

    token = create_access_token(user_id=admin.id, account_type=ADMIN, role=ADMIN)
    admin.password = hash_password(data.new_password)
    admin.reset_password_token = None   # legacy columns, no longer used
    admin.reset_password_expiry = None
    admin.jwt_token = token             # signs out every other session
    admin.updated_at = datetime.now(timezone.utc)
    session.add(admin)
    session.commit()

    return {"message": "Password reset successful", "access_token": token, "token_type": "bearer"}


# --- email OTP -----------------------------------------------------------------
OTP_TTL_SECONDS = 600
MAX_ATTEMPTS = 5


class OTPVerification(BaseModel):
    email: EmailStr
    otp: str


class EmailRequest(BaseModel):
    to: EmailStr


def generate_otp() -> str:
    """6-digit one-time code."""
    return f"{secrets.randbelow(1_000_000):06d}"


@router.post("/send-verification-email")
async def send_verification_email(email_request: EmailRequest):
    key = f"otp:{email_request.to}"
    otp_code = generate_otp()
    try:
        await redis_client.set(
            key,
            json.dumps({"email": email_request.to, "otp_code": otp_code, "attempts": 0}),
            ex=OTP_TTL_SECONDS,  # replaces any earlier code for this email
        )
        html = f"""
        <html>
            <body>
                <h2>Email Verification</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">{otp_code}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Harness</p>
            </body>
        </html>
        """
        email_sent = await send_mail(to=email_request.to, subject="Your Verification Code", html=html)
    except Exception:
        log.exception("Failed to send verification email")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not send verification email")

    return {
        "message": "Verification code sent successfully",
        "email": email_request.to,
        "expires_in": "10 minutes",
        "status": email_sent,
    }


@router.post("/verify-otp")
async def verify_otp(verification: OTPVerification):
    key = f"otp:{verification.email}"
    stored = await redis_client.get(key)
    if not stored:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "OTP expired or not found")

    otp_data = json.loads(stored)

    if otp_data["attempts"] >= MAX_ATTEMPTS:
        await redis_client.delete(key)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Too many failed attempts")

    if secrets.compare_digest(verification.otp.encode(), otp_data["otp_code"].encode()):
        await redis_client.delete(key)
        return {"message": "OTP verified successfully", "email": verification.email, "verified": True}

    otp_data["attempts"] += 1
    await redis_client.set(key, json.dumps(otp_data), ex=OTP_TTL_SECONDS)
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        f"Invalid OTP. {MAX_ATTEMPTS - otp_data['attempts']} attempts remaining",
    )

