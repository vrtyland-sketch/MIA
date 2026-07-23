"use strict";

const assert = require("assert/strict");
const comboOverlay = require("../scripts/MIA_COMBO_OVERLAY");
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

console.log("\n---- COMBO OVERLAY CONTRACT ----\n");

test("gift combo moment includes title and hold", () => {
  const moment = comboOverlay.buildGiftComboMoment(
    { comboTier: "SUPER", comboLabel: "SUPER COMBO ×50", comboCount: 50 },
    { userLabel: "Rose", giftName: "Galaxy" }
  );

  assert.equal(moment.kind, "SUPER");
  assert.match(moment.title, /SUPER COMBO/);
  assert.match(moment.subtext, /Rose/);
  assert.ok(moment.holdMs >= 6000);
});

test("spam wave moment on newly confirmed session", () => {
  const moment = comboOverlay.buildSpamComboMoment({
    newlyConfirmed: true,
    eventCount: 4,
    totalPoints: 120,
    participantCount: 3
  });

  assert.equal(moment.kind, "SPAM_WAVE");
  assert.match(moment.title, /DÁRKOVÁ VLNA/);
});

test("spam milestone moment on reward tier", () => {
  const moment = comboOverlay.buildSpamComboMoment({
    shouldRewardSpam: true,
    rewardTier: "T3",
    totalPoints: 620,
    eventCount: 8,
    participantCount: 5
  });

  assert.equal(moment.kind, "SPAM_MILESTONE");
  assert.match(moment.title, /T3/);
});

test("overlay state stores and expires combo moment", () => {
  const state = overlayState.createOverlayState();
  overlayState.setComboMoment(state, {
    kind: "COMBO",
    title: "COMBO ×12",
    subtext: "Fan · Rose",
    holdMs: 5000
  });

  const snap = overlayState.getComboMomentSnapshot(state);
  assert.ok(snap);
  assert.equal(snap.title, "COMBO ×12");
});

test("pickStrongerMoment prefers higher priority", () => {
  const low = { priority: 2, title: "low" };
  const high = { priority: 5, title: "high" };
  assert.equal(comboOverlay.pickStrongerMoment(low, high).title, "high");
});

test("boss combo moment uses canon banner per tier", () => {
  const t4 = comboOverlay.buildBossComboMoment({
    streamTier: "T4",
    bossEvent: "boss_arrival",
    bossBanner: "PŘIŠEL BOSS",
    giftName: "Galaxy"
  });
  assert.equal(t4.title, "PŘIŠEL BOSS");
  assert.equal(t4.priority, 5);

  const t6 = comboOverlay.buildBossComboMoment({
    streamTier: "T6",
    bossEvent: "legend_event",
    bossBanner: "LEGENDA STREAMU",
    giftName: "Universe"
  });
  assert.equal(t6.kind, "LEGEND");
  assert.equal(t6.priority, 7);
});
