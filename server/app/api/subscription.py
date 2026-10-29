"""
Paystack subscriptions for hotel admins.

Flow
----
1. POST /initialize-transaction/{admin_id}  -> returns Paystack checkout URL
2. User pays on Paystack and is redirected back to the frontend with ?reference=...
3. GET  /verify-payment/{admin_id}?reference=...  -> verifies the charge, activates the subscription
4. POST /paystack/webhook  -> keeps everything in sync (renewals, failed payments, cancellations)
5. GET  /admin/{admin_id}/subscription(/status)  -> what the frontend checks

Subscription data is stored on AdminCredentials. Access is computed from
`subscription_expires_at` at read time, so no cron job is needed to expire anyone.

Env vars: PAYSTACK_SECRET_KEY, FRONTEND_URL (or PAYSTACK_CALLBACK_URL), SUBSCRIPTION_GRACE_DAYS (optional)
"""
import hashlib
import hmac
import json
import logging
import math
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from starlette.concurrency import run_in_threadpool

from app.database import engine
from app.model import AdminCredentials, Admin

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIG
# ============================================================================
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_BASE_URL = "https://api.paystack.co"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
PAYSTACK_CALLBACK_URL = os.getenv("PAYSTACK_CALLBACK_URL", f"{FRONTEND_URL}/subscription")
GRACE_DAYS = int(os.getenv("SUBSCRIPTION_GRACE_DAYS", 3))  # extra days after expiry (late renewals)

# Server-side source of truth for prices. The client never decides what to charge.
PLANS = {
    "PLN_v3o2ntamoh7bgae": {"name": "Monthly", "plan_type": "monthly", "price": 20000, "days": 30},
    "PLN_ls4chsrcaz52tf1": {"name": "Quarterly", "plan_type": "quarterly", "price": 55000, "days": 90},
    "PLN_lw7fn7o13j0gr3c": {"name": "Annual", "plan_type": "annual", "price": 220000, "days": 365},
}

LIVE_STATUSES = ("active", "non-renewing", "attention")

# Two routers: attach your normal auth dependency to `router` only.
# The webhook MUST stay public (it is protected by Paystack's signature instead).
router = APIRouter(tags=["subscription"])
webhook_router = APIRouter(tags=["subscription"])


# ============================================================================
# SMALL HELPERS
# ============================================================================
def get_session():
    with Session(engine) as session:
        yield session


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Some DBs (e.g. SQLite) return naive datetimes; treat them as UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return _aware(dt)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    dt = _aware(dt)
    return dt.isoformat() if dt else None


def _meta(data: dict) -> dict:
    """Paystack metadata can come back as a dict, a JSON string, or empty."""
    meta = data.get("metadata")
    if isinstance(meta, dict):
        return meta
    if isinstance(meta, str) and meta:
        try:
            parsed = json.loads(meta)
            return parsed if isinstance(parsed, dict) else {}
        except ValueError:
            return {}
    return {}


def _extract_plan_code(data: dict) -> Optional[str]:
    plan = data.get("plan")
    if isinstance(plan, dict) and plan.get("plan_code"):
        return plan["plan_code"]
    if isinstance(plan, str) and plan:
        return plan
    plan_obj = data.get("plan_object")
    if isinstance(plan_obj, dict) and plan_obj.get("plan_code"):
        return plan_obj["plan_code"]
    return _meta(data).get("plan_code")


# ============================================================================
# PAYSTACK HTTP
# ============================================================================
class PaystackError(Exception):
    pass


def _paystack(method: str, path: str, **kwargs):
    """Call Paystack and return the `data` field. Raises PaystackError on any failure."""
    if not PAYSTACK_SECRET_KEY:
        raise PaystackError("PAYSTACK_SECRET_KEY is not configured")
    try:
        response = requests.request(
            method,
            f"{PAYSTACK_BASE_URL}{path}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=30,
            **kwargs,
        )
        body = response.json()
    except requests.exceptions.RequestException as e:
        raise PaystackError(f"Could not reach Paystack: {e}") from e
    except ValueError as e:
        raise PaystackError("Paystack returned an invalid response") from e

    if response.status_code >= 400 or not body.get("status"):
        raise PaystackError(body.get("message") or f"Paystack error {response.status_code}")
    return body.get("data")


# ============================================================================
# CREDENTIALS ROW HELPERS
# ============================================================================
def _get_creds(session: Session, admin_id: int) -> Optional[AdminCredentials]:
    return session.exec(
        select(AdminCredentials).where(AdminCredentials.admin_id == admin_id)
    ).first()


