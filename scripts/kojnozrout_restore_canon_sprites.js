"use strict";

/**
 * Obnoví kanonické Kojnožrout PNG z _raw / archivu.
 * Procedurální „zelený duch“ se nepoužívá, pokud existuje reálná grafika.
 *
 *   node scripts/kojnozrout_restore_canon_sprites.js
 *   node scripts/kojnozrout_restore_canon_sprites.js --from-raw
 */

const fs = require("fs");
const path = require("path");
const { batchConvert } = require("./kojnozrout_prepare_sprite");

const ASSETS_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const MOODS_DIR = path.join(ASSETS_ROOT, "moods");
const RAW_DIR = path.join(MOODS_DIR, "_raw");
const { resolveArchiveDir } = require("./kojnozrout_offline_paths");
const ARCHIVE_ROOT = resolveArchiveDir();

const CANON_MOODS = [
  "idle",
  "warm",
  "happy",
  "hungry",
  "excited",
  "eating",
  "full",
  "sleepy",
  "sick",
  "sad",
  "annoyed",
  "laugh",
  "stressed"
];

const DERIVE_FROM = {
  laugh: "happy",
  stressed: "annoyed",
  warm: "idle",
  eating: "happy"
};

const {
  FULL_DERIVE_MAP,
  listEatingVariantKeys
} = require("./KOJNOZROUT_MOOD_DERIVE");

const EATING_VARIANTS = listEatingVariantKeys();

function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_err) {
    return false;
  }
}

function fileExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return true;
    return stat.size > 0;
  } catch (_err) {
    return false;
  }
}

function isCanonArtFile(filePath) {
  if (!fileExists(filePath)) return false;
  return fs.statSync(filePath).size > 200000;
}

function findBestArchiveDir() {
  if (!pathExists(ARCHIVE_ROOT)) return null;
  const dirs = fs
    .readdirSync(ARCHIVE_ROOT)
    .map((name) => path.join(ARCHIVE_ROOT, name))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  for (const dir of dirs) {
    const hits = CANON_MOODS.filter((m) => fileExists(path.join(dir, `kojnozout-${m}.png`))).length;
    if (hits >= 6) return dir;
  }
  return dirs[0] || null;
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return { src, dest, bytes: fs.statSync(dest).size };
}

async function restoreFromRaw() {
  if (!pathExists(RAW_DIR)) {
    return { ok: false, reason: "raw_dir_missing", converted: [] };
  }
  const converted = await batchConvert(MOODS_DIR, { mode: "magenta" });
  return { ok: true, source: RAW_DIR, converted };
}

function restoreFromArchive(archiveDir) {
  const restored = [];
  const missing = [];

  for (const mood of CANON_MOODS) {
    const src = path.join(archiveDir, `kojnozout-${mood}.png`);
    const dest = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (fileExists(src) && isCanonArtFile(src)) {
      restored.push(copyFile(src, dest));
      continue;
    }
    missing.push(mood);
  }

  for (const mood of missing) {
    const sourceMood = DERIVE_FROM[mood];
    if (!sourceMood) continue;
    const src = path.join(MOODS_DIR, `kojnozout-${sourceMood}.png`);
    const dest = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (fileExists(src) && isCanonArtFile(src)) {
      restored.push({ ...copyFile(src, dest), derivedFrom: sourceMood });
    }
  }

  for (const variant of EATING_VARIANTS) {
    const src = path.join(MOODS_DIR, `kojnozout-eating.png`);
    const dest = path.join(MOODS_DIR, `kojnozout-${variant}.png`);
    if (isCanonArtFile(src) && !isCanonArtFile(dest)) {
      restored.push({ ...copyFile(src, dest), derivedFrom: "eating", variant, legacyCopy: true });
    }
  }

  return { ok: restored.length > 0, archiveDir, restored, missing };
}

function refreshDerivedMoods(options = {}) {
  const { generateMoodAssets } = require("./kojnozrout_generate_mood_assets");
  return generateMoodAssets({ force: options.force === true });
}

async function restoreCanonSprites(options = {}) {
  fs.mkdirSync(MOODS_DIR, { recursive: true });

  const archiveDir = findBestArchiveDir();
  const archiveResult = archiveDir ? restoreFromArchive(archiveDir) : { ok: false, restored: [] };

  let rawResult = null;
  if (options.fromRaw !== false) {
    rawResult = await restoreFromRaw();
  }

  const canonCount = CANON_MOODS.filter((m) =>
    isCanonArtFile(path.join(MOODS_DIR, `kojnozout-${m}.png`))
  ).length;

  if (canonCount >= 8) {
    refreshDerivedMoods({ force: options.forceDerived !== false });
  }

  const canonMarker = {
    restoredAt: Date.now(),
    archiveDir: archiveDir || null,
    rawDir: RAW_DIR,
    note: "Canon Kojnožrout art — do not overwrite with procedural generator"
  };
  fs.writeFileSync(
    path.join(MOODS_DIR, ".canon-source.json"),
    JSON.stringify(canonMarker, null, 2),
    "utf8"
  );

  return {
    ok: canonCount >= 8,
    moodsDir: MOODS_DIR,
    canonCount,
    archive: archiveResult,
    raw: rawResult
  };
}

if (require.main === module) {
  restoreCanonSprites({ fromRaw: process.argv.includes("--from-raw") || true })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  restoreCanonSprites,
  isCanonArtFile,
  findBestArchiveDir,
  CANON_MOODS,
  EXTENDED_DERIVE_FROM: FULL_DERIVE_MAP,
  FULL_DERIVE_MAP,
  MOODS_DIR
};
