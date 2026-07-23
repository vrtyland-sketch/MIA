"use strict";

/**
 * Generate the full Kojnožrout mood sprite set (distinct PNG per mood).
 *
 *   node scripts/kojnozrout_generate_full_sprite_set.js
 *   node scripts/kojnozrout_generate_full_sprite_set.js --force
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ALL_MOODS, renderKojnozoutMood, renderEatingVariant, listEatingVariantFileKeys, EATING_VARIANT_COUNT } = require("./kojnozrout_sprite_renderer");

const ASSETS_ROOT = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout"
);
const MOODS_DIR = path.join(ASSETS_ROOT, "moods");
const BASE_DIR = path.join(ASSETS_ROOT, "base");
const ARCHIVE_DIR = path.join(ASSETS_ROOT, "_archive");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function archiveExistingMoods() {
  if (!fs.existsSync(MOODS_DIR)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(ARCHIVE_DIR, stamp);
  ensureDir(target);
  const files = fs.readdirSync(MOODS_DIR).filter((f) => f.toLowerCase().endsWith(".png"));
  for (const file of files) {
    fs.copyFileSync(path.join(MOODS_DIR, file), path.join(target, file));
  }
  return { archiveDir: target, count: files.length };
}

function generateFullSpriteSet(options = {}) {
  const force = Boolean(options.force);
  const { isCanonArtFile } = require("./kojnozrout_restore_canon_sprites");
  ensureDir(MOODS_DIR);
  ensureDir(BASE_DIR);

  const archived = force ? archiveExistingMoods() : null;
  const written = [];
  const skipped = [];
  const hashes = {};
  const blocked = [];

  for (const mood of ALL_MOODS) {
    const outPath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (isCanonArtFile(outPath)) {
      blocked.push({ mood, reason: "canon_art_preserved" });
      skipped.push({ mood, reason: "canon_art_preserved" });
      continue;
    }

    const buf = renderKojnozoutMood(mood);

    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      skipped.push({ mood, reason: "exists" });
      continue;
    }

    fs.writeFileSync(outPath, buf);
    written.push({ mood, path: outPath, bytes: buf.length, sha256: sha256(buf) });
    hashes[mood] = sha256(buf);
  }

  for (let i = 1; i <= EATING_VARIANT_COUNT; i += 1) {
    const key = `eating-${String(i).padStart(2, "0")}`;
    const outPath = path.join(MOODS_DIR, `kojnozout-${key}.png`);
    const buf = renderEatingVariant(i);

    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      skipped.push({ mood: key, reason: "exists" });
      continue;
    }

    fs.writeFileSync(outPath, buf);
    written.push({ mood: key, path: outPath, bytes: buf.length, sha256: sha256(buf) });
    hashes[key] = sha256(buf);
  }

  const idlePath = path.join(MOODS_DIR, "kojnozout-idle.png");
  const bodyPath = path.join(BASE_DIR, "body.png");
  if (fs.existsSync(idlePath)) {
    fs.copyFileSync(idlePath, bodyPath);
  }

  const uniqueHashes = new Set(Object.values(hashes));
  const duplicateGroups = [];
  const byHash = {};
  for (const [mood, hash] of Object.entries(hashes)) {
    if (!byHash[hash]) byHash[hash] = [];
    byHash[hash].push(mood);
  }
  for (const [hash, moods] of Object.entries(byHash)) {
    if (moods.length > 1) duplicateGroups.push({ hash, moods });
  }

  return {
    moodsDir: MOODS_DIR,
    baseBody: bodyPath,
    moodCount: ALL_MOODS.length + EATING_VARIANT_COUNT,
    eatingVariants: listEatingVariantFileKeys(),
    written,
    skipped,
    blocked,
    archived,
    uniqueCount: uniqueHashes.size,
    duplicateGroups,
    allDistinct: duplicateGroups.length === 0
  };
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  const result = generateFullSpriteSet({ force });
  console.log(JSON.stringify(result, null, 2));
  if (!result.allDistinct) {
    console.error("WARNING: duplicate sprite hashes detected — moods may look identical.");
    process.exitCode = 1;
  }
}

module.exports = { generateFullSpriteSet, ASSETS_ROOT, MOODS_DIR };
