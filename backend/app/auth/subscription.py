import hashlib
import hmac
import os
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth.authentication import CurrentUser, Role, get_current_user, require_role
from app.database import engine, get_session
from app.model import AuthIdentity, Company, CompanySubscription, SubStatus

# --- config ---
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY")
PAYSTACK_BASE_URL = "https://api.paystack.co"

# Create these once on the Paystack dashboard, then paste the codes here
# (or load from env). Keys must match the plan ids used on the pricing page.
PLAN_CODES = {
    "basic": os.getenv("PAYSTACK_PLAN_BASIC"),
    "professional": os.getenv("PAYSTACK_PLAN_PROFESSIONAL"),
    "enterprise": os.getenv("PAYSTACK_PLAN_ENTERPRISE"),
}
PLAN_CODES_REVERSE = {code: plan_id for plan_id, code in PLAN_CODES.items()}

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# --- schemas ---
class InitializeRequest(BaseModel):
    plan_id: str  # 'basic' | 'professional' | 'enterprise'


class InitializeResponse(BaseModel):
    reference: str
    plan_code: str
    email: str
    public_key: str


class SubscriptionStatusResponse(BaseModel):
    plan_id: Optional[str]
    status: SubStatus
    current_period_end: Optional[datetime]


# --- routes ---
@router.post("/initialize", response_model=InitializeResponse)
def initialize_subscription(
    payload: InitializeRequest,
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
):
    """Only a company account can start checkout — subscriptions live at the
    tenant level, not per-user. Reference is just handed to Paystack; the
    webhook is what actually confirms and activates the plan."""
    if payload.plan_id not in PLAN_CODES:
        raise HTTPException(status_code=400, detail="Invalid plan_id")

    return InitializeResponse(
        reference=f"sub_{uuid.uuid4().hex}",
        plan_code=PLAN_CODES[payload.plan_id],
        email=current_user.email,
        public_key=PAYSTACK_PUBLIC_KEY,
    )


@router.get("/status", response_model=SubscriptionStatusResponse)
def get_subscription_status(
    company_id: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: CurrentUser = Depends(get_current_user),
):
    """The checker the frontend polls to decide what to gate behind a plan.
    Company/staff always see their own tenant; admin must pass ?company_id=."""
    if current_user.role == Role.ADMIN:
        if not company_id:
            raise HTTPException(status_code=400, detail="Admin must provide a company_id query param")
    elif current_user.role in (Role.COMPANY, Role.STAFF):
        company_id = current_user.company_id
    else:
        raise HTTPException(status_code=403, detail="This account has no company subscription")

    sub = db.exec(select(CompanySubscription).where(CompanySubscription.company_id == company_id)).first()
    if not sub:
        return SubscriptionStatusResponse(plan_id=None, status=SubStatus.PENDING, current_period_end=None)

    return SubscriptionStatusResponse(
        plan_id=sub.plan_id, status=sub.status, current_period_end=sub.current_period_end
    )


@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_session),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
):
    sub = db.exec(
        select(CompanySubscription).where(CompanySubscription.company_id == current_user.company_id)
    ).first()
    if not sub or not sub.subscription_code:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    with httpx.Client() as client:
        response = client.post(
            f"{PAYSTACK_BASE_URL}/subscription/disable",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            json={"code": sub.subscription_code, "token": sub.email_token},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to cancel subscription with processor")

    # subscription.disable webhook will also fire and confirm this, but we
    # flip it here too so the UI doesn't lag behind the user's action.
    sub.status = SubStatus.CANCELLED
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()

    return {"message": "Subscription cancelled"}


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paystack_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_paystack_signature: str = Header(None),
):
    """Unauthenticated on purpose — Paystack's servers call this directly.
    Trust nothing here except a signature that matches your secret key."""
    payload = await request.body()
    computed = hmac.new(PAYSTACK_SECRET_KEY.encode(), payload, hashlib.sha512).hexdigest()

    if not x_paystack_signature or not hmac.compare_digest(computed, x_paystack_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = await request.json()
    background_tasks.add_task(process_webhook_event, event.get("event"), event.get("data", {}))

    # Always 200 immediately, or Paystack will keep retrying this event.
    return {"status": "success"}


def process_webhook_event(event_type: str, data: dict) -> None:
    """Runs after the 200 OK is already sent, so it opens its own session
    rather than reusing the request's. Handlers are idempotent — Paystack
    can and will send the same event more than once."""
    with Session(engine) as db:
        if event_type == "subscription.create":
            _handle_subscription_create(db, data)
        elif event_type == "charge.success":
            _handle_charge_success(db, data)
        elif event_type == "invoice.payment_failed":
            _handle_payment_failed(db, data)
        elif event_type == "subscription.disable":
            _handle_subscription_disable(db, data)
        # Unhandled event types are ignored on purpose — Paystack sends many
        # more than these four; only these move the company's access state.


def _find_company_by_email(db: Session, email: str) -> Optional[Company]:
    identity = db.exec(select(AuthIdentity).where(AuthIdentity.email == email)).first()
    if not identity:
        return None
    return db.exec(select(Company).where(Company.auth_identity_id == identity.id)).first()


def _get_or_create_sub(db: Session, company_id: str) -> CompanySubscription:
    sub = db.exec(select(CompanySubscription).where(CompanySubscription.company_id == company_id)).first()
    if not sub:
        sub = CompanySubscription(company_id=company_id)
    return sub


def _handle_subscription_create(db: Session, data: dict) -> None:
    customer_email = data.get("customer", {}).get("email")
    company = _find_company_by_email(db, customer_email)
    if not company:
        return  # no matching company — nothing to activate

    plan_code = data.get("plan", {}).get("plan_code")
    sub = _get_or_create_sub(db, company.id)
    sub.plan_id = PLAN_CODES_REVERSE.get(plan_code, sub.plan_id)
    sub.status = SubStatus.ACTIVE
    sub.customer_email = customer_email
    sub.subscription_code = data.get("subscription_code")
    sub.email_token = data.get("email_token")
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()


def _handle_charge_success(db: Session, data: dict) -> None:
    customer_email = data.get("customer", {}).get("email")
    company = _find_company_by_email(db, customer_email)
    if not company:
        return

    sub = _get_or_create_sub(db, company.id)
    sub.status = SubStatus.ACTIVE
    sub.customer_email = customer_email
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()


def _handle_payment_failed(db: Session, data: dict) -> None:
    customer_email = data.get("customer", {}).get("email")
    company = _find_company_by_email(db, customer_email)
    if not company:
        return

    sub = _get_or_create_sub(db, company.id)
    sub.status = SubStatus.PAST_DUE
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()


def _handle_subscription_disable(db: Session, data: dict) -> None:
    subscription_code = data.get("subscription_code")
    sub = db.exec(
        select(CompanySubscription).where(CompanySubscription.subscription_code == subscription_code)
    ).first()
    if not sub:
        customer_email = data.get("customer", {}).get("email")
        company = _find_company_by_email(db, customer_email)
        if not company:
            return
        sub = _get_or_create_sub(db, company.id)

    sub.status = SubStatus.CANCELLED
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()