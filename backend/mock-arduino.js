require("dotenv").config();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Missing API_KEY. Copy backend/.env.example to backend/.env first.");
  process.exit(1);
}

async function sendRollout(rolloutPercentage) {
  const response = await fetch(`${BACKEND_URL}/rollout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ rollout_percentage: rolloutPercentage }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sweep() {
  console.log(`Mock Arduino sweep → ${BACKEND_URL}/rollout`);
  console.log("Press Ctrl+C to stop\n");

  while (true) {
    for (let value = 0; value <= 100; value += 5) {
      const result = await sendRollout(value);
      console.log(`Sent ${value}% → published at ${result.published_at}`);
      await sleep(2000);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--sweep")) {
    await sweep();
    return;
  }

  const valueArg = args.find((arg) => !arg.startsWith("--"));
  if (valueArg === undefined) {
    console.log("Usage:");
    console.log("  npm run mock -- 50          send one value");
    console.log("  npm run mock -- --sweep     cycle 0→100 every 2s");
    process.exit(1);
  }

  const value = Number(valueArg);
  if (!Number.isFinite(value)) {
    console.error("Value must be a number between 0 and 100");
    process.exit(1);
  }

  const result = await sendRollout(value);
  console.log(`Sent ${result.rollout_percentage}% → ${BACKEND_URL}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
