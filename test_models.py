import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")
api_key = os.getenv("GROQ_API_KEY")

response = requests.get(
    "https://api.groq.com/openai/v1/models",
    headers={"Authorization": f"Bearer {api_key}"}
)

models = response.json().get("data", [])
vision_models = [m["id"] for m in models if "vision" in m["id"].lower()]
print("Vision models:", vision_models)
