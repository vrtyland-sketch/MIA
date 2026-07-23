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

console.log("\n---- SUPPORT ADAPTIVE ACK ----\n");

test("large stream T1 flood should stay silent instead of thanking every gift", () => {
  const outputState = { supportAckState: { lastPublicAckAt: Date.now(), giftsSinceAck: 0 } };
  let decision = decide({
    event: baseEvent,
    streamState: { audience: { viewerCount: 320, source: "payload" } },
    kojnozoutState: { bowlPercent: 12, mood: "warm", stage: "idle" }
  });

  decision = policy.applySupportPresentation(
    decision,
    baseEvent,
    { bowlPercent: 12 },
    { audience: { viewerCount: 320 } },
    outputState
  );

  assert.equal(decision.meta?.supportAckMode, "silent");

  const result = buildActionResult({
    decision,
    event: baseEvent,
    streamState: { audience: { viewerCount: 320 } },
    outputState,
    kojnozoutState: { bowlPercent: 12, mood: "warm", stage: "idle" }
  });

  assert.equal(result.overlayPayload, null);
  assert.equal(result.shouldPlayVideo, false);
});

test("spam buildup between waves stays silent with no video", () => {
  const outputState = { supportAckState: { lastWaveAckAt: 0, lastPublicAckAt: 0 } };
  const decision = policy.applySupportPresentation(
    {
      route: "support",
      decisionType: "support",
      reason: "SUPPORT_SPAM_BUILDUP",
      tier: "T1",
      shouldPlayVideo: true,
      speaker: "kojnozout",
      actorRoles: { primary: "kojnozout", companion: "mia", allowCompanion: false },
      spamVerdict: { eventCount: 2, contributorCount: 1, totalPoints: 20 },
      resolvedSupport: { tier: "T1", repeatCount: 1, coins: 1 }
    },
    baseEvent,
    { bowlPercent: 20 },
    { audience: { viewerCount: 120 } },
    outputState
  );

  assert.equal(decision.meta?.supportAckMode, "silent");
  assert.equal(decision.meta?.supportAckReason, "spam_buildup_throttle");
  assert.equal(decision.shouldPlayVideo, false);
});

test("spam buildup should use wave ack instead of per-gift thanks", () => {
  const outputState = { supportAckState: { lastWaveAckAt: 0, lastPublicAckAt: 0 } };
  const decision = policy.applySupportPresentation(
    {
      route: "support",
      decisionType: "support",
      reason: "SUPPORT_SPAM_BUILDUP",
      tier: "T1",
      shouldPlayVideo: false,
      speaker: "mia",
      actorRoles: { primary: "mia", companion: "kojnozout", allowCompanion: false },
      spamVerdict: { eventCount: 4, contributorCount: 2, totalPoints: 40 },
      resolvedSupport: { tier: "T1", repeatCount: 1, coins: 1 }
    },
    baseEvent,
    { bowlPercent: 20 },
    { audience: { viewerCount: 120 } },
    outputState
  );

  assert.equal(decision.meta?.supportAckMode, "wave");

  const result = buildActionResult({
    decision,
    event: baseEvent,
    streamState: { audience: { viewerCount: 120 } },
    outputState,
    kojnozoutState: { bowlPercent: 20, mood: "warm", stage: "idle" }
  });

  assert.ok(result.overlayPayload?.text);
  assert.match(result.overlayPayload.text, /komunit/i);
});

test("T3 gift still gets full public acknowledgement", () => {
  const event = {
    ...baseEvent,
    support: { giftName: "Galaxy", tier: "T3", coins: 200, repeatCount: 1 }
  };

  const decision = policy.applySupportPresentation(
    decide({
      event,
      streamState: { audience: { viewerCount: 400 } },
      kojnozoutState: { bowlPercent: 30 }
    }),
    event,
    { bowlPercent: 30 },
    { audience: { viewerCount: 400 } },
    {}
  );

  assert.equal(decision.meta?.supportAckMode, "full");
  assert.equal(decision.speaker, "kojnozout");
});

console.log("\n---- SUPPORT ADAPTIVE ACK SUMMARY ----\n");
