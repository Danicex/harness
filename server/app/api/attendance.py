import json
import random
import string
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from app.auth.authentication import isAuthorized
from app.crud import create_data, get_data_by_period
from app.database import SessionDep
from app.redis import redis_client
from app.model import Staff
router = APIRouter(prefix="/attendance", tags=["attendance"])

CODE_TTL_SECONDS = 60
CURRENT_CODE_KEY = "attendance:current_code"


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _code_key(code: str) -> str:
    return f"attendance:code:{code}"


def _get_bearer_token(authorization: str) -> str:
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return parts[1]


def _authorize(authorization: str) -> dict:
    token = _get_bearer_token(authorization)
    auth = isAuthorized(token)
    if not auth:
        raise HTTPException(status_code=401, detail="Not authorized")
    return auth


async def _store_new_code() -> str:
    """Generate a fresh code, persist it, and point 'current' at it.
    Called on startup-of-cycle (nothing active) and right after a code is used,
    so the display screen always has something valid to show.
    """
    code = generate_otp()
    payload = {"code": code, "created_at": datetime.utcnow().isoformat()}

    await redis_client.set(_code_key(code), json.dumps(payload), ex=CODE_TTL_SECONDS)
    await redis_client.set(CURRENT_CODE_KEY, code, ex=CODE_TTL_SECONDS)
    return code


class AttendancePayload(BaseModel):
    verification_code: str
    status: str  # "check_in" | "check_out"


@router.get("/current-code", status_code=status.HTTP_200_OK)
async def get_current_code():
    """
    Polled by the kiosk/display page. Returns the active code, generating
    one if none exists yet (first run, natural TTL expiry, or just consumed).
    """
    code = await redis_client.get(CURRENT_CODE_KEY)
    if not code:
        code = await _store_new_code()
    return {"code": code, "expires_in": CODE_TTL_SECONDS}


@router.post("/create_attendance", status_code=status.HTTP_201_CREATED)
async def create_attendance(
    payload: AttendancePayload,
    session: SessionDep,
    authorization: str = Header(...),
):
    token = authorization.split(" ")[1]
    auth = isAuthorized(token)
    if not auth:
        raise HTTPException(status_code=401, detail="Not authorized")
    staff_id = auth.get("staff_id") or auth.get("user_id")
    admin_id = auth.get("admin_id")

    if payload.status not in ("check_in", "check_out"):
        raise HTTPException(status_code=400, detail="status must be check_in or check_out")

    key = _code_key(payload.verification_code)
    stored_data = await redis_client.get(key)
    if not stored_data:
        raise HTTPException(status_code=404, detail="Code expired or invalid")

    # single-use: burn this code, and if it was the active/displayed one,
    # clear the pointer so the next /current-code call mints a fresh one
    await redis_client.delete(key)
    current = await redis_client.get(CURRENT_CODE_KEY)
    if current == payload.verification_code:
        await redis_client.delete(CURRENT_CODE_KEY)
        
    staff_data = session.exec(
    select(Staff).where(Staff.id == staff_id)
    ).first() 
    
    attendance_dict = {
        "staff_id": staff_id,
        "admin_id": admin_id,
        "name": staff_data.name,
        "status": payload.status,
        "created_at": datetime.utcnow(),
    }
    record = create_data("attendance", attendance_dict, session)

    # pre-warm the next code immediately so the display never sits blank
    await _store_new_code()

    return record


@router.get("/monthly/{month}", status_code=status.HTTP_200_OK)
async def get_attendance_by_month(
    month: str,
    session: SessionDep,
    authorization: str = Header(...),
):
    auth = _authorize(authorization)
    return get_data_by_period(auth["admin_id"], "attendance", session, period=month)


@router.get("/period/{date}", status_code=status.HTTP_200_OK)
async def get_attendance_by_date(
    date: str,
    session: SessionDep,
    authorization: str = Header(...),
):
    auth = _authorize(authorization)
    return get_data_by_period(auth["admin_id"], "attendance", session, date=date)