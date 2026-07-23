"use strict";

/**
 * Contract tests for MIA_NEXT/engine_spam_session.js (production spam engine).
 * Each test uses an isolated SpamSessionEngine instance.
 */

const assert = require("assert/strict");
const {
  createSpamSessionEngine,
  resolveAudienceBand
} = require("../MIA_NEXT/engine_spam_session");

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

function giftEvent(overrides = {}) {
  const base = {
    eventType: "GIFT",
    route: "support",
    ts: Date.now(),
    user: { username: "fan1", nickname: "Fan1" },
    support: {
      giftName: "Rose",
      tier: "T1",
      coins: 1,
      totalPoints: 10,
      miaPoints: 10
    }
  };

  return {
    ...base,
    ...overrides,
    user: { ...base.user, ...(overrides.user || {}) },
    support: { ...base.support, ...(overrides.support || {}) }
  };
}

console.log("\n---- SPAM SESSION ENGINE CONTRACT ----\n");

test("non-gift events are ignored", () => {
  const engine = createSpamSessionEngine({ windowMs: 5000, minSequenceCount: 3 });
  const result = engine.processSupport(
    { eventType: "COMMENT", message: "ahoj" },
    { streamState: { audience: { viewerCount: 50 } } }
  );

  assert.equal(result.reason, "ignored_non_gift");
  assert.equal(result.shouldTrack, false);
});

test("gift buildup before spam is confirmed", () => {
  const engine = createSpamSessionEngine({ windowMs: 8000, minSequenceCount: 3 });
  const ctx = { streamState: { audience: { viewerCount: 120 } } };

  const r1 = engine.processSupport(giftEvent({ ts: 1000 }), ctx);
  const r2 = engine.processSupport(giftEvent({ ts: 1100, user: { username: "fan2" } }), ctx);

  assert.equal(r1.reason, "spam_buildup");
  assert.equal(r2.reason, "spam_buildup");
  assert.equal(r1.shouldRewardSpam, false);
  assert.equal(r2.eventCount, 2);
});

test("spam confirms after minSequenceCount gifts", () => {
  const engine = createSpamSessionEngine({ windowMs: 8000, minSequenceCount: 3 });
  const ctx = { streamState: { audience: { viewerCount: 120 } } };

  engine.processSupport(giftEvent({ ts: 1000 }), ctx);
  engine.processSupport(giftEvent({ ts: 1100, user: { username: "fan2" } }), ctx);
  const r3 = engine.processSupport(
    giftEvent({ ts: 1200, user: { username: "fan3" } }),
    ctx
  );

  assert.equal(r3.reason, "spam_confirmed_no_reward");
  assert.equal(r3.isSpamConfirmed, true);
  assert.equal(r3.newlyConfirmed, true);
});

test("spam engine derives points from coins when miaPoints missing", () => {
  const engine = createSpamSessionEngine({
    windowMs: 8000,
    minSequenceCount: 3,
    rewardThresholds: { T2: 20, T3: 200, T4: 500 }
  });
  const ctx = { streamState: { audience: { viewerCount: 20 } } };

  let reward = null;
  for (let i = 0; i < 4; i++) {
    const result = engine.processSupport(
      giftEvent({
        ts: 1000 + i * 100,
        user: { username: `fan${i}` },
        support: {
          giftName: "Rose",
          tier: "T1",
          coins: 1,
          repeatCount: 1,
          totalPoints: 0,
          miaPoints: 0
        }
      }),
      ctx
    );
    if (result.shouldRewardSpam) {
      reward = result;
      break;
    }
  }

  assert.ok(reward, "expected coin-derived spam milestone");
  assert.equal(reward.rewardTier, "T2");
});

