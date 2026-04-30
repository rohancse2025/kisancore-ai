import os
import base64
import requests
from groq import Groq
from dotenv import load_dotenv

load_dotenv('backend/.env')
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# Use a small sample image
img_url = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
response = requests.get(img_url)
base64_image = base64.b64encode(response.content).decode('utf-8')
data_url = f"data:image/png;base64,{base64_image}"

try:
    vision_response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is this?"},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }
        ]
    )
    print("Success with base64:", vision_response.choices[0].message.content)
except Exception as e:
    print("Error with base64:", e)
