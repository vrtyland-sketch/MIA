"use strict";

/**
 * Phase 1 — append-only JSONL event log for future replay.
 * Default: logs/mia-runtime-events-YYYY-MM-DD.jsonl
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_DIR = path.join(ROOT, "logs");

let logDir = DEFAULT_DIR;
let enabled =
  String(process.env.MIA_EVENT_LOG || "1").trim() !== "0" &&
  String(process.env.MIA_EVENT_LOG || "1").trim().toLowerCase() !== "false";

function setEventLogEnabled(value) {
  enabled = value === true;
}

function isEventLogEnabled() {
  return enabled;
}

function setEventLogDir(dir) {
  if (dir) logDir = path.resolve(dir);
}

function dayStamp(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function resolveLogPath(ts = Date.now()) {
  return path.join(logDir, `mia-runtime-events-${dayStamp(ts)}.jsonl`);
}

function appendRuntimeEvent(event = {}, meta = {}) {
  if (!enabled) return { ok: false, skipped: true, reason: "disabled" };
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = JSON.stringify({
      loggedAt: Date.now(),
      ...meta,
      event
    });
    const filePath = resolveLogPath();
    fs.appendFileSync(filePath, `${line}\n`, "utf8");
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  appendRuntimeEvent,
  setEventLogEnabled,
  isEventLogEnabled,
  setEventLogDir,
  resolveLogPath
};
