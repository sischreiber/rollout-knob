// KY-040 + OLED — Phase 4: WiFi + HTTP POST to backend
// Arduino UNO R4 WiFi

#include <WiFiS3.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "arduino_secrets.h"

const int SERVER_PORT = 3000;
const char* SERVER_PATH = "/rollout";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WiFiClient client;

const int PIN_CLK = 2;
const int PIN_DT  = 3;
const int PIN_SW  = 4;

enum State { SYNCED, PENDING, SENDING };
State state = SYNCED;

int counter = 0;
int syncedValue = 0;
int lastClkState;
int lastButtonState = HIGH;

void setup() {
  Serial.begin(9600);

  pinMode(PIN_CLK, INPUT);
  pinMode(PIN_DT, INPUT);
  pinMode(PIN_SW, INPUT_PULLUP);
  lastClkState = digitalRead(PIN_CLK);

  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("SSD1306 not found");
    while (true);
  }

  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());

  updateDisplay();
}

void loop() {
  int clkState = digitalRead(PIN_CLK);
  if (clkState != lastClkState && clkState == LOW) {
    if (digitalRead(PIN_DT) != clkState) {
      counter++;
    } else {
      counter--;
    }
    if (counter > 100) counter = 100;
    if (counter < 0)   counter = 0;

    state = (counter == syncedValue) ? SYNCED : PENDING;

    Serial.print("Value: ");
    Serial.println(counter);
    updateDisplay();
  }
  lastClkState = clkState;

  int buttonState = digitalRead(PIN_SW);
  if (buttonState == LOW && lastButtonState == HIGH) {
    if (counter != syncedValue) {
      commit();
    }
    delay(50);
  }
  lastButtonState = buttonState;
}

void commit() {
  state = SENDING;
  updateDisplay();

  bool ok = sendValue(counter);

  if (ok) {
    syncedValue = counter;
    state = SYNCED;
    Serial.print(">>> Sent: ");
    Serial.println(syncedValue);
  } else {
    state = PENDING;
    Serial.println(">>> Send failed");
  }
  updateDisplay();
}

bool sendValue(int value) {
  String body = "{\"rollout_percentage\":" + String(value) + "}";

  Serial.print("[sendValue] POST ");
  Serial.print(value);
  Serial.print(" -> ");
  Serial.print(SERVER_HOST);
  Serial.println(SERVER_PATH);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println("[sendValue] connection failed");
    return false;
  }

  client.print("POST ");
  client.print(SERVER_PATH);
  client.println(" HTTP/1.1");

  client.print("Host: ");
  client.println(SERVER_HOST);

  client.println("Content-Type: application/json");

  client.print("X-API-Key: ");
  client.println(API_KEY);

  client.print("Content-Length: ");
  client.println(body.length());

  client.println("Connection: close");
  client.println();
  client.println(body);

  unsigned long timeout = millis() + 5000;
  while (client.available() == 0) {
    if (millis() > timeout) {
      Serial.println("[sendValue] response timeout");
      client.stop();
      return false;
    }
  }

  String statusLine = client.readStringUntil('\n');
  Serial.print("[sendValue] response: ");
  Serial.println(statusLine);

  client.stop();

  return statusLine.indexOf("200") != -1;
}

void updateDisplay() {
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Rollout");

  display.setTextSize(4);
  display.setCursor(10, 24);
  display.print(counter);
  display.print("%");

  display.setTextSize(1);
  display.setCursor(0, 56);
  switch (state) {
    case SYNCED:  display.print("synced");  break;
    case PENDING: display.print("pending"); break;
    case SENDING: display.print("sending..."); break;
  }

  display.display();
}
