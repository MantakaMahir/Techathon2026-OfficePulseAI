#include <WiFi.h>
#include <HTTPClient.h>

// Representative Drawing Room firmware for Wokwi ESP32.
// Switches use INPUT_PULLUP: closed switch -> LOW -> device ON.

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// Use a public tunnel/deployed backend for Wokwi HTTP telemetry.
// Example: "https://your-tunnel.example/api/iot/ingest"
const char* BACKEND_INGEST_URL = "";

struct DevicePin {
  const char* id;
  int inputPin;
  int outputPin;
};

DevicePin devices[] = {
  { "drawing_light_1", 32, 14 },
  { "drawing_light_2", 33, 12 },
  { "drawing_light_3", 25, 13 },
  { "drawing_fan_1", 26, 18 },
  { "drawing_fan_2", 27, 19 }
};

const int currentSensorPin = 34;
unsigned long lastPostMs = 0;

void setup() {
  Serial.begin(115200);

  for (DevicePin device : devices) {
    pinMode(device.inputPin, INPUT_PULLUP);
    pinMode(device.outputPin, OUTPUT);
  }

  if (strlen(BACKEND_INGEST_URL) > 0) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
      delay(250);
      Serial.print(".");
    }
    Serial.println("\nWiFi connected");
  }
}

void loop() {
  String json = "{\"room\":\"drawing\",\"source\":\"wokwi-esp32\",\"devices\":[";

  for (int i = 0; i < 5; i++) {
    bool isOn = digitalRead(devices[i].inputPin) == LOW;
    digitalWrite(devices[i].outputPin, isOn ? HIGH : LOW);

    if (i > 0) json += ",";
    json += "{\"id\":\"";
    json += devices[i].id;
    json += "\",\"status\":\"";
    json += isOn ? "on" : "off";
    json += "\"}";
  }

  int currentValue = analogRead(currentSensorPin);
  json += "],\"currentAdc\":";
  json += currentValue;
  json += "}";

  Serial.println(json);

  if (strlen(BACKEND_INGEST_URL) > 0 && WiFi.status() == WL_CONNECTED && millis() - lastPostMs > 5000) {
    HTTPClient http;
    http.begin(BACKEND_INGEST_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(json);
    Serial.print("POST status: ");
    Serial.println(code);
    http.end();
    lastPostMs = millis();
  }

  delay(500);
}
