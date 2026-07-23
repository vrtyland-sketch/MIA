"use strict";

const assert = require("assert/strict");
const {
  isDirectorEnabled,
  planDirection,
  applyDirectorToVoicePlan,
  MOODS
} = require("../core/mia-director");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const prev = process.env.MIA_DIRECTOR;
const prevDual = process.env.MIA_DUAL_VOICE;

try {
  delete process.env.MIA_DIRECTOR;
  delete process.env.MIA_DUAL_VOICE;

  test("director enabled by default", () => {
    assert.equal(isDirectorEnabled({}), true);
    assert.equal(isDirectorEnabled({ phase2: { director: { enabled: false } } }), false);
  });

  test("MIA_DIRECTOR=0 disables", () => {
    process.env.MIA_DIRECTOR = "0";
    assert.equal(isDirectorEnabled({}), false);
    delete process.env.MIA_DIRECTOR;
  });

  test("T1 gift → calm/warm koj lane, no dual", () => {
    const plan = planDirection({
      event: {
        type: "gift",
        user: { id: "u1", name: "Pepa" },
        gift: { name: "Rose", miaPoints: 7.5 }
      },
      kojVitals: { bowlPercent: 20, hunger: 0.4 }
    });
    assert.equal(plan.enabled, true);
    assert.ok(plan.intensity < 0.5);
    assert.ok([MOODS.calm, MOODS.warm].includes(plan.mood));
    assert.equal(plan.speaker, "kojnozout");
    assert.equal(plan.dualVoice, false);
    assert.equal(plan.companion, null);
    assert.ok(plan.overlayHints.animationTier);
    assert.equal(plan.overlayHints.showCoins, undefined);
  });

  test("T4 + bowl rush → celebrate / high intensity", () => {
    const plan = planDirection({
      event: {
        type: "gift",
        user: { id: "u2", name: "Tom" },
        gift: { name: "Lion", miaPoints: 8000 }
      },
      comboMoment: { type: "bowl_rush" },
      kojVitals: { bowlPercent: 96 }
    });
    assert.ok(plan.intensity >= 0.85);
    assert.equal(plan.mood, MOODS.celebrate);
    assert.ok(plan.overlayHints.giftStageSpectacle);
    assert.ok(plan.celebrate);
  });

  test("applyDirectorToVoicePlan never revives dual", () => {
    process.env.MIA_DUAL_VOICE = "";
    const direction = planDirection({
      event: { type: "gift", gift: { miaPoints: 9000 } },
      comboMoment: { type: "community_burst" }
    });
    const voice = applyDirectorToVoicePlan(
      { text: "díky", companionVoiceText: "echo", voiceSpeaker: "mia" },
      direction
    );
    assert.equal(voice.companionVoiceText, "");
    assert.ok(voice.director);
  });

  test("viewer memory celebrate flag when returning fan", () => {
    const plan = planDirection({
      event: { type: "gift", gift: { miaPoints: 7.5 } },
      viewerMemory: { giftCount: 5, favoriteGift: "ROSE", name: "Fan" }
    });
    assert.equal(plan.celebrate?.useViewerMemory, true);
  });
} finally {
  if (prev === undefined) delete process.env.MIA_DIRECTOR;
  else process.env.MIA_DIRECTOR = prev;
  if (prevDual === undefined) delete process.env.MIA_DUAL_VOICE;
  else process.env.MIA_DUAL_VOICE = prevDual;
}

console.log("phase2_mia_director_contract: all passed");
