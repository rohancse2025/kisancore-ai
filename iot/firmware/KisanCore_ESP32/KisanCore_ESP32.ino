/**
 * KisanCore IoT — ESP32 Motor Version (UPDATED)
 */

#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// ===== USER CONFIGURATION =====
const char *WIFI_SSID = "Rohan";
const char *WIFI_PASSWORD = "Rohan1234";

const char *SERVER_URL = "https://kisancore-ai-1.onrender.com/api/v1/iot/data";

const int READ_INTERVAL = 5000;

const int SOIL_DRY_THRESHOLD = 30;
const int SOIL_WET_THRESHOLD = 60;
// ==============================

#define DHT_PIN 4
#define SOIL_PIN 34
#define MOTOR_PIN 26
#define LED_PIN 2
#define DHTTYPE DHT22

DHT dht(DHT_PIN, DHTTYPE);

unsigned long lastReadTime = 0;
unsigned long readingCount = 0;

bool motorState = false;

float lastTemp = 0;
float lastHum = 0;
float lastSoil = 0;

unsigned long lastLEDBlink = 0;
bool ledState = LOW;

void setup() {

  Serial.begin(115200);

  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Initialize both to OFF
  digitalWrite(MOTOR_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  dht.begin();

  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println(" KisanCore IoT Starting ");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ===== MOTOR TEST (Hardware Check) =====
  Serial.println("Testing Motor & Battery...");
  digitalWrite(MOTOR_PIN, HIGH);
  Serial.println("   >>> Motor ON");
  delay(2000);
  digitalWrite(MOTOR_PIN, LOW);
  Serial.println("   >>> Motor OFF");
  delay(1000);
  
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

  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.printf("Reading #%lu\n", readingCount);
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  readSensors();

  String command = postToBackend();

  controlMotor(command);

  safetyCheck();

  Serial.printf("Temp: %.1f C\n", lastTemp);
  Serial.printf("Humidity: %.1f %%\n", lastHum);
  Serial.printf("Soil Moisture: %.1f %%\n", lastSoil);

  Serial.printf("Motor: %s\n",
                motorState ? "ON" : "OFF");

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

void connectWiFi() {

  Serial.println("\nConnecting WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;

  while (WiFi.status() != WL_CONNECTED && retry < 30) {

    delay(500);

    Serial.print(".");

    digitalWrite(LED_PIN,
                 !digitalRead(LED_PIN));

    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    digitalWrite(LED_PIN, HIGH);

  } else {

    Serial.println("\nWiFi Failed!");
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

  lastSoil = map(rawSoil,
                 4095,
                 0,
                 0,
                 100);

  lastSoil = constrain(lastSoil, 0, 100);
}

String postToBackend() {

  if (WiFi.status() != WL_CONNECTED) {
    return "KEEP";
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  http.setTimeout(10000);

  if (http.begin(client, SERVER_URL)) {

    http.addHeader("Content-Type",
                   "application/json");

    StaticJsonDocument<200> doc;

    doc["temperature"] = lastTemp;
    doc["humidity"] = lastHum;
    doc["soil_moisture"] = lastSoil;

    String body;

    serializeJson(doc, body);

    int code = http.POST(body);

    if (code > 0) {

      String response = http.getString();

      Serial.printf("HTTP %d\n", code);
      Serial.println(response);

      StaticJsonDocument<200> res;

      deserializeJson(res, response);

      if (res.containsKey("relay_command")) {

        String cmd =
          res["relay_command"].as<String>();

        http.end();

        return cmd;
      }

    } else {

      Serial.print("POST Failed: ");
      Serial.println(http.errorToString(code));
    }

    http.end();
  }

  return "KEEP";
}

void controlMotor(String command) {

  if (command == "ON") {

    motorState = true;

    digitalWrite(MOTOR_PIN, HIGH);

    Serial.println("Pump ON");

  } else if (command == "OFF") {

    motorState = false;

    digitalWrite(MOTOR_PIN, LOW);

    Serial.println("Pump OFF");

  } else {

    Serial.println("KEEP");
  }
}

void safetyCheck() {

  if (lastSoil >= SOIL_WET_THRESHOLD &&
      motorState == true) {

    motorState = false;

    digitalWrite(MOTOR_PIN, LOW);

    Serial.println("Safety Auto OFF");
  }
}

void handleStatusLED() {

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  if (motorState) {

    if (millis() - lastLEDBlink >= 500) {

      ledState = !ledState;

      digitalWrite(LED_PIN, ledState);

      lastLEDBlink = millis();
    }

  } else {

    digitalWrite(LED_PIN, HIGH);
  }
}
