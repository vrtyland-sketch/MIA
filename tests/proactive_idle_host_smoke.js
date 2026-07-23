"use strict";

const assert = require("assert/strict");
const proactiveHost = require("../scripts/MIA_PROACTIVE_HOST");
const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");

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

console.log("\n---- PROACTIVE IDLE HOST ----\n");

test("quiet stream should trigger solo stream segment when chat is idle", () => {
  const outputState = {};
  const now = Date.now();
  const tick = proactiveHost.evaluateProactiveHostTick({
    streamState: {
      audience: { viewerCount: 12 },
      chat: { lastMessageAt: now - 130000 }
    },
    outputState,
    overlayState: {},
    serverStartedAt: now - 300000,
    kojnozoutState: { mood: "sleepy" }
  });

  assert.equal(tick.shouldSpeak, true);
  assert.equal(tick.behavior, "solo_stream");
  assert.equal(tick.reason, "solo_stream_segment");
  assert.equal(tick.overlayPayload?.stage, "solo_stream");
  assert.equal(tick.overlayPayload?.meta?.source, "solo_stream");
  assert.ok(tick.overlayPayload?.text);
  assert.ok(!/chat sp[ií]|kde jste|napi[sš]te|ticho/i.test(tick.overlayPayload.text));
});

test("recent chat should block proactive host speech", () => {
  const now = Date.now();
  const tick = proactiveHost.evaluateProactiveHostTick({
    streamState: {
      audience: { viewerCount: 20 },
      chat: { lastMessageAt: now - 5000 }
    },
    outputState: {},
    overlayState: {},
    serverStartedAt: now - 300000
  });

  assert.equal(tick.shouldSpeak, false);
  assert.equal(tick.reason, "chat_not_quiet_enough");
});

test("chat message should reset proactive escalation", () => {
  const outputState = {
    proactiveHostState: {
      lastSpokeAt: Date.now(),
      escalationLevel: 3,
      speakCount: 2
    }
  };

  proactiveHost.resetProactiveHostOnChat(outputState);
  assert.equal(outputState.proactiveHostState.escalationLevel, 0);
});

console.log("\n---- PROACTIVE IDLE HOST SUMMARY ----\n");

console.log("\n---- SUPPORT ACK TINY VS LARGE ----\n");

test("tiny stream T1 should thank more often than large stream flood", () => {
  const tinyOutput = { supportAckState: { lastPublicAckAt: 0, giftsSinceAck: 0 } };
  const largeOutput = {
    supportAckState: { lastPublicAckAt: Date.now(), giftsSinceAck: 0 }
  };

  const tinyPlan = policy.resolveSupportAckPlan(
    {
      eventType: "GIFT",
      route: "support",
      support: { tier: "T1", coins: 1, repeatCount: 1 }
    },
    { bowlPercent: 10 },
    {
      route: "support",
      reason: "SUPPORT_GIFT",
      tier: "T1",
      spamVerdict: { eventCount: 1, contributorCount: 1 }
    },
    { audience: { viewerCount: 10 } },
    tinyOutput
  );

  const largePlan = policy.resolveSupportAckPlan(
    {
      eventType: "GIFT",
      route: "support",
      support: { tier: "T1", coins: 1, repeatCount: 1 }
    },
    { bowlPercent: 10 },
    {
      route: "support",
      reason: "SUPPORT_GIFT",
      tier: "T1",
      spamVerdict: { eventCount: 3, contributorCount: 2 }
    },
    { audience: { viewerCount: 420 } },
    largeOutput
  );

  assert.equal(tinyPlan.mode, "brief");
  assert.equal(largePlan.mode, "silent");
});

console.log("\n---- SUPPORT ACK TINY VS LARGE SUMMARY ----\n");
