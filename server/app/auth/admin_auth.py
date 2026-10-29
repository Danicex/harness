import hmac
import os
import time
from datetime import datetime, timedelta, timezone

import jwt  # PyJWT
import pyotp
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

ADMIN_TOTP_SECRET = os.getenv("ADMIN_TOTP_SECRET")
ADMIN_JWT_SECRET = os.getenv("ADMIN_JWT_SECRET")
if not ADMIN_TOTP_SECRET or not ADMIN_JWT_SECRET or len(ADMIN_JWT_SECRET) < 32:
    raise RuntimeError(
        "ADMIN_TOTP_SECRET and ADMIN_JWT_SECRET (>=32 chars) must be set. "
        "Run setup_totp.py to generate them."
    )

TOTP_STEP = 30          # standard for Google Authenticator
TOTP_DRIFT_STEPS = 1    # accept previous/next 30s window
TOKEN_TTL_MINUTES = 15

_totp = pyotp.TOTP(ADMIN_TOTP_SECRET)  # SHA1, 6 digits, 30s = authenticator default
_bearer = HTTPBearer(auto_error=False)

# In-memory state. Use Redis/DB instead if you run more than one worker.
MAX_FAILURES = 5
LOCKOUT_SECONDS = 300
_failures: list[float] = []     # global on purpose: there is only one admin login
_last_used_counter = -1         # replay protection for login codes


class LoginBody(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


def verify_totp(code: str) -> bool:
    """Constant-time check across the drift window, rejecting reused codes."""
    global _last_used_counter
    now = int(time.time())
    matched = None
    for step in range(-TOTP_DRIFT_STEPS, TOTP_DRIFT_STEPS + 1):
        t = now + step * TOTP_STEP
        if hmac.compare_digest(_totp.at(t), code):
            matched = t // TOTP_STEP
    if matched is None or matched <= _last_used_counter:
        return False
    _last_used_counter = matched
    return True


def _locked_out() -> bool:
    now = time.time()
    _failures[:] = [t for t in _failures if now - t < LOCKOUT_SECONDS]
    return len(_failures) >= MAX_FAILURES


def login(body: LoginBody) -> dict:
    """Exchange a valid authenticator code for a short-lived JWT."""
    if _locked_out():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again later.",
        )
    if not verify_totp(body.code):
        _failures.append(time.time())
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")

    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": "admin", "iat": now, "exp": now + timedelta(minutes=TOKEN_TTL_MINUTES)},
        ADMIN_JWT_SECRET,
        algorithm="HS256",
    )
    return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_TTL_MINUTES * 60}


def require_admin(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> None:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized")
    try:
        payload = jwt.decode(
            creds.credentials,
            ADMIN_JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized")
    if payload.get("sub") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized")