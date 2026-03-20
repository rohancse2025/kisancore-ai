from fastapi import APIRouter

router = APIRouter()

@router.get("")
def irrigation_suggestion(soil_moisture: float):
    if soil_moisture < 30.0:
        return {"status": "ON", "message": "Irrigation ON"}
    elif soil_moisture <= 60.0:
        return {"status": "MODERATE", "message": "Moderate irrigation"}
    else:
        return {"status": "OFF", "message": "No irrigation needed"}
