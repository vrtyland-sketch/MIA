"use strict";

const assert = require("assert/strict");
const { buildActionResult } = require("../shared/platform_runtime/action_builder");

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
  user: { username: "Tester", nickname: "Tester" },
  support: { giftName: "Rose", tier: "T1", coins: 1 }
};

test("normal T1 gift shows Rose · video T1", () => {
  const result = buildActionResult({
    decision: {
      route: "support",
      decisionType: "support",
      reason: "SUPPORT_RESOLVED",
      speaker: "kojnozout",
      tier: "T1",
      shouldPlayVideo: true,
      meta: { supportAckMode: "brief" },
      recommendedAction: {
        type: "support_reaction",
        bankKey: "support_small"
      }
    },
    event: baseEvent,
    outputState: {},
    kojnozoutState: { bowlPercent: 5, mood: "warm", stage: "idle" }
  });

  assert.match(result.overlayPayload.subtext, /Rose · video T1/);
  assert.ok(result.overlayPayload.text);
  assert.doesNotMatch(
    result.overlayPayload.text,
    /díky\. Miska to registruje\./,
    "brief T1 should prefer text bank over generic brief fallback when variants exist"
  );
});

test("spam reward shows gift T1 to video T2", () => {
  const result = buildActionResult({
    decision: {
      route: "support",
      decisionType: "support",
      reason: "SUPPORT_SPAM_REWARD",
      speaker: "kojnozout",
      tier: "T2",
      shouldPlayVideo: true,
      spamVerdict: {
        isSpamActive: true,
        shouldRewardSpam: true,
        totalPoints: 130,
        nextRewardTier: "T3",
        pointsToNextReward: 20,
        remainingWindowSec: 2,
        eventCount: 4,
        audienceBand: "tiny",
        viewerCount: 30
      }
    },
    event: baseEvent,
    kojnozoutState: { bowlPercent: 10, mood: "warm", stage: "idle" }
  });

  assert.match(result.overlayPayload.subtext, /SPAM ODMĚNA → video T2/);
  assert.match(result.overlayPayload.subtext, /Rose \(T1\) → video T2/);
});
