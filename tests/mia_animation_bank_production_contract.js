"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  resolveGiftReactionPlan,
  resolveBankQuality
} = require("../shared/mia-animation-engine/GiftReactionOrchestrator");
const { resolveMoodSourceFile } = require("../scripts/seed_animation_bank");

const ROOT = path.resolve(__dirname, "..");
const BANK = path.join(ROOT, "mia-output-overlay", "assets", "animation-bank");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("seed resolves production mood files", () => {
  const src = resolveMoodSourceFile("react-gift", 0);
  assert.match(src.name, /kojnozout-react-gift/);
  assert.ok(fs.existsSync(src.full));
});

test("gift/rose metadata is production quality", () => {
  const meta = JSON.parse(
    fs.readFileSync(path.join(BANK, "gift", "rose", "metadata.json"), "utf8")
  );
  assert.equal(meta.quality, "production");
  assert.equal(meta.source, "production_moods");
  assert.equal(meta.spriteHint, "react-gift");
});

test("gift/rose sheet exists and is large enough for production art", () => {
  const sheet = path.join(BANK, "gift", "rose", "built", "sprite_sheet.png");
  assert.ok(fs.existsSync(sheet));
  assert.ok(fs.statSync(sheet).size > 50000, "sheet too small — likely procedural blob");
});

test("resolveGiftReactionPlan prefers production sheet for rose", () => {
  const plan = resolveGiftReactionPlan({
    giftKey: "rose",
    effectProgram: "flower_support",
    emotion: "happy",
    tier: "T1"
  });
  assert.equal(plan.bankQuality, "production");
  assert.equal(plan.preferProductionSprite, false);
  assert.equal(plan.spriteHint, "react-gift");
  assert.match(plan.sheetUrl || "", /gift\/rose/);
  assert.match(plan.manifestUrl || "", /gift\/rose/);
});

test("resolveBankQuality detects production vs ai vs procedural", () => {
  assert.equal(resolveBankQuality({ metadata: { quality: "production" } }), "production");
  assert.equal(resolveBankQuality({ metadata: { source: "production_moods" } }), "production");
  assert.equal(resolveBankQuality({ metadata: { tags: ["production"] } }), "production");
  assert.equal(resolveBankQuality({ metadata: { quality: "ai" } }), "ai");
  assert.equal(resolveBankQuality({ metadata: { source: "ai_true_alpha_anim" } }), "ai");
  assert.equal(resolveBankQuality({ metadata: {} }), "procedural");
});

test("runtime gates procedural sheets and keeps particles", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.match(src, /preferProductionSprite/);
  assert.match(src, /bankQuality/);
  assert.match(src, /spawnParticles/);
  assert.match(src, /playSoundCue/);
});

test("seed script no longer uses procedural renderer", () => {
  const src = fs.readFileSync(path.join(ROOT, "scripts", "seed_animation_bank.js"), "utf8");
  assert.doesNotMatch(src, /renderKojnozoutMood/);
  assert.match(src, /production_moods/);
  assert.match(src, /copyFileSync/);
});

console.log("mia_animation_bank_production_contract: all passed");
