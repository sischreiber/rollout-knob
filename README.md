# rollout-knob

A physical rollout dial for Firebase Remote Config.

## Structure

- **web/** — Static Vercel page that reads Remote Config live and displays the current rollout percentage.
- **arduino/** — UNO R4 WiFi sketch (coming later).
- **backend/** — Node.js middleware with Firebase Admin SDK (coming later).

## Data flow

```
Arduino → Backend (Admin SDK) → Firebase Remote Config → Web page (reads live)
```

## Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Register a web app (do **not** enable Firebase Hosting).
3. In Remote Config, create a parameter named `rollout_percentage` (type **Number**) and **Publish** it.
4. Copy your web app config into `web/index.html` (replace the `firebaseConfig` placeholders).
5. Deploy to [Vercel](https://vercel.com/): import the repo and set **Root Directory** to `web`.
