# rollout-knob

A physical rollout dial for Firebase Remote Config.

Turn a knob → backend publishes the percentage → Firebase Remote Config → live web display.

**Live:** https://rollout-knob.vercel.app

## Structure

| Folder | What it is | Where it runs |
|--------|------------|---------------|
| **web/** | Static page that reads Remote Config and shows the rollout % | **Vercel** (production) or localhost (dev) |
| **backend/** | Node.js API that writes `rollout_percentage` via Firebase Admin SDK | **Your machine** (dev) or **Railway / Render** (production later) |
| **arduino/** | UNO R4 WiFi sketch (coming later) | On the physical device |

## Data flow

```
Physical dial (Arduino)  →  Backend (Admin SDK)  →  Firebase Remote Config  →  Web page (reads live)
        ↑ mock-arduino.js simulates this step today
```

## What runs on Firebase?

**Firebase stores and serves Remote Config** — it does not run your backend.

| Component | On Firebase? |
|-----------|--------------|
| Remote Config (`rollout_percentage`) | ✅ Yes |
| Web app config (apiKey, projectId, …) | ✅ Yes (just config, not hosting) |
| Backend Express server | ❌ No — runs locally or on Railway/Render/etc. |
| Live display page | ❌ No — runs on Vercel |

Firebase Hosting is static-only (like Vercel). Use it for the web page if you want, but this project uses Vercel.

---

## Backend — quick start

The backend accepts a rollout value (from the Arduino or mock script) and **publishes** it to Remote Config. The web page then picks it up on its next poll.

### One-time backend setup

1. **Service account key** (Admin SDK credentials)
   - Firebase Console → **Project settings → Service accounts**
   - **Generate new private key** → save as `backend/serviceAccountKey.json`
   - ⚠️ Gitignored — never commit this file

2. **Environment file**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env`:
   ```env
   PORT=3000
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   API_KEY=pick-a-long-random-string
   BACKEND_URL=http://localhost:3000
   ```

3. **Install dependencies** (first time only)
   ```bash
   cd backend
   npm install
   ```

### Start the backend

```bash
cd backend
npm start
```

You should see:
```
rollout-knob backend listening on http://localhost:3000
```

Health check (no auth):
```bash
curl http://localhost:3000/health
```

### Mock the Arduino (no hardware needed)

Open a **second terminal** (keep the server running in the first):

```bash
cd backend
npm run mock -- 50          # send 50% once
npm run mock -- --sweep     # cycle 0→100 in steps of 5, every 2s
```

Or with curl:
```bash
curl -X POST http://localhost:3000/rollout \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY_FROM_ENV" \
  -d '{"rollout_percentage": 75}'
```

Then watch https://rollout-knob.vercel.app — should update within ~10 seconds.

### Backend API

| Method | Path | Auth | Body |
|--------|------|------|------|
| `GET` | `/health` | none | — |
| `GET` | `/rollout` | `X-API-Key` header | — |
| `POST` | `/rollout` | `X-API-Key` header | `{ "rollout_percentage": 50 }` |

The real Arduino sketch will send the same `POST /rollout` request over WiFi later.

---

## Cheat sheet

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

**Files you must create locally (never in git):**

| File | How to get it |
|------|---------------|
| `backend/serviceAccountKey.json` | Firebase Console → Project settings → Service accounts → Generate new private key |
| `backend/.env` | Copy from `backend/.env.example` |

**Firebase Console reminders:**

- Remote Config changes → always click **Publish changes**
- Web app config → Project settings → Your apps → Web → **Config**
- Service account → Project settings → **Service accounts**
