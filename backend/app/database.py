from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./kisancore.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Farmer(Base):
  __tablename__ = "farmers"
  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, nullable=False)
  phone = Column(String, unique=True, index=True)
  password_hash = Column(String, nullable=False)
  location = Column(String, default="")
  farm_size = Column(Float, default=0.0)
  soil_ph = Column(Float, default=6.5)
  nitrogen = Column(Float, default=50.0)
  created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FarmerHistory(Base):
  __tablename__ = "farmer_history"
  id = Column(Integer, primary_key=True)
  farmer_id = Column(Integer)
  type = Column(String)  
  data = Column(Text)
  created_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
