"use strict";

/**
 * Phase 4 — Streamer config profiles (MVP).
 * Named snapshots under data/streamer-profiles/<safe-name>.json
 * Holds runtime.json slice, flag hints, gift/config pointers, voice prefs.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_DIR = path.join(ROOT, "data", "streamer-profiles");
const RUNTIME_JSON = path.join(ROOT, "config", "runtime.json");
const ACTIVE_META = "_active.json";

const PROFILE_VERSION = 1;

let profilesDir = DEFAULT_DIR;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizeProfileName(name) {
  const input = safeString(name, "");
  if (!input || /[\\/]|\.\./.test(input)) {
    return null;
  }
  const raw = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (!raw || raw === ACTIVE_META.replace(".json", "") || raw.startsWith("_")) {
    return null;
  }
  return raw;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function configureStreamerProfiles(options = {}) {
  if (options.dir) {
    profilesDir = path.isAbsolute(options.dir)
      ? options.dir
      : path.join(ROOT, options.dir);
  }
}

function profilePath(name) {
  const safe = sanitizeProfileName(name);
  if (!safe) return null;
  return path.join(profilesDir, `${safe}.json`);
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return raw && typeof raw === "object" ? raw : fallback;
  } catch (_err) {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function loadRuntimeFile() {
  return readJsonSafe(RUNTIME_JSON, {});
}

function collectVoicePrefs(env = process.env) {
  return {
    edgeVoice: safeString(env.MIA_TTS_EDGE_VOICE, "cs-CZ-VlastaNeural"),
    edgeVoiceKoj: safeString(env.MIA_TTS_EDGE_VOICE_KOJ, "cs-CZ-AntoninNeural"),
    edgeRateMia: safeString(env.MIA_TTS_EDGE_RATE_MIA, "-28%"),
    edgePitchMia: safeString(env.MIA_TTS_EDGE_PITCH_MIA, "+16Hz"),
    edgeRateKoj: safeString(env.MIA_TTS_EDGE_RATE_KOJ, "+32%"),
    edgePitchKoj: safeString(env.MIA_TTS_EDGE_PITCH_KOJ, "-32Hz")
  };
}

function collectFlagHints(env = process.env) {
  const keys = [
    "MIA_ACTION_QUEUE",
    "MIA_STREAM_WATCHDOG",
    "MIA_DIRECTOR",
    "MIA_COMBO_MOMENTS",
    "MIA_VIEWER_MEMORY",
    "MIA_DUAL_VOICE",
    "MIA_TECH_FORMS",
    "MIA_BATTLE_MVP",
    "MIA_VIEWER_INVENTORY",
    "MIA_USER_MODE"
  ];
  const flags = {};
  for (const key of keys) {
    const v = safeString(env[key], "");
    if (v) flags[key] = v;
  }
  return flags;
}

function defaultPointers() {
  return {
    runtimeConfig: "config/runtime.json",
    giftMap: "scripts/MIA_GIFT_MAP.js",
    soloStream: "config/solo-stream.json",
    note: "Pointers only — gift map remains code-backed until dedicated gifts.json exists."
  };
}

function buildProfileSnapshot(name, options = {}) {
  const safe = sanitizeProfileName(name);
  if (!safe) {
    return { ok: false, error: "invalid_profile_name" };
  }
  const runtime = options.runtime || loadRuntimeFile();
  const env = options.env || process.env;
  return {
    ok: true,
    profile: {
      version: PROFILE_VERSION,
      name: safe,
      label: safeString(options.label, safe),
      savedAt: Date.now(),
      runtime: {
        phase1: runtime.phase1 || null,
        phase2: runtime.phase2 || null,
        phase3: runtime.phase3 || null,
        phase4: runtime.phase4 || null
      },
      flags: collectFlagHints(env),
      pointers: { ...defaultPointers(), ...(options.pointers || {}) },
      voice: collectVoicePrefs(env)
    }
  };
}

function listProfiles() {
  ensureDir(profilesDir);
  const active = readJsonSafe(path.join(profilesDir, ACTIVE_META), null);
  const names = fs
    .readdirSync(profilesDir)
    .filter((f) => f.endsWith(".json") && f !== ACTIVE_META)
    .map((f) => f.replace(/\.json$/i, ""))
    .sort();
  const profiles = names.map((name) => {
    const data = readJsonSafe(profilePath(name), {});
    return {
      name,
      label: data.label || name,
      savedAt: data.savedAt || null,
      active: active?.name === name
    };
  });
  return {
    ok: true,
    dir: path.relative(ROOT, profilesDir).replace(/\\/g, "/"),
    active: active?.name || null,
    profiles
  };
}

function saveProfile(name, options = {}) {
  const built = buildProfileSnapshot(name, options);
  if (!built.ok) return built;
  const file = profilePath(built.profile.name);
  writeJsonAtomic(file, built.profile);
  return {
    ok: true,
    name: built.profile.name,
    path: path.relative(ROOT, file).replace(/\\/g, "/"),
    profile: built.profile
  };
}

function readProfile(name) {
  const file = profilePath(name);
  if (!file) return { ok: false, error: "invalid_profile_name" };
  const data = readJsonSafe(file, null);
  if (!data) return { ok: false, error: "profile_not_found", name: sanitizeProfileName(name) };
  return { ok: true, name: sanitizeProfileName(name), profile: data, path: file };
}

/**
 * Apply profile runtime slice into config/runtime.json.
 * Env voice/flags are returned as hints — process restart recommended for env.
 */
