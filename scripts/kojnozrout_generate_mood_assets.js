"use strict";

/**
 * Doplní / opraví mood PNG transformací z kanonických masterů.
 *
 *   npm run generate:koj-moods
 *   node scripts/kojnozrout_generate_mood_assets.js --force
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { isCanonArtFile, MOODS_DIR } = require("./kojnozrout_restore_canon_sprites");
const {
  FULL_DERIVE_MAP,
  DERIVED_MOOD_KEYS,
  MASTER_MOODS,
  resolveDeriveSpec
} = require("./KOJNOZROUT_MOOD_DERIVE");
const { transformCanonFile } = require("./kojnozrout_canon_transform");

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch (_err) {
    return false;
  }
}

function fileSha(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sameFileBytes(a, b) {
  if (!fileExists(a) || !fileExists(b)) return false;
  if (fs.statSync(a).size !== fs.statSync(b).size) return false;
  return fileSha(a) === fileSha(b);
}

/** Přepiš když chybí, force, nebo je stale byte-kopie masteru/idle (ne vizuální transform). */
function shouldWrite(targetPath, force, sourcePath, idlePath) {
  if (force) return true;
  if (!fileExists(targetPath)) return true;
  if (sourcePath && sameFileBytes(targetPath, sourcePath)) return true;
  if (idlePath && sameFileBytes(targetPath, idlePath)) return true;
  return !isCanonArtFile(targetPath);
}

function deriveDerived(targetMood, options = {}) {
  const force = options.force === true;
  const spec = resolveDeriveSpec(targetMood);
  const sourceMood = spec.source || "idle";
  const src = path.join(MOODS_DIR, `kojnozout-${sourceMood}.png`);
  const dest = path.join(MOODS_DIR, `kojnozout-${targetMood}.png`);
  const idlePath = path.join(MOODS_DIR, "kojnozout-idle.png");

  if (!isCanonArtFile(src)) {
    return {
      ok: false,
      target: targetMood,
      source: sourceMood,
      reason: "master_missing",
      path: src
    };
  }

  if (!shouldWrite(dest, force, src, idlePath)) {
    return {
      ok: true,
      target: targetMood,
      source: sourceMood,
      skipped: true,
      reason: "canon_already_present",
      bytes: fs.statSync(dest).size
    };
  }

  const result = transformCanonFile(src, dest, spec);
  return {
    ok: true,
    target: targetMood,
    source: sourceMood,
    transform: spec,
    path: dest,
    bytes: result.bytes
  };
}

function generateMoodAssets(options = {}) {
  const force = options.force === true;
  const only = Array.isArray(options.only) ? new Set(options.only) : null;
  const results = [];

  for (const target of DERIVED_MOOD_KEYS) {
    if (only && !only.has(target)) continue;
    results.push(deriveDerived(target, { force }));
  }

  const written = results.filter((r) => r.ok && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => !r.ok);

  return {
    ok: failed.length === 0,
    moodsDir: MOODS_DIR,
    strategy: "canon_master_transform",
    masterCount: MASTER_MOODS.length,
    derivedCount: DERIVED_MOOD_KEYS.length,
    totalSprites: MASTER_MOODS.length + DERIVED_MOOD_KEYS.length,
    written: written.length,
    skipped: skipped.length,
    failed: failed.length,
    results,
    hint: "Vlastní art: moods/_raw/kojnozout-{mood}.png → npm run restore:koj-sprites"
  };
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  const result = generateMoodAssets({ force });
  try {
    const fs = require("fs");
    const path = require("path");
    const { buildBrowserMoodEmojiScript } = require("./MIA_KOJNOZROUT_MOOD_EMOJI");
    const emojiOut = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "mood-emoji.js");
    fs.mkdirSync(path.dirname(emojiOut), { recursive: true });
    fs.writeFileSync(emojiOut, buildBrowserMoodEmojiScript(), "utf8");
  } catch (_err) {
    /* optional */
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

module.exports = {
  generateMoodAssets,
  deriveDerived,
  FULL_DERIVE_MAP,
  DERIVED_MOOD_KEYS
};
