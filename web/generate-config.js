import fs from "fs";

const envVarNames = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID",
};

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => envVarNames[key]);

if (missing.length > 0) {
  console.error("Missing Vercel environment variables:");
  missing.forEach((name) => console.error(`  - ${name}`));
  console.error("Add them in Vercel → Settings → Environment Variables, then redeploy.");
  process.exit(1);
}

fs.writeFileSync(
  "config.local.js",
  `export const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};\n`
);

console.log("Generated config.local.js from environment variables");
