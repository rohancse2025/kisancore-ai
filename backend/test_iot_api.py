import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1/iot"

def test_post_data(temp, hum):
    print(f"\n--- Testing POST /data (Temp: {temp}, Hum: {hum}) ---")
    payload = {
        "temperature": temp,
        "humidity": hum
    }
    try:
        response = requests.post(f"{BASE_URL}/data", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_get_latest():
    print("\n--- Testing GET /latest ---")
    try:
        response = requests.get(f"{BASE_URL}/latest")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Ensure your backend is running on http://localhost:8000")
    
    # 1. Test initial state
    test_get_latest()
    
    # 2. Test sensor data POST
    test_post_data(28.5, 65.2)
    
    # 3. Test get latest after update
    test_get_latest()
