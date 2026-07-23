"use strict";

/**
 * Generate 100 Kojnožrout variant PNGs + per-effectProgram backgrounds.
 *
 *   node scripts/kojnozrout_generate_animation_bank.js
 *   node scripts/kojnozrout_generate_animation_bank.js --force
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { renderKojnozoutVariant, resolveVariantPlan } = require("./kojnozrout_sprite_renderer");
const {
  listBackgroundPrograms,
  renderGiftBackground
} = require("./kojnozrout_background_generator");

const ASSETS_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const VARIANTS_DIR = path.join(ASSETS_ROOT, "variants");
const BACKGROUNDS_DIR = path.join(ASSETS_ROOT, "backgrounds");
const MANIFEST_PATH = path.join(ASSETS_ROOT, "animation-bank-manifest.json");

const VARIANT_COUNT = 100;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function generateAnimationBank(options = {}) {
  const force = Boolean(options.force);
  ensureDir(VARIANTS_DIR);
  ensureDir(BACKGROUNDS_DIR);

  const variants = [];
  const hashes = new Set();

  for (let i = 1; i <= VARIANT_COUNT; i += 1) {
    const plan = resolveVariantPlan(i);
    const fileName = `kojnozout-v${String(i).padStart(3, "0")}.png`;
    const outPath = path.join(VARIANTS_DIR, fileName);
    const buf = renderKojnozoutVariant(i);
    const hash = sha256(buf);

    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      variants.push({ index: i, mood: plan.mood, path: outPath, skipped: true });
      hashes.add(hash);
      continue;
    }

    fs.writeFileSync(outPath, buf);
    variants.push({
      index: i,
      mood: plan.mood,
      seed: plan.seed,
      path: outPath,
      bytes: buf.length,
      sha256: hash
    });
    hashes.add(hash);
  }

  const backgrounds = [];
  for (const program of listBackgroundPrograms()) {
    const fileName = `bg-${program}.png`;
    const outPath = path.join(BACKGROUNDS_DIR, fileName);
    const buf = renderGiftBackground(program, program.length * 3);

    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      backgrounds.push({ program, path: outPath, skipped: true });
      continue;
    }

    fs.writeFileSync(outPath, buf);
    backgrounds.push({ program, path: outPath, bytes: buf.length, sha256: sha256(buf) });
  }

  const manifest = {
    version: 1,
    generatedAt: Date.now(),
    variantCount: VARIANT_COUNT,
    backgroundCount: backgrounds.length,
    variantsDir: VARIANTS_DIR,
    backgroundsDir: BACKGROUNDS_DIR,
    allVariantsDistinct: hashes.size === VARIANT_COUNT,
    variants: variants.map((v) => ({
      index: v.index,
      mood: v.mood,
      file: `variants/${path.basename(v.path)}`
    })),
    backgrounds: backgrounds.map((b) => ({
      program: b.program,
      file: `backgrounds/${path.basename(b.path)}`
    }))
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  return {
    manifestPath: MANIFEST_PATH,
    variantCount: VARIANT_COUNT,
    uniqueVariantHashes: hashes.size,
    allVariantsDistinct: hashes.size === VARIANT_COUNT,
    backgroundCount: backgrounds.length,
    writtenVariants: variants.filter((v) => !v.skipped).length,
    writtenBackgrounds: backgrounds.filter((b) => !b.skipped).length
  };
}

if (require.main === module) {
  const result = generateAnimationBank({ force: process.argv.includes("--force") });
  console.log(JSON.stringify(result, null, 2));
  if (!result.allVariantsDistinct) process.exitCode = 1;
}

module.exports = { generateAnimationBank, VARIANT_COUNT, VARIANTS_DIR, BACKGROUNDS_DIR };
