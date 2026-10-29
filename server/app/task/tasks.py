import base64
import json
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from html import escape
from typing import List, Optional, Union
from zoneinfo import ZoneInfo

import redis
import requests
from celery.signals import worker_process_init
from sqlmodel import Session, select

from app.celery_app import celery_app
from app.crud import update_data
from app.database import engine
from app.model import AdminCredentials, Booking, HotelProfile
from app.services.send_sms import BulkSMSAPI

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIG
# ============================================================================
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Fallbacks used only when an admin has no credentials of their own
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")  # e.g. noreply@yourdomain.com
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "")

RESEND_API_URL = "https://api.resend.com/emails"
BULK_SMS_BASE_URL = os.getenv("BULK_SMS_BASE_URL", "https://www.bulksmsnigeria.com/api/v2/sms")

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Africa/Lagos")
PROGRESS_TTL_SECONDS = 60 * 60 * 24  # keep task status in redis for 24h
NOTIFICATION_GUARD_TTL = 60 * 60 * 48  # de-dupe window for check-in/out emails
SMS_MAX_WORKERS = min(int(os.getenv("SMS_MAX_WORKERS", 5)), 10)

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=0,
    decode_responses=True,
)


# ============================================================================
# HELPERS
# ============================================================================
@worker_process_init.connect
def _reset_db_pool(**_):
    """Don't share DB connections between forked worker processes."""
    engine.dispose()


def _set_status(task_id: str, **fields):
    """Write task status to redis and make sure the key eventually expires."""
    if not task_id:
        return
    clean = {k: v for k, v in fields.items() if v is not None}
    redis_client.hset(task_id, mapping=clean)
    redis_client.expire(task_id, PROGRESS_TTL_SECONDS)


def _today_iso() -> str:
    """Today's date in the app timezone (not the server's)."""
    # If Booking.check_in / check_out are `date` columns, return .date() instead of .isoformat()
    return datetime.now(ZoneInfo(APP_TIMEZONE)).date().isoformat()


def _first_time(booking_id, event: str, today: str) -> bool:
    """True only the first time this (booking, event, day) is seen. Prevents duplicate emails."""
    key = f"notif:{booking_id}:{event}:{today}"
    return bool(redis_client.set(key, 1, nx=True, ex=NOTIFICATION_GUARD_TTL))


def _is_cancelled(booking) -> bool:
    status = getattr(booking, "status", None)
    return isinstance(status, str) and status.lower() in ("cancelled", "canceled")


def normalize_phone(raw) -> Optional[str]:
    """Normalize to international digits (2348012345678). Returns None if it looks invalid."""
    digits = re.sub(r"\D", "", str(raw or ""))
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:  # 08012345678
        return "234" + digits[1:]
    if len(digits) == 10:  # 8012345678
        return "234" + digits
    if digits.startswith("234") and len(digits) == 13:
        return digits
    if 11 <= len(digits) <= 15 and not digits.startswith("0"):  # other international numbers
        return digits
    return None


def get_hotel(admin_id, session: Optional[Session] = None):
    if session is not None:
        return session.exec(
            select(HotelProfile).where(HotelProfile.admin_id == admin_id)
        ).first()
    with Session(engine) as own_session:
        return own_session.exec(
            select(HotelProfile).where(HotelProfile.admin_id == admin_id)
        ).first()


def get_admin_credentials(admin_id) -> Optional[dict]:
    """
    Fetch an admin's email (Resend) and SMS (BulkSMS Nigeria) credentials.
    Returns a plain dict so it is safe to use after the DB session closes.
    """
    with Session(engine) as session:
        creds = session.exec(
            select(AdminCredentials).where(AdminCredentials.admin_id == admin_id)
        ).first()

        if not creds:
            return None

        return {
            "resend_api_key": creds.resend_api_key,
            "resend_from_email": creds.resend_from_email,
            "resend_from_name": creds.resend_from_name,
            "resend_reply_to": creds.resend_reply_to,
            "api_token": creds.api_token,
            "sender_id": creds.sender_id,
        }


# ============================================================================
# EMAIL SENDING (Resend REST API, per-admin credentials)
# ============================================================================
class EmailConfigError(Exception):
    """Missing or invalid email configuration. Not retryable."""


class TransientEmailError(Exception):
    """Temporary failure (network, 429, 5xx). Worth retrying."""


def _resolve_email_config(admin_id, from_email_override: Optional[str] = None) -> dict:
    """Work out the API key / from / reply-to to use for this admin."""
    creds = get_admin_credentials(admin_id) or {}

    api_key = creds.get("resend_api_key") or RESEND_API_KEY
    if not api_key:
        raise EmailConfigError(f"No Resend API key configured for admin_id={admin_id}")

    email = from_email_override or creds.get("resend_from_email") or DEFAULT_FROM_EMAIL
    if not email:
        raise EmailConfigError(f"No from-email configured for admin_id={admin_id}")

    name = creds.get("resend_from_name") or DEFAULT_FROM_NAME
    from_header = f"{name} <{email}>" if name and "<" not in email else email

    return {
        "api_key": api_key,
        "from": from_header,
        "reply_to": creds.get("resend_reply_to"),
    }


