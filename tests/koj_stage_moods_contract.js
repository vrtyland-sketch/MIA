"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  resolveStageMoodSpriteUrl,
  EVOLUTION_STAGE_TIERS,
  CORE_MOODS,
  VITAL_MOODS
} = require("../scripts/MIA_KOJNOZROUT_ASSETS");
const displayJs = fs.readFileSync(path.join(__dirname, "..", "scripts", "MIA_KOJNOZROUT_DISPLAY.js"), "utf8");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "stages");
const STAGE_MOODS = [...new Set([...CORE_MOODS, ...VITAL_MOODS])];

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.match(displayJs, /resolveStageMoodSpriteUrl/, "display uses stage resolver");
  assert.match(displayJs, /stageSpriteUrl/, "display exposes stage sprite url");
  assert.ok(!displayJs.includes("evolutionSpriteUrl || `/assets/kojnozrout/moods"), "evolution no longer overrides all moods");
  pass("DISPLAY wired for per-tier stage moods");

  for (const tier of EVOLUTION_STAGE_TIERS) {
    for (const mood of STAGE_MOODS) {
      const file = path.join(ROOT, tier, `kojnozout-${mood}.png`);
      assert.ok(fs.existsSync(file), `missing ${tier}/${mood}`);
      assert.ok(fs.statSync(file).size > 10000, `tiny ${tier}/${mood}`);
    }
    const idleUrl = resolveStageMoodSpriteUrl(tier, "idle");
    assert.ok(idleUrl && idleUrl.includes(`/stages/${tier}/`), `idle url for ${tier}`);
    pass(`stage sprites present for tier ${tier}`);
  }

  const hatchHappy = resolveStageMoodSpriteUrl("hatchling", "happy");
  assert.match(hatchHappy, /stages\/hatchling\/kojnozout-happy/);
  const legendSad = resolveStageMoodSpriteUrl("legend", "sad");
  assert.match(legendSad, /stages\/legend\/kojnozout-sad/);
  pass("stage mood fallback chain works");

  console.log("\n---- KOJ STAGE MOODS CONTRACT ----");
  console.log("passed");
}

run();
