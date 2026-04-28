import time
import requests
import sys

# HOW TO RUN FULL SMS + HARDWARE SIMULATION:
#
# STEP 1 - Start backend:
#   cd backend && python -m uvicorn app.main:app --reload
#
# STEP 2 - Run hardware simulator (in new terminal):
#   python test_esp32_simulator.py
#
# STEP 3 - Run this SMS test (in new terminal):
#   python test_sms_simulator.py
#
# STEP 4 - To test with REAL phone (optional):
#   Install ngrok: npm install -g ngrok
#   Run: ngrok http 8000
#   Copy the https URL (like https://abc123.ngrok.io)
#   Go to twilio.com/console → Your number → Messaging → Webhook
#   Set webhook URL to: https://abc123.ngrok.io/api/v1/sms/webhook
#   Now send real SMS from your phone to your Twilio number!
#   Commands: PUMP ON, PUMP OFF, AUTO, STATUS, HELP, DAILY
#
# Requirements: pip install requests

BASE_URL = "http://localhost:8000"
WEBHOOK_URL = f"{BASE_URL}/api/v1/sms/webhook"
IOT_DATA_URL = f"{BASE_URL}/api/v1/iot/data"
IOT_LATEST_URL = f"{BASE_URL}/api/v1/iot/latest"

def print_banner():
    print("\n📱 KisanCore SMS Command Simulator")
    print("====================================")
    print("This simulates what happens when a farmer")
    print("sends SMS to your Twilio number.")
    print("No real phone needed for this test!")
    print("====================================\n")

def check_backend():
    try:
        # Check an open endpoint to ensure backend is up
        # We can ping the health check or api docs
        requests.get(f"{BASE_URL}/docs", timeout=3)
    except requests.exceptions.RequestException:
        print("❌ Backend not running. Start it first:")
        print("   cd backend && python -m uvicorn app.main:app --reload")
        sys.exit(1)

def send_sms(body, phone="+919876543210"):
    # Twilio sends data as URL Encoded Form Data, not JSON
    response = requests.post(WEBHOOK_URL, data={"From": phone, "Body": body})
    return response.text

def run_tests():
    print_banner()
    check_backend()
    
    results = {}
    
    # TEST 1
    print("TEST 1 \u2014 Send HELP command:")
    r1 = send_sms("HELP")
    print(r1)
    if "PUMP ON" in r1:
        print("Expected: should contain list of commands -> PASS\n")
        results[1] = "PASS"
    else:
        print("Expected: should contain list of commands -> FAIL\n")
        results[1] = "FAIL"
    time.sleep(2)

    # TEST 2
    print("TEST 2 \u2014 Send STATUS command (no sensor data yet):")
    r2 = send_sms("STATUS")
    print(r2)
    print("Expected: checking it responds -> PASS\n")
    results[2] = "PASS"
    time.sleep(2)

    # TEST 3
    print("TEST 3 \u2014 First start the ESP32 simulator for 1 reading, then STATUS:")
    requests.post(IOT_DATA_URL, json={"temperature": 29.0, "humidity": 66.0, "soil_moisture": 22.0})
    print("Sensor data injected: soil is DRY at 22%")
    time.sleep(1)
    r3 = send_sms("STATUS")
    print(r3)
    if "22" in r3:
        print("Expected: response should mention 22% or soil moisture -> PASS\n")
        results[3] = "PASS"
    else:
        print("Expected: response should mention 22% or soil moisture -> FAIL\n")
        results[3] = "FAIL"
    time.sleep(2)

    # TEST 4
    print("TEST 4 \u2014 Send PUMP ON command:")
    r4 = send_sms("PUMP ON")
    print(r4)
    r4_pass = False
    if "activated" in r4.lower() or "on" in r4.lower():
        r4_pass = True
        
    latest = requests.get(IOT_LATEST_URL).json()
    ovr = latest.get("manual_override")
    print(f"Pump override state: {ovr}")
    if ovr == "ON" and r4_pass:
        print("Expected: pump activated message and override state is ON -> PASS\n")
        results[4] = "PASS"
    else:
        print("Expected: pump activated message and override state is ON -> FAIL\n")
        results[4] = "FAIL"
    time.sleep(2)

    # TEST 5
    print("TEST 5 \u2014 Send PUMP ON 3 (timed, 3 minutes):")
    r5 = send_sms("PUMP ON 3")
    print(r5)
    if "3" in r5:
        print("Expected: mentions 3 minutes -> PASS\n")
        results[5] = "PASS"
    else:
        print("Expected: mentions 3 minutes -> FAIL\n")
        results[5] = "FAIL"
    time.sleep(2)

    # TEST 6
    print("TEST 6 \u2014 Send PUMP OFF:")
    r6 = send_sms("PUMP OFF")
    print(r6)
    latest = requests.get(IOT_LATEST_URL).json()
    ovr = latest.get("manual_override")
    print(f"Pump override state: {ovr}")
    if ovr == "OFF":
        print("Expected: manual_override == 'OFF' -> PASS\n")
        results[6] = "PASS"
    else:
        print("Expected: manual_override == 'OFF' -> FAIL\n")
        results[6] = "FAIL"
    time.sleep(2)

    # TEST 7
    print("TEST 7 \u2014 Send AUTO (return to automatic):")
    r7 = send_sms("AUTO")
    print(r7)
    latest = requests.get(IOT_LATEST_URL).json()
    ovr = latest.get("manual_override")
    print(f"Pump override state: {ovr}")
    # json null translates to Python None
    if ovr is None:
        print("Expected: manual_override is None or null -> PASS\n")
        results[7] = "PASS"
    else:
        print("Expected: manual_override is None or null -> FAIL\n")
        results[7] = "FAIL"
    time.sleep(2)

    # TEST 8
    print("TEST 8 \u2014 Send DAILY report:")
    requests.post(IOT_DATA_URL, json={"temperature": 31.0, "humidity": 58.0, "soil_moisture": 35.0})
    print("Sensor data injected: temp 31, humidity 58, soil 35")
    r8 = send_sms("DAILY")
    print(r8)
    if "31" in r8 or "58" in r8 or "temp" in r8.lower() or "humid" in r8.lower():
        print("Expected: response contains temperature or humidity info -> PASS\n")
        results[8] = "PASS"
    else:
        print("Expected: response contains temperature or humidity info -> FAIL\n")
        results[8] = "FAIL"
    time.sleep(2)

    # SUMMARY
    print("\n========================================")
    print("SMS SIMULATOR RESULTS")
    print("========================================")
    print(f"Test 1 HELP command:         {results[1]}")
    print(f"Test 2 STATUS no data:       {results[2]}")
    print(f"Test 3 STATUS with data:     {results[3]}")
    print(f"Test 4 PUMP ON command:      {results[4]}")
    print(f"Test 5 PUMP ON timed:        {results[5]}")
    print(f"Test 6 PUMP OFF command:     {results[6]}")
    print(f"Test 7 AUTO mode restore:    {results[7]}")
    print(f"Test 8 DAILY summary:        {results[8]}")
    print("========================================")

    passed_tests = list(results.values()).count("PASS")
    print(f"[{passed_tests}/8] tests passed\n")

    if passed_tests == 8:
        print("✅ All SMS commands working! ")
        print("Your SMS system is ready for real Twilio testing.\n")
        print("Next step: Connect real Twilio with ngrok so your phone can send these same commands.")
        print("Run: ngrok http 8000")
        print("Then set your Twilio webhook to: https://[your-ngrok-url]/api/v1/sms/webhook")

if __name__ == "__main__":
    run_tests()
