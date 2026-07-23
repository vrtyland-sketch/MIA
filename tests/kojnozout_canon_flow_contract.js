"use strict";

const assert = require("assert/strict");
const careValidation = require("../scripts/MIA_KOJNOZROUT_CARE_VALIDATION");
const reactionOrder = require("../scripts/MIA_KOJNOZROUT_REACTION_ORDER");
const display = require("../scripts/MIA_KOJNOZROUT_DISPLAY");
const {
  resolveBowlCycleSpecialPlayback,
  noteBowlFullSpecialPlayed
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

console.log("\n---- KOJNOZROUT CANON FLOW CONTRACT ----\n");

test("care validation blocks rapid repeat from same user", () => {
  careValidation.resetCareValidationState();
  const now = Date.now();
  const first = careValidation.validateCareAttempt({
    userLabel: "Rose",
    action: "podrbat",
    kojnozoutState: { mood: "happy" },
    now
  });
  assert.equal(first.ok, true);
  const second = careValidation.validateCareAttempt({
    userLabel: "Rose",
    action: "podrbat",
    kojnozoutState: { mood: "happy" },
    now: now + 1000
  });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "care_user_cooldown");
});

test("care validation allows soft heal when not sick", () => {
  careValidation.resetCareValidationState();
  const result = careValidation.validateCareAttempt({
    userLabel: "Alex",
    action: "lecit",
    kojnozoutState: { mood: "happy", affliction: null },
    now: Date.now()
  });
  assert.equal(result.ok, true);
  assert.equal(result.soft, true);
});

test("reaction order schedules koj after mia on emotional statement", () => {
  assert.equal(
    reactionOrder.shouldKojFollowMia({ type: "emotional_statement", emotion: { type: "stress" } }, "mia"),
    true
  );
  const companion = reactionOrder.buildKojEmotionalCompanion("Rose", {
    type: "sadness_report",
    emotion: { type: "stress" }
  });
  assert.ok(companion.overlayPayload);
  assert.equal(companion.overlayPayload.owner, "kojnozout");
  assert.ok(companion.delayMs >= 500);
});

test("watching koj with sleep depth shows calm or cozy sprite mood", () => {
  const mood = display.resolveKojDisplayMood(
    {
      mood: "idle",
      behavior: "watching",
      bowlPercent: 40,
      hunger: 30,
      vitals: { sleepDepth: 28 }
    },
    { need: "happy" }
  );
  assert.equal(mood, "cozy-blanket");
});

test("bowl cycle special playback offers T4 when full", () => {
  const outputState = createOutputState();
  const plan = resolveBowlCycleSpecialPlayback({
    runtimeConfig: {
      gameplay: {
        bowlFull: {
          preferredTier: "T4",
          specialSources: ["T4_VIDEO_13"],
          cooldownMs: 60000
        }
      }
    },
    outputState,
    kojnozoutState: { bowlPercent: 100 },
    now: Date.now()
  });
  assert.equal(plan.play, true);
  assert.equal(plan.tier, "T4");
  noteBowlFullSpecialPlayed(outputState, { at: Date.now(), tier: "T4" });
  const blocked = resolveBowlCycleSpecialPlayback({
    runtimeConfig: {
      gameplay: {
        bowlFull: { preferredTier: "T4", specialSources: ["T4_VIDEO_13"], cooldownMs: 60000 }
      }
    },
    outputState,
    kojnozoutState: { bowlPercent: 100 },
    now: Date.now()
  });
  assert.equal(blocked.play, false);
  assert.equal(blocked.reason, "bowl_full_cooldown");
});

console.log("\n---- KOJNOZROUT CANON FLOW CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
