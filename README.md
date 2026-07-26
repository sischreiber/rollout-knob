# rollout-knob

A physical rollout dial for Firebase Remote Config.

```
Arduino → Backend → Firebase Remote Config → Web page (Vercel)
```

| Folder | Runs on |
|--------|---------|
| `web/` | Vercel |
| `backend/` | Localhost (later Railway/Render) — **not** Firebase |
| `arduino/` | Device (later) |

---

## Firebase (once)

1. Create project, register **web app** (no Hosting).
2. Remote Config: parameter `rollout_percentage` (Number, default `0`) → **Publish**.
3. Copy web app **Config** into `web/index.html` → Project settings → Your apps → Web.
4. Service account key → `backend/serviceAccountKey.json` → Project settings → Service accounts → Generate new private key.

---

## Web

**Live:** https://rollout-knob.vercel.app

Vercel Root Directory: `web`. Redeploy after changing it.

```bash
cd web && python3 -m http.server 8080
```

---

## Backend

```bash
cp backend/.env.example backend/.env   # set API_KEY
cd backend && npm install && npm start
```

Mock Arduino (second terminal):

```bash
cd backend && npm run mock -- 50
cd backend && npm run mock -- --sweep
```

`POST /rollout` with header `X-API-Key` and body `{ "rollout_percentage": 50 }`.

Page updates within ~10s.

---

## Local files (gitignored)

- `backend/serviceAccountKey.json`
- `backend/.env`
