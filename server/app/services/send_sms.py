import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)


class BulkSMSAPI:
    """
    BulkSMS Nigeria API client (framework independent).

    All configuration is passed in as parameters, so it works from FastAPI,
    Celery tasks, scripts, etc. without Django settings.
    """

    def __init__(
        self,
        base_url: str,
        api_token: str,
        sender_id: Optional[str] = None,
        timeout: int = 30,
    ):
        if not base_url:
            raise ValueError("base_url is required")
        if not api_token:
            raise ValueError("api_token is required")

        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.sender_id = sender_id
        self.timeout = timeout

        if not self.sender_id:
            logger.warning("sender_id not provided - it must be passed to send_sms()")

        # Reuse one connection across all messages in a bulk send
        self.session = requests.Session()
        self.session.headers.update(self._headers())

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def send_sms(
        self,
        to_number: str,
        message: str,
        sender_id: Optional[str] = None,
        gateway: str = "direct-refund",
    ) -> dict:
        """Send a single SMS. Raises on network/HTTP/API errors."""
        sender = sender_id or self.sender_id
        if not sender:
            raise ValueError("sender_id must be provided")

        payload = {
            "from": sender,
            "to": to_number,
            "body": message,
            "gateway": gateway,
        }

        try:
            response = self.session.post(
                self.base_url, json=payload, timeout=self.timeout
            )
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            body = e.response.text if e.response is not None else ""
            raise RuntimeError(f"HTTP error sending SMS: {e} - {body}") from e
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Network error sending SMS: {e}") from e

        try:
            data = response.json()
        except ValueError as e:
            raise RuntimeError(f"Invalid JSON response: {response.text}") from e

        # Some APIs return HTTP 200 with an error body; check for it
        if isinstance(data, dict) and data.get("error"):
            err = data["error"]
            raise RuntimeError(f"API error: {err.get('message', err) if isinstance(err, dict) else err}")

        return data

    def send_bulk_sms(
        self,
        recipients: list,
        message: str,
        sender_id: Optional[str] = None,
        gateway: str = "direct-refund",
    ) -> dict:
        """Send the same message to many recipients."""
        if not isinstance(recipients, list):
            raise ValueError("recipients must be a list of phone numbers")

        results = {
            "total": len(recipients),
            "successful": 0,
            "failed": 0,
            "results": [],
        }

        for recipient in recipients:
            try:
                result = self.send_sms(
                    to_number=recipient,
                    message=message,
                    sender_id=sender_id,
                    gateway=gateway,
                )
                results["successful"] += 1
                results["results"].append(
                    {"recipient": recipient, "status": "success", "data": result}
                )
            except Exception as e:
                results["failed"] += 1
                results["results"].append(
                    {"recipient": recipient, "status": "failed", "error": str(e)}
                )
                logger.error(f"Failed to send SMS to {recipient}: {e}")

        logger.info(
            f"Bulk SMS completed: {results['successful']}/{results['total']} successful"
        )
        return results

    def close(self):
        self.session.close()