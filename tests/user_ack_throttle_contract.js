"use strict";

const assert = require("assert");
const throttle = require("../scripts/MIA_USER_ACK_THROTTLE");
const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const { decide } = require("../shared/platform_runtime_rules/decision_engine");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("gift wave spam and per-user throttle are separate modules", () => {
  const spam = require("../MIA_NEXT/engine_spam_session");
  assert.equal(typeof spam.createSpamSessionEngine, "function");
  assert.equal(typeof throttle.noteUserPublicAck, "function");
  assert.notEqual(spam.createSpamSessionEngine, throttle.noteUserPublicAck);
});

test("same user gift ack is silenced on second gift", () => {
  const outputState = {};
  const event = {
    eventType: "GIFT",
    route: "support",
    user: { userId: "u1", nickname: "Tomino" },
    support: {
      giftName: "Rose",
      tier: "T1",
      streamTier: "T1",
      coins: 1,
      totalCoins: 1,
      miaPoints: 7.5,
      giftPriority: 2,
      giftKey: "ROSE",
      giftVoice: { owner: "kojnozout", speak: true }
    }
  };

  const first = policy.resolveSupportAckPlan(
    event,
    { bowlPercent: 40 },
    { route: "support", reason: "SUPPORT_RESOLVED", tier: "T1" },
    { audience: { viewerCount: 30 } },
    outputState
  );
  assert.ok(first.mode === "brief" || first.mode === "full");

  policy.noteSupportAck(outputState, first.mode, event);

  const second = policy.resolveSupportAckPlan(
    event,
    { bowlPercent: 40 },
    { route: "support", reason: "SUPPORT_RESOLVED", tier: "T1" },
    { audience: { viewerCount: 30 } },
    outputState
  );
  assert.equal(second.mode, "silent");
  assert.equal(second.reason, "user_gift_ack_throttle");
});

test("high priority gift bypasses per-user throttle", () => {
  const outputState = {};
  const event = {
    eventType: "GIFT",
    user: { userId: "u2", nickname: "Pepa" },
    support: {
      giftName: "Lion",
      tier: "T4",
      streamTier: "T4",
      giftPriority: 10,
      giftKey: "LION",
      giftVoice: { owner: "both", speak: true }
    }
  };

  policy.noteSupportAck(outputState, "full", event);
  const again = policy.resolveSupportAckPlan(
    event,
    { bowlPercent: 40 },
    { route: "support", reason: "SUPPORT_RESOLVED", tier: "T4" },
    { audience: { viewerCount: 30 } },
    outputState
  );
  assert.equal(again.mode, "full");
  assert.equal(again.reason, "gift_map_priority");
});

test("repeated greeting from same user is ignored", () => {
  const outputState = {};
  const event = {
    eventType: "COMMENT",
    route: "community",
    message: "ahoj",
    user: { userId: "u3", nickname: "Fan" }
  };

  const first = decide({
    event,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(first.reason, "COMMUNITY_GREETING_DUAL");

  throttle.noteUserPublicAck(
    outputState,
    throttle.resolveUserKey(event),
    "greeting"
  );

  const second = decide({
    event,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(second.reason, "USER_GREETING_THROTTLE");
  assert.equal(second.route, "ignore");
});

test("empty mia ping and follow are throttled per user", () => {
  const outputState = {};
  const ping = {
    eventType: "COMMENT",
    route: "community",
    message: "mia",
    user: { userId: "u4", nickname: "PingFan" }
  };

  const firstPing = decide({
    event: ping,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(firstPing.reason, "COMMUNITY_DIRECT_PING");
  throttle.noteUserPublicAck(outputState, throttle.resolveUserKey(ping), "ping");

  const secondPing = decide({
    event: ping,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(secondPing.reason, "USER_PING_THROTTLE");

  const follow = {
    eventType: "FOLLOW",
    route: "community",
    user: { userId: "u5", nickname: "Follower" }
  };
  const firstFollow = decide({
    event: follow,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(firstFollow.reason, "COMMUNITY_FOLLOW");
  throttle.noteUserPublicAck(
    outputState,
    throttle.resolveUserKey(follow),
    "follow"
  );
  const secondFollow = decide({
    event: follow,
    streamState: { audience: { viewerCount: 40 } },
    outputState
  });
  assert.equal(secondFollow.reason, "USER_FOLLOW_THROTTLE");
});

test("chat CARE is throttled per user via shared throttle", () => {
  const careValidation = require("../scripts/MIA_KOJNOZROUT_CARE_VALIDATION");
  careValidation.resetCareValidationState();
  const outputState = {};
  const first = careValidation.validateCareAttempt({
    userLabel: "CareFan",
    userKey: "nick:carefan",
    audienceBand: "small",
    outputState,
    action: "podrbat",
    kojnozoutState: { hunger: 50, mood: "idle" },
    now: Date.now()
  });
  assert.equal(first.ok, true);

  const second = careValidation.validateCareAttempt({
    userLabel: "CareFan",
    userKey: "nick:carefan",
    audienceBand: "small",
    outputState,
    action: "nakrmit",
    kojnozoutState: { hunger: 50, mood: "idle" },
    now: Date.now()
  });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "care_user_cooldown");
});

test("gift care group maps to CARE action", () => {
  const care = require("../scripts/MIA_KOJNOZROUT_CARE");
  assert.equal(care.resolveCareActionFromGiftCare("LOVE").action, "podrbat");
  assert.equal(care.resolveCareActionFromGiftCare("HEAL").action, "lecit");
  assert.equal(care.resolveCareActionFromGiftCare("PET").action, "podrbat");

  const koj = require("../scripts/MIA_KOJNOZROUT_ENGINE");
  const before = koj.createKojnozoutState({ hunger: 50, socialState: 0 });
  const result = koj.applySupportToKojnozout(
    before,
    {
      giftName: "Heart",
      giftCare: "LOVE",
      giftPriority: 2,
      miaPoints: 7.5,
      tier: "T1"
    },
    {}
  );
  assert.equal(result.giftCareAction, "podrbat");
  assert.equal(result.state.behavior, "care_react");
  assert.equal(result.state.lastGiftCareAction, "podrbat");
  assert.equal(result.state.lastGiftCareGroup, "LOVE");
  // Stav se musí zachovat přes další createKojnozoutState (snapshot / další event).
  const snap = koj.createKojnozoutState(result.state);
  assert.equal(snap.lastGiftCareAction, "podrbat");
  assert.equal(snap.behavior, "care_react");
});

console.log("user_ack_throttle_contract: all passed");
