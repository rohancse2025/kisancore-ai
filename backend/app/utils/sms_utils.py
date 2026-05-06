import os
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

def send_sms_twilio(phone: str, message: str) -> tuple[bool, str]:
  account_sid = os.getenv("TWILIO_ACCOUNT_SID")
  auth_token = os.getenv("TWILIO_AUTH_TOKEN")
  from_number = os.getenv("TWILIO_SMS_FROM")
  
  if not account_sid or not auth_token or not from_number:
    return False, "Twilio credentials not configured in .env"
  
  # Normalize Indian phone number
  clean = phone.replace("+", "").replace(" ", "").replace("-", "").replace("whatsapp:", "")
  if clean.startswith("91") and len(clean) == 12:
    clean = clean  
  elif len(clean) == 10:
    clean = "91" + clean
  to_number = "+" + clean
  
  try:
    client = Client(account_sid, auth_token)
    msg = client.messages.create(body=message, from_=from_number, to=to_number)
    return True, f"Sent: {msg.sid}"
  except TwilioRestException as e:
    if "unverified" in str(e).lower():
      return False, "Phone not verified in Twilio trial. Add it at twilio.com/console"
    return False, str(e)
  except Exception as e:
    return False, str(e)

def send_whatsapp_message(to: str, message: str) -> bool:
  account_sid = os.getenv("TWILIO_ACCOUNT_SID")
  auth_token = os.getenv("TWILIO_AUTH_TOKEN")
  from_whatsapp = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
  
  if not account_sid or not auth_token:
    return False
  
  # Normalize phone
  clean = to.replace("+", "").replace(" ", "").replace("-", "").replace("whatsapp:", "")
  if clean.startswith("91") and len(clean) == 12:
    clean = clean
  elif len(clean) == 10:
    clean = "91" + clean
  to_whatsapp = "whatsapp:+" + clean
  try:
      if not account_sid or not auth_token:
          logger.error("❌ TWILIO ERROR: ACCOUNT_SID or AUTH_TOKEN is missing in .env")
          return False

      client = Client(account_sid, auth_token)
      
      # Log attempt
      logger.info(f"📤 Attempting WhatsApp to {to} from {from_whatsapp}...")
      
      message_obj = client.messages.create(body=message, from_=from_whatsapp, to=to)
      
      logger.info(f"✅ SUCCESS: WhatsApp Message SID: {message_obj.sid}")
      return True
  except Exception as e:
      logger.error(f"❌ TWILIO FAILED for {to}: {str(e)}")
      # Specific help for common errors
      if "21608" in str(e):
          logger.error("👉 FIX: This phone number has not 'Joined' the Twilio Sandbox. Send 'join tent-with' from your phone.")
      elif "Authenticate" in str(e) or "401" in str(e):
          logger.error("👉 FIX: Your TWILIO_ACCOUNT_SID or AUTH_TOKEN is incorrect in .env.")
      return False
