# Termii (https://termii.com) — one of the cheapest SMS routes available
# for Nigerian numbers, and it doesn't require pre-registering a sender ID
# for OTP-type traffic the way some alternatives do.
import os
from typing import Optional

import httpx

TERMII_API_KEY = os.getenv("TERMII_API_KEY")
TERMII_SENDER_ID = os.getenv("TERMII_SENDER_ID", "N-Alert")  # 11-char alphanumeric
TERMII_BASE_URL = "https://api.ng.termii.com/api/sms/send"


def send_sms(to: str, body: str, sender_id: Optional[str] = None) -> dict:
    """Send a single SMS synchronously. Returns Termii's response payload.
    Raises for network/HTTP errors — callers (Celery tasks) decide how to
    record failures rather than swallowing them here."""
    payload = {
        "to": to,
        "from": sender_id or TERMII_SENDER_ID,
        "sms": body,
        "type": "plain",
        "channel": "generic",
        "api_key": TERMII_API_KEY,
    }
    response = httpx.post(TERMII_BASE_URL, json=payload, timeout=15)
    response.raise_for_status()
    return response.json()
