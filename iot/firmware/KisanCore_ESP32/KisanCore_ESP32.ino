#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

// --- CONFIGURATION ---
const char *WIFI_SSID = "YOUR_WIFI_SSID"; // TODO: Fill with your WiFi SSID
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // TODO: Fill with your WiFi Password

const char *BACKEND_URL = "http://10.197.108.36:8000/api/v1/iot/data";

// --- SENSOR PINS ---
#define DHTPIN 4      // GPIO Pin for DHT22
#define DHTTYPE DHT22
#define SOIL_PIN 34   // GPIO Pin for Capacitive Soil Moisture Sensor (Analog)

// Calibration values for Soil Moisture (V1.2)
// These may need adjustment based on your specific sensor
const int AirValue = 3500;   // Value in dry air
const int WaterValue = 1500; // Value in water

DHT dht(DHTPIN, DHTTYPE);

// Interval for reading sensor data (in milliseconds)
const unsigned long interval = 10000;
unsigned long previousMillis = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n--- KisanCore AI IoT Node ---");
  Serial.println("Sensors: DHT22 (GPIO 4), Soil Moisture (GPIO 34)");

  // Initialize DHT sensor
  dht.begin();

  // Initialize WiFi
  connectToWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  // Check WiFi connection status
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    connectToWiFi();
  }

  // Task execution every 10 seconds
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // 1. Read DHT22 (Digital)
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // 2. Read Soil Moisture (Analog)
    int soilRaw = analogRead(SOIL_PIN);
    // Convert raw analog reading to percentage
    // Map: AirValue (0%) to WaterValue (100%)
    float soilMoisture = map(soilRaw, AirValue, WaterValue, 0, 100);
    
    // Constrain to 0-100% range
    if (soilMoisture > 100) soilMoisture = 100;
    if (soilMoisture < 0) soilMoisture = 0;

    // Check if DHT reads failed
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Error: Failed to read from DHT sensor!");
      return; 
    }

    // Serial Debugging
    Serial.println("-------------------------");
    Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
    Serial.print("Humidity:    "); Serial.print(humidity); Serial.println(" %");
    Serial.print("Soil Moister: "); Serial.print(soilMoisture); Serial.print(" % (Raw: "); Serial.print(soilRaw); Serial.println(")");

    // Send data to backend
    sendDataToServer(temperature, humidity, soilMoisture);
  }
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed! Will retry in next loop.");
  }
}

void sendDataToServer(float temp, float hum, float soil) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    Serial.println("Sending data to server...");

    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    StaticJsonDocument<256> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["soil_moisture"] = soil;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // Make POST request
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.print("Server Response: ");
      Serial.println(response);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi not connected. Cannot send data.");
  }
}
