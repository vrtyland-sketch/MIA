"use strict";

const assert = require("assert/strict");
const giftPresentation = require("../scripts/MIA_GIFT_PRESENTATION");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- SPRINT B CONTRACT ----\n");

test("orchestrator exposes unified lanes for boss T4", () => {
  const plan = giftPresentation.resolveGiftPresentationPlan(
    {
      streamTier: "T4",
      bossEvent: "boss_arrival",
      bossBanner: "PŘIŠEL BOSS",
      giftName: "Galaxy"
    },
    { userLabel: "Rose" }
  );

  assert.equal(plan.lanes.comboFlash, true);
  assert.equal(plan.lanes.speech, "combo_flash");
  assert.equal(plan.comboSpeechPayload, null);
  assert.equal(plan.speechLane.suppressPrimaryOverlay, true);
});

test("combo speech suppresses duplicate MIA primary bubble", () => {
  const plan = giftPresentation.resolveGiftPresentationPlan(
    {
      streamTier: "T2",
      comboTier: "SUPER",
      comboLabel: "SUPER COMBO",
      comboCount: 5,
      giftName: "Rose"
    },
    {
      userLabel: "Alice",
      primaryOverlay: { owner: "mia", text: "Díky za gift" }
    }
  );

  assert.ok(plan.comboSpeechPayload);
  assert.equal(plan.speechLane.suppressPrimaryOverlay, true);

  const patched = giftPresentation.applyPresentationLanes(
    { overlayPayload: { owner: "mia", text: "Díky" }, meta: {} },
    plan
  );
  assert.equal(patched.overlayPayload, null);
  assert.equal(patched.meta.presentationSpeechLane, "combo");
});

test("combo speech keeps koj primary bubble", () => {
  const plan = giftPresentation.resolveGiftPresentationPlan(
    {
      streamTier: "T2",
      comboTier: "SUPER",
      comboLabel: "SUPER COMBO",
      comboCount: 5,
      giftName: "Rose"
    },
    {
      userLabel: "Alice",
      primaryOverlay: { owner: "kojnozout", text: "Mňam" }
    }
  );

  assert.equal(plan.speechLane.suppressPrimaryOverlay, false);
  assert.equal(plan.lanes.speech, "combo_plus_primary");
});

test("post-gift plan enables viewer story from T2+", () => {
  const low = giftPresentation.resolvePostGiftExperiencePlan({ streamTier: "T1" });
  const high = giftPresentation.resolvePostGiftExperiencePlan({ streamTier: "T3", videoReaction: true });

  assert.equal(low.runViewerStory, false);
  assert.equal(high.runViewerStory, true);
  assert.equal(high.runGiftVisual, true);
});

test("prepareGiftPresentation bundles boss patch and lanes", () => {
  const normalized = {
    user: { nickname: "BossGifter" },
    support: {
      giftContext: {
        streamTier: "T6",
        bossEvent: "legend_event",
        bossBanner: "LEGENDA STREAMU",
        giftName: "Universe",
        obsTier: "T6"
      }
    }
  };

  const { actionResult, plan } = giftPresentation.prepareGiftPresentation(
    normalized,
    { overlayPayload: { text: "Děkuju", subtext: "", priority: 3 }, meta: {} },
    null
  );

  assert.ok(plan);
  assert.equal(actionResult.overlayPayload.text, "LEGENDA STREAMU");
  assert.equal(actionResult.voicePreempt, true);
  assert.equal(actionResult.meta.presentationPlan.lanes.comboFlash, true);
});

test("overlay manifest includes evolution and backpack entries", () => {
  const startupCheck = require("../scripts/MIA_STARTUP_CHECK");
  const manifest = startupCheck.buildOverlayManifest({ baseUrl: "http://127.0.0.1:3000" });
  const ids = manifest.map((row) => row.id);

  assert.ok(ids.includes("evolution"));
  assert.ok(ids.includes("backpack"));
  const evolution = manifest.find((row) => row.id === "evolution");
  const backpack = manifest.find((row) => row.id === "backpack");
  assert.equal(evolution.ok, true);
  assert.equal(backpack.ok, true);
  assert.match(evolution.url, /evolution-toast-overlay\.html/);
  assert.match(backpack.url, /kojnozrout-backpack-overlay\.html/);
});

test("boss T5 policy unchanged from sprint 4", () => {
  const policy = giftEconomy.resolveBossPresentationPolicy("T5");
  assert.equal(policy.useComboFlash, true);
  assert.equal(policy.useSpeechBossSubtext, true);
  assert.equal(policy.miaInterrupt, true);
});
