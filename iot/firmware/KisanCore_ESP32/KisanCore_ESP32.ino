#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

const char* WIFI_SSID = "Redmi 10A";
const char* WIFI_PASSWORD = "Rohan1234";
const char* BACKEND_URL = "http://10.186.223.36:8000/api/v1/iot/data";

#define DHTPIN 5
#define DHTTYPE DHT22
#define SOIL_PIN 34
#define RELAY_PIN 26

const int AIR_VALUE = 3500;
const int WATER_VALUE = 1500;

DHT dht(DHTPIN, DHTTYPE);
unsigned long previousMillis = 0;
const unsigned long interval = 10000;
bool wifiConnecting = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  dht.begin();
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  connectToWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  if (WiFi.status() != WL_CONNECTED && !wifiConnecting) {
    connectToWiFi();
  }

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    delay(500);

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    int soilRaw = analogRead(SOIL_PIN);
    
    // FIX: Floating pin detection — if raw ADC < 100, the sensor wire is disconnected
    // A disconnected analog pin floats near 0, NOT a valid soil reading
    float soilMoisture;
    if (soilRaw < 100) {
      Serial.println("❌ Soil sensor disconnected! Sending -999 marker.");
      soilMoisture = -999.0;
    } else {
      // Floating point math for accurate soil moisture percentages
      soilMoisture = (float)(soilRaw - AIR_VALUE) * 100.0 / (WATER_VALUE - AIR_VALUE);
      soilMoisture = constrain(soilMoisture, 0, 100);
    }

    // FIX 2: Do NOT return and block sending! Assign -999 to alert the AI dashboard that THIS specific sensor disconnected!
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Invalid DHT data! Sending -999 marker to Dashboard.");
      temperature = -999.0;
      humidity = -999.0;
    }

    Serial.printf("Temp: %.1f C | Humidity: %.1f%% | Soil: %.1f%%\n",
                  temperature, humidity, soilMoisture);

    sendDataToServer(temperature, humidity, soilMoisture);
  }
}

void connectToWiFi() {
  wifiConnecting = true;
  WiFi.disconnect(true);
  delay(1000);
  Serial.print("Connecting...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi Failed!");
  }
  wifiConnecting = false;
}

void sendDataToServer(float temp, float hum, float soil) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client; // FIX 3: Prevents "HTTP Error -1" Core panics on newer ESP32 firmwares
  HTTPClient http;
  
  http.begin(client, BACKEND_URL); 
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  StaticJsonDocument<256> doc;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soil_moisture"] = soil;

  String payload;
  serializeJson(doc, payload);
  Serial.println("📤 Sending: " + payload);

  int code = http.POST(payload);
  if (code > 0) {
    String response = http.getString();
    Serial.println("✅ HTTP " + String(code) + ": " + response);
    if (code == 200) {
      if (response.indexOf("ON") >= 0) {
        digitalWrite(RELAY_PIN, HIGH);
        Serial.println("RELAY ON - Irrigation started");
      } else {
        digitalWrite(RELAY_PIN, LOW);  
        Serial.println("RELAY OFF - No irrigation");
      }
    }
  } else {
    Serial.println("❌ Failed: " + String(code));
  }
  http.end();
}
