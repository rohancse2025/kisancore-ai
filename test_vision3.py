import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv("backend/.env")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    vision_response = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview", # Try llama-3.2-11b-vision
        messages=[]
    )
except Exception as e:
    pass

models_to_try = ["llama-3.2-11b-vision", "llama-3.2-90b-vision"]

for model in models_to_try:
    print(f"Trying {model}...")
    try:
        vision_response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "What is in this image?"},
                        {"type": "image_url", "image_url": {"url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg"}}
                    ]
                }
            ]
        )
        print("Success:", vision_response.choices[0].message.content)
        break
    except Exception as e:
        print("Error:", e)
