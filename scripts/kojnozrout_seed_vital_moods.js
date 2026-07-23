"use strict";

/**
 * Derive vital mood sprites from base moods when dedicated art is missing.
 *
 *   node scripts/kojnozrout_seed_vital_moods.js
 */

const fs = require("fs");
const path = require("path");

const MOODS_DIR = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "moods"
);

const DERIVE_MAP = {
  sleepy: "idle",
  sad: "idle",
  sick: "hungry",
  annoyed: "hungry"
};

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch (_err) {
    return false;
  }
}

function seedVitalMoods() {
  if (!fs.existsSync(MOODS_DIR)) {
    fs.mkdirSync(MOODS_DIR, { recursive: true });
  }

  const created = [];
  const skipped = [];

  for (const [target, source] of Object.entries(DERIVE_MAP)) {
    const targetPath = path.join(MOODS_DIR, `kojnozout-${target}.png`);
    const sourcePath = path.join(MOODS_DIR, `kojnozout-${source}.png`);

    if (fileExists(targetPath)) {
      skipped.push({ target, reason: "exists" });
      continue;
    }

    if (!fileExists(sourcePath)) {
      skipped.push({ target, reason: `missing_source_${source}` });
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
    created.push({ target, from: source, path: targetPath });
  }

  return { created, skipped, moodsDir: MOODS_DIR };
}

if (require.main === module) {
  const result = seedVitalMoods();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { seedVitalMoods, DERIVE_MAP };
