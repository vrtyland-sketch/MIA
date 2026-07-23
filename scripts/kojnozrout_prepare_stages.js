"use strict";

/**
 * Matte-key hand-painted stage moods from stages/{tier}/_raw/
 *
 *   npm run prepare:stages
 */

const fs = require("fs");
const path = require("path");
const { batchConvert } = require("./kojnozrout_prepare_sprite");

const STAGES_ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "stages");

async function prepareAllStages() {
  if (!fs.existsSync(STAGES_ROOT)) {
    console.log("No stages directory yet.");
    return [];
  }

  const tiers = fs
    .readdirSync(STAGES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const results = [];
  for (const tier of tiers) {
    const tierDir = path.join(STAGES_ROOT, tier);
    const rawDir = path.join(tierDir, "_raw");
    if (!fs.existsSync(rawDir)) continue;
    const rows = await batchConvert(tierDir, { mode: "magenta" });
    for (const row of rows) {
      console.log(`✅ ${tier}/${path.basename(row.output)} alpha ${(row.alphaRatio * 100).toFixed(1)}% keyed`);
      results.push({ tier, ...row });
    }
  }
  return results;
}

async function main() {
  const results = await prepareAllStages();
  if (!results.length) {
    console.log("No stages/{tier}/_raw PNGs to process.");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { prepareAllStages };
