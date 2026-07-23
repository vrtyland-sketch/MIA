"use strict";

const assert = require("assert/strict");
const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const { buildActionResult } = require("../shared/platform_runtime/action_builder");
const { decide } = require("../shared/platform_runtime_rules/decision_engine");

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

const baseEvent = {
  eventType: "GIFT",
  route: "support",
  user: { username: "Tester", nickname: "Tester" },
  support: { giftName: "Rose", tier: "T1", coins: 1, repeatCount: 1 }
};

function decideSupport(event, streamState, kojnozoutState, outputState = {}) {
  return policy.applySupportPresentation(
    decide({ event, streamState, kojnozoutState }),
    event,
    kojnozoutState,
    streamState,
    outputState
  );
}

console.log("\n---- SUPPORT KOJ REACTION POLICY ----\n");

test("routine T1 gift should be acknowledged by Kojnozout, MIA only supplements big moments", () => {
  const decision = decideSupport(
    baseEvent,
    { audience: { viewerCount: 18, source: "default_small_stream" } },
    { bowlPercent: 8, mood: "warm", stage: "idle" }
  );

  assert.equal(decision.speaker, "kojnozout");
  assert.equal(decision.meta?.kojnozoutReaction, true);
  assert.equal(decision.meta?.primarySpeakerPolicy, "KOJNOZROUT_GIFT_LANE_PRIMARY");
  assert.ok(["brief", "full"].includes(decision.meta?.supportAckMode));

  const result = buildActionResult({
    decision,
    event: baseEvent,
    streamState: { audience: { viewerCount: 18 } },
    kojnozoutState: { bowlPercent: 8, mood: "warm", stage: "idle" }
  });

  assert.equal(result.overlayPayload.owner, "kojnozout");
  assert.equal(result.companionOverlayPayload, null);
});

test("T3 gift should still trigger Kojnozout reaction", () => {
  const event = {
    ...baseEvent,
    support: { giftName: "Galaxy", tier: "T3", coins: 200, repeatCount: 1 }
  };

  const decision = decideSupport(
    event,
    {},
    { bowlPercent: 40, mood: "warm", stage: "idle" }
  );

  assert.equal(decision.speaker, "kojnozout");
  assert.equal(decision.meta?.kojnozoutReaction, true);
});

test("full bowl should trigger Kojnozout reaction even on small gift", () => {
  const decision = decideSupport(
    baseEvent,
    {},
    { bowlPercent: 96, mood: "excited", stage: "full" }
  );

  assert.equal(decision.reason, "SUPPORT_FULL_BOWL");
  assert.equal(decision.speaker, "kojnozout");
});

test("spam reward should trigger Kojnozout reaction", () => {
  const decision = policy.applySupportPresentation(
    {
      route: "support",
      reason: "SUPPORT_SPAM_REWARD",
      tier: "T2",
      speaker: "mia",
      actorRoles: { primary: "mia", companion: "kojnozout", allowCompanion: false },
      resolvedSupport: { tier: "T1", repeatCount: 1, coins: 1 }
    },
    baseEvent,
    { bowlPercent: 12 }
  );

  assert.equal(decision.speaker, "kojnozout");
});

console.log("\n---- SUPPORT KOJ REACTION POLICY SUMMARY ----\n");
