"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { FORMS, ANIM_SPECS } = require("../scripts/generate_platform_form_anims");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const BATTLE_MOODS = [
  "idle",
  "attack",
  "attack2",
  "hit",
  "hit2",
  "defend",
  "win",
  "faint",
  "item_box",
  "item_heal",
  "item_buff",
  "taunt"
];
const BATTLE_MIRROR = [
  "battle",
  "attack2",
  "hit",
  "hit2",
  "defend",
  "win",
  "faint",
  "box",
  "heal",
  "buff",
  "taunt"
];

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

function pngOk(filePath, minBytes = 800) {
  assert.ok(fs.existsSync(filePath), `missing ${filePath}`);
  assert.ok(fs.statSync(filePath).size >= minBytes, `too small ${filePath}`);
}

console.log("\n---- PLATFORM FORM ASSETS CONTRACT ----\n");

test("master PNG exists for each platform form", () => {
  const masters = {
    tiktok: "tokzrout-master.png",
    kick: "stackzrout-master.png",
    twitch: "bitszrout-master.png",
    youtube: "kisstube-master.png"
  };
  for (const platform of FORMS) {
    pngOk(path.join(ROOT, "masters", masters[platform]), 50000);
  }
});

test("full ANIM_SPECS set present per platform", () => {
  for (const platform of FORMS) {
    const dir = path.join(ROOT, "forms", platform);
    for (const anim of Object.keys(ANIM_SPECS)) {
      pngOk(path.join(dir, `${anim}.png`), 50000);
    }
  }
});

test("battle mirror PNGs present for all platforms", () => {
  for (const platform of FORMS) {
    for (const stem of BATTLE_MIRROR) {
      pngOk(path.join(ROOT, "battle", `${platform}-${stem}.png`), 50000);
    }
  }
});

test("roster resolveFormSprite paths exist on disk", () => {
  const roster = require("../scripts/MIA_KOJ_ROSTER");
  for (const platform of FORMS) {
    for (const mood of BATTLE_MOODS) {
      const rel = roster.resolveFormSprite(platform, mood);
      pngOk(path.join(__dirname, "..", "mia-output-overlay", rel.replace(/^\//, "").replace(/\//g, path.sep)), 50000);
    }
  }
});

if (!process.exitCode) {
  console.log("\nplatform_form_assets_contract: all passed\n");
}
