"use strict";

/**
 * One-shot v33 housekeeping: move hot-path bloat to assets/_offline_backup.
 * Does not delete. Leaves live moods/kojnozout-*.png in place.
 *
 *   node scripts/kojnozrout_move_offline_backup.js
 */

const fs = require("fs");
const path = require("path");
const {
  ASSETS,
  KOJ_LIVE,
  OFFLINE_ROOT,
  OFFLINE_KOJ,
  ARCHIVE_DIR,
  PRENORM_DIR,
  PRE_BACKUP_DIR
} = require("./kojnozrout_offline_paths");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveDir(src, dest) {
  if (!fs.existsSync(src)) return { ok: false, reason: "missing_src" };
  if (fs.existsSync(dest)) return { ok: false, reason: "dest_exists" };
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  return { ok: true };
}

function main() {
  ensureDir(PRE_BACKUP_DIR);
  ensureDir(path.dirname(PRENORM_DIR));
  ensureDir(path.dirname(ARCHIVE_DIR));

  const liveArchive = path.join(KOJ_LIVE, "_archive");
  const livePrenorm = path.join(KOJ_LIVE, "moods", "_prenorm_backup");
  const moods = path.join(KOJ_LIVE, "moods");

  const archiveMove = moveDir(liveArchive, ARCHIVE_DIR);
  const prenormMove = moveDir(livePrenorm, PRENORM_DIR);

  let preMoved = 0;
  if (fs.existsSync(moods)) {
    for (const name of fs.readdirSync(moods)) {
      if (!/\.pre-.*\.png$/i.test(name)) continue;
      const src = path.join(moods, name);
      if (!fs.statSync(src).isFile()) continue;
      fs.renameSync(src, path.join(PRE_BACKUP_DIR, name));
      preMoved += 1;
    }
  }

  // Stub at legacy archive path (pointer only — not the art bank)
  ensureDir(liveArchive);
  fs.writeFileSync(
    path.join(liveArchive, "README.md"),
    [
      "# Moved (v33)",
      "",
      "Koj art archives live under:",
      "",
      "`assets/_offline_backup/kojnozrout/_archive/`",
      "",
      "Install/restore scripts resolve via `scripts/kojnozrout_offline_paths.js`.",
      "Do not delete — cold backup only. Live moods stay in `../moods/kojnozout-*.png`.",
      ""
    ].join("\n"),
    "utf8"
  );

  ensureDir(OFFLINE_ROOT);
  fs.writeFileSync(
    path.join(OFFLINE_ROOT, "README.md"),
    [
      "# Offline graphics backup (v33)",
      "",
      "Cold store off the live mood hot path. Contents:",
      "",
      "- `kojnozrout/_archive/` — historical art banks",
      "- `kojnozrout/moods/_prenorm_backup/` — prenorm snapshots",
      "- `kojnozrout/moods/pre-backups/` — `*.pre-*.png` sidecars",
      "",
      "Runtime loads only `assets/kojnozrout/moods/kojnozout-<key>.png` (no `.pre-` suffix).",
      ""
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(moods, "_OFFLINE_MOVED.md"),
    [
      "# Pre / prenorm backups moved (v33)",
      "",
      "`*.pre-*.png` and `_prenorm_backup/` → `assets/_offline_backup/kojnozrout/moods/`",
      "",
      "Live canon PNGs remain here as `kojnozout-*.png`.",
      ""
    ].join("\n"),
    "utf8"
  );

  const liveMoods = fs.existsSync(moods)
    ? fs
        .readdirSync(moods)
        .filter((n) => /^kojnozout-.*\.png$/i.test(n) && !/\.pre-/i.test(n))
        .length
    : 0;
  const preLeft = fs.existsSync(moods)
    ? fs.readdirSync(moods).filter((n) => /\.pre-.*\.png$/i.test(n)).length
    : 0;

  const report = {
    ok: true,
    archiveMove,
    prenormMove,
    preMoved,
    liveMoods,
    preLeftInMoods: preLeft,
    offlineArchive: fs.existsSync(ARCHIVE_DIR),
    offlinePrenorm: fs.existsSync(PRENORM_DIR),
    offlinePreCount: fs.existsSync(PRE_BACKUP_DIR)
      ? fs.readdirSync(PRE_BACKUP_DIR).length
      : 0,
    paths: { ARCHIVE_DIR, PRENORM_DIR, PRE_BACKUP_DIR, ASSETS }
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
