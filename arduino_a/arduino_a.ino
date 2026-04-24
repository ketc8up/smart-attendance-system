#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include "esp_sleep.h"

// --- WIFI ---
#define WIFI_SSID "Yanik"
#define WIFI_PASSWORD "uxac4246"

// --- BACKEND ---
#define SERVER_URL "http://172.21.174.152:5000/api/attendance/scan"
#define DEVICE_ID "esp32-gate-1"
#define GATE_ID "classroom-a"

// --- PINS ---
#define SS_PIN          5
#define RST_PIN         4
#define PIR_PIN         13
#define ACTIVE_IR_PIN   27
#define BUZZER_PIN      26

// --- OLED ---
Adafruit_SH1106G display(128, 64, &Wire, -1);

// --- RFID ---
MFRC522 rfid(SS_PIN, RST_PIN);

// --- STATE ---
unsigned long lastActionTime = 0;
bool awaitingPass = false;
String pendingUID = "";

int lastIR = -1;

void connectWiFi();
void ensureWiFiConnected();
bool sendToBackend(String uid);
String getUID();
void updateOLED(String line1, String line2);
void beep(int type);

void setup() {
  Serial.begin(115200);
  delay(1000);

  esp_sleep_wakeup_cause_t reason = esp_sleep_get_wakeup_cause();
  if (reason == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("[WAKE] Woken by PIR");
  } else {
    Serial.println("[BOOT] Normal startup");
  }

  Serial.println("===== SYSTEM START =====");

  pinMode(PIR_PIN, INPUT);
  pinMode(ACTIVE_IR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Wire.begin(21, 22);

  if (!display.begin(0x3C, true)) {
    Serial.println("[ERROR] OLED not found");
    while (true) {
      delay(100);
    }
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.display();
  Serial.println("[OK] OLED initialized");

  SPI.begin();
  rfid.PCD_Init();
  delay(100);
  Serial.println("[OK] RFID initialized");

  ledcAttach(BUZZER_PIN, 2000, 8);


  connectWiFi();

  updateOLED("READY", "Tap Entry ID...");
  Serial.println("[STATE] Waiting for RFID scan...");
  lastActionTime = millis();
}

void loop() {
  ensureWiFiConnected();

  int pirState = digitalRead(PIR_PIN);
  int irState = digitalRead(ACTIVE_IR_PIN);

  if (irState != lastIR) {
    Serial.print("[IR] ");
    Serial.println(irState == LOW ? "BLOCKED" : "CLEAR");
    lastIR = irState;
  }

  if (!awaitingPass &&
      (millis() - lastActionTime > 15000) &&
      pirState == LOW) {
    Serial.println("[SLEEP] Preparing to sleep...");
    delay(2000);

    if (digitalRead(PIR_PIN) == LOW) {
      Serial.println("[SLEEP] Entering deep sleep");
      updateOLED("SLEEPING", "Waiting for motion");
      delay(500);

      esp_sleep_enable_ext0_wakeup((gpio_num_t)PIR_PIN, 1);
      esp_deep_sleep_start();
    }
  }

  if (awaitingPass) {
    if (irState == LOW) {
      Serial.println("[SUCCESS] Person crossed");
      Serial.print("[LOG] UID: ");
      Serial.println(pendingUID);

      bool backendOk = sendToBackend(pendingUID);

      if (backendOk) {
        updateOLED("LOGGED", "Welcome!");
        beep(2);
      } else {
        updateOLED("ERROR", "Backend failed");
        beep(3);
      }

      delay(2000);
      awaitingPass = false;

      updateOLED("READY", "Tap Entry ID...");
      lastActionTime = millis();
    } else if (millis() - lastActionTime > 5000) {
      Serial.println("[TIMEOUT] No crossing");

      updateOLED("FAILED", "Did not cross");
      beep(3);

      delay(2000);
      awaitingPass = false;

      updateOLED("READY", "Tap Entry ID...");
      lastActionTime = millis();
    }
  }

  if (!awaitingPass &&
      rfid.PICC_IsNewCardPresent() &&
      rfid.PICC_ReadCardSerial()) {
    Serial.println("\n[EVENT] RFID detected");

    pendingUID = getUID();

    Serial.print("[DATA] UID: ");
    Serial.println(pendingUID);

    updateOLED("SUCCESS", "Walk through gate");
    beep(1);

    awaitingPass = true;
    lastActionTime = millis();

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}

bool sendToBackend(String uid) {
  ensureWiFiConnected();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected");
    return false;
  }

  HTTPClient http;

  Serial.print("[HTTP] POST URL: ");
  Serial.println(SERVER_URL);

  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  String body = "{\"uid\":\"" + uid + "\",\"action\":\"ENTRY\",\"deviceId\":\"" +
                String(DEVICE_ID) + "\",\"gateId\":\"" + String(GATE_ID) + "\"}";

  Serial.print("[HTTP] Payload: ");
  Serial.println(body);

  int httpCode = http.POST(body);

  Serial.print("[HTTP] Code: ");
  Serial.println(httpCode);

  bool success = false;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("[RESPONSE] " + response);
    success = httpCode >= 200 && httpCode < 300;
  } else {
    Serial.print("[ERROR] Request failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return success;
}

String getUID() {
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      content.concat("0");
    }
    content.concat(String(rfid.uid.uidByte[i], HEX));
  }
  content.toUpperCase();
  return content;
}

void updateOLED(String line1, String line2) {
  display.clearDisplay();
  display.setCursor(0, 10);
  display.println(line1);
  display.setCursor(0, 30);
  display.println(line2);
  display.display();
}

void connectWiFi() {
  Serial.print("[WIFI] Connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WIFI] Connected");
  Serial.print("[WIFI] ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("[WIFI] Connection lost, reconnecting...");
  WiFi.disconnect();
  connectWiFi();
}

void beep(int type) {
  if (type == 1) {
    ledcWriteTone(BUZZER_PIN, 1200);
    delay(300);
    ledcWriteTone(BUZZER_PIN, 0);
  } else if (type == 2) {
    for (int i = 0; i < 2; i++) {
      ledcWriteTone(BUZZER_PIN, 1500);
      delay(200);
      ledcWriteTone(BUZZER_PIN, 0);
      delay(150);
    }
  } else if (type == 3) {
    for (int i = 0; i < 3; i++) {
      ledcWriteTone(BUZZER_PIN, 800);
      delay(120);
      ledcWriteTone(BUZZER_PIN, 0);
      delay(120);
    }
  }
}
