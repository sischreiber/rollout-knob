require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY;

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS. Copy backend/.env.example to backend/.env and add your service account key path."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const remoteConfig = admin.remoteConfig();
const app = express();

app.use(express.json());

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return res.status(500).json({ error: "Server missing API_KEY env var" });
  }

  const provided = req.get("x-api-key");
  if (provided !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

function parseRolloutValue(body) {
  const raw =
    body.rollout_percentage ?? body.rollout ?? body.value ?? body.percentage;

  if (raw === undefined || raw === null || raw === "") {
    return { error: "Missing rollout_percentage (0–100)" };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { error: "rollout_percentage must be a number" };
  }

  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 100) {
    return { error: "rollout_percentage must be between 0 and 100" };
  }

  return { value: rounded };
}

async function publishRolloutPercentage(value) {
  const template = await remoteConfig.getTemplate();
  const param = template.parameters.rollout_percentage;

  if (!param) {
    throw new Error(
      'Remote Config parameter "rollout_percentage" not found. Create and publish it in the Firebase Console first.'
    );
  }

  param.defaultValue = { value: String(value) };
  await remoteConfig.publishTemplate(template);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/rollout", requireApiKey, async (_req, res) => {
  try {
    const template = await remoteConfig.getTemplate();
    const param = template.parameters.rollout_percentage;

    if (!param?.defaultValue?.value) {
      return res.status(404).json({ error: "rollout_percentage not configured" });
    }

    res.json({
      rollout_percentage: Number(param.defaultValue.value),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/rollout", requireApiKey, async (req, res) => {
  const parsed = parseRolloutValue(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    await publishRolloutPercentage(parsed.value);
    res.json({
      ok: true,
      rollout_percentage: parsed.value,
      published_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`rollout-knob backend listening on http://localhost:${PORT}`);
  console.log("POST /rollout with { rollout_percentage: 0-100 }");
  console.log("Run `npm run mock -- 50` or `npm run mock -- --sweep` to simulate the Arduino");
});
