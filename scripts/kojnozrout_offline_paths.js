"use strict";

/**
 * Cold-storage paths for Koj art backups (off live mood hot path).
 * Live runtime loads only `moods/kojnozout-*.png` (no `.pre-` suffix).
 */

const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "mia-output-overlay", "assets");
const KOJ_LIVE = path.join(ASSETS, "kojnozrout");
const OFFLINE_ROOT = path.join(ASSETS, "_offline_backup");
const OFFLINE_KOJ = path.join(OFFLINE_ROOT, "kojnozrout");

const ARCHIVE_DIR = path.join(OFFLINE_KOJ, "_archive");
const PRENORM_DIR = path.join(OFFLINE_KOJ, "moods", "_prenorm_backup");
const PRE_BACKUP_DIR = path.join(OFFLINE_KOJ, "moods", "pre-backups");

/** Prefer offline archive; fall back to legacy live-tree path if not yet moved. */
function resolveArchiveDir() {
  const fs = require("fs");
  if (fs.existsSync(ARCHIVE_DIR)) return ARCHIVE_DIR;
  const legacy = path.join(KOJ_LIVE, "_archive");
  if (fs.existsSync(legacy)) return legacy;
  return ARCHIVE_DIR;
}

function resolvePrenormDir() {
  const fs = require("fs");
  if (fs.existsSync(PRENORM_DIR)) return PRENORM_DIR;
  const legacy = path.join(KOJ_LIVE, "moods", "_prenorm_backup");
  if (fs.existsSync(legacy)) return legacy;
  return PRENORM_DIR;
}

module.exports = {
  ROOT,
  ASSETS,
  KOJ_LIVE,
  OFFLINE_ROOT,
  OFFLINE_KOJ,
  ARCHIVE_DIR,
  PRENORM_DIR,
  PRE_BACKUP_DIR,
  resolveArchiveDir,
  resolvePrenormDir
};