def _get_or_create_creds(session: Session, admin_id: int) -> AdminCredentials:
    creds = _get_creds(session, admin_id)
    if not creds:
        creds = AdminCredentials(admin_id=admin_id)
        session.add(creds)
        session.flush()
    return creds


def _find_creds(
    session: Session,
    *,
    admin_id=None,
    customer_code=None,
    email=None,
    subscription_code=None,
) -> Optional[AdminCredentials]:
    """Locate the admin a webhook event belongs to (renewal events carry no metadata)."""
    try:
        if admin_id not in (None, ""):
            creds = _get_creds(session, int(admin_id))
            if creds:
                return creds
    except (TypeError, ValueError):
        pass

    lookups = (
        (AdminCredentials.paystack_subscription_code, subscription_code),
        (AdminCredentials.paystack_customer_code, customer_code),
        (AdminCredentials.paystack_customer_email, email.lower() if email else None),
    )
    for column, value in lookups:
        if value:
            creds = session.exec(select(AdminCredentials).where(column == value)).first()
            if creds:
                return creds
    return None


# ============================================================================
# ACCESS LOGIC
# ============================================================================
def has_access(creds: Optional[AdminCredentials]) -> bool:
    if not creds:
        return False
    expires = _aware(creds.subscription_expires_at)
    if not expires:
        return False
    return _utcnow() <= expires + timedelta(days=GRACE_DAYS)


def build_detail(creds: Optional[AdminCredentials]) -> dict:
    """Response shape used by every subscription endpoint the frontend calls."""
    expires = _aware(creds.subscription_expires_at) if creds else None
    if not creds or not expires:
        return {
            "is_active": False,
            "status": "none",
            "plan_type": None,
            "plan_code": None,
            "started_at": None,
            "expires_at": None,
            "days_left": 0,
            "cancel_at_period_end": False,
            "manage_link": None,
        }

    active = has_access(creds)
    raw_status = creds.subscription_status or "active"
    days_left = max(0, math.ceil((expires - _utcnow()).total_seconds() / 86400))

    return {
        "is_active": active,
        "status": raw_status if active else "expired",
        "plan_type": creds.subscription_plan_type,
        "plan_code": creds.subscription_plan_code,
        "started_at": _iso(creds.subscription_started_at),
        "expires_at": _iso(expires),
        "days_left": days_left,
        "cancel_at_period_end": active and raw_status in ("non-renewing", "cancelled", "completed"),
        "manage_link": creds.subscription_manage_link,
    }


def require_active_subscription(admin_id: int, session: Session = Depends(get_session)):
    """
    Dependency to protect other routes:
        @app.get("/admin/{admin_id}/rooms", dependencies=[Depends(require_active_subscription)])
    """
    if not has_access(_get_creds(session, admin_id)):
        raise HTTPException(status_code=402, detail="An active subscription is required")


# ============================================================================
# APPLYING PAYSTACK DATA TO THE DB ROW
# ============================================================================
def _apply_charge(creds: AdminCredentials, data: dict, plan_code: str) -> bool:
    """
    Extend access for one successful charge. Idempotent per payment reference,
    so verify + webhook (or webhook retries) never extend twice.
    """
    reference = data.get("reference")
    if not reference or creds.last_payment_reference == reference:
        return False

    plan = PLANS[plan_code]
    paid_at = _parse_dt(data.get("paid_at")) or _utcnow()
    current_expiry = _aware(creds.subscription_expires_at)

    # Renewing early stacks on top of remaining time; otherwise start from the payment
    base = current_expiry if current_expiry and current_expiry > paid_at else paid_at

    was_lapsed = not current_expiry or current_expiry + timedelta(days=GRACE_DAYS) < paid_at
    if was_lapsed or not creds.subscription_started_at:
        creds.subscription_started_at = paid_at

    creds.subscription_expires_at = base + timedelta(days=plan["days"])
    creds.subscription_plan_code = plan_code
    creds.subscription_plan_type = plan["plan_type"]
    creds.subscription_status = "active"
    creds.last_payment_reference = reference
    creds.last_payment_at = paid_at

    customer = data.get("customer") or {}
    if customer.get("customer_code"):
        creds.paystack_customer_code = customer["customer_code"]
    if customer.get("email"):
        creds.paystack_customer_email = customer["email"].lower()
    return True


