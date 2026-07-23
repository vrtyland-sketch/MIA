"use strict";

const fs = require("fs");
const path = require("path");

const ASSETS_ROOT = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout"
);
const MEGA_DIR = path.join(ASSETS_ROOT, "mega");
const MANIFEST_PATH = path.join(MEGA_DIR, "mega-bank-manifest.json");

const MEGA_VARIANT_COUNT = 300;
const MOOD_SEED_COUNT = 10;

let cachedManifest = null;
let manifestLoadedAt = 0;
const MANIFEST_TTL_MS = 60000;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch (_err) {
    return false;
  }
}

function loadMegaManifest(force = false) {
  const now = Date.now();
  if (!force && cachedManifest && now - manifestLoadedAt < MANIFEST_TTL_MS) {
    return cachedManifest;
  }
  if (!fileExists(MANIFEST_PATH)) {
    cachedManifest = null;
    manifestLoadedAt = now;
    return null;
  }
  try {
    cachedManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    manifestLoadedAt = now;
    return cachedManifest;
  } catch (_err) {
    cachedManifest = null;
    manifestLoadedAt = now;
    return null;
  }
}

function isMegaBankReady() {
  const manifest = loadMegaManifest();
  return Boolean(manifest && toNumber(manifest.totalCount, 0) >= 300);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function resolveMoodSeed(state = {}, mood = "idle", now = Date.now()) {
  const feedPoints = toNumber(state.feedPoints, 0);
  const feedSeq = toNumber(state.sessionFeedCount, feedPoints);
  const lastFedAt = toNumber(state.lastFedAt, 0);
  const tick = lastFedAt > 0 ? Math.floor(lastFedAt / 700) : Math.floor(now / 700);
  return Math.abs(feedSeq + tick + mood.length) % MOOD_SEED_COUNT;
}

function resolveMegaSpriteEntry(mood = "idle", seed = 0) {
  const manifest = loadMegaManifest();
  const safeMood = safeString(mood, "idle").toLowerCase();
  const safeSeed = clamp(Math.floor(toNumber(seed, 0)), 0, MOOD_SEED_COUNT - 1);
  const id = `${safeMood}-s${pad2(safeSeed)}`;
  const entry =
    manifest?.sprites?.find((s) => s.id === id) ||
    manifest?.sprites?.find((s) => s.mood === safeMood && s.seed === safeSeed);

  const rel = entry?.file || `mega/sprites/koj-${safeMood}-s${pad2(safeSeed)}.png`;
  const abs = path.join(ASSETS_ROOT, rel);
  if (!fileExists(abs)) {
    return null;
  }

  return {
    id,
    mood: safeMood,
    seed: safeSeed,
    file: rel,
    publicPath: `assets/kojnozrout/${rel}`
  };
}

function resolveMegaSpriteForState(mood = "idle", state = {}, now = Date.now()) {
  if (!isMegaBankReady()) return null;
  const seed = resolveMoodSeed(state, mood, now);
  return resolveMegaSpriteEntry(mood, seed);
}

function resolveMegaSceneEntry(mood = "idle", program = "generic_support", seed = 0) {
  const manifest = loadMegaManifest();
  if (!manifest?.scenes?.length) return null;

  const safeMood = safeString(mood, "idle").toLowerCase();
  const safeProgram = safeString(program, "generic_support");
  const safeSeed = clamp(Math.floor(toNumber(seed, 0)), 0, MOOD_SEED_COUNT - 1);

  let entry = manifest.scenes.find(
    (s) => s.mood === safeMood && s.program === safeProgram && s.seed === safeSeed
  );
  if (!entry) {
    entry = manifest.scenes.find((s) => s.mood === safeMood && s.program === safeProgram);
  }
  if (!entry) {
    const idx = Math.abs(safeMood.length + safeProgram.length + safeSeed) % manifest.scenes.length;
    entry = manifest.scenes[idx];
  }

  const rel = entry?.file;
  if (!rel) return null;
  const abs = path.join(ASSETS_ROOT, rel);
  if (!fileExists(abs)) return null;

  return {
    id: entry.id,
    mood: entry.mood,
    program: entry.program,
    seed: entry.seed,
    layout: entry.layout,
    file: rel,
    publicPath: `assets/kojnozrout/${rel}`
  };
}

function resolveMegaVariantIndex(input = {}) {
  const explicit = toNumber(input.variantIndex, 0);
  if (explicit >= 1 && explicit <= MEGA_VARIANT_COUNT) {
    return Math.floor(explicit);
  }

  const tier = safeString(input.tier, "T1").toUpperCase();
  const mood = safeString(input.kojMood, "happy");
  const giftKey = safeString(input.giftKey, "gift");
  const userKey = safeString(input.userLabel, "divak");

  const tierBase = { T1: 8, T2: 68, T3: 148, T4: 228 }[tier] || 8;
  const moodOffset = {
    idle: 0,
    warm: 3,
    happy: 6,
    hungry: 9,
    excited: 12,
    eating: 15,
    full: 18,
    sleepy: 21,
    sick: 24,
    sad: 27,
    annoyed: 30,
    laugh: 33,
    stressed: 36
  }[mood] ?? 6;

  const hash = require("crypto")
    .createHash("sha1")
    .update(`${giftKey}:${userKey}:${tier}:${mood}`)
    .digest("hex");
  const jitter = parseInt(hash.slice(0, 4), 16) % 22;
  return clamp(tierBase + moodOffset + jitter, 1, MEGA_VARIANT_COUNT);
}

function pickMegaSceneForGift(input = {}) {
  const mood = safeString(input.kojMood, "happy");
  const program = safeString(input.effectProgram, "generic_support");
  const variantIndex = resolveMegaVariantIndex(input);
  const seed = variantIndex % MOOD_SEED_COUNT;
  return resolveMegaSceneEntry(mood, program, seed);
}

function getMegaBankSnapshot() {
  const manifest = loadMegaManifest(true);
  if (!manifest) {
    return { ready: false, totalCount: 0 };
  }
  return {
    ready: toNumber(manifest.totalCount, 0) >= 300,
    totalCount: manifest.totalCount,
    spriteCount: manifest.spriteCount,
    backgroundCount: manifest.backgroundCount,
    sceneCount: manifest.sceneCount,
    generatedAt: manifest.generatedAt,
    manifestPath: MANIFEST_PATH.replace(/\\/g, "/")
  };
}

module.exports = {
  ASSETS_ROOT,
  MEGA_DIR,
  MANIFEST_PATH,
  MEGA_VARIANT_COUNT,
  MOOD_SEED_COUNT,
  loadMegaManifest,
  isMegaBankReady,
  resolveMoodSeed,
  resolveMegaSpriteEntry,
  resolveMegaSpriteForState,
  resolveMegaSceneEntry,
  resolveMegaVariantIndex,
  pickMegaSceneForGift,
  getMegaBankSnapshot
};
