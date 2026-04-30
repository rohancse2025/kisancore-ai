import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv("backend/.env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    vision_response = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
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
except Exception as e:
    print("Error:", e)
