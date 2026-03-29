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

# --- IN-MEMORY STORAGE ---
latest_reading = {
    "temperature": 0.0,
    "humidity": 0.0,
    "soil_moisture": 0.0,
    "irrigation_needed": False,
    "suggestion": "No data",
    "timestamp": "Never"
}

# --- ROUTES ---

@router.post("/data")
async def post_iot_data(data: IOTData):
    global latest_reading
    # Get current time formatted as "10:30 AM"
    now = datetime.now()
    formatted_time = now.strftime("%I:%M %p")
    
    # Irrigation Logic
    irrigation_needed = False
    message = "No data"

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
        "timestamp": formatted_time
    })
    
    return {
        "status": "ok", 
        "irrigation_needed": irrigation_needed,
        "message": message
    }

@router.get("/latest")
async def get_latest_data():
    return latest_reading
