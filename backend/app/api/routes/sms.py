from fastapi import APIRouter, Form
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

FAST2SMS_KEY = os.getenv("FAST2SMS_API_KEY", "")

class SMSRequest(BaseModel):
  to_phone: str
  message_type: str
  data: dict

def send_sms_fast2sms(phone: str, message: str):
  if not FAST2SMS_KEY:
    return False, "Fast2SMS key not configured"
  try:
    clean_phone = phone.replace("+91", "").strip()
    url = "https://www.fast2sms.com/dev/bulkV2"
    payload = {
      "route": "q",
      "message": message,
      "language": "english",
      "flash": 0,
      "numbers": clean_phone,
    }
    headers = {
      "authorization": FAST2SMS_KEY,
      "Content-Type": "application/json"
    }
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    result = response.json()
    print(f"Fast2SMS Response: {result}")
    
    if result.get("return") is True:
        return True, "Sent"
    else:
        # result.get("message") is often a list
        msg = result.get("message", "Unknown error")
        if isinstance(msg, list): msg = msg[0]
        return False, msg
  except Exception as e:
    print(f"Fast2SMS Exception: {e}")
    return False, str(e)

def send_sms(to: str, message: str):
  success, _ = send_sms_fast2sms(to, message)
  return success

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

    # Return TwiML XML response manually to avoid Twilio dependency
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_msg}</Message>
</Response>"""
    
    return Response(content=xml_response, media_type="application/xml")

@router.get("/test")
def test_sms(phone: str):
    success, detail = send_sms_fast2sms(phone, "KisanCore: This is a test message from your new Fast2SMS integration. It's working! 🌾")
    if success:
        return {"status": "success", "message": f"Test SMS sent to {phone}", "details": detail}
    else:
        return {"status": "error", "message": "Failed to send test SMS.", "reason": detail}
