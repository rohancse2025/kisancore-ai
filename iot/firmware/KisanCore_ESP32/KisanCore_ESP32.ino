/**
 * KisanCore IoT — ESP32 Firmware (FINAL FIX)
 */

#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> 

// ===== USER CONFIGURATION =====
const char *WIFI_SSID = "Redmi 10A";      
const char *WIFI_PASSWORD = "Rohan1234";
const char *SERVER_IP = "kisancore-ai-1.onrender.com"; 
const int SERVER_PORT = 443;                           
const int READ_INTERVAL = 5000;   // SET TO 5 SECONDS FOR FAST TESTING
const int SOIL_DRY_THRESHOLD = 30; 
const int SOIL_WET_THRESHOLD = 60; 
// ==============================

#define DHT_PIN 4
#define SOIL_PIN 34
#define RELAY_PIN 27
#define LED_PIN 2
#define DHTTYPE DHT22

DHT dht(DHT_PIN, DHTTYPE);
unsigned long lastReadTime = 0;
unsigned long readingCount = 0;
bool relayState = LOW; // Software state
float lastTemp = 0;
float lastHum = 0;
float lastSoil = 0;
unsigned long lastLEDBlink = 0;
bool ledState = LOW;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Active-Low: HIGH = OFF
  pinMode(LED_PIN, OUTPUT);

  dht.begin();
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("   KisanCore IoT System Starting   ");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  handleStatusLED();
  if (millis() - lastReadTime >= READ_INTERVAL || lastReadTime == 0) {
    lastReadTime = millis();
    readingCount++;
    performCycle();
  }
}

void performCycle() {
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.printf("KisanCore IoT — Sensor Reading #%lu\n", readingCount);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  readSensors();
  String relayCommand = postToBackend();
  controlRelay(relayCommand);
  safetyCheck();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi: Connected (RSSI: %d dBm)\n", WiFi.RSSI());
  } else {
    Serial.println("WiFi: DISCONNECTED");
  }
  Serial.printf("Temp: %.1f°C | Hum: %.1f%% | Soil: %.1f%%\n", lastTemp, lastHum, lastSoil);
  Serial.printf("Relay State: %s\n", (relayState == HIGH) ? "ON" : "OFF");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

void connectWiFi() {
  Serial.println("\n--- WiFi Reconnect Attempt ---");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Prevents WiFi from going to sleep (fixes some disconnect issues)
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 30) {
    delay(1000);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED while connecting
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.printf("\n❌ WiFi Failed (Status: %d). Retrying in 5s...\n", WiFi.status());
    delay(5000); // Wait 5 seconds before the main loop tries again
  }
}

void readSensors() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    lastTemp = t;
    lastHum = h;
  }
  int rawSoil = analogRead(SOIL_PIN);
  lastSoil = map(rawSoil, 4095, 0, 0, 100);
  lastSoil = constrain(lastSoil, 0, 100);
}

String postToBackend() {
  if (WiFi.status() != WL_CONNECTED) return "KEEP";
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = "https://" + String(SERVER_IP) + "/api/v1/iot/data";
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    StaticJsonDocument<200> doc;
    doc["temperature"] = lastTemp;
    doc["humidity"] = lastHum;
    doc["soil_moisture"] = lastSoil;
    String body;
    serializeJson(doc, body);
    int code = http.POST(body);
    if (code > 0) {
      String response = http.getString();
      Serial.printf("Server Response (%d): %s\n", code, response.c_str());
      StaticJsonDocument<200> res;
      deserializeJson(res, response);
      if (res.containsKey("relay_command")) {
        String cmd = res["relay_command"].as<String>();
        http.end();
        return cmd;
      }
    } else {
      Serial.printf("❌ POST Failed, error: %s\n", http.errorToString(code).c_str());
    }
    http.end();
  } else {
    Serial.println("❌ HTTP Begin failed");
  }
  return "KEEP";
}

void controlRelay(String command) {
  if (command == "ON") {
    relayState = HIGH;
    digitalWrite(RELAY_PIN, LOW); // Active-Low: LOW = ON
    Serial.println("ACTION: Pump turned ON 💧");
  } else if (command == "OFF") {
    relayState = LOW;
    digitalWrite(RELAY_PIN, HIGH); // Active-Low: HIGH = OFF
    Serial.println("ACTION: Pump turned OFF 🛑");
  } else {
    Serial.println("ACTION: No change (KEEP)");
  }
}

void safetyCheck() {
  if (lastSoil >= SOIL_WET_THRESHOLD && relayState == HIGH) {
    relayState = LOW;
    digitalWrite(RELAY_PIN, HIGH); // HIGH = OFF for Active-Low
    Serial.println("SAFETY: Auto-shutoff triggered");
  }
}

void handleStatusLED() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (relayState == HIGH) {
    if (millis() - lastLEDBlink >= 1000) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState);
      lastLEDBlink = millis();
    }
  } else {
    digitalWrite(LED_PIN, HIGH);
  }
}
