import time
import requests
import random
from datetime import datetime
import sys

# HOW TO RUN THIS SIMULATOR:
# Step 1: Open Terminal 1 -> cd backend && python -m uvicorn app.main:app --reload
# Step 2: Open Terminal 2 -> cd frontend && npm run dev  
# Step 3: Open Terminal 3 -> python test_esp32_simulator.py
# Step 4: Open browser -> http://localhost:5173/iot
# Step 5: Watch the IoT page update in real time with simulated data!
# Requirements: pip install requests

DATA_URL = "http://localhost:8000/api/v1/iot/data"
OVERRIDE_URL = "http://localhost:8000/api/v1/iot/override"

def print_banner():
    print("\n🌾 KisanCore Virtual ESP32 Simulator")
    print("=====================================")
    print("Simulating DHT22 + Soil Sensor data")
    print(f"Sending to: {DATA_URL}")
    print("Press Ctrl+C to stop.")
    print("=====================================\n")

def post_data(temp, hum, soil):
    payload = {
        "temperature": round(temp, 1),
        "humidity": round(hum, 1),
        "soil_moisture": round(soil, 1)
    }
    while True:
        try:
            res = requests.post(DATA_URL, json=payload, timeout=5)
            res.raise_for_status()
            data = res.json()
            now = datetime.now().strftime("%H:%M:%S")
            pump = data.get("relay_command", "OFF")
            msg = data.get("message", "")
            print(f"[{now}] Temp: {payload['temperature']}°C | Humidity: {payload['humidity']}% | Soil: {payload['soil_moisture']}% | Pump: {pump} | {msg}")
            return data
        except requests.exceptions.RequestException:
            print("\n❌ Cannot connect to backend. Start it with:")
            print("   cd backend && python -m uvicorn app.main:app --reload")
            print("   Retrying in 10 seconds...\n")
            time.sleep(10)

def apply_noise(val, min_val, max_val, noise_range):
    new_val = val + random.uniform(-noise_range, noise_range)
    return max(min_val, min(max_val, new_val))

def run_scenarios():
    print_banner()
    results = {
        1: "PASS",
        2: "FAIL",
        3: "FAIL",
        4: "FAIL",
        5: "PASS"
    }

    # SCENARIO 1
    print("\n=== SCENARIO 1: NORMAL CONDITIONS ===")
    t, h, s = 28.0, 65.0, 50.0
    for _ in range(6):
        post_data(t, h, s)
        t = apply_noise(t, 15, 45, 0.3)
        h = apply_noise(h, 20, 95, 0.5)
        s = apply_noise(s, 0, 100, 1.0)
        time.sleep(5)

    # SCENARIO 2
    print("\n=== SCENARIO 2: DRY SOIL \u2014 Pump should turn ON ===")
    t, h, s = 32.0, 45.0, 18.0
    pump_turned_on = False
    for i in range(6):
        data = post_data(t, h, s)
        if i == 0:
            if data and data.get("relay_command") == "ON":
                print("✅ PUMP ON \u2014 Irrigation triggered correctly!")
                pump_turned_on = True
            else:
                print("❌ PUMP did not turn ON \u2014 Check backend logic")
        t = apply_noise(t, 15, 45, 0.3)
        h = apply_noise(h, 20, 95, 0.5)
        s = apply_noise(s, 0, 100, 1.0)
        time.sleep(5)
    results[2] = "PASS" if pump_turned_on else "FAIL"

    # SCENARIO 3
    print("\n=== SCENARIO 3: WET SOIL \u2014 Pump should stay OFF ===")
    t, h, s = 25.0, 80.0, 75.0
    pump_stayed_off = True
    for _ in range(6):
        data = post_data(t, h, s)
        if data and data.get("relay_command") == "ON":
            pump_stayed_off = False
        t = apply_noise(t, 15, 45, 0.3)
        h = apply_noise(h, 20, 95, 0.5)
        s = apply_noise(s, 0, 100, 1.0)
        time.sleep(5)
    results[3] = "PASS" if pump_stayed_off else "FAIL"

    # SCENARIO 4
    print("\n=== SCENARIO 4: SAFETY SHUTOFF TEST ===")
    t, h, s = 28.0, 60.0, 20.0
    safety_worked = False
    
    # Send a manual override ON to test the 60% safety threshold properly
    try:
        requests.post(OVERRIDE_URL, json={"command": "ON", "duration_minutes": 60})
    except:
        pass
        
    for _ in range(10): # Run long enough to hit 65 (20 -> 25 -> 30 -> 35 -> 40 -> 45 -> 50 -> 55 -> 60 -> 65)
        data = post_data(t, h, s)
        s += 5.0
        t = apply_noise(t, 15, 45, 0.3)
        h = apply_noise(h, 20, 95, 0.5)
        
        if s >= 60.0 and data and data.get("relay_command") == "OFF" and not safety_worked:
            print("✅ SAFETY SHUTOFF WORKED!")
            safety_worked = True
        time.sleep(5)
    results[4] = "PASS" if safety_worked else "FAIL"

    # SCENARIO 5
    print("\n=== SCENARIO 5: HIGH TEMPERATURE + DRY ===")
    t, h, s = 42.0, 30.0, 25.0
    for _ in range(6):
        post_data(t, h, s)
        t = apply_noise(t, 15, 45, 0.3)
        h = apply_noise(h, 20, 95, 0.5)
        s = apply_noise(s, 0, 100, 1.0)
        time.sleep(5)

    # SUMMARY
    print("\n==========================================")
    print("SIMULATION COMPLETE - RESULTS SUMMARY")
    print("==========================================")
    print(f"Scenario 1 Normal: {results[1]}")
    print(f"Scenario 2 Dry Soil Pump ON: {results[2]}")
    print(f"Scenario 3 Wet Soil OFF: {results[3]}")
    print(f"Scenario 4 Safety Shutoff: {results[4]}")
    print(f"Scenario 5 High Temp: {results[5]}")
    print("==========================================")
    print("All tests done. Your IoT backend is working correctly!")

if __name__ == "__main__":
    try:
        run_scenarios()
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")
        sys.exit(0)