test("spam reward fires when points cross T2 threshold", () => {
  const engine = createSpamSessionEngine({
    windowMs: 10000,
    minSequenceCount: 3,
    rewardThresholds: { T2: 30, T3: 200, T4: 500 }
  });
  const ctx = { streamState: { audience: { viewerCount: 120 } } };

  let reward = null;

  for (let i = 0; i < 4; i++) {
    const result = engine.processSupport(
      giftEvent({
        ts: 1000 + i * 100,
        user: { username: `fan${i}` },
        support: { giftName: "Rose", totalPoints: 10, miaPoints: 10 }
      }),
      ctx
    );

    if (result.shouldRewardSpam) {
      reward = result;
      break;
    }
  }

  assert.ok(reward, "expected spam reward milestone");
  assert.equal(reward.rewardTier, "T2");
  assert.equal(reward.reason, "spam_confirmed_reward");
});

test("already_granted does not repeat reward for same tier", () => {
  const engine = createSpamSessionEngine({
    windowMs: 10000,
    minSequenceCount: 3,
    rewardThresholds: { T2: 20, T3: 200, T4: 500 }
  });
  const ctx = { streamState: { audience: { viewerCount: 120 } } };

  let firstReward = null;

  for (let i = 0; i < 5; i++) {
    const result = engine.processSupport(
      giftEvent({
        ts: 1000 + i * 100,
        user: { username: `fan${i}` },
        support: { totalPoints: 10, miaPoints: 10 }
      }),
      ctx
    );

    if (result.shouldRewardSpam && !firstReward) {
      firstReward = result;
    }
  }

  assert.ok(firstReward);

  const again = engine.processSupport(
    giftEvent({
      ts: 2000,
      user: { username: "fan_extra" },
      support: { totalPoints: 5, miaPoints: 5 }
    }),
    ctx
  );

  assert.equal(again.shouldRewardSpam, false);
  assert.equal(again.rewardState, "already_granted");
});

test("tiny stream uses lower minSequenceCount via audience policy", () => {
  const engine = createSpamSessionEngine({ windowMs: 8000, minSequenceCount: 3 });
  const ctx = { streamState: { audience: { viewerCount: 10 } } };

  engine.processSupport(giftEvent({ ts: 1000 }), ctx);
  engine.processSupport(giftEvent({ ts: 1100, user: { username: "fan2" } }), ctx);

  const state = engine.getState();
  assert.equal(state.audienceBand, "tiny");
  assert.equal(state.minSequenceCount, 2);
});

test("engine instances are isolated", () => {
  const engine1 = createSpamSessionEngine({ windowMs: 8000, minSequenceCount: 3 });
  const engine2 = createSpamSessionEngine({ windowMs: 8000, minSequenceCount: 3 });
  const ctx = { streamState: { audience: { viewerCount: 50 } } };

  for (let i = 0; i < 3; i++) {
    engine1.processSupport(giftEvent({ ts: 1000 + i * 50 }), ctx);
  }

  const fresh = engine2.processSupport(giftEvent({ ts: 5000 }), ctx);
  assert.equal(fresh.eventCount, 1);
  assert.equal(fresh.isSpamConfirmed, false);
});

test("resolveAudienceBand maps viewer counts", () => {
  assert.equal(resolveAudienceBand(10), "tiny");
  assert.equal(resolveAudienceBand(400), "large");
});

test("spamRewardTier aliases rewardTier and supports T4 milestone", () => {
  const engine = createSpamSessionEngine({
    windowMs: 10000,
    minSequenceCount: 3,
    rewardThresholds: { T2: 30, T3: 60, T4: 90 }
  });
  const ctx = { streamState: { audience: { viewerCount: 120 } } };

  const tiers = [];
  // Po 15 bodech: 3. gift = 45 → T2, pak 60 → T3, pak 90 → T4 (postupné milestone).
  for (let i = 0; i < 8; i++) {
    const result = engine.processSupport(
      giftEvent({
        ts: 1000 + i * 100,
        user: { username: `fan${i}` },
        support: { giftName: "Rose", totalPoints: 15, miaPoints: 15 }
      }),
      ctx
    );
    if (result.shouldRewardSpam) {
      assert.equal(result.spamRewardTier, result.rewardTier);
      tiers.push(result.spamRewardTier);
    }
  }

  assert.deepEqual(tiers, ["T2", "T3", "T4"]);
});

console.log("\n---- SPAM SESSION ENGINE CONTRACT SUMMARY ----\n");
