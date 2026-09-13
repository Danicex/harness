from datetime import datetime

from sqlmodel import Session, select

from app.celery_app import celery_app
from app.database import engine
from app.model import Campaign, CampaignRecipient, CampaignChannel, CampaignStatus, DeliveryStatus
from app.services.mailer import send_mail
from app.services.send_sms import send_sms

import asyncio


@celery_app.task(name="app.tasks.dispatch_campaign")
def dispatch_campaign(campaign_id: str) -> str:
    """Sends every PENDING recipient row for a campaign, then rolls the
    campaign's own status up from the per-recipient results. Safe to retry:
    already-SENT/FAILED recipients are skipped, so re-running only touches
    what's left."""
    with Session(engine) as session:
        campaign = session.get(Campaign, campaign_id)
        if not campaign:
            return f"Campaign {campaign_id} not found"

        campaign.status = CampaignStatus.SENDING
        session.add(campaign)
        session.commit()

        recipients = session.exec(
            select(CampaignRecipient).where(
                CampaignRecipient.campaign_id == campaign_id,
                CampaignRecipient.status == DeliveryStatus.PENDING,
            )
        ).all()

        sent, failed = 0, 0
        for recipient in recipients:
            try:
                if recipient.channel == CampaignChannel.EMAIL:
                    ok = asyncio.run(
                        send_mail(
                            to=recipient.destination,
                            subject=campaign.subject or campaign.name,
                            html=campaign.message,
                        )
                    )
                    if not ok:
                        raise RuntimeError("Resend reported failure")
                    recipient.provider_message_id = None
                else:  # SMS
                    result = send_sms(to=recipient.destination, body=campaign.message)
                    recipient.provider_message_id = str(result.get("message_id", ""))

                recipient.status = DeliveryStatus.SENT
                recipient.sent_at = datetime.utcnow()
                sent += 1
            except Exception as exc:  # noqa: BLE001 - record and move on
                recipient.status = DeliveryStatus.FAILED
                recipient.error = str(exc)[:500]
                failed += 1

            session.add(recipient)

        campaign.status = CampaignStatus.SENT if failed == 0 else (
            CampaignStatus.FAILED if sent == 0 else CampaignStatus.SENT
        )
        session.add(campaign)
        session.commit()

        return f"Campaign {campaign_id}: sent={sent} failed={failed}"


@celery_app.task(name="app.tasks.dispatch_due_campaigns")
def dispatch_due_campaigns() -> str:
    """Celery beat heartbeat — picks up campaigns scheduled for the past
    and fires them off. Immediate (non-scheduled) campaigns are dispatched
    directly from the create-campaign endpoint instead."""
    now = datetime.utcnow()
    with Session(engine) as session:
        due = session.exec(
            select(Campaign).where(
                Campaign.status == CampaignStatus.QUEUED,
                Campaign.scheduled_at != None,  # noqa: E711
                Campaign.scheduled_at <= now,
            )
        ).all()
        for campaign in due:
            dispatch_campaign.delay(campaign.id)
        return f"Queued {len(due)} due campaign(s)"
