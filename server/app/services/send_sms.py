import os
import africastalking
from typing import Optional, List
from dotenv import load_dotenv
import json
# Load default environment variables
load_dotenv()

DEFAULT_USERNAME = os.getenv("AFRICASTALKING_USERNAME")
DEFAULT_API_KEY = os.getenv("AFRICASTALKING_API_KEY")
DEFAULT_SENDER_ID = os.getenv("AFRICASTALKING_SENDER_ID")

def get_sms_service(api_key: Optional[str] = None) -> africastalking.SMS:
    """Helper function to dynamically initialize Africa's Talking and return the SMS object."""
    # Use provided API key if available, otherwise fall back to default from .env
    current_api_key = api_key if api_key else DEFAULT_API_KEY
    
    # Note: Africa's Talking username is required for initialization.
    # If your agents have custom usernames in the future, you can pass it here as well.
    africastalking.initialize(DEFAULT_USERNAME, current_api_key)
    return africastalking.SMS

def send_sms(
    phone_number: str, 
    message: str, 
    api_key: Optional[str] = None, 
    agent_phone: Optional[str] = None
):
    """Sends a single SMS, using custom agent credentials or default values."""
    try:
        sms_client = get_sms_service(api_key)
        
        # Use agent_phone as the sender_id/shortcode if provided, otherwise default sender ID
        sender = agent_phone if agent_phone else DEFAULT_SENDER_ID
        
        # Africa's Talking requires recipients to be a list even for a single message
        response = sms_client.send(
            message,
            [phone_number],
            sender_id=sender
        )
        return response

    except Exception as e:
        raise Exception(f"SMS sending failed: {str(e)}")

def send_bulk_sms(
    phone_numbers: List[str], 
    message: str, 
    api_key: Optional[str] = None, 
    agent_phone: Optional[str] = None
):
    """Sends bulk SMS, using custom agent credentials or default values."""
    try:
        sms_client = get_sms_service(api_key)
        
        sender = agent_phone if agent_phone else DEFAULT_SENDER_ID
        
        response = sms_client.send(
            message,
            phone_numbers,
            sender_id=sender
        )
        return response

    except Exception as e:
        raise Exception(f"Bulk SMS sending failed: {str(e)}")
TEST_PHONE = "+2349131374059"

def run_tests():
    print("--- Starting Africa's Talking SMS Tests ---")
    
    # -------------------------------------------------------------
    # Test 1: Single SMS
    # -------------------------------------------------------------
    print("\n[Test 1] Testing single SMS...")
    try:
        single_response = send_sms(
            phone_number=TEST_PHONE,
            message="Hello! This is a test single SMS from Africa's Talking backend."
        )
        print("✅ Single SMS Success Response:")
        # Pretty print the dictionary response from the AT SDK
        print(json.dumps(single_response, indent=4))
    except Exception as e:
        print(f"❌ Single SMS Failed: {e}")

    # -------------------------------------------------------------
    # Test 2: Bulk SMS
    # -------------------------------------------------------------
    print("\n[Test 2] Testing bulk SMS...")
    try:
        # Testing bulk by passing a list (even with just one number or multiple)
        bulk_recipients = [TEST_PHONE] 
        
        bulk_response = send_bulk_sms(
            phone_numbers=bulk_recipients,
            message="Hello! This is a bulk SMS test notification."
        )
        print("✅ Bulk SMS Success Response:")
        print(json.dumps(bulk_response, indent=4))
    except Exception as e:
        print(f"❌ Bulk SMS Failed: {e}")

if __name__ == "__main__":
    run_tests()