function loadProfile(name, options = {}) {
  const read = readProfile(name);
  if (!read.ok) return read;

  const current = loadRuntimeFile();
  const next = { ...current };
  const slice = read.profile.runtime || {};
  for (const key of ["phase1", "phase2", "phase3", "phase4"]) {
    if (slice[key] && typeof slice[key] === "object") {
      next[key] = slice[key];
    }
  }
  if (options.applyRuntime !== false) {
    writeJsonAtomic(RUNTIME_JSON, next);
  }

  ensureDir(profilesDir);
  writeJsonAtomic(path.join(profilesDir, ACTIVE_META), {
    name: read.name,
    loadedAt: Date.now(),
    voiceHints: read.profile.voice || {},
    flagHints: read.profile.flags || {}
  });

  return {
    ok: true,
    name: read.name,
    appliedRuntime: true,
    restartRecommended: true,
    voiceHints: read.profile.voice || {},
    flagHints: read.profile.flags || {},
    note: "runtime.json updated; set env voice/flags from hints and restart MIA"
  };
}

function deleteProfile(name) {
  const file = profilePath(name);
  if (!file) return { ok: false, error: "invalid_profile_name" };
  if (!fs.existsSync(file)) return { ok: false, error: "profile_not_found" };
  fs.unlinkSync(file);
  const activePath = path.join(profilesDir, ACTIVE_META);
  const active = readJsonSafe(activePath, null);
  if (active?.name === sanitizeProfileName(name) && fs.existsSync(activePath)) {
    fs.unlinkSync(activePath);
  }
  return { ok: true, name: sanitizeProfileName(name) };
}

function getActiveProfileMeta() {
  ensureDir(profilesDir);
  return readJsonSafe(path.join(profilesDir, ACTIVE_META), null);
}

function getProfilesPublicSnapshot() {
  const listed = listProfiles();
  return {
    enabled: true,
    dir: listed.dir,
    active: listed.active,
    count: listed.profiles.length,
    profiles: listed.profiles
  };
}

module.exports = {
  PROFILE_VERSION,
  DEFAULT_DIR,
  configureStreamerProfiles,
  sanitizeProfileName,
  buildProfileSnapshot,
  listProfiles,
  saveProfile,
  readProfile,
  loadProfile,
  deleteProfile,
  getActiveProfileMeta,
  getProfilesPublicSnapshot,
  loadRuntimeFile,
  collectVoicePrefs,
  collectFlagHints
};
