from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import bcrypt
from jose import jwt
import datetime
from app.database import get_db, Farmer, FarmerHistory
from sqlalchemy.orm import Session

router = APIRouter()
SECRET_KEY = "kisancore-secret-key-2024"
ALGORITHM = "HS256"

class RegisterRequest(BaseModel):
  name: str
  phone: str
  password: str
  location: str = ""
  farm_size: float = 0.0

class LoginRequest(BaseModel):
  phone: str
  password: str

class UpdateProfileRequest(BaseModel):
  soil_ph: float = 6.5
  nitrogen: float = 50.0
  location: str = ""
  farm_size: float = 0.0

def create_token(phone: str):
  expire = datetime.datetime.utcnow() + datetime.timedelta(days=30)
  return jwt.encode(
    {"sub": phone, "exp": expire}, 
    SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
  existing = db.query(Farmer).filter(Farmer.phone == req.phone).first()
  if existing:
    raise HTTPException(400, detail="Phone already registered")
  hashed_pw = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
  farmer = Farmer(
    name=req.name, phone=req.phone,
    password_hash=hashed_pw,
    location=req.location,
    farm_size=req.farm_size)
  db.add(farmer)
  db.commit()
  db.refresh(farmer)
  return {"token": create_token(req.phone),
    "farmer": {"name": farmer.name,
    "phone": farmer.phone,
    "location": farmer.location}}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == req.phone).first()
  if not farmer:
    raise HTTPException(401, detail="Wrong phone or password")
  
  is_valid = bcrypt.checkpw(req.password.encode('utf-8'), farmer.password_hash.encode('utf-8'))
  if not is_valid:
    raise HTTPException(401, detail="Wrong phone or password")
    
  return {"token": create_token(req.phone),
    "farmer": {"name": farmer.name,
    "phone": farmer.phone,
    "location": farmer.location,
    "soil_ph": farmer.soil_ph,
    "nitrogen": farmer.nitrogen,
    "farm_size": farmer.farm_size}}

@router.get("/profile")
def get_profile(phone: str, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
  if not farmer:
    raise HTTPException(404)
  return farmer

@router.put("/profile")
def update_profile(phone: str, req: UpdateProfileRequest, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
  if not farmer:
    raise HTTPException(404)
  farmer.soil_ph = req.soil_ph
  farmer.nitrogen = req.nitrogen
  farmer.location = req.location
  farmer.farm_size = req.farm_size
  db.commit()
  return {"status": "updated"}

@router.post("/history")
def save_history(farmer_id: int, type: str, data: str, db: Session = Depends(get_db)):
  history = FarmerHistory(farmer_id=farmer_id, type=type, data=data)
  db.add(history)
  db.commit()
  return {"status": "saved"}

@router.get("/history/{farmer_id}")
def get_history(farmer_id: int, db: Session = Depends(get_db)):
  return db.query(FarmerHistory).filter(
    FarmerHistory.farmer_id == farmer_id
  ).order_by(FarmerHistory.created_at.desc()
  ).limit(20).all()
