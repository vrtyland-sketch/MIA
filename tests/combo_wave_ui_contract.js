"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const waveUi = require("../mia-output-overlay/assets/combo-wave-ui.js");
const comboOverlay = require("../scripts/MIA_COMBO_OVERLAY");

test("buildWaveHudModel hides when wave inactive", () => {
  assert.deepEqual(waveUi.buildWaveHudModel({ active: false }), { visible: false });
});

test("buildWaveHudModel exposes progress and participants", () => {
  const model = waveUi.buildWaveHudModel({
    active: true,
    spamConfirmed: true,
    totalPoints: 600,
    targetRewardPoints: 750,
    pointsToNextReward: 750,
    eventCount: 5,
    participantCount: 3,
    remainingWindowSec: 8,
    nextRewardTier: "T2",
    participants: {
      a: { userLabel: "Tomino", points: 400, count: 3 },
      b: { userLabel: "MiaFan", points: 150, count: 1 },
      c: { userLabel: "RoseQueen", points: 50, count: 1 }
    }
  });

  assert.equal(model.visible, true);
  assert.equal(model.confirmed, true);
  assert.equal(model.progressPct, 80);
  assert.equal(model.nextTier, "T2");
  assert.deepEqual(model.participantNames, ["Tomino", "MiaFan", "RoseQueen"]);
  assert.match(model.metaLine, /5 dárků/);
  assert.match(model.metaLine, /600 bodů/);
});

test("buildWaveHudModel marks urgent countdown", () => {
  const model = waveUi.buildWaveHudModel({
    active: true,
    spamConfirmed: true,
    totalPoints: 120,
    targetRewardPoints: 750,
    eventCount: 4,
    participantCount: 2,
    remainingWindowSec: 3
  });

  assert.equal(model.urgent, true);
  assert.equal(model.pulse, false);
});

test("resolveSpamMomentPresentation maps wave kinds", () => {
  const wave = waveUi.resolveSpamMomentPresentation({ kind: "SPAM_WAVE" });
  const milestone = waveUi.resolveSpamMomentPresentation({ kind: "SPAM_MILESTONE" });
  assert.match(wave.badge, /vlna/i);
  assert.match(milestone.badge, /milník/i);
});

test("spam wave moment uses canon wave title", () => {
  const moment = comboOverlay.buildSpamComboMoment({
    newlyConfirmed: true,
    eventCount: 4,
    totalPoints: 120,
    participantCount: 3
  });

  assert.equal(moment.kind, "SPAM_WAVE");
  assert.match(moment.title, /DÁRKOVÁ VLNA/);
  assert.equal(moment.priority, 4);
});
