"use strict";

/**
 * Save YouTube API key from stdin into .env + secrets/local (gitignored).
 * Usage:  Get-Clipboard | node scripts/mia_save_youtube_api_key.js
 * Never logs the raw key.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const SECRET_PATH = path.join(ROOT, "secrets", "local", "youtube_credentials.json");

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => {
      data += c;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function setEnv(env, name, val) {
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(env)) return env.replace(re, `${name}=${val}`);
  return `${env.replace(/\s*$/, "")}\n${name}=${val}\n`;
}

async function main() {
  const raw = (await readStdin()).trim();
  if (!raw || raw.length < 20 || !/^AIza/.test(raw)) {
    console.log(JSON.stringify({ ok: false, reason: "invalid_or_empty_stdin" }));
    process.exit(1);
  }

  let env = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  env = setEnv(env, "MIA_YOUTUBE_ENABLED", "1");
  env = setEnv(env, "YOUTUBE_API_KEY", raw);
  fs.writeFileSync(ENV_PATH, env, "utf8");

  fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
  let prev = {};
  try {
    if (fs.existsSync(SECRET_PATH)) prev = JSON.parse(fs.readFileSync(SECRET_PATH, "utf8"));
  } catch (_e) {
    /* ignore */
  }

  const fingerprint = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const payload = {
    ...prev,
    savedAt: new Date().toISOString(),
    projectId: "mia-youtube-504118",
    projectName: "MIA YouTube",
    authMode: "api_key",
    apiKeyName: "API key 2",
    apiKey: raw,
    apiKeyFingerprint: fingerprint,
    rotatedFrom: "API key 1 (revoke in Cloud Console)",
    note: "gitignored; do not commit; do not paste into chat"
  };
  fs.writeFileSync(SECRET_PATH, JSON.stringify(payload, null, 2), "utf8");

  console.log(
    JSON.stringify({
      ok: true,
      apiKeyName: "API key 2",
      fingerprint,
      wrote: [".env", "secrets/local/youtube_credentials.json"]
    })
  );
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
