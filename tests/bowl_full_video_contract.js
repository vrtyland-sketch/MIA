"use strict";

const assert = require("assert/strict");
const {
  crossedIntoFullBowl,
  isFullBowl,
  resolveBowlFullSpecialPlayback,
  noteBowlFullSpecialPlayed,
  getBowlFullConfig
} = require("../scripts/MIA_BOWL_FULL_VIDEO");
const { createOutputState } = require("../scripts/MIA_OUTPUT_STATE");

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

const runtimeConfig = {
  gameplay: {
    bowlFull: {
      preferredTier: "T4",
      specialSources: ["T4_VIDEO_13", "T4_VIDEO_14"],
      cooldownMs: 60000
    }
  }
};

test("isFullBowl threshold is 95%", () => {
  assert.equal(isFullBowl(94), false);
  assert.equal(isFullBowl(95), true);
  assert.equal(isFullBowl(100), true);
});

test("crossedIntoFullBowl detects transition only", () => {
  assert.equal(crossedIntoFullBowl(80, 96), true);
  assert.equal(crossedIntoFullBowl(95, 100), false);
  assert.equal(crossedIntoFullBowl(96, 100), false);
});

test("resolveBowlFullSpecialPlayback plays T4 on transition", () => {
  const outputState = createOutputState();
  const plan = resolveBowlFullSpecialPlayback(
    { reason: "SUPPORT_FULL_BOWL", meta: { supportMomentType: "full_bowl" } },
    {
      runtimeConfig,
      outputState,
      kojnozoutState: { bowlPercent: 96 },
      bowlBeforeImpact: 88,
      now: Date.now()
    }
  );

  assert.equal(plan.play, true);
  assert.equal(plan.mode, "special");
  assert.equal(plan.tier, "T4");
  assert.equal(plan.sourceName, "T4_VIDEO_13");
  assert.equal(plan.reason, "bowl_full_transition");
});

test("resolveBowlFullSpecialPlayback skips when already full", () => {
  const plan = resolveBowlFullSpecialPlayback(
    { reason: "SUPPORT_FULL_BOWL" },
    {
      runtimeConfig,
      outputState: createOutputState(),
      kojnozoutState: { bowlPercent: 100 },
      bowlBeforeImpact: 98,
      now: Date.now()
    }
  );

  assert.equal(plan.play, false);
  assert.equal(plan.reason, "bowl_full_no_transition");
});

test("resolveBowlFullSpecialPlayback respects cooldown after first play", () => {
  const outputState = createOutputState();
  noteBowlFullSpecialPlayed(outputState, { at: Date.now() - 1000 });

  const plan = resolveBowlFullSpecialPlayback(
    { reason: "SUPPORT_FULL_BOWL" },
    {
      runtimeConfig,
      outputState,
      kojnozoutState: { bowlPercent: 97 },
      bowlBeforeImpact: 80,
      now: Date.now()
    }
  );

  assert.equal(plan.play, false);
  assert.equal(plan.reason, "bowl_full_cooldown");
});

test("special source rotates across transitions", () => {
  const outputState = createOutputState();
  const now = Date.now() + 120000;

  const first = resolveBowlFullSpecialPlayback(
    { reason: "SUPPORT_FULL_BOWL" },
    {
      runtimeConfig,
      outputState,
      kojnozoutState: { bowlPercent: 96 },
      bowlBeforeImpact: 70,
      now
    }
  );
  noteBowlFullSpecialPlayed(outputState, { at: now });

  const second = resolveBowlFullSpecialPlayback(
    { reason: "SUPPORT_FULL_BOWL" },
    {
      runtimeConfig,
      outputState,
      kojnozoutState: { bowlPercent: 97 },
      bowlBeforeImpact: 70,
      now: now + 120000
    }
  );

  assert.equal(first.sourceName, "T4_VIDEO_13");
  assert.equal(second.sourceName, "T4_VIDEO_14");
});

test("getBowlFullConfig reads gameplay.bowlFull", () => {
  const cfg = getBowlFullConfig(runtimeConfig);
  assert.equal(cfg.preferredTier, "T4");
  assert.deepEqual(cfg.specialSources, ["T4_VIDEO_13", "T4_VIDEO_14"]);
  assert.equal(cfg.cooldownMs, 60000);
});
