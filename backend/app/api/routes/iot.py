from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter()

# --- MODELS ---
class IOTData(BaseModel):
    temperature: float
    humidity: float

# --- IN-MEMORY STORAGE ---
latest_reading = {
    "temperature": None,
    "humidity": None,
    "timestamp": None
}

# --- ROUTES ---

@router.post("/data")
async def post_iot_data(data: IOTData):
    global latest_reading
    # Get current time formatted as "10:30 AM"
    now = datetime.now()
    formatted_time = now.strftime("%I:%M %p")
    
    # Update latest reading
    latest_reading.update({
        "temperature": data.temperature,
        "humidity": data.humidity,
        "timestamp": formatted_time
    })
    
    return {
        "status": "ok", 
        "message": "Data received"
    }

@router.get("/latest")
async def get_latest_data():
    return latest_reading
