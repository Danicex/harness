from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.admin_auth import LoginBody, login as do_login, require_admin
from sqlmodel import select
from app.crud import get_admin_data, read_data, update_data
from app.database import SessionDep
from datetime import datetime, timezone
from typing import Optional
from app.model import Admin, AdminCredentials
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])

ALLOWED_STATUSES = {"active", "suspended", "deactivated"}  # adjust to your model


@router.post("/login")
async def login(body: LoginBody):
    return do_login(body)


@router.get("/all_users", dependencies=[Depends(require_admin)])
async def get_all_users(session: SessionDep):
    # Make sure read_data excludes password hashes / tokens from the response.
    return read_data("admin", session)


@router.get("/staff/{admin_id}", dependencies=[Depends(require_admin)])
async def get_admin_staff(admin_id: int, session: SessionDep):
    return get_admin_data(admin_id, "staff", session)


@router.get("/user_sub/{admin_id}", dependencies=[Depends(require_admin)])
async def get_user_sub(admin_id: int, session: SessionDep):
    return get_admin_data(admin_id, "subcription", session)


@router.put("/accounts/{admin_id}/status/{action_type}", dependencies=[Depends(require_admin)])
async def action_admin(admin_id: int, action_type: str, session: SessionDep):
    if action_type not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"action_type must be one of {sorted(ALLOWED_STATUSES)}",
        )
    update_data("admin", admin_id, {"account_status": action_type}, session)
    return {"admin_id": admin_id, "account_status": action_type}






SECRET_FIELDS = {"resend_api_key", "api_token"}


# ---------- schemas ----------
class CredentialsIn(BaseModel):
    """Every field is optional. Only fields present in the request are changed;
    send null (or an empty string) to clear a field."""
    resend_api_key: Optional[str] = None
    resend_from_email: Optional[str] = None  
    resend_from_name: Optional[str] = None
    resend_reply_to: Optional[str] = None
    api_token: Optional[str] = None         
    sender_id: Optional[str] = None       
    domain: Optional[str] = None       
    


class CredentialsSave(CredentialsIn):
    """Request body for PUT: the credential fields plus the admin they belong to."""
    admin_id: int


class CredentialsOut(CredentialsIn):
    """Same fields, but secrets are masked so they never leave the server in full."""
    pass


# ---------- helpers ----------
def mask(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return "••••" + value[-4:] if len(value) > 8 else "••••"


def to_out(creds: Optional[AdminCredentials]) -> CredentialsOut:
    if not creds:
        return CredentialsOut()
    data = {f: getattr(creds, f) for f in CredentialsIn.model_fields}
    for f in SECRET_FIELDS:
        data[f] = mask(data[f])
    return CredentialsOut(**data)


def get_credentials(admin_id: int, session) -> Optional[AdminCredentials]:
    """Raw (unmasked) credentials. Use this inside your email/SMS/voice services."""
    return session.exec(
        select(AdminCredentials).where(AdminCredentials.admin_id == admin_id)
    ).first()


# ---------- routes ----------
@router.get("/admin_credentials", response_model=CredentialsOut)
def read_credentials(admin_id: int, session: SessionDep, dependencies=[Depends(require_admin)]):
    # GET /credentials?admin_id=1
    return to_out(get_credentials(admin_id, session))


@router.put("/admin_credentials", response_model=CredentialsOut )
def save_credentials(
    payload: CredentialsSave,
    session: SessionDep,
):
    data = payload.model_dump(exclude_unset=True)  # .dict(exclude_unset=True) on Pydantic v1
    admin_id = data.pop("admin_id")

    if not session.get(Admin, admin_id):
        raise HTTPException(status_code=404, detail="Admin not found")

    creds = get_credentials(admin_id, session) or AdminCredentials(admin_id=admin_id)

    for field, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(creds, field, value)

    creds.updated_at = datetime.now(timezone.utc)
    session.add(creds)
    session.commit()
    session.refresh(creds)
    return to_out(creds)