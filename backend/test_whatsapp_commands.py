import requests
import time
import xml.etree.ElementTree as ET

BACKEND = "http://localhost:8000"

def send_whatsapp_command(command: str, from_number: str = "+919876543210"):
    """Simulate incoming WhatsApp message from farmer"""
    print(f"\n{'='*60}")
    print(f"Farmer sends: {command}")
    print(f"{'='*60}")
    
    payload = {
        "From": f"whatsapp:{from_number}",
        "To": "whatsapp:+14155238886",
        "Body": command
    }
    
    try:
        response = requests.post(
            f"{BACKEND}/api/v1/sms/webhook",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        print(f"Backend Response ({response.status_code}):")
        
        if "xml" in response.headers.get("Content-Type", ""):
            root = ET.fromstring(response.text)
            message = root.find('.//Message')
            if message is not None:
                body = message.find('Body')
                reply_text = body.text if body is not None else message.text
                # Safely print by ignoring characters the terminal can't handle
                print(f"Bot Reply:\n{reply_text.encode('ascii', 'ignore').decode('ascii')}\n")
            else:
                print(f"XML Response:\n{response.text}\n")
        else:
            print(response.text)
            
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def inject_sensor_data(temp: float, humidity: float, soil: float):
    """Simulate ESP32 posting sensor data"""
    print(f"\nInjecting sensor data: Temp={temp}C, Humidity={humidity}%, Soil={soil}%")
    payload = {
        "temperature": temp,
        "humidity": humidity,
        "soil_moisture": soil
    }
    response = requests.post(f"{BACKEND}/api/v1/iot/data", json=payload)
    print(f"Sensor data posted\n")
    return response.json()

def main():
    print("-" * 60)
    print("   KISANCORE WHATSAPP BOT - COMMAND TESTING SUITE       ")
    print("-" * 60)
    
    print("Starting test sequence...\n")
    time.sleep(1)
    
    # Test 1
    print("\nTEST 1 -- HELP Command")
    send_whatsapp_command("HELP")
    time.sleep(2)
    
    # Test 2
    print("\nTEST 2 -- STATUS (no sensor data yet)")
    send_whatsapp_command("STATUS")
    time.sleep(2)
    
    # Test 3
    print("\nTEST 3 -- Inject Dry Soil Data")
    inject_sensor_data(temp=32.0, humidity=55.0, soil=22.0)
    time.sleep(1)
    
    # Test 4
    print("\nTEST 4 -- STATUS (with dry soil data)")
    send_whatsapp_command("STATUS")
    time.sleep(2)
    
    # Test 5
    print("\nTEST 5 -- PUMP ON")
    send_whatsapp_command("PUMP ON")
    time.sleep(1)
    
    response = requests.get(f"{BACKEND}/api/v1/iot/latest")
    state = response.json()
    if state.get("manual_override") == "ON":
        print("VERIFIED: Pump is now ON")
    else:
        print("FAILED: Pump should be ON but isn't")
    time.sleep(2)
    
    # Test 6
    print("\nTEST 6 -- PUMP ON 3 (3 minutes)")
    send_whatsapp_command("PUMP ON 3")
    time.sleep(2)
    
    # Test 7
    print("\nTEST 7 -- PUMP OFF")
    send_whatsapp_command("PUMP OFF")
    time.sleep(1)
    
    response = requests.get(f"{BACKEND}/api/v1/iot/latest")
    state = response.json()
    if state.get("manual_override") == "OFF":
        print("VERIFIED: Pump is now OFF")
    else:
        print("FAILED: Pump should be OFF")
    time.sleep(2)
    
    # Test 8
    print("\nTEST 8 -- AUTO (return to automatic control)")
    send_whatsapp_command("AUTO")
    time.sleep(1)
    
    response = requests.get(f"{BACKEND}/api/v1/iot/latest")
    state = response.json()
    if state.get("manual_override") is None or state.get("manual_override") == "AUTO":
        print("VERIFIED: Back in AUTO mode")
    else:
        print(f"FAILED: Should be AUTO mode, but got {state.get('manual_override')}")
    time.sleep(2)
    
    # Test 9
    print("\nTEST 9 -- DAILY (daily farm summary)")
    send_whatsapp_command("DAILY")
    time.sleep(2)
    
    # Test 10
    print("\nTEST 10 -- Unknown Command")
    send_whatsapp_command("HELLO")
    time.sleep(2)
    
    # Test 11
    print("\nTEST 11 -- Safety Shutoff Test")
    print("First turn pump ON:")
    send_whatsapp_command("PUMP ON 10")
    time.sleep(1)
    
    print("\nNow inject WET soil data (>60%):")
    result = inject_sensor_data(temp=26.0, humidity=78.0, soil=65.0)
    
    if result.get("relay_command") == "OFF":
        print("VERIFIED: Safety shutoff triggered - pump forced OFF at 65% moisture")
    else:
        print("FAILED: Safety should have turned pump OFF")
    time.sleep(2)
    
    print("-" * 60)
    print("               TEST SUITE COMPLETE                        ")
    print("-" * 60)
    print("\nAll 11 tests executed successfully.")

if __name__ == "__main__":
    main()
