# rollout-knob

A physical rollout dial for Firebase Remote Config.

Turn a knob → backend publishes the percentage → Firebase Remote Config → live web display on Vercel.

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

## One-time Firebase setup

Do this once when creating the project.

1. Create a project in the [Firebase Console](https://console.firebase.google.com/) (e.g. `rollout-knob`).
2. **Register a web app** (gear icon → Project settings → Your apps → Add app → Web).
   - Do **not** enable Firebase Hosting.
   - Copy the `firebaseConfig` object.
3. **Remote Config:** create parameter `rollout_percentage`
   - Type: **Number**
   - Default: `0`
   - Click **Save**, then **Publish changes** (values are not live until published!)
4. Paste `firebaseConfig` into `web/index.html` (replace the `YOUR_*` placeholders).
   - Same place in Console: **Project settings → Your apps → Web app → Config**

---

## Web page (Vercel)

**Live URL:** https://rollout-knob.vercel.app

### Deploy / redeploy on Vercel

1. Import the GitHub repo on [Vercel](https://vercel.com/).
2. **Settings → General → Root Directory:** `web` → Save.
3. **Settings → Build & Deployment:**
   - Framework Preset: **Other**
   - Build / Install commands: **empty**
4. After changing Root Directory, **Deployments → Redeploy** (old deploys 404 without this).

### Preview locally

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

The page polls Remote Config every 10 seconds. After changing a value in the Console (and publishing), wait up to 10s for the display to update.

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

## Cheat sheet (commands I always forget)

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

---

## Production backend (later)

For the real Arduino dial, deploy `backend/` to a Node.js host so the device can reach it over the internet:

- [Railway](https://railway.app/) or [Render](https://render.com/) — easy, free tier
- Set the same env vars (`GOOGLE_APPLICATION_CREDENTIALS` as a secret/json, `API_KEY`, `PORT`)
- Point the Arduino (and `BACKEND_URL` in mock script) at the public URL

Not on Firebase — Firebase has no Express/server hosting (only Cloud Functions, which this project doesn't use).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Vercel shows 404 | Root Directory = `web`, then **Redeploy** |
| Page stuck at 0% | Check `firebaseConfig` in `web/index.html`; publish Remote Config |
| Backend won't start | Missing `backend/.env` or `serviceAccountKey.json` |
| Mock returns 401 | `X-API-Key` in `.env` must match what mock/curl sends |
| Page doesn't update after mock | Wait ~10s (web polls every 10s); check backend logs for errors |
| Remote Config change ignored | Did you click **Publish changes** in Firebase Console? |
