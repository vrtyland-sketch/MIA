"use strict";

/**
 * Per-tier mood sprites: assets/kojnozrout/stages/{tier}/kojnozout-{mood}.png
 *
 *   npm run generate:koj-stages
 *   npm run generate:koj-stages -- --force
 *
 * Hand-painted override: drop PNG into stages/{tier}/_raw/ then npm run prepare:stages
 */

const fs = require("fs");
const path = require("path");
const { transformCanonFile } = require("./kojnozrout_canon_transform");
const { MOODS_DIR } = require("./kojnozrout_restore_canon_sprites");
const { EVOLUTION_TIERS } = require("./generate_koj_2d_factory_gfx");
const { CORE_MOODS, VITAL_MOODS } = require("./MIA_KOJNOZROUT_ASSETS");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const STAGES_DIR = path.join(ROOT, "stages");
const EVOLUTION_DIR = path.join(ROOT, "evolution");

const STAGE_MOODS = [...new Set([...CORE_MOODS, ...VITAL_MOODS])];
const HAND_PAINT_MIN_BYTES = 200000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function shouldSkip(dest, force) {
  if (force) return false;
  try {
    return fs.existsSync(dest) && fs.statSync(dest).size >= HAND_PAINT_MIN_BYTES;
  } catch (_) {
    return false;
  }
}

function copyIdleFromEvolution(tier, dest) {
  const evo = path.join(EVOLUTION_DIR, `${tier}.png`);
  if (!fs.existsSync(evo)) return false;
  fs.copyFileSync(evo, dest);
  return true;
}

function generateStageMoods(options = {}) {
  const force = Boolean(options.force);
  const results = [];

  for (const [tier, spec] of Object.entries(EVOLUTION_TIERS)) {
    const tierDir = path.join(STAGES_DIR, tier);
    ensureDir(tierDir);

    for (const mood of STAGE_MOODS) {
      const dest = path.join(tierDir, `kojnozout-${mood}.png`);
      if (shouldSkip(dest, force)) {
        results.push({ tier, mood, skipped: true, bytes: fs.statSync(dest).size, source: "hand" });
        continue;
      }

      if (mood === "idle" && copyIdleFromEvolution(tier, dest)) {
        results.push({ tier, mood, ok: true, bytes: fs.statSync(dest).size, source: "evolution_idle" });
        continue;
      }

      const src = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
      if (!fs.existsSync(src)) {
        results.push({ tier, mood, ok: false, reason: "mood_missing" });
        continue;
      }

      transformCanonFile(src, dest, spec);
      results.push({ tier, mood, ok: true, bytes: fs.statSync(dest).size, source: "derived" });
    }
  }

  const manifestPath = path.join(STAGES_DIR, "stage-manifest.json");
  const manifest = {
    generatedAt: Date.now(),
    tiers: Object.keys(EVOLUTION_TIERS),
    moods: STAGE_MOODS,
    results
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return { ok: true, manifestPath, manifest, results };
}

async function main() {
  const force = process.argv.includes("--force");
  const out = generateStageMoods({ force });
  const ok = out.results.filter((r) => r.ok || r.skipped).length;
  console.log(
    JSON.stringify(
      {
        ok: true,
        manifest: out.manifestPath,
        stageSprites: `${ok}/${out.results.length}`,
        tiers: out.manifest.tiers.length,
        moodsPerTier: STAGE_MOODS.length
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateStageMoods, STAGE_MOODS, STAGES_DIR };
