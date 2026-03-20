from fastapi import APIRouter

from app.api.routes import health, sensor, crop, irrigation

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"], prefix="/health")
api_router.include_router(sensor.router, tags=["sensor"], prefix="/sensor-data")
api_router.include_router(crop.router, tags=["crop"], prefix="/recommend-crop")
api_router.include_router(irrigation.router, tags=["irrigation"], prefix="/irrigation-suggestion")
