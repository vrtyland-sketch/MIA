"use strict";

const assert = require("assert/strict");
const bossCinematic = require("../scripts/MIA_BOSS_CINEMATIC");
const comboOverlay = require("../scripts/MIA_COMBO_OVERLAY");
const giftPresentation = require("../scripts/MIA_GIFT_PRESENTATION");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");

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

console.log("\n---- BOSS CINEMATIC CONTRACT ----\n");

test("T5 boss combo builds MEGA_BOSS cinematic payload", () => {
  const combo = comboOverlay.buildBossComboMoment({
    streamTier: "T5",
    bossEvent: "mega_boss",
    bossBanner: "MEGA BOSS",
    giftName: "Galaxy"
  });

  assert.equal(combo.kind, "MEGA_BOSS");
  assert.ok(bossCinematic.shouldActivateBossCinematic(combo));

  const cinematic = bossCinematic.buildBossCinematicPayload(combo, {
    userLabel: "Rose",
    giftName: "Galaxy"
  });

  assert.equal(cinematic.kind, "MEGA_BOSS");
  assert.equal(cinematic.tier, "T5");
  assert.match(cinematic.title, /MEGA BOSS/);
  assert.ok(cinematic.holdMs >= 8500);
  assert.match(cinematic.heroImageUrl, /hero-t5\.png/);
});

test("T4 boss combo does not activate cinematic", () => {
  const combo = comboOverlay.buildBossComboMoment({
    streamTier: "T4",
    bossEvent: "boss_arrival",
    bossBanner: "PŘIŠEL BOSS",
    giftName: "Rose"
  });

  assert.equal(combo.kind, "BOSS");
  assert.equal(bossCinematic.shouldActivateBossCinematic(combo), false);
  assert.equal(bossCinematic.buildBossCinematicPayload(combo), null);
});

test("T6 boss combo builds LEGEND cinematic", () => {
  const combo = comboOverlay.buildBossComboMoment({
    streamTier: "T6",
    bossEvent: "legend_event",
    bossBanner: "LEGENDA STREAMU",
    giftName: "Universe"
  });

  const cinematic = bossCinematic.buildBossCinematicPayload(combo, {
    userLabel: "Fan",
    giftName: "Universe"
  });

  assert.equal(cinematic.kind, "LEGEND");
  assert.equal(cinematic.tier, "T6");
  assert.ok(cinematic.holdMs >= 10000);
});

test("gift presentation plan includes bossCinematic for T5", () => {
  const plan = giftPresentation.resolveGiftPresentationPlan(
    {
      streamTier: "T5",
      obsTier: "T5",
      bossEvent: "mega_boss",
      bossBanner: "MEGA BOSS",
      giftName: "Galaxy"
    },
    { userLabel: "Rose", giftName: "Galaxy" }
  );

  assert.ok(plan.comboMoment);
  assert.ok(plan.bossCinematic);
  assert.equal(plan.lanes.bossCinematic, true);
  assert.equal(plan.lanes.comboFlash, true);
});

test("overlay state stores boss cinematic with hold", () => {
  const state = overlayState.createOverlayState();
  overlayState.setBossCinematic(state, {
    kind: "MEGA_BOSS",
    title: "MEGA BOSS",
    tier: "T5",
    holdMs: 9000
  });

  const snap = overlayState.getBossCinematicSnapshot(state);
  assert.ok(snap);
  assert.equal(snap.title, "MEGA BOSS");
  assert.equal(snap.tier, "T5");
  assert.ok(snap.holdUntilTs > Date.now());
});

test("koj display celebrates during boss cinematic", () => {
  const kojDisplay = require("../scripts/MIA_KOJNOZROUT_DISPLAY");
  const now = Date.now();
  const mood = kojDisplay.resolveContextualDisplayMood(
    "idle",
    {},
    {
      bossCinematic: {
        kind: "MEGA_BOSS",
        holdUntilTs: now + 8000
      }
    },
    now
  );
  assert.equal(mood, "party-pop");

  const legendMood = kojDisplay.resolveContextualDisplayMood(
    "idle",
    {},
    {
      bossCinematic: {
        kind: "LEGEND",
        holdUntilTs: now + 8000
      }
    },
    now
  );
  assert.equal(legendMood, "hype");
});

test("obs vision layout mode prefers boss cinematic", () => {
  const vision = require("../scripts/MIA_OBS_VISION");
  assert.equal(
    vision.resolveLayoutMode({
      bossCinematic: { active: true },
      comboMoment: { active: true }
    }),
    "boss_cinematic"
  );

  const plan = vision.buildLayoutPlan("boss_cinematic", "tiktok", { width: 1920, height: 1080 });
  assert.equal(plan.combo.enabled, true);
  assert.equal(plan.boss_cinematic.enabled, true);
  assert.equal(plan.speech.enabled, true);
});

test("boss cinematic ui model marks T5 visible", () => {
  const ui = require("../mia-output-overlay/assets/boss-cinematic-ui");
  const model = ui.buildBossCinematicModel({
    kind: "MEGA_BOSS",
    title: "MEGA BOSS",
    tier: "T5",
    subtext: "Rose · Galaxy",
    accent: "#ff6040",
    miaPoints: 7500,
    holdMs: 9500,
    holdUntilTs: Date.now() + 8000,
    momentId: "test-1"
  });

  assert.equal(model.visible, true);
  assert.equal(model.badge, "MEGA BOSS");
  assert.equal(model.isMegaBoss, true);
  assert.match(model.pointsLine, /MIA bod/);
});
