"""
Test the full smart alert flow:
1. Register farmer phone by simulating a WhatsApp STATUS message
2. POST low soil moisture IoT data to trigger the smart alert
3. Check server logs to confirm alert was sent
"""
import requests
import time

BASE = "http://localhost:8000/api/v1"
FARMER_PHONE = "whatsapp:+919999999999"  # Change to your real number if testing

print("=" * 50)
print("STEP 1: Register farmer phone via WhatsApp webhook")
print("=" * 50)
r = requests.post(f"{BASE}/sms/webhook", data={
    "From": FARMER_PHONE,
    "Body": "STATUS"
}, timeout=10)
print(f"Webhook status: {r.status_code}")
print(f"TwiML response:\n{r.text}\n")

print("=" * 50)
print("STEP 2: Check registered phone via /sms/status")
print("=" * 50)
r2 = requests.get(f"{BASE}/sms/status", timeout=10)
print(r2.json())

print("\n" + "=" * 50)
print("STEP 3: POST low-moisture IoT data (soil=15%) to trigger SMART ALERT")
print("NOTE: The alert WhatsApp message will be sent to your registered phone")
print("=" * 50)
# Reset last_alert_time first by clearing
requests.delete(f"{BASE}/iot/clear", timeout=5)
time.sleep(0.5)

r3 = requests.post(f"{BASE}/iot/data", json={
    "temperature": 32.5,
    "humidity": 45.0,
    "soil_moisture": 15.0  # Below 30 — should trigger alert
}, timeout=15)
print(f"IoT response: {r3.json()}")
print("\nCheck your WhatsApp — you should receive the SMART ALERT now!")
