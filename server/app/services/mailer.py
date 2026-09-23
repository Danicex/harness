import os
import resend
from typing import Union, List, Optional
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY

async def send_mail(
    to: Union[str, List[str]],
    subject: str,
    html: str,
    from_email: str = "Acme <noreply@encheiron.com>",
    api_key: Optional[str] = None,
    agent_email: Optional[str] = None
) -> bool:
    """Sends email via Resend, handling standard delivery or using an agent's custom email as the sender."""
    try:
        # Override the global Resend API key if a custom one is supplied for this specific call
        if api_key:
            resend.api_key = api_key
            
        # If an agent email is provided, it becomes the 'from' address; otherwise, use the default
        sender = agent_email if agent_email else from_email
        
        # Convert single recipient email string to a list
        if isinstance(to, str):
            to = [to]
            
        # Prepare email parameters dictionary
        params = {
            "from": sender,
            "to": to,
            "subject": subject,
            "html": html,
        }
        
        # Send email via Resend SDK
        response = resend.Emails.send(params)
        
        # Check if email was sent successfully (handles dict or object responses safely)
        if response and (hasattr(response, 'id') or (isinstance(response, dict) and 'id' in response)):
            return True
        return False
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
