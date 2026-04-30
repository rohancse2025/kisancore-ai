import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv("backend/.env")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    vision_response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct", # latest vision model
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is in this image?"},
                    {"type": "image_url", "image_url": {"url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"}}
                ]
            }
        ]
    )
    print("Success 90b:", vision_response.choices[0].message.content)
except Exception as e:
    print("Error 90b:", e)

try:
    vision_response = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview", # try this second
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is in this image?"},
                    {"type": "image_url", "image_url": {"url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"}}
                ]
            }
        ]
    )
    print("Success 11b:", vision_response.choices[0].message.content)
except Exception as e:
    print("Error 11b:", e)
    
try:
    vision_response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct", # try this third
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is in this image?"},
                    {"type": "image_url", "image_url": {"url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"}}
                ]
            }
        ]
    )
    print("Success 4-scout:", vision_response.choices[0].message.content)
except Exception as e:
    print("Error 4-scout:", e)