def _post_to_resend(config: dict, params: dict) -> dict:
    """
    Calls Resend directly with this admin's key, so there is no global
    `resend.api_key` shared between tasks or admins.
    """
    payload = {
        "from": config["from"],
        "to": params["to"],
        "subject": params["subject"],
        "html": params["html"],
    }
    if config.get("reply_to"):
        payload["reply_to"] = config["reply_to"]
    if params.get("attachments"):
        payload["attachments"] = params["attachments"]

    try:
        response = requests.post(
            RESEND_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {config['api_key']}"},
            timeout=30,
        )
    except requests.exceptions.RequestException as e:
        raise TransientEmailError(f"Network error contacting Resend: {e}") from e

    if response.status_code == 429 or response.status_code >= 500:
        raise TransientEmailError(f"Resend temporary error {response.status_code}: {response.text}")
    if response.status_code >= 400:
        raise RuntimeError(f"Resend rejected the email ({response.status_code}): {response.text}")

    data = response.json()
    if not data.get("id"):
        raise RuntimeError(f"Unexpected Resend response: {data}")
    return data


def _run_email_task(task, admin_id, params: dict, from_email: Optional[str]) -> bool:
    """Shared flow for both email tasks: status tracking + retry on transient errors."""
    task_id = task.request.id
    _set_status(task_id, status="processing", progress=0)

    try:
        config = _resolve_email_config(admin_id, from_email)
        _post_to_resend(config, params)
        _set_status(task_id, status="completed", progress=100)
        return True

    except TransientEmailError as e:
        if task.request.retries < task.max_retries:
            _set_status(task_id, status="retrying", progress=0, error=str(e))
            raise task.retry(exc=e, countdown=30 * (2 ** task.request.retries))
        _set_status(task_id, status="failed", progress=100, error=str(e))
        raise

    except Exception as e:
        _set_status(task_id, status="failed", progress=100, error=str(e))
        raise


# ============================================================================
# EMAIL TEMPLATE
# ============================================================================
def generate_booking_email_html(hotel, booking, event_type):
    """Generate HTML email template for booking notifications."""
    if event_type == "check_in":
        title = "🏨 Check-In Confirmation"
        message = "Your room is now ready and waiting for you!"
        status_color = "#4CAF50"
    else:
        title = "🔄 Check-Out Confirmation"
        message = "Thank you for staying with us! Your room is now available for other guests."
        status_color = "#FF9800"

    hotel_name = escape(str(hotel.hotel_name))

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: #ffffff; border-radius: 10px; padding: 30px;">
            <h1 style="color: #2c3e50;">{hotel_name}</h1>
            <div style="background-color: {status_color}; color: white; display: inline-block; padding: 8px 20px; border-radius: 20px;">{title}</div>
            <p>{message}</p>
            <p>Booking ID: #{escape(str(booking.id))} | Room: {escape(str(booking.room_id))}</p>
            <p>Check-in: {escape(str(booking.check_in))} → Check-out: {escape(str(booking.check_out))}</p>
        </div>
    </body>
    </html>
    """


# ============================================================================
# DAILY ROOM STATUS TASK
# ============================================================================
@celery_app.task
def update_room_statuses():
    today = _today_iso()
    pending = []  # emails to dispatch AFTER the DB commit
    hotel_cache = {}
    rooms_updated = 0

    with Session(engine) as session:
        bookings = session.exec(
            select(Booking).where(
                (Booking.check_in == today) | (Booking.check_out == today)
            )
        ).all()
        bookings = [b for b in bookings if not _is_cancelled(b)]

        def hotel_for(admin_id):
            if admin_id not in hotel_cache:
                hotel_cache[admin_id] = get_hotel(admin_id, session)
            return hotel_cache[admin_id]

        checkouts = [b for b in bookings if b.check_out == today]
        checkins = [b for b in bookings if b.check_in == today]

        # Check-outs first, so a same-day turnover on the same room ends up "occupied"
        for event, event_type, room_status, group in (
            ("check_out", "check_out", "available", checkouts),
            ("check_in", "check_in", "occupied", checkins),
        ):
            for booking in group:
                hotel = hotel_for(booking.admin_id)
                if not hotel:
                    logger.warning("Hotel not found for admin_id=%s", booking.admin_id)
                    continue

                update_data("room", booking.room_id, {"status": room_status}, session)
                rooms_updated += 1

                label = "Check-In" if event == "check_in" else "Check-Out"
                pending.append({
                    "admin_id": booking.admin_id,
                    "booking_id": booking.id,
                    "event": event,
                    "to": booking.customer_email,
                    "subject": f"{label} Confirmation - {hotel.hotel_name}",
                    "html": generate_booking_email_html(hotel, booking, event_type),
                })

        session.commit()

    # Only notify guests once the status changes are safely saved
    queued = 0
    for item in pending:
        if not item["to"]:
            continue
        if not _first_time(item["booking_id"], item["event"], today):
            continue  # already notified today
        send_mail.delay(item["admin_id"], item["to"], item["subject"], item["html"])
        queued += 1

    return f"Updated {rooms_updated} room(s), queued {queued} notification email(s)"


# ============================================================================
# EMAIL TASKS
# ============================================================================
@celery_app.task(bind=True, ignore_result=True, max_retries=3)
def send_mail(
    self,
    admin_id: int,
    to: Union[str, List[str]],
    subject: str,
    html: str,
    from_email: Optional[str] = None,
) -> bool:
    """Send an email through Resend using the admin's own credentials."""
    if isinstance(to, str):
        to = [to]

    params = {"to": to, "subject": subject, "html": html}
    return _run_email_task(self, admin_id, params, from_email)


