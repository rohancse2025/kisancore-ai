#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── CONFIG ──────────────────────────────
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPass";
const char* BACKEND_URL   = 
  "http://192.168.1.5:8000/api/v1/iot/data";

#define DHTPIN      4
#define DHTTYPE     DHT22
#define SOIL_PIN    34
#define RELAY_PIN   26
#define LED_PIN     2   // onboard LED

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend = 0;
const long INTERVAL = 10000; // 10 seconds

// ── SETUP ────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  dht.begin();
  
  Serial.println("\n=== KisanCore IoT Node ===");
  connectWiFi();
}

// ── LOOP ─────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    connectWiFi();
  }
  
  unsigned long now = millis();
  if (now - lastSend >= INTERVAL) {
    lastSend = now;
    readAndSend();
  }
}

// ── READ SENSORS + SEND ──────────────────
void readAndSend() {
  delay(200);
  
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  
  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT22 read failed!");
    return;
  }
  
  // Read soil moisture (analog 0-4095)
  int rawSoil = analogRead(SOIL_PIN);
  // Convert to percentage (4095=dry, 0=wet)
  float soilMoisture = map(rawSoil, 
    4095, 0, 0, 100);
  soilMoisture = constrain(soilMoisture, 0, 100);
  
  Serial.printf("Temp: %.1f C | Humidity: %.1f%%"
    " | Soil: %.1f%%\n", 
    temp, hum, soilMoisture);
  
  // Control relay based on soil moisture
  if (soilMoisture < 30) {
    digitalWrite(RELAY_PIN, HIGH); // Fan/pump ON
    digitalWrite(LED_PIN, HIGH);
    Serial.println("RELAY ON - Irrigation needed");
  } else {
    digitalWrite(RELAY_PIN, LOW);  // Fan/pump OFF
    digitalWrite(LED_PIN, LOW);
    Serial.println("RELAY OFF - OK");
  }
  
  sendToServer(temp, hum, soilMoisture);
}

// ── SEND TO BACKEND ───────────────────────
void sendToServer(float temp, float hum, 
                  float soil) {
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type","application/json");
  http.setTimeout(8000);
  
  StaticJsonDocument<256> doc;
  doc["temperature"]  = temp;
  doc["humidity"]     = hum;
  doc["soil_moisture"] = soil;
  
  String payload;
  serializeJson(doc, payload);
  
  int code = http.POST(payload);
  
  if (code > 0) {
    String response = http.getString();
    Serial.printf("Server: %d | %s\n", 
      code, response.c_str());
    
    // Check if server says irrigation needed
    if (response.indexOf("true") > 0) {
      Serial.println("Server confirms: irrigate!");
    }
  } else {
    Serial.printf("HTTP Error: %d\n", code);
  }
  
  http.end();
}

// ── WIFI CONNECT ──────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED 
         && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Failed!");
  }
}
