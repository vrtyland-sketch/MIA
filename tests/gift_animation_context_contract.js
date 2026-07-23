"use strict";

const assert = require("assert");
const {
  buildGiftAnimationContext,
  resolveGiftReactionMood,
  resolveCareVariantOffset,
  resolvePrimaryNeed
} = require("../scripts/MIA_GIFT_ANIMATION_CONTEXT");
const { resolveVariantIndex } = require("../scripts/MIA_GIFT_VISUAL_COMPOSER");

function run() {
  assert.equal(resolvePrimaryNeed({ mood: "hungry", hunger: 60 }), "hungry");
  assert.equal(resolvePrimaryNeed({ mood: "sick", affliction: "sick" }), "sick");
  assert.equal(resolvePrimaryNeed({ isSleeping: true }), "sleepy");
  assert.equal(resolvePrimaryNeed({ mood: "happy", hunger: 10 }), "happy");

  const hungryCtx = buildGiftAnimationContext(
    { mood: "hungry", hunger: 70, bond: { neglect: 10, careBond: 20 } },
    { bowlPercent: 15 },
    { effectProgram: "care_feed" }
  );
  assert.equal(hungryCtx.primaryNeed, "hungry");
  assert.equal(hungryCtx.bowlPercent, 15);
  assert.equal(resolveGiftReactionMood(hungryCtx, { effectProgram: "care_feed" }), "eating");

  const sadCtx = buildGiftAnimationContext(
    { mood: "sad", affliction: "sad", bond: { neglect: 60, careBond: 5 } },
    {},
    { effectProgram: "generic_support" }
  );
  assert.equal(resolveGiftReactionMood(sadCtx, {}), "sad");
  assert.ok(resolveCareVariantOffset(sadCtx) >= 5);

  const happyCtx = buildGiftAnimationContext(
    { mood: "happy", hunger: 5, bond: { neglect: 10, careBond: 50 } },
    {},
    { effectProgram: "pet_react" }
  );
  assert.equal(resolveGiftReactionMood(happyCtx, { effectProgram: "pet_react" }), "happy");
  assert.ok(resolveCareVariantOffset(happyCtx) <= 0);

  const base = resolveVariantIndex({
    tier: "T2",
    kojMood: "happy",
    giftKey: "rose",
    userLabel: "FanA"
  });
  const careShifted = resolveVariantIndex({
    tier: "T2",
    kojMood: "sad",
    giftKey: "rose",
    userLabel: "FanA",
    giftAnimation: sadCtx
  });
  assert.ok(base >= 1 && base <= 100);
  assert.ok(careShifted >= 1 && careShifted <= 100);
  assert.notEqual(base, careShifted, "care context should shift variant index");

  console.log("gift_animation_context_contract: OK");
}

run();
