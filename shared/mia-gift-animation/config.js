"use strict";

/**
 * Gift animation generator config (stream-usable procedural v1).
 * Env:
 *   MIA_GIFT_ANIM_AUTO=1          — auto-queue on mapped gifts
 *   MIA_GIFT_ANIM_ASK_WORDS=1     — ask viewer for words before generate
 *   MIA_GIFT_ANIM_MIN_TIER=T3     — auto only from this tier up
 *   MIA_GIFT_ANIM_DURATION_MS=10000
 *   MIA_GIFT_ANIM_WORDS_TIMEOUT_MS=20000
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(ROOT, "data", "gift-animation-config.json");

function pickBool(env, keys, fallback) {
  for (const key of keys) {
    const raw = env[key];
    if (raw == null || raw === "") continue;
    const v = String(raw).trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) return true;
    if (["0", "false", "no", "off"].includes(v)) return false;
  }
  return fallback;
}

function pickNumber(env, keys, fallback) {
  for (const key of keys) {
    const n = Number(env[key]);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickString(env, keys, fallback) {
  for (const key of keys) {
    const v = env[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function loadDiskConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) || {};
  } catch (_err) {
    return {};
  }
}

function saveDiskConfig(partial = {}) {
  const next = { ...getConfig(), ...partial, updatedAt: Date.now() };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function getConfig() {
  const env = process.env;
  const disk = loadDiskConfig();
  return {
    autoEnabled: disk.autoEnabled != null
      ? Boolean(disk.autoEnabled)
      : pickBool(env, ["MIA_GIFT_ANIM_AUTO"], false),
    askWordsByDefault: disk.askWordsByDefault != null
      ? Boolean(disk.askWordsByDefault)
      : pickBool(env, ["MIA_GIFT_ANIM_ASK_WORDS"], false),
    minTier: String(disk.minTier || pickString(env, ["MIA_GIFT_ANIM_MIN_TIER"], "T3")).toUpperCase(),
    durationMs: Math.max(
      6000,
      Math.min(20000, Number(disk.durationMs) || pickNumber(env, ["MIA_GIFT_ANIM_DURATION_MS"], 10000))
    ),
    wordsTimeoutMs: Math.max(
      5000,
      Math.min(60000, Number(disk.wordsTimeoutMs) || pickNumber(env, ["MIA_GIFT_ANIM_WORDS_TIMEOUT_MS"], 20000))
    ),
    // Procedural motion graphics only in v1 (not Runway / Sora).
    // Plug a real video model later via provider: "ai_video".
    provider: String(disk.provider || "procedural_v1"),
    playOnObs: disk.playOnObs != null ? Boolean(disk.playOnObs) : true,
    giftKeysAllow: Array.isArray(disk.giftKeysAllow) ? disk.giftKeysAllow : null
  };
}

module.exports = {
  CONFIG_PATH,
  getConfig,
  saveDiskConfig,
  loadDiskConfig
};
