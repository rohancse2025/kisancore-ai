/**
 * KisanCore IoT — ESP32 Firmware
 *
 * Hardware:
 * - ESP32 DevKit V1
 * - DHT22 (Temperature & Humidity)
 * - Soil Moisture Sensor (Analog)
 * - 12V Fan (via Relay)
 *
 * Required Libraries:
 * - DHT sensor library by Adafruit
 * - ArduinoJson by Benoit Blanchon (v6.x)
 */

#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> // Added for HTTPS support

// ===== USER CONFIGURATION =====
const char *WIFI_SSID = "Redmi 10A";
const char *WIFI_PASSWORD = "Rohan1234";
const char *SERVER_IP = "kisancore-ai-1.onrender.com"; // Fixed: changed 'api' to 'ai'
const int SERVER_PORT = 443;                           // HTTPS Port
const int READ_INTERVAL = 30000;   // 30 seconds
const int SOIL_DRY_THRESHOLD = 30; // Below this = irrigation needed
const int SOIL_WET_THRESHOLD = 60; // Above this = safety shutoff
// ==============================

// HARDWARE PINS
#define DHT_PIN 4
#define SOIL_PIN 34
#define RELAY_PIN 26
#define LED_PIN 2
#define DHTTYPE DHT22

// GLOBAL OBJECTS & VARIABLES
DHT dht(DHT_PIN, DHTTYPE);
unsigned long lastReadTime = 0;
unsigned long readingCount = 0;
bool relayState = LOW;
float lastTemp = 0;
float lastHum = 0;
float lastSoil = 0;

// LED Timing
unsigned long lastLEDBlink = 0;
bool ledState = LOW;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start with fan OFF

  dht.begin();

  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("   KisanCore IoT System Starting   ");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  connectWiFi();
}

void loop() {
  // 1. Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Non-blocking LED Status logic
  handleStatusLED();

  // 3. Sensor Reading & API Update Loop
  if (millis() - lastReadTime >= READ_INTERVAL || lastReadTime == 0) {
    lastReadTime = millis();
    readingCount++;

    performCycle();
  }
}

/**
 * Main execution cycle: Read -> Post -> Control -> Safety
 */
void performCycle() {
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.printf("KisanCore IoT — Sensor Reading #%lu\n", readingCount);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // A. Read Sensors
  readSensors();

  // B. Post to Backend
  String relayCommand = postToBackend();

  // C. Control Relay
  controlRelay(relayCommand);

  // D. Local Safety Check
  safetyCheck();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi: Connected (RSSI: %d dBm)\n", WiFi.RSSI());
  } else {
    Serial.println("WiFi: DISCONNECTED");
  }
  
  Serial.printf("Temperature: %.1f°C\n", lastTemp);
  Serial.printf("Humidity: %.1f%%\n", lastHum);
  Serial.printf("Soil Moisture: %.1f%%\n", lastSoil);
  Serial.printf("Relay State: %s\n", (relayState == HIGH) ? "ON" : "OFF");
  Serial.println("Safety: OK");
  Serial.println("Next reading in 30 seconds...");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

/**
 * Connects to WiFi with 30s timeout and fast blink status
 */
void connectWiFi() {
  Serial.println("\n--- WiFi Reset & Reconnect ---");
  
  WiFi.persistent(false); // Don't save WiFi credentials to flash
  WiFi.disconnect(true);  // Wipe old settings
  delay(1000);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("Connecting to: %s\n", WIFI_SSID);

  int retry = 0;
  // Try for 20 seconds (40 * 500ms)
  while (WiFi.status() != WL_CONNECTED && retry < 40) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH); // Solid ON
  } else {
    Serial.printf("\n❌ WiFi Failed (Status: %d)\n", WiFi.status());
    Serial.println("Action: Try changing hotspot name to 'Rohan' (no spaces).");
  }
}

/**
 * Reads sensors with retry logic for DHT22
 */
void readSensors() {
  // Read DHT22 with 3 retries
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int retry = 0;

  while ((isnan(h) || isnan(t)) && retry < 3) {
    Serial.println("DHT22 Read Failure! Retrying in 2s...");
    delay(2000);
    h = dht.readHumidity();
    t = dht.readTemperature();
    retry++;
  }

  if (!isnan(h) && !isnan(t)) {
    lastTemp = t;
    lastHum = h;
  }

  // Read Soil Moisture
  int rawSoil = analogRead(SOIL_PIN);
  if (rawSoil == 4095) {
    Serial.println("WARNING: Soil sensor disconnected or very dry (4095)");
  }

  // dry (4095) -> 0%, wet (0) -> 100%
  lastSoil = map(rawSoil, 4095, 0, 0, 100);
  lastSoil = constrain(lastSoil, 0, 100); // Ensure range 0-100
}

/**
 * Sends JSON data to backend and receives command
 */
String postToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Post skipped: WiFi not connected.");
    return "KEEP";
  }

  WiFiClientSecure client;
  client.setInsecure(); 

  HTTPClient http;
  String url = "https://" + String(SERVER_IP) + "/api/v1/iot/data";
  
  Serial.printf("Cloud Syncing to: %s\n", url.c_str());

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); 

    StaticJsonDocument<200> doc;
    doc["temperature"] = lastTemp;
    doc["humidity"] = lastHum;
    doc["soil_moisture"] = lastSoil;

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.println("Sending POST data...");
    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
      Serial.printf("Cloud Response Code: %d\n", httpCode);
      if (httpCode == HTTP_CODE_OK || httpCode == 201) {
        String response = http.getString();
        Serial.println("Cloud Response: " + response);
        StaticJsonDocument<200> resDoc;
        DeserializationError error = deserializeJson(resDoc, response);

        if (!error && resDoc.containsKey("relay_command")) {
          String result = resDoc["relay_command"].as<String>();
          Serial.printf("Backend Order: %s\n", result.c_str());
          http.end();
          return result;
        }
      }
    } else {
      Serial.printf("Cloud Connection Error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("Cloud Error: http.begin failed.");
  }
  return "KEEP";
}

/**
 * Controls relay based on backend command
 */
void controlRelay(String command) {
  if (command == "ON") {
    relayState = HIGH;
    Serial.println("Relay: ON");
  } else if (command == "OFF") {
    relayState = LOW;
    Serial.println("Relay: OFF");
  }

  digitalWrite(RELAY_PIN, relayState);
}

/**
 * Independent local safety check
 */
void safetyCheck() {
  if (lastSoil >= SOIL_WET_THRESHOLD && relayState == HIGH) {
    relayState = LOW;
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("SAFETY: Auto-shutoff at 60% moisture");

    // 5 Rapid blinks for safety event
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(50);
      digitalWrite(LED_PIN, LOW);
      delay(50);
    }
  }
}

/**
 * Manages the status LED patterns without blocking
 */
void handleStatusLED() {
  if (WiFi.status() != WL_CONNECTED)
    return; // Handled in connectWiFi()

  // Slow blink (1s) if relay is active
  if (relayState == HIGH) {
    if (millis() - lastLEDBlink >= 1000) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState);
      lastLEDBlink = millis();
    }
  } else {
    // Solid ON if everything is normal and relay is OFF
    digitalWrite(LED_PIN, HIGH);
  }
}
