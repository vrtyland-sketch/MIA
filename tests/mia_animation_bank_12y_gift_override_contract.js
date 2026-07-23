"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const {
  resolveClipForGift,
  findGiftOverrideClip
} = require("../shared/mia-animation-engine/AnimationBank");
const {
  resolveGiftReactionPlan
} = require("../shared/mia-animation-engine/GiftReactionOrchestrator");
const {
  bindGiftKeysToClip,
  markBankClipProduction
} = require("../shared/mia-animation-engine/promoteAiAnimation");
const { HARDCODED_GIFT_KEYS } = require("../shared/mia-animation-engine/effectProgramPresets");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

async function writeFrame(filePath) {
  const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FF00FF"/>
    <circle cx="24" cy="24" r="10" fill="#22AA66"/>
  </svg>`;
  fs.writeFileSync(filePath, await sharp(Buffer.from(svg)).png().toBuffer());
}

async function makeClip(bankRoot, clipId, meta) {
  const clipDir = path.join(bankRoot, ...clipId.split("/"));
  const framesDir = path.join(clipDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });
  await writeFrame(path.join(framesDir, "0001.png"));
  await writeFrame(path.join(framesDir, "0002.png"));
  fs.writeFileSync(path.join(clipDir, "metadata.json"), `${JSON.stringify(meta, null, 2)}\n`);
  const { packClipDirectory } = require("../shared/mia-animation-engine/spriteSheetPack");
  const packed = await packClipDirectory(clipDir, { bankRoot, clipId });
  assert.equal(packed.ok, true);
}

(async () => {
  await test("HARDCODED_GIFT_KEYS includes rose and heart_small", () => {
    assert.ok(HARDCODED_GIFT_KEYS.includes("rose"));
    assert.ok(HARDCODED_GIFT_KEYS.includes("heart_small"));
  });

  await test("bindGiftKeys catalog is phase 12y", () => {
    assert.equal(graphicsStudio.getCommand("bind_gift_keys").phase, "12y");
  });

  await test("override without confirm is rejected for rose", async () => {
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12y-a-"));
    await makeClip(bankRoot, "ai/override_rose", {
      id: "ai/override_rose",
      quality: "production",
      source: "ai_true_alpha_anim",
      fps: 10,
      giftKeys: []
    });
    const blocked = await bindGiftKeysToClip({
      bankRoot,
      clipId: "ai/override_rose",
      giftKeys: ["rose"],
      overrideHardcoded: true,
      confirmOverride: false
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "override_requires_confirm");
    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  await test("production giftOverride beats hardcoded gift/rose", async () => {
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12y-b-"));
    await makeClip(bankRoot, "gift/rose", {
      id: "gift/rose",
      quality: "production",
      source: "production_moods",
      fps: 10,
      giftKeys: ["rose"],
      tags: ["production"]
    });
    await makeClip(bankRoot, "ai/custom_rose", {
      id: "ai/custom_rose",
      quality: "production",
      source: "ai_true_alpha_anim",
      fps: 10,
      giftKeys: [],
      tags: ["production"]
    });

    const bound = await bindGiftKeysToClip({
      bankRoot,
      clipId: "ai/custom_rose",
      giftKeys: ["rose"],
      overrideHardcoded: true,
      confirmOverride: true
    });
    assert.equal(bound.ok, true);
    assert.equal(bound.giftOverride, true);
    assert.equal(bound.overrideActive, true);

    const { buildAnimationBank } = require("../scripts/build_animation_bank");
    await buildAnimationBank({ bankRoot, seed: false, force: true });
    const { loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");
    const bank = loadBankIndex(bankRoot);

    const override = findGiftOverrideClip(bank, "rose");
    assert.equal(override?.id, "ai/custom_rose");

    const resolved = resolveClipForGift(bank, { giftKey: "rose", emotion: "happy" });
    assert.equal(resolved?.id, "ai/custom_rose");

    const plan = resolveGiftReactionPlan(
      { giftKey: "rose", effectProgram: "flower_support", emotion: "happy", tier: "T1" },
      bank
    );
    assert.equal(plan.animationId, "ai/custom_rose");
    assert.equal(plan.bankQuality, "production");
    assert.ok(plan.sheetUrl);
    assert.match(plan.sheetUrl, /ai\/custom_rose/);
    assert.equal(plan.preferProductionSprite, false);

    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  await test("ai quality giftOverride does not win live sheets until production", async () => {
    const bankRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-12y-c-"));
    await makeClip(bankRoot, "gift/rose", {
      id: "gift/rose",
      quality: "production",
      source: "production_moods",
      fps: 10,
      giftKeys: ["rose"],
      tags: ["production"]
    });
    await makeClip(bankRoot, "ai/draft_rose", {
      id: "ai/draft_rose",
      quality: "ai",
      source: "ai_true_alpha_anim",
      fps: 10,
      giftKeys: [],
      tags: ["ai-true-alpha"]
    });

    const bound = await bindGiftKeysToClip({
      bankRoot,
      clipId: "ai/draft_rose",
      giftKeys: ["rose"],
      overrideHardcoded: true,
      confirmOverride: true
    });
    assert.equal(bound.overridePending, true);
    assert.equal(bound.overrideActive, false);

    const { buildAnimationBank } = require("../scripts/build_animation_bank");
    await buildAnimationBank({ bankRoot, seed: false, force: true });
    const { loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");
    const bank = loadBankIndex(bankRoot);
    const resolved = resolveClipForGift(bank, { giftKey: "rose" });
    assert.equal(resolved?.id, "gift/rose");

    await markBankClipProduction({
      bankRoot,
      clipId: "ai/draft_rose",
      confirmProduction: true
    });
    const bank2 = loadBankIndex(bankRoot);
    const resolved2 = resolveClipForGift(bank2, { giftKey: "rose" });
    assert.equal(resolved2?.id, "ai/draft_rose");

    fs.rmSync(bankRoot, { recursive: true, force: true });
  });

  await test("dashboard has override checkbox", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(src, /bankOverrideHardcoded/);
    assert.match(src, /confirmOverride/);
  });

  console.log("mia_animation_bank_12y_gift_override_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
