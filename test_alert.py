"""
KisanCore Smart Alert Tester
============================
This script tests the full alert pipeline:
  1. Registers YOUR phone number with the bot
  2. Clears the alert cooldown timer
  3. Posts dry-soil IoT data (soil=15%) to trigger the WhatsApp alert

HOW TO USE:
  1. Make sure your backend server is running:
       cd backend
       python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

  2. Replace YOUR_PHONE below with your real number (e.g. 9876543210)

  3. Run this script:
       python test_alert.py

  4. You should receive a WhatsApp message within a few seconds.
     Also check server logs for:  SMART ALERT SENT to whatsapp:+91XXXXXXXXXX
"""

import requests
import time

# ─── CONFIG ───────────────────────────────────────────────
YOUR_PHONE = "8088677032"   # ← PUT YOUR 10-DIGIT NUMBER HERE
BACKEND    = "http://localhost:8000/api/v1"
# ──────────────────────────────────────────────────────────

from_number = f"whatsapp:+91{YOUR_PHONE.lstrip('91').lstrip('+')}"
print(f"\nUsing phone: {from_number}")
print("=" * 55)

# STEP 1: Register phone by sending STATUS
print("\n[1/3] Registering phone with the bot (STATUS message)...")
r = requests.post(f"{BACKEND}/sms/webhook", data={
    "From": from_number,
    "Body": "STATUS"
}, timeout=10)
print(f"      Webhook response: {r.status_code} {'OK' if r.status_code == 200 else 'FAILED'}")

# STEP 2: Clear alert cooldown (so we don't hit the 1-minute cooldown)
print("\n[2/3] Clearing alert cooldown timer...")
requests.delete(f"{BACKEND}/iot/clear", timeout=5)
time.sleep(0.5)
print("      Done.")

# STEP 3: Post low soil moisture to trigger the alert
print("\n[3/3] Posting dry soil data (soil=15%) to trigger SMART ALERT...")
r2 = requests.post(f"{BACKEND}/iot/data", json={
    "temperature": 32.5,
    "humidity":    45.0,
    "soil_moisture": 15.0     # Below 30 → triggers alert
}, timeout=15)

data = r2.json()
print(f"      IoT response: {data}")

print("\n" + "=" * 55)
if r2.status_code == 200:
    print(f"DRY TEST SUCCESS: Check WhatsApp on +91{YOUR_PHONE}")
    print("Expected: 'Soil moisture is TOO DRY (15.0%)'")
else:
    print("FAILED: IoT endpoint returned an error.")

# ─── BONUS: Test TOO WET alert ────────────────────────────
input("\nPress Enter to now test the TOO WET alert (soil=80%)...")

print("\n[WET] Clearing cooldown and posting wet soil data...")
requests.delete(f"{BACKEND}/iot/clear", timeout=5)
time.sleep(0.3)

r3 = requests.post(f"{BACKEND}/iot/data", json={
    "temperature": 28.0,
    "humidity":    90.0,
    "soil_moisture": 80.0     # Above 70 → triggers wet alert
}, timeout=15)
print(f"      IoT response: {r3.json()}")
print(f"\nWET TEST: Check WhatsApp on +91{YOUR_PHONE}")
print("Expected: 'Soil moisture is TOO WET (80.0%)'")
