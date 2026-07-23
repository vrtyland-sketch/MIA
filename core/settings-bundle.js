"use strict";

/**
 * Phase 4 — Export / import settings bundle (MVP).
 * JSON bundle: runtime.json slice + director/queue flags + optional viewer-memory.
 */

const fs = require("fs");
const path = require("path");
const streamerProfiles = require("./streamer-profiles");

const ROOT = path.resolve(__dirname, "..");
const RUNTIME_JSON = path.join(ROOT, "config", "runtime.json");
const VIEWER_MEMORY = path.join(ROOT, "data", "viewer-memory.json");
const BUNDLE_VERSION = 1;
const BUNDLE_KIND = "mia-settings-bundle";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
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
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function buildSettingsBundle(options = {}) {
  const includeViewerMemory = options.includeViewerMemory === true;
  const runtime = options.runtime || streamerProfiles.loadRuntimeFile();
  const env = options.env || process.env;

  const bundle = {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    exportedAt: Date.now(),
    note: "No secrets. Overlay never exposes coins — only miaPoints.",
    runtime: {
      phase1: runtime.phase1 || null,
      phase2: runtime.phase2 || null,
      phase3: runtime.phase3 || null,
      phase4: runtime.phase4 || null
    },
    flags: streamerProfiles.collectFlagHints(env),
    voice: streamerProfiles.collectVoicePrefs(env),
    pointers: {
      runtimeConfig: "config/runtime.json",
      giftMap: "scripts/MIA_GIFT_MAP.js",
      soloStream: "config/solo-stream.json"
    },
    viewerMemory: null
  };

  if (includeViewerMemory) {
    bundle.viewerMemory = readJsonSafe(VIEWER_MEMORY, { version: 1, viewers: {} });
  } else {
    bundle.viewerMemoryExcluded = true;
  }

  return { ok: true, bundle };
}

function validateBundle(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "invalid_bundle" };
  }
  if (raw.kind && raw.kind !== BUNDLE_KIND) {
    return { ok: false, error: "wrong_bundle_kind", kind: raw.kind };
  }
  if (raw.runtime && typeof raw.runtime !== "object") {
    return { ok: false, error: "invalid_runtime_slice" };
  }
  return { ok: true };
}

/**
 * Import bundle into config/runtime.json (+ optional viewer-memory).
 * Does not write secrets or .env automatically.
 */
function importSettingsBundle(raw, options = {}) {
  const check = validateBundle(raw);
  if (!check.ok) return check;

  const current = streamerProfiles.loadRuntimeFile();
  const next = { ...current };
  const slice = raw.runtime || {};
  for (const key of ["phase1", "phase2", "phase3", "phase4"]) {
    if (slice[key] && typeof slice[key] === "object") {
      next[key] = slice[key];
    }
  }

  if (options.applyRuntime !== false) {
    writeJsonAtomic(RUNTIME_JSON, next);
  }

  let viewerMemoryImported = false;
  if (
    options.includeViewerMemory === true &&
    raw.viewerMemory &&
    typeof raw.viewerMemory === "object" &&
    raw.viewerMemory.viewers
  ) {
    writeJsonAtomic(VIEWER_MEMORY, raw.viewerMemory);
    viewerMemoryImported = true;
  }

  return {
    ok: true,
    appliedRuntime: options.applyRuntime !== false,
    viewerMemoryImported,
    voiceHints: raw.voice || {},
    flagHints: raw.flags || {},
    restartRecommended: true,
    note: "runtime.json updated; apply flag/voice hints in .env and restart MIA"
  };
}

function getExportFilename() {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
  return `mia-settings-${stamp}.json`;
}

module.exports = {
  BUNDLE_VERSION,
  BUNDLE_KIND,
  buildSettingsBundle,
  validateBundle,
  importSettingsBundle,
  getExportFilename,
  safeString
};
