#ifndef ARDUINO_SECRETS_H
#define ARDUINO_SECRETS_H

// Copy from arduino_secrets.example.h and fill in your values.
// This file is gitignored — never commit real credentials.

const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_HOST   = "192.168.X.X";  // local IP of machine running backend
const char* API_KEY       = "YOUR_API_KEY"; // must match backend/.env X-API-Key

#endif
