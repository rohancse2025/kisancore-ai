from fastapi import APIRouter, Form, Request
from pydantic import BaseModel
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_PHONE = os.getenv("TWILIO_PHONE")

class SMSRequest(BaseModel):
  to_phone: str
  message_type: str
  data: dict

def send_sms(to: str, message: str):
  try:
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    client.messages.create(
      body=message, from_=FROM_PHONE, to=to)
    return True
  except Exception as e:
    print(f"SMS Error: {e}")
    return False

@router.post("/send")
def send_alert(req: SMSRequest):
  msg = ""
  
  if req.message_type == "irrigation":
    soil = req.data.get("soil_moisture", 0)
    temp = req.data.get("temperature", 0)
    if soil < 30:
      msg = (f"KisanCore ALERT: Your farm soil "
        f"moisture is {soil}% - Too DRY! "
        f"Please irrigate crops immediately. "
        f"Temp: {temp}C. -KisanCore AI")
    elif soil > 70:
      msg = (f"KisanCore ALERT: Soil moisture "
        f"is {soil}% - Too WET! "
        f"Stop irrigation, check drainage. "
        f"-KisanCore AI")
    else:
      msg = (f"KisanCore: Farm update - "
        f"Soil moisture {soil}%, Temp {temp}C. "
        f"Conditions are optimal today. "
        f"-KisanCore AI")
        
  elif req.message_type == "crop":
    crop = req.data.get("crop", "Unknown")
    confidence = req.data.get("confidence", 0)
    msg = (f"KisanCore Crop Advice: Based on "
      f"your soil data, best crop to grow is "
      f"{crop} ({confidence}% match). "
      f"Visit app for full details. "
      f"-KisanCore AI")
      
  elif req.message_type == "market":
    commodity = req.data.get("commodity", "")
    price = req.data.get("price", 0)
    trend = req.data.get("trend", "stable")
    msg = (f"KisanCore Market: {commodity} "
      f"price today Rs.{price}/quintal "
      f"({trend}). Check market page for "
      f"all mandi prices. -KisanCore AI")
      
  elif req.message_type == "weather":
    temp = req.data.get("temperature", 0)
    condition = req.data.get("condition", "")
    tip = req.data.get("tip", "")
    msg = (f"KisanCore Weather: Today {temp}C "
      f"{condition}. Tip: {tip} "
      f"-KisanCore AI")
      
  elif req.message_type == "disease":
    disease = req.data.get("disease", "")
    treatment = req.data.get("treatment", "")
    msg = (f"KisanCore Disease Alert: "
      f"{disease} detected on your crop. "
      f"Treatment: {treatment} "
      f"-KisanCore AI")

  if not msg:
    return {"status": "error", 
      "message": "Unknown message type"}
    
  success = send_sms(req.to_phone, msg)
  return {"status": "sent" if success 
    else "failed"}

@router.post("/daily-summary")
def daily_summary(phone: str, 
  temperature: float, humidity: float,
  soil_moisture: float, top_crop: str):
  msg = (
    f"KisanCore Daily Summary:\n"
    f"Farm: Temp {temperature}C, "
    f"Humidity {humidity}%\n"
    f"Soil: {soil_moisture}% moisture\n"
    f"Best crop: {top_crop}\n"
    f"Irrigation: "
    f"{'ON - Irrigate now' if soil_moisture < 30 else 'OFF - OK'}\n"
    f"-KisanCore AI")
  success = send_sms(phone, msg)
  return {"status": "sent" if success else "failed"}

@router.post("/webhook")
async def handle_incoming_sms(From: str = Form(...), Body: str = Form(...)):
    # Import iot dynamically to avoid circular imports
    import app.api.routes.iot as iot
    import time
    from fastapi.responses import Response
    
    text = Body.strip().upper()
    response_msg = ""
    
    if text.startswith("PUMP ON"):
        duration = 60
        parts = text.split()
        if len(parts) > 2 and parts[2].isdigit():
            duration = int(parts[2])
            
        iot.latest_reading["manual_override"] = "ON"
        iot.latest_reading["override_expiry_time"] = time.time() + (duration * 60)
        response_msg = f"KisanCore: Pump activated manually for {duration} mins."
        
    elif text == "PUMP OFF":
        iot.latest_reading["manual_override"] = "OFF"
        iot.latest_reading["override_expiry_time"] = time.time() + 86400
        response_msg = "KisanCore: Pump turned OFF manually."
        
    elif text == "AUTO":
        iot.latest_reading["manual_override"] = None
        iot.latest_reading["override_expiry_time"] = 0
        response_msg = "KisanCore: Pump restored to Autonomous AI Mode."
        
    elif text == "STATUS":
        temp = iot.latest_reading.get("temperature", "--")
        hum = iot.latest_reading.get("humidity", "--")
        soil = iot.latest_reading.get("soil_moisture", "--")
        mode = iot.latest_reading.get("manual_override", "AUTO")
        if mode is None: mode = "AUTO"
        response_msg = f"Farm Status: Temp {temp}C, Air Humidity {hum}%, Soil Moisture {soil}%. Mode: {mode}. -KisanCore AI"
        
    else:
        response_msg = "Command not recognized. Valid commands: PUMP ON [mins], PUMP OFF, AUTO, STATUS."

    # Return Twilio TwiML XML response natively
    twiml = MessagingResponse()
    twiml.message(response_msg)
    
    return Response(content=str(twiml), media_type="application/xml")
