#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// --- WIFI ---
#define WIFI_SSID "Yanik"
#define WIFI_PASSWORD "uxac4246"

// --- BACKEND URL ---
#define SERVER_URL "http://172.21.174.152:5000/api/attendance/scan"
#define DEVICE_ID "esp32-gate-2"
#define GATE_ID "building-exit"

// --- PINS ---
#define SS_PIN    5
#define RST_PIN   4
#define SCK_PIN   16
#define MISO_PIN  17
#define MOSI_PIN  23
#define LED_RED   33

// --- OBJECT ---
MFRC522 rfid(SS_PIN, RST_PIN);

void connectWiFi();
void ensureWiFiConnected();
void sendExitToBackend(String uid);
String getUID();
void successBlink();
void warningBlink();
void errorBlink();

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_RED, OUTPUT);
  digitalWrite(LED_RED, LOW);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  delay(100);
  Serial.println("[OK] RFID initialized");

  connectWiFi();
  Serial.println("[STATE] Exit scanner ready");
}

void loop() {
  ensureWiFiConnected();

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getUID();

    Serial.print("[DATA] Exit UID: ");
    Serial.println(uid);

    if (uid.length() > 0) {
      sendExitToBackend(uid);
    } else {
      Serial.println("[ERROR] Empty UID");
      errorBlink();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(1000);
  }
}

void sendExitToBackend(String uid) {
  ensureWiFiConnected();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected");
    errorBlink();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  String body = "{\"uid\":\"" + uid + "\",\"action\":\"EXIT\",\"deviceId\":\"" +
                String(DEVICE_ID) + "\",\"gateId\":\"" + String(GATE_ID) + "\"}";

  Serial.print("[HTTP] POST URL: ");
  Serial.println(SERVER_URL);
  Serial.print("[HTTP] Payload: ");
  Serial.println(body);

  int httpCode = http.POST(body);

  Serial.print("[HTTP] Code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("[RESPONSE] " + response);

    if (response.indexOf("EXIT_MARKED") >= 0) {
      successBlink();
    } else if (response.indexOf("EXIT_ALREADY_MARKED") >= 0) {
      warningBlink();
    } else {
      errorBlink();
    }
  } else {
    Serial.print("[ERROR] Request failed: ");
    Serial.println(http.errorToString(httpCode));
    errorBlink();
  }

  http.end();
}

String getUID() {
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      content += "0";
    }
    content += String(rfid.uid.uidByte[i], HEX);
  }
  content.toUpperCase();
  return content;
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

void successBlink() {
  digitalWrite(LED_RED, HIGH);
  delay(1000);
  digitalWrite(LED_RED, LOW);
}

void warningBlink() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_RED, HIGH);
    delay(200);
    digitalWrite(LED_RED, LOW);
    delay(250);
  }
}

void errorBlink() {
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_RED, HIGH);
    delay(120);
    digitalWrite(LED_RED, LOW);
    delay(120);
  }
}
