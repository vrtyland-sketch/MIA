"use strict";

/**
 * Intake from Windows clipboard without echoing secrets.
 * - API key (AIza…) → .env + secrets/local/youtube_credentials.json
 * - YouTube video id from URL → .env YOUTUBE_VIDEO_ID
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const SECRET_PATH = path.join(ROOT, "secrets", "local", "youtube_credentials.json");

function getClipboard() {
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", "[Console]::Out.Write([string](Get-Clipboard -Raw))"],
    { encoding: "utf8", maxBuffer: 2_000_000 }
  );
  if (r.error) throw r.error;
  return String(r.stdout || "");
}

function setEnv(env, name, val) {
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(env)) return env.replace(re, `${name}=${val}`);
  return `${env.replace(/\s*$/, "")}\n${name}=${val}\n`;
}

function writeEnv(updates) {
  let env = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  for (const [k, v] of Object.entries(updates)) env = setEnv(env, k, v);
  fs.writeFileSync(ENV_PATH, env, "utf8");
}

function saveApiKey(key) {
  writeEnv({ MIA_YOUTUBE_ENABLED: "1", YOUTUBE_API_KEY: key });
  fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
  let prev = {};
  try {
    if (fs.existsSync(SECRET_PATH)) prev = JSON.parse(fs.readFileSync(SECRET_PATH, "utf8"));
  } catch (_e) {
    /* ignore */
  }
  const fingerprint = crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
  fs.writeFileSync(
    SECRET_PATH,
    JSON.stringify(
      {
        ...prev,
        savedAt: new Date().toISOString(),
        projectId: "mia-youtube-504118",
        projectName: "MIA YouTube",
        authMode: "api_key",
        apiKeyName: "rotated",
        apiKey: key,
        apiKeyFingerprint: fingerprint,
        note: "gitignored; do not commit"
      },
      null,
      2
    ),
    "utf8"
  );
  return { ok: true, saved: "api_key", fingerprint };
}

function saveVideoId(id) {
  writeEnv({ MIA_YOUTUBE_ENABLED: "1", YOUTUBE_VIDEO_ID: id });
  return { ok: true, saved: "video_id", videoIdLen: id.length };
}

function main() {
  const clip = getClipboard();
  const results = [];

  const keyMatch = clip.match(/AIza[0-9A-Za-z_-]{20,}/);
  if (keyMatch) results.push(saveApiKey(keyMatch[0]));

  const vidMatch =
    clip.match(/(?:v=|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/) ||
    clip.match(/\b([A-Za-z0-9_-]{11})\b/);
  // Only accept video id if URL-shaped match first; avoid random 11-char noise
  const urlVid = clip.match(/(?:v=|\/live\/|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (urlVid) results.push(saveVideoId(urlVid[1]));

  if (!results.length) {
    console.log(
      JSON.stringify({
        ok: false,
        reason: "clipboard_has_neither_api_key_nor_video_url",
        clipLen: clip.length
      })
    );
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, results }));
}

main();
