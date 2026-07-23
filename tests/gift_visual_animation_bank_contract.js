"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  renderKojnozoutVariant,
  resolveVariantPlan,
  ALL_MOODS
} = require("../scripts/kojnozrout_sprite_renderer");
const { renderGiftBackground, listBackgroundPrograms } = require("../scripts/kojnozrout_background_generator");
const {
  composeGiftMoment,
  shouldComposeGiftVisual,
  resolveVariantIndex
} = require("../scripts/MIA_GIFT_VISUAL_COMPOSER");
const { generateAnimationBank, VARIANT_COUNT } = require("../scripts/kojnozrout_generate_animation_bank");

async function run() {
  const hashes = new Set();
  for (let i = 1; i <= VARIANT_COUNT; i += 1) {
    const plan = resolveVariantPlan(i);
    assert.ok(ALL_MOODS.includes(plan.mood), `variant ${i} mood`);
    const buf = renderKojnozoutVariant(i);
    assert.ok(buf.length > 800, `variant ${i} size`);
    const crypto = require("crypto");
    hashes.add(crypto.createHash("sha256").update(buf).digest("hex"));
  }
  assert.equal(hashes.size, VARIANT_COUNT, "all 100 variants must be distinct");

  for (const program of listBackgroundPrograms()) {
    const bg = renderGiftBackground(program, 3);
    assert.ok(bg.length > 1200, `background ${program}`);
  }

  const bank = generateAnimationBank({ force: true });
  assert.equal(bank.variantCount, 100);
  assert.equal(bank.allVariantsDistinct, true);
  assert.ok(bank.backgroundCount >= 10);

  const composed = await composeGiftMoment({
    userLabel: "Rose Fan",
    giftName: "Rose",
    tier: "T2",
    effectProgram: "flower_support",
    kojMood: "excited",
    thankText: "Rose Fan poslal Rose"
  });
  assert.equal(composed.ok, true);
  assert.ok(composed.imageUrl.startsWith("/generated/gift-moments/"));
  assert.ok(fs.existsSync(composed.imagePath));

  assert.equal(
    shouldComposeGiftVisual({ kind: "gift", support: { coins: 1, tier: "T1" } }, { tier: "T1" }),
    true
  );
  assert.equal(shouldComposeGiftVisual({ kind: "gift", duelActive: true }, { tier: "T2" }), false);

  const idx = resolveVariantIndex({ tier: "T3", kojMood: "happy", giftKey: "rose", userLabel: "A" });
  assert.ok(idx >= 1 && idx <= 100);

  console.log("gift_visual_animation_bank_contract: OK");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