def _apply_subscription_data(creds: AdminCredentials, sub: dict):
    """Store Paystack's subscription object (from the API or a subscription.* webhook)."""
    if sub.get("subscription_code"):
        creds.paystack_subscription_code = sub["subscription_code"]
    if sub.get("email_token"):
        creds.paystack_email_token = sub["email_token"]

    plan_code = (sub.get("plan") or {}).get("plan_code")
    if plan_code in PLANS:
        creds.subscription_plan_code = plan_code
        creds.subscription_plan_type = PLANS[plan_code]["plan_type"]

    status = sub.get("status")
    if status:
        creds.subscription_status = status

    next_payment = _parse_dt(sub.get("next_payment_date"))
    if next_payment and status in LIVE_STATUSES:
        creds.subscription_expires_at = next_payment

    customer = sub.get("customer") or {}
    if customer.get("customer_code"):
        creds.paystack_customer_code = customer["customer_code"]
    if customer.get("email"):
        creds.paystack_customer_email = customer["email"].lower()


def _refresh_manage_link(creds: AdminCredentials) -> Optional[str]:
    """Ask Paystack for a fresh manage link (update card / cancel) and store it."""
    if not creds.paystack_subscription_code:
        return None
    data = _paystack("GET", f"/subscription/{creds.paystack_subscription_code}/manage/link")
    link = (data or {}).get("link")
    if link:
        creds.subscription_manage_link = link
    return link


def _sync_subscription(creds: AdminCredentials, charge_data: dict):
    """
    Best effort: right after the first payment, look up the subscription Paystack created
    so we can store its code and manage link without waiting for the webhook.
    """
    customer_id = (charge_data.get("customer") or {}).get("id")
    if not customer_id:
        return
    try:
        subs = _paystack("GET", "/subscription", params={"customer": customer_id, "perPage": 50})
        if not isinstance(subs, list):
            return

        live = [s for s in subs if s.get("status") in LIVE_STATUSES]
        matching = [s for s in live if (s.get("plan") or {}).get("plan_code") == creds.subscription_plan_code]
        pool = matching or live
        if not pool:
            return

        pool.sort(key=lambda s: s.get("createdAt") or s.get("created_at") or "", reverse=True)
        _apply_subscription_data(creds, pool[0])
        _refresh_manage_link(creds)
    except PaystackError as e:
        logger.warning("Could not sync Paystack subscription for admin %s: %s", creds.admin_id, e)


def _charge_matches_plan(data: dict, plan_code: Optional[str]) -> bool:
    plan = PLANS.get(plan_code or "")
    if not plan:
        return False
    try:
        amount = int(data.get("amount") or 0)
    except (TypeError, ValueError):
        return False
    return data.get("currency") == "NGN" and amount >= plan["price"] * 100


# ============================================================================
# ROUTES
# ============================================================================
class InitializeBody(BaseModel):
    email: Optional[str] = None
    plan_code: str


@router.post("/initialize-transaction/{admin_id}")
def initialize_transaction(
    admin_id: int,
    body: InitializeBody,
    session: Session = Depends(get_session),
):
    plan = PLANS.get(body.plan_code)
    if not plan:
        raise HTTPException(status_code=400, detail="Unknown subscription plan")
    #check admin
    admin = session.exec(
        select(Admin).where(Admin.id == admin_id)
    ).first()
    if not admin:
        raise HTTPException(status_code=401, detail=str("not authorized"))
    
    email = admin.email
    if "@" not in email:
        raise HTTPException(status_code=422, detail="A valid email is required")

    creds = _get_or_create_creds(session, admin_id)
    if has_access(creds) and creds.subscription_status == "active":
        raise HTTPException(status_code=409, detail="You already have an active subscription")

    payload = {
        "email": email,
        "plan": body.plan_code,  # Paystack uses the plan's own amount when a plan is given
        "amount": plan["price"] * 100,  # kobo
        "callback_url": PAYSTACK_CALLBACK_URL,
        "reference": f"sub_{admin_id}_{uuid.uuid4().hex[:16]}",
        "metadata": {
            "admin_id": admin_id,
            "plan_code": body.plan_code,
            "plan_type": plan["plan_type"],
        },
    }

    try:
        data = _paystack("POST", "/transaction/initialize", json=payload)
    except PaystackError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Remember which email Paystack knows this admin by, so webhooks can find them later
    creds.paystack_customer_email = email
    creds.updated_at = _utcnow()
    session.add(creds)
    session.commit()

    return {
        "authorization_url": data["authorization_url"],
        "access_code": data.get("access_code"),
        "reference": data.get("reference") or payload["reference"],
    }


