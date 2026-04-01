#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
// MUST BE YOUR LAPTOP'S IP ON THE SAME WIFI NETWORK
const char* BACKEND_URL = "http://10.197.108.36:8000/api/v1/iot/data";

#define DHTPIN 4
#define DHTTYPE DHT22
#define SOIL_PIN 34

// Calibrate these values based on your sensor
const int AIR_VALUE = 3500;
const int WATER_VALUE = 1500;

DHT dht(DHTPIN, DHTTYPE);

unsigned long previousMillis = 0;
const unsigned long INTERVAL = 10000;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  dht.begin();
  connectWiFi();
}

void loop() {
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long now = millis();

  if (now - previousMillis >= INTERVAL) {
    previousMillis = now;

    // Read DHT
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Read Soil Sensor
    int soilRaw = analogRead(SOIL_PIN);

    // FIXED soil moisture calculation (no map())
    float soilMoisture = (float)(soilRaw - AIR_VALUE) * 100.0 / (WATER_VALUE - AIR_VALUE);
    soilMoisture = constrain(soilMoisture, 0, 100);

    // Check DHT errors
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ DHT22 read failed!");
      return;
    }

    // Debug Output
    Serial.println("----- Sensor Data -----");
    Serial.printf("Temperature: %.1f °C\n", temperature);
    Serial.printf("Humidity: %.1f %%\n", humidity);
    Serial.printf("Soil Moisture: %.1f %%\n", soilMoisture);
    Serial.println("-----------------------");

    // Send Data
    sendData(temperature, humidity, soilMoisture);
  }
}

// WiFi Connection Function
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi failed. Will retry...");
  }
}

// Send Data to Server
void sendData(float temp, float hum, float soil) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, skipping POST");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  // Use WiFiClient with begin() to prevent connection issues on ESP32
  http.begin(client, BACKEND_URL);
  // Add a connection timeout to prevent hanging forever
  http.setTimeout(5000); 
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soil_moisture"] = soil;

  String payload;
  serializeJson(doc, payload);

  Serial.println("📤 Sending JSON:");
  Serial.println(payload);

  int maxRetries = 3;
  int retryCount = 0;
  int httpCode = -1;

  while (retryCount < maxRetries) {
    httpCode = http.POST(payload);

    if (httpCode > 0) {
      Serial.printf("✅ HTTP Response code: %d\n", httpCode);
      String response = http.getString();
      Serial.println("Server Response:");
      Serial.println(response);
      break; // Success, exit retry loop
    } else {
      Serial.printf("❌ POST failed. Error: %s (-%d)\n", http.errorToString(httpCode).c_str(), -httpCode);
      retryCount++;
      if (retryCount < maxRetries) {
        Serial.printf("🔄 Retrying... (%d/%d)\n", retryCount, maxRetries);
        delay(2000); // Wait 2s before retrying
      }
    }
  }

  if (retryCount >= maxRetries) {
    Serial.println("🚨 All POST retries failed. Check network or server configuration.");
  }

  http.end();
}
