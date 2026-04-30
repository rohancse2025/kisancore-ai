"""
Simulates a Twilio WhatsApp webhook call with an image attached.
Run while the uvicorn server is up on port 8000.
"""
import requests

WEBHOOK = "http://localhost:8000/api/v1/sms/webhook"

payload = {
    "From": "whatsapp:+919999999999",
    "Body": "",
    # A public leaf image for testing
    "MediaUrl0": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotham.jpg/800px-Above_Gotham.jpg",
    "MediaContentType0": "image/jpeg",
}

print("Sending simulated image webhook to:", WEBHOOK)
resp = requests.post(WEBHOOK, data=payload, timeout=15)
print("Status:", resp.status_code)
print("Response XML:\n", resp.text)