@celery_app.task(bind=True, ignore_result=True, max_retries=3)
def send_mail_with_attachment(
    self,
    admin_id: int,
    filename: str,
    content_type: str,
    file_content: str,
    to: Union[str, List[str]],
    subject: str,
    html: str,
    from_email: Optional[str] = None,
) -> bool:
    """
    Send an email with an attachment using the admin's own credentials.
    `file_content` must already be a base64 string. For big files, prefer passing
    a storage path/key instead of the content, to keep the broker light.
    """
    if isinstance(to, str):
        to = [to]

    params = {
        "to": to,
        "subject": subject,
        "html": html,
        "attachments": [{
            "filename": filename,
            "content": file_content,
            "content_type": content_type,
        }],
    }
    return _run_email_task(self, admin_id, params, from_email)


# ============================================================================
# SMS TASK, BulkSMS Nigeria
# ============================================================================
@celery_app.task(bind=True, ignore_result=True)
def send_bulk_sms(self, admin_id: int, to, body: str):
    """
    Send SMS via BulkSMS Nigeria using the admin's own credentials.

    :param admin_id: admin whose credentials (api_token / sender_id) should be used.
    :param to: single phone number (str) or list of phone numbers.
    :param body: SMS message text.
    """
    task_id = self.request.id

    raw_numbers = [to] if isinstance(to, str) else list(to or [])

    # Normalize, drop duplicates, and separate out numbers that look invalid
    numbers, invalid, seen = [], [], set()
    for raw in raw_numbers:
        number = normalize_phone(raw)
        if number is None:
            invalid.append(raw)
        elif number not in seen:
            seen.add(number)
            numbers.append(number)

    total = len(numbers) + len(invalid)
    errors = [{"recipient": str(r), "error": "Invalid phone number"} for r in invalid]
    sent = 0
    failed = len(invalid)

    _set_status(task_id, status="processing", progress=0, total=total, sent=0, failed=failed)

    if not numbers:
        _set_status(
            task_id, status="failed", progress=100, total=total, sent=0, failed=failed,
            error="No valid phone numbers to send to",
            errors=json.dumps(errors) if errors else None,
        )
        return

    # --- Step 1: credentials ---
    creds = get_admin_credentials(admin_id)
    if not creds or not creds.get("api_token") or not creds.get("sender_id"):
        _set_status(
            task_id, status="failed", progress=100, sent=0, failed=total,
            error=f"No SMS credentials (api_token / sender_id) found for admin_id={admin_id}",
        )
        return

    # --- Step 2: client ---
    try:
        client = BulkSMSAPI(
            base_url=BULK_SMS_BASE_URL,
            api_token=creds["api_token"],
            sender_id=creds["sender_id"],
        )
    except Exception as e:
        _set_status(task_id, status="failed", progress=100, sent=0, failed=total, error=str(e))
        raise

    # --- Step 3: send concurrently, update progress as results come in ---
    try:
        processed = failed  # invalid numbers already count as processed
        last_percent = -1

        with ThreadPoolExecutor(max_workers=SMS_MAX_WORKERS) as pool:
            futures = {
                pool.submit(client.send_sms, to_number=number, message=body): number
                for number in numbers
            }
            for future in as_completed(futures):
                number = futures[future]
                try:
                    future.result()
                    sent += 1
                except Exception as e:
                    failed += 1
                    errors.append({"recipient": number, "error": str(e)})
                    logger.error("SMS to %s failed: %s", number, e)

                processed += 1
                percent = int(processed / total * 100)
                if percent != last_percent:  # skip redundant redis writes
                    last_percent = percent
                    _set_status(task_id, progress=percent, sent=sent, failed=failed)

        status = "success" if failed == 0 else "partial" if sent > 0 else "failed"
        _set_status(
            task_id,
            status=status, progress=100, sent=sent, failed=failed, total=total,
            errors=json.dumps(errors) if errors else None,
        )
        return {"status": status, "sent": sent, "failed": failed, "total": total}

    except Exception as e:
        _set_status(
            task_id, status="failed", progress=100, sent=sent,
            failed=total - sent, total=total, error=str(e),
        )
        raise

    finally:
        client.close()