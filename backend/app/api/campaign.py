# SMS / Email campaigns. Creating a campaign resolves its audience into
# CampaignRecipient rows up front (the durable "history" record), then either
# dispatches immediately via Celery or leaves it QUEUED for celery beat to
# pick up at scheduled_at (see app/tasks.py).
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.model import (
    Campaign, CampaignRecipient, Customer,
    CampaignChannel, CampaignAudience, CampaignStatus, DeliveryStatus, Role,
)
from app.auth.authentication import CurrentUser, require_role, scope_to_company
from app.tasks import dispatch_campaign

router = APIRouter(prefix="/campaign", tags=["campaigns"])


class CampaignCreate(BaseModel):
    name: str
    channel: CampaignChannel
    message: str
    subject: Optional[str] = None                       # required in practice for email
    audience: CampaignAudience = CampaignAudience.ALL_CUSTOMERS
    customer_ids: Optional[List[str]] = None             # required when audience == SPECIFIC
    scheduled_at: Optional[datetime] = None               # omit to send immediately


class CampaignRead(BaseModel):
    id: str
    company_id: str
    name: str
    channel: CampaignChannel
    audience: CampaignAudience
    subject: Optional[str]
    message: str
    status: CampaignStatus
    scheduled_at: Optional[datetime]
    created_at: datetime


class CampaignRecipientRead(BaseModel):
    id: str
    customer_id: Optional[str]
    channel: CampaignChannel
    destination: str
    status: DeliveryStatus
    provider_message_id: Optional[str]
    error: Optional[str]
    sent_at: Optional[datetime]


def _destinations_for(channel: CampaignChannel, customer: Customer) -> List[tuple]:
    """Returns [(channel, destination), ...] — BOTH fans a customer out to
    two recipient rows so each delivery is tracked independently."""
    out = []
    if channel in (CampaignChannel.EMAIL, CampaignChannel.BOTH) and customer.email:
        out.append((CampaignChannel.EMAIL, customer.email))
    if channel in (CampaignChannel.SMS, CampaignChannel.BOTH) and customer.phone:
        out.append((CampaignChannel.SMS, customer.phone))
    return out


@router.post("/", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    if payload.audience == CampaignAudience.SPECIFIC and not payload.customer_ids:
        raise HTTPException(status_code=400, detail="customer_ids is required for a specific audience")

    if payload.audience == CampaignAudience.ALL_CUSTOMERS:
        customers = session.exec(select(Customer).where(Customer.company_id == company_id)).all()
    else:
        customers = session.exec(
            select(Customer).where(
                Customer.company_id == company_id,
                Customer.id.in_(payload.customer_ids),
            )
        ).all()

    is_immediate = payload.scheduled_at is None or payload.scheduled_at <= datetime.utcnow()

    campaign = Campaign(
        company_id=company_id,
        name=payload.name,
        channel=payload.channel,
        audience=payload.audience,
        subject=payload.subject,
        message=payload.message,
        status=CampaignStatus.QUEUED,
        scheduled_at=None if is_immediate else payload.scheduled_at,
        created_by=current_user.id,
    )
    session.add(campaign)
    session.flush()  # populates campaign.id

    recipients = []
    for customer in customers:
        for channel, destination in _destinations_for(payload.channel, customer):
            recipients.append(
                CampaignRecipient(
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel=channel,
                    destination=destination,
                )
            )

    if not recipients:
        raise HTTPException(status_code=400, detail="No customers with a usable email/phone for this channel")

    session.add_all(recipients)
    session.commit()
    session.refresh(campaign)

    if is_immediate:
        dispatch_campaign.delay(campaign.id)

    return campaign


@router.get("/", response_model=List[CampaignRead])
def list_campaigns(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(Campaign)
    if company_id:
        stmt = stmt.where(Campaign.company_id == company_id)
    return session.exec(stmt.order_by(Campaign.created_at.desc())).all()


# The "campaign history" view — per-recipient delivery outcomes for one campaign.
@router.get("/{campaign_id}/history", response_model=List[CampaignRecipientRead])
def campaign_history(
    campaign_id: str,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    campaign = session.get(Campaign, campaign_id)
    if not campaign or (company_id and campaign.company_id != company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    stmt = select(CampaignRecipient).where(CampaignRecipient.campaign_id == campaign_id)
    return session.exec(stmt.order_by(CampaignRecipient.created_at.desc())).all()
