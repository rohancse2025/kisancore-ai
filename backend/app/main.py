from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.settings import settings


app = FastAPI(title=settings.app_name)

cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
# Always allow "null" origin so standalone file:// HTML pages can reach the API
if "null" not in cors_origins:
    cors_origins.append("null")
if cors_origins:
    _allow_origins = ["*"] if "*" in cors_origins else cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allow_origins,
        # Credentials cannot be used with wildcard; disable only in that case
        allow_credentials=_allow_origins != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.api_v1_prefix)
from app.database import Base, engine

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)



@app.get("/")
def root():
    return {"message": "KisanCore API is Live!", "version": "V2.2"}

@app.post("/api/v1/iot/data")
@app.post("/api/v1/iot/")
async def iot_fallback(data: dict):
    from app.api.routes.iot import latest_reading
    import time
    from datetime import datetime
    
    now = datetime.now()
    formatted_time = now.strftime("%I:%M %p")
    
    # Update state
    temp = data.get("temperature", 0)
    hum = data.get("humidity", 0)
    soil = data.get("soil_moisture", 0)
    
    latest_reading.update({
        "temperature": temp,
        "humidity": hum,
        "soil_moisture": soil,
        "timestamp": formatted_time,
        "unix_timestamp": int(time.time() * 1000)
    })
    
    # Calculate command
    override = latest_reading.get("manual_override")
    irrigation_needed = False
    
    if override == "ON":
        irrigation_needed = True
    elif override == "OFF":
        irrigation_needed = False
    else:
        irrigation_needed = soil < 30 # Simple auto logic for fallback
        
    return {
        "status": "ok", 
        "source": "fallback",
        "relay_command": "ON" if irrigation_needed else "OFF"
    }

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}

