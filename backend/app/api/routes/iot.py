from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter()

# --- MODELS ---
class IOTData(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float

import time

# --- IN-MEMORY STORAGE & PERSISTENCE ---
DATA_FILE = "latest_reading.json"

latest_reading = {
    "temperature": 0.0,
    "humidity": 0.0,
    "soil_moisture": 0.0,
    "irrigation_needed": False,
    "suggestion": "No data",
    "timestamp": "Never",
    "unix_timestamp": 0,
    "manual_override": None, # "ON", "OFF", or None
    "override_expiry_time": 0,
    "farmer_phones": [], # List of whatsapp: numbers
    "last_alert_time": 0
}

def save_persistence():
    try:
        import json
        with open(DATA_FILE, "w") as f:
            json.dump(latest_reading, f)
    except Exception as e:
        print(f"Error saving persistence: {e}")

def load_persistence():
    global latest_reading
    try:
        import json
        import os
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r") as f:
                saved_data = json.load(f)
                latest_reading.update(saved_data)
                print("Persistence loaded successfully.")
    except Exception as e:
        print(f"Error loading persistence: {e}")

# Load data on startup
load_persistence()

def broadcast_whatsapp(message: str):
    """Send a message to all registered farmers and the environment fallback phone."""
    import os
    from app.utils.sms_utils import send_whatsapp_message
    
    # 1. Collect all targets (List + Env Fallback)
    targets = set(latest_reading.get("farmer_phones", []))
    env_phone = os.getenv("FARMER_PHONE")
    if env_phone:
        if not env_phone.startswith("whatsapp:"):
            # Normalize env phone
            clean = "".join(filter(str.isdigit, env_phone))
            if len(clean) == 10: clean = "91" + clean
            env_phone = f"whatsapp:+{clean}"
        targets.add(env_phone)
    
    # 2. Send to everyone
    for phone in targets:
        if phone:
            send_whatsapp_message(phone, message)

# --- ROUTES ---

@router.get("/test")
def test_iot():
    return {"status": "iot_router_active"}

@router.post("/data")
@router.post("/")  # Alternative to handle /api/v1/iot/
async def post_iot_data(data: IOTData):
    print(f"IOT DEBUG: Received data -> Temp: {data.temperature}, Hum: {data.humidity}, Soil: {data.soil_moisture}")
    global latest_reading
    # Get current time in IST (UTC+5:30)
    from datetime import timezone, timedelta
    ist_offset = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist_offset)
    formatted_time = now.strftime("%I:%M %p")
    
    # --- MANUAL OVERRIDE AND SAFETY CHECK LOGIC ---
    # 1. Check if an override is active and expired
    if latest_reading["manual_override"] is not None:
        if time.time() > latest_reading["override_expiry_time"]:
            latest_reading["manual_override"] = None
            message = "Override timer completed. Switched to Auto Mode."
            # Timer expiry notification
            timer_msg = (
                f"KisanCore: Your pump timer has ended. "
                f"Pump is now in AUTO mode. "
                f"Send STATUS to check soil moisture. -KisanCore AI"
            )
            phone_to_alert = latest_reading.get("farmer_phones")
            broadcast_whatsapp(timer_msg)
            
    # 2. Safety Autoshutoff (if moisture >= 60% and we are manually pumping)
    if data.soil_moisture >= 60 and latest_reading["manual_override"] == "ON":
        latest_reading["manual_override"] = None
        irrigation_needed = False
        message = f"SAFETY TRIGGER: Moisture reached {data.soil_moisture}%. Pumping automatically turned OFF to prevent waterlogging."
        # Safety SMS notification
        safety_msg = (
            f"KisanCore SAFETY: Pump auto-OFF. "
            f"Soil moisture reached {data.soil_moisture}% — waterlogging prevented. "
            f"Send STATUS to check farm. -KisanCore AI"
        )
        broadcast_whatsapp(safety_msg)
    
    # 3. Apply Override OR Fallback to Auto
    if latest_reading["manual_override"] == "ON":
        irrigation_needed = True
        message = "Manual Override: Pump is ON."
    elif latest_reading["manual_override"] == "OFF":
        irrigation_needed = False
        message = "Manual Override: Pump is OFF."
    else:
        # Standard Autonomous logic
        if data.soil_moisture < 30:
            irrigation_needed = True
            message = "Irrigation needed. Soil is dry."
        elif 30 <= data.soil_moisture <= 60:
            irrigation_needed = False
            message = "Soil moisture is optimal."
        else:
            irrigation_needed = False
            message = "Soil is wet enough. No irrigation needed."

    # Update latest reading
    latest_reading.update({
        "temperature": data.temperature,
        "humidity": data.humidity,
        "soil_moisture": data.soil_moisture,
        "irrigation_needed": irrigation_needed,
        "suggestion": message,
        "timestamp": formatted_time,
        "unix_timestamp": int(time.time() * 1000)
    })
    save_persistence()
    
    # --- FEATURE 1: SMART ALERTS ---
    # Cooldown check (set to 5 minutes as requested)
    alert_cooldown_ok = (time.time() - latest_reading["last_alert_time"]) > 300 

    if alert_cooldown_ok and data.soil_moisture < 30:
        latest_reading["last_alert_time"] = time.time()
        
        # Always ask for permission/confirmation as requested, regardless of mode
        alert_msg = (
            f"KisanCore SMART ALERT:\n"
            f"Soil moisture is TOO DRY ({data.soil_moisture}%).\n"
            f"Your crops may need water. Should I turn on the pump?\n"
            f"Reply 'PUMP ON 30' to water for 30 mins."
        )
        broadcast_whatsapp(alert_msg)
        print(f"SMART ALERT [DRY] BROADCAST SENT | Moisture: {data.soil_moisture}%")

    elif alert_cooldown_ok and data.soil_moisture > 70:
        latest_reading["last_alert_time"] = time.time()
        alert_msg = (
            f"KisanCore SMART ALERT:\n"
            f"Soil moisture is TOO WET ({data.soil_moisture}%).\n"
            f"Stop irrigation and check drainage to prevent waterlogging.\n"
            f"Reply 'PUMP OFF' to stop the pump."
        )
        broadcast_whatsapp(alert_msg)
        print(f"SMART ALERT [WET] BROADCAST SENT | Moisture: {data.soil_moisture}%")

    return {
        "status": "ok", 
        "relay_command": "ON" if irrigation_needed else "OFF",
        "irrigation_needed": irrigation_needed,
        "message": message
    }

