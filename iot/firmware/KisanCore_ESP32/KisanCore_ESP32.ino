#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

// --- CONFIGURATION ---
const char *WIFI_SSID = "YOUR_WIFI_SSID"; // TODO: Fill with your WiFi SSID
const char *WIFI_PASSWORD =
    "YOUR_WIFI_PASSWORD"; // TODO: Fill with your WiFi Password

const char *BACKEND_URL = "http://10.197.108.36:8000/api/v1/iot/data";

#define DHTPIN 4      // GPIO Pin where DHT22 is connected
#define DHTTYPE DHT22 // Using DHT22 sensor

DHT dht(DHTPIN, DHTTYPE);

// Interval for reading sensor data (in milliseconds)
const unsigned long interval = 10000;
unsigned long previousMillis = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n--- KisanCore AI IoT Node ---");

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

    // Read sensor data
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Check if any reads failed
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Error: Failed to read from DHT sensor!");
      return; // Skip this cycle and try again later
    }

    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.print("°C, Humidity: ");
    Serial.print(humidity);
    Serial.println("%");

    // Send data to backend
    sendDataToServer(temperature, humidity);
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

void sendDataToServer(float temp, float hum) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    Serial.println("Sending data to server...");

    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    StaticJsonDocument<128> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;

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
