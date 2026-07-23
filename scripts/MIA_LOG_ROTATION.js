"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 7;

function getMaxBytes() {
  const mb = Number(process.env.MIA_LOG_MAX_MB);
  if (Number.isFinite(mb) && mb > 0) {
    return Math.floor(mb * 1024 * 1024);
  }
  return DEFAULT_MAX_BYTES;
}

function getRetentionDays() {
  const days = Number(process.env.MIA_LOG_RETENTION_DAYS);
  if (Number.isFinite(days) && days > 0) {
    return Math.floor(days);
  }
  return DEFAULT_RETENTION_DAYS;
}

function prepareLogFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);
    if (stat.size < getMaxBytes()) {
      return;
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ".jsonl");
    let index = 1;

    while (fs.existsSync(path.join(dir, `${base}.${index}.jsonl`))) {
      index += 1;
    }

    fs.renameSync(filePath, path.join(dir, `${base}.${index}.jsonl`));
  } catch (err) {
    console.error("[LOG_ROTATION]", err.message);
  }
}

function cleanupOldLogs(logsDir) {
  const retentionMs = getRetentionDays() * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;

  try {
    const names = fs.readdirSync(logsDir);

    for (const name of names) {
      if (!name.endsWith(".jsonl")) {
        continue;
      }

      const fullPath = path.join(logsDir, name);
      const stat = fs.statSync(fullPath);

      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error("[LOG_ROTATION_CLEANUP]", err.message);
  }
}

module.exports = {
  DEFAULT_MAX_BYTES,
  DEFAULT_RETENTION_DAYS,
  getMaxBytes,
  getRetentionDays,
  prepareLogFile,
  cleanupOldLogs
};
