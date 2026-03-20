import random
from fastapi import APIRouter

router = APIRouter()

@router.get("")
def get_sensor_data():
    return {
        "temperature": random.randint(20, 40),
        "humidity": random.randint(40, 90),
        "soil_moisture": random.randint(10, 80),
    }
