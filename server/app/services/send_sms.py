import os
import africastalking
from dotenv import load_dotenv

load_dotenv()

USERNAME = os.getenv("AFRICASTALKING_USERNAME")
API_KEY = os.getenv("AFRICASTALKING_API_KEY")
SENDER_ID = os.getenv("AFRICASTALKING_SENDER_ID")

africastalking.initialize(USERNAME, API_KEY)

sms = africastalking.SMS


def send_sms(phone_number: str, message: str):
    try:
        response = sms.send(
            message,
            [phone_number],
            sender_id=SENDER_ID
        )

        return response

    except Exception as e:
        raise Exception(f"SMS sending failed: {str(e)}")


def send_bulk_sms(phone_numbers: list[str], message: str):
    try:
        response = sms.send(
            message,
            phone_numbers,
            sender_id=SENDER_ID
        )

        return response

    except Exception as e:
        raise Exception(f"Bulk SMS sending failed: {str(e)}")