@router.get("/verify-payment/{admin_id}")
def verify_payment(
    admin_id: int,
    reference: str,
    session: Session = Depends(get_session),
):
    try:
        data = _paystack("GET", f"/transaction/verify/{reference}")
    except PaystackError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if data.get("status") != "success":
        raise HTTPException(
            status_code=400,
            detail=f"Payment was not completed (status: {data.get('status')})",
        )

    # The payment must belong to the admin asking, otherwise anyone could claim someone else's
    if str(_meta(data).get("admin_id")) != str(admin_id):
        raise HTTPException(status_code=403, detail="This payment does not belong to your account")

    plan_code = _extract_plan_code(data)
    if not _charge_matches_plan(data, plan_code):
        raise HTTPException(status_code=400, detail="Payment does not match a subscription plan")

    creds = _get_or_create_creds(session, admin_id)
    _apply_charge(creds, data, plan_code)
    _sync_subscription(creds, data)

    creds.updated_at = _utcnow()
    session.add(creds)
    session.commit()
    session.refresh(creds)
    return build_detail(creds)


@router.get("/admin/{admin_id}/subscription")
def get_subscription(admin_id: int, session: Session = Depends(get_session)):
    """Full subscription details (used by the Subscribe page)."""
    return build_detail(_get_creds(session, admin_id))


@router.get("/admin/{admin_id}/subscription/status")
def get_subscription_status(admin_id: int, session: Session = Depends(get_session)):
    """Lightweight check: is this admin currently subscribed?"""
    detail = build_detail(_get_creds(session, admin_id))
    return {
        "is_subscribed": detail["is_active"],
        "status": detail["status"],
        "plan_type": detail["plan_type"],
        "expires_at": detail["expires_at"],
        "days_left": detail["days_left"],
    }


@router.get("/admin/{admin_id}/subscription/manage-link")
def get_manage_link(admin_id: int, session: Session = Depends(get_session)):
    """Generate a fresh Paystack link to update the card or cancel the subscription."""
    creds = _get_creds(session, admin_id)
    if not creds or not creds.paystack_subscription_code:
        raise HTTPException(status_code=404, detail="No subscription found")

    try:
        link = _refresh_manage_link(creds)
    except PaystackError as e:
        if creds.subscription_manage_link:  # fall back to the last stored link
            return {"link": creds.subscription_manage_link}
        raise HTTPException(status_code=502, detail=str(e))

    creds.updated_at = _utcnow()
    session.add(creds)
    session.commit()
    return {"link": link or creds.subscription_manage_link}


# ============================================================================
# WEBHOOK
# ============================================================================
def _handle_event(event: str, data: dict):
    customer = data.get("customer") or {}
    nested_sub = data.get("subscription") if isinstance(data.get("subscription"), dict) else {}
    subscription_code = data.get("subscription_code") or nested_sub.get("subscription_code")
    meta = _meta(data)

    with Session(engine) as session:
        creds = _find_creds(
            session,
            admin_id=meta.get("admin_id"),
            customer_code=customer.get("customer_code"),
            email=customer.get("email"),
            subscription_code=subscription_code,
        )
        if not creds:
            logger.warning("Paystack event %s: no matching admin (customer=%s)", event, customer.get("email"))
            return

        if event == "charge.success":
            plan_code = _extract_plan_code(data)
            if plan_code in PLANS:  # ignore one-off charges that aren't subscription payments
                if _charge_matches_plan(data, plan_code):
                    _apply_charge(creds, data, plan_code)
                else:
                    logger.warning("charge.success amount/currency mismatch: %s", data.get("reference"))

        elif event == "subscription.create":
            _apply_subscription_data(creds, data)
            try:
                _refresh_manage_link(creds)
            except PaystackError as e:
                logger.warning("Could not fetch manage link: %s", e)

        elif event == "subscription.not_renew":
            creds.subscription_status = "non-renewing"
            next_payment = _parse_dt(data.get("next_payment_date"))
            if next_payment:
                creds.subscription_expires_at = next_payment

        elif event == "subscription.disable":
            # Keep access until the period that was already paid for runs out
            creds.subscription_status = "cancelled"

        elif event == "invoice.payment_failed":
            creds.subscription_status = "attention"

        else:
            return  # events we don't care about

        creds.updated_at = _utcnow()
        session.add(creds)
        session.commit()


@webhook_router.post("/paystack/webhook")
async def paystack_webhook(request: Request):
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Paystack is not configured")

    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(PAYSTACK_SECRET_KEY.encode(), raw_body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = json.loads(raw_body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = payload.get("event", "")
    data = payload.get("data") or {}

    try:
        await run_in_threadpool(_handle_event, event, data)
    except Exception:
        logger.exception("Failed to process Paystack event %s", event)
        # A non-200 makes Paystack retry the event later
        raise HTTPException(status_code=500, detail="Processing failed")

    return {"received": True}