"use strict";

/**
 * Secret-free proof that a platform recently reached ingest.
 * Stores platform, event type, and time only.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_PATH = path.join(ROOT, "data", "platform-live-signals.json");
const PLATFORM_IDS = ["tiktok", "kick", "twitch", "youtube"];

function signalsPath() {
  const override = String(process.env.MIA_PLATFORM_LIVE_SIGNALS || "").trim();
  return override || DEFAULT_PATH;
}

function loadStoredLiveSignals() {
  try {
    const raw = JSON.parse(fs.readFileSync(signalsPath(), "utf8"));
    if (!raw || typeof raw !== "object") return {};
    const out = {};
    for (const id of PLATFORM_IDS) {
      const row = raw[id];
      const at = Number(row && row.at);
      if (!Number.isFinite(at) || at <= 0) continue;
      const eventType =
        row && typeof row.eventType === "string" && row.eventType.trim()
          ? row.eventType.trim().toUpperCase()
          : null;
      out[id] = { at, eventType };
    }
    return out;
  } catch (_err) {
    return {};
  }
}

function notePlatformLiveSignal(platform, meta = {}) {
  const id = String(platform || "").trim().toLowerCase();
  if (!PLATFORM_IDS.includes(id)) {
    return { ok: false, reason: "unknown_platform" };
  }
  const next = loadStoredLiveSignals();
  next[id] = {
    at: Date.now(),
    eventType: String(meta.eventType || "UNKNOWN").trim().toUpperCase() || "UNKNOWN"
  };
  const file = signalsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { ok: true, id, signal: next[id] };
}

module.exports = {
  DEFAULT_PATH,
  signalsPath,
  loadStoredLiveSignals,
  notePlatformLiveSignal
};