class OverrideRequest(BaseModel):
    command: str  # "ON", "OFF"
    duration_minutes: Optional[int] = 60

@router.post("/override")
async def set_override(req: OverrideRequest):
    global latest_reading
    if req.command not in ["ON", "OFF"]:
        return {"status": "error", "message": "Invalid command"}
    
    latest_reading["manual_override"] = req.command
    # Give a default safe 60 min expiration for manual commands, unless overwritten 
    if req.command == "ON":
        latest_reading["override_expiry_time"] = time.time() + (req.duration_minutes * 60)
    else:
        latest_reading["override_expiry_time"] = time.time() + 86400  # Stays theoretically off for longer unless cleared
    
    save_persistence()
    return {"status": "ok", "message": f"Pump overridden to {req.command}"}

@router.delete("/override")
async def clear_override():
    global latest_reading
    latest_reading["manual_override"] = None
    latest_reading["override_expiry_time"] = 0
    return {"status": "ok", "message": "Override cleared. Switched to Auto Mode."}

@router.get("/latest")
async def get_latest_data():
    # Check for timer expiry even on GET requests for better responsiveness
    if latest_reading["manual_override"] is not None:
        if time.time() > latest_reading["override_expiry_time"]:
            latest_reading["manual_override"] = None
            save_persistence()
            
    return latest_reading

@router.get("/test-alert")
async def test_alert():
    msg = "KisanCore Test: Your WhatsApp Alert System is working! 🚀🌾"
    broadcast_whatsapp(msg)
    return {"status": "test_triggered", "targets": list(set(latest_reading.get("farmer_phones", [])))}

@router.delete("/clear")
async def clear_iot_data():
    global latest_reading
    latest_reading.update({
        "temperature": 0.0,
        "humidity": 0.0,
        "soil_moisture": 0.0,
        "irrigation_needed": False,
        "suggestion": "No data",
        "timestamp": "Never",
        "unix_timestamp": 0,
        "last_alert_time": 0
    })
    return {"status": "cleared"}
