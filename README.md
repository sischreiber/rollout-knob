# rollout-knob

rollout-knob is a small hardware side project that puts a physical dial in front of Firebase Remote Config. Instead of changing a feature's rollout percentage in the Firebase Console, you turn a mechanical knob and watch the value go live on a web page.

A KY-040 rotary encoder sets the percentage, an OLED shows it, a Node.js backend writes it into Remote Config, and a static page reflects the change on its next poll. The whole loop runs on my own hardware and network.

## How a knob turn reaches the live web page

A knob turn travels through four systems before it shows up on the page:

1. Read the KY-040 encoder and hold the change as **pending** (no write yet)
2. Press the button to commit — the sketch fires a single `POST /rollout` over WiFi
3. Backend validates the `X-API-Key` header, then publishes via Firebase Admin SDK (writes `rollout_percentage` straight into Remote Config — no manual Console publish per turn)
4. OLED steps through **pending → sending → synced** so the device state is always visible
5. Web page polls Remote Config every 10 seconds and reflects the new value on its next poll

## Structure

| Folder       | What it is                                                          | Where it runs                               |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------- |
| **arduino/** | UNO R4 WiFi sketch — KY-040 encoder + OLED, POSTs on button press   | On the physical device                      |
| **backend/** | Node.js/Express API that writes `rollout_percentage` via Admin SDK  | Locally, on the same network as the Arduino |
| **web/**     | Static page that reads Remote Config and shows the rollout %        | Vercel                                      |

## Arduino

An Arduino sketch (C++) runs on the UNO R4 WiFi. It reads the KY-040 rotary encoder into a value from 0 to 100 and shows it on the SSD1306 OLED. On a button press it POSTs that value to the backend over WiFi.

The fiddly parts live in the sketch: debouncing the mechanical button, tracking turn direction, and stepping through the pending → sending → synced states so the display always shows where the value stands.

Sketch: `arduino/rollout-knob/rollout-knob.ino`.

1. Install libraries: **WiFiS3**, **Adafruit SSD1306**, **Adafruit GFX**
2. Copy `arduino/arduino_secrets.example.h` → `arduino/arduino_secrets.h` (gitignored)
3. Fill in WiFi, your Mac's local IP (`SERVER_HOST`), and `API_KEY` (must match `backend/.env`)
4. Backend must be running on the same network (`npm start`, listens on `0.0.0.0:3000`)
5. Turn knob → **pending** → press button → **sending** → **synced** → Vercel updates within ~10s

## Backend

A small Node.js/Express server runs locally on the same network as the Arduino. It exposes an API-key-protected `POST /rollout`, validates the `X-API-Key` header, and writes the percentage into Remote Config through the Firebase Admin SDK. No manual Console publish needed on each turn. A mock script stands in for the hardware, so the whole pipeline is testable without the physical knob.

### One-time backend setup

1. **Service account key** (Admin SDK credentials)
   - Firebase Console → **Project settings → Service accounts**
   - **Generate new private key** → save as `backend/serviceAccountKey.json`
   - Gitignored — never commit this file

2. **Environment file** — `cp backend/.env.example backend/.env` and fill in the values

3. **Install dependencies** (first time only) — `cd backend && npm install`

### Start the backend

```bash
cd backend
npm start
```

### Mock the Arduino (no hardware needed)

Open a **second terminal** (keep the server running in the first):

```bash
cd backend
npm run mock -- 50          # send 50% once
npm run mock -- --sweep     # cycle 0→100 in steps of 5, every 2s
```

Then watch https://rollout-knob.vercel.app — should update within ~10 seconds.

## Firebase

Remote Config holds `rollout_percentage` as the single source of truth. Normally you'd change that value in the Firebase Console. The twist here is that it gets set with a mechanical rotary knob instead.

Firebase only stores and serves the config; it doesn't run the backend. Create the `rollout_percentage` parameter (Number) once in the Console and publish it — after that, the backend publishes each knob turn automatically via the Admin SDK.

## The web page

**Live:** https://rollout-knob.vercel.app

A plain static page on Vercel polls `rollout_percentage` every 10 seconds through the Firebase Web SDK and displays it with a grey-to-green background gradient. When the value changes, the page catches up on its next poll. From turning the knob to the value showing up takes about ten seconds — mostly the polling interval, not the transfer.

**Local:** copy `web/config.local.example.js` → `web/config.local.js` and fill in your Firebase web app config.

**Vercel:** set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, and `FIREBASE_APP_ID` as environment variables — the build generates `config.local.js` from them.

## Cheat sheet

Because I tend to forget terminal commands, here's everything in one place:

```bash
# ── Web (local preview) ──
cd web && python3 -m http.server 8080

# ── Backend (terminal 1) ──
cd backend && npm start

# ── Mock Arduino (terminal 2) ──
cd backend && npm run mock -- 50
cd backend && npm run mock -- --sweep

# ── Manual API test ──
curl http://localhost:3000/health
curl -X POST http://localhost:3000/rollout \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"rollout_percentage": 42}'
```

**Local files (gitignored):** `arduino/arduino_secrets.h`, `backend/.env`, `backend/serviceAccountKey.json`, `web/config.local.js`

## About

A side project I mostly built for myself and my kids to play with. Vibecoded throughout with Claude and Cursor. The full pin layout, sketch and backend setup live in this repo, so it can be rebuilt from scratch.
