"use strict";

/**
 * Token / secret store for platform OAuth & API keys.
 * Files live under secrets/local/ (gitignored). Never log raw tokens.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const LOCAL_DIR = path.join(ROOT, "secrets", "local");

const PLATFORM_FILES = Object.freeze({
  twitch: "twitch_oauth.json",
  youtube: "youtube_oauth.json",
  kick: "kick_credentials.json",
  discord: "discord_oauth.json"
});

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

function filePath(platform) {
  const name = PLATFORM_FILES[platform] || `${platform}_credentials.json`;
  return path.join(LOCAL_DIR, name);
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_err) {
    return null;
  }
}

function writeJsonSafe(file, data) {
  ensureLocalDir();
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function maskToken(value) {
  const s = String(value || "");
  if (s.length < 8) return s ? "***" : "";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function loadTokens(platform) {
  return readJsonSafe(filePath(platform));
}

function saveTokens(platform, payload = {}) {
  const existing = loadTokens(platform) || {};
  const next = {
    ...existing,
    ...payload,
    platform,
    updatedAt: new Date().toISOString()
  };
  writeJsonSafe(filePath(platform), next);
  return { ok: true, path: filePath(platform), platform };
}

function tokenStatus(platform) {
  const data = loadTokens(platform);
  if (!data) {
    return {
      platform,
      present: false,
      path: filePath(platform),
      fields: {}
    };
  }
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "platform" || k === "updatedAt" || k === "expiresAt") {
      fields[k] = v;
      continue;
    }
    if (/token|secret|key|password/i.test(k) && typeof v === "string") {
      fields[k] = maskToken(v);
    } else {
      fields[k] = v;
    }
  }
  const expired =
    data.expiresAt && Number(new Date(data.expiresAt)) > 0
      ? Date.now() > Number(new Date(data.expiresAt))
      : null;
  return {
    platform,
    present: true,
    path: filePath(platform),
    expired,
    updatedAt: data.updatedAt || null,
    fields
  };
}

function listKnownTokenFiles() {
  return Object.keys(PLATFORM_FILES).map((platform) => tokenStatus(platform));
}

module.exports = {
  LOCAL_DIR,
  PLATFORM_FILES,
  filePath,
  loadTokens,
  saveTokens,
  tokenStatus,
  listKnownTokenFiles,
  maskToken
};
