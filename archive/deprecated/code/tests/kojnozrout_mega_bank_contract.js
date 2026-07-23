"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { generateMegaBank, TARGET_MIN_TOTAL } = require("../scripts/kojnozrout_generate_mega_bank");
const megaBank = require("../scripts/MIA_KOJNOZROUT_MEGA_BANK");
const { composeKojScene } = require("../scripts/kojnozrout_scene_composer");

async function run() {
  const composed = composeKojScene({ mood: "sad", effectProgram: "pet_react", seed: 2 });
  assert.ok(composed.pngBuffer && composed.pngBuffer.length > 5000, "scene composer works");

  const quick = generateMegaBank({ force: true, quick: true });
  assert.equal(quick.ok, true);
  assert.ok(quick.totalCount >= 8);

  megaBank.loadMegaManifest(true);
  assert.equal(megaBank.isMegaBankReady(), false);

  const sprite = megaBank.resolveMegaSpriteEntry("idle", 0);
  assert.ok(sprite?.publicPath.includes("mega/sprites/koj-idle-s00.png"));

  const scene = megaBank.resolveMegaSceneEntry("idle", "generic_support", 0);
  assert.ok(scene?.publicPath.includes("mega/scenes/"));

  const manifestPath = path.join(
    __dirname,
    "..",
    "mia-output-overlay",
    "assets",
    "kojnozrout",
    "mega",
    "mega-bank-manifest.json"
  );
  assert.ok(fs.existsSync(manifestPath));

  console.log(`✅ mega bank quick contract passed (${quick.totalCount} assets, full target ${TARGET_MIN_TOTAL})`);
}

run().catch((err) => {
  console.error("❌ mega bank contract failed:", err);
  process.exit(1);
});
