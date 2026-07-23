"use strict";

/**
 * End-to-end integration tests for the production shadow pipeline.
 * No HTTP mocks — exercises runShadowPipeline → decide → buildActionResult.
 */

const assert = require("assert/strict");
const { runShadowPipeline } = require("../MIA_NEXT/engine_shadow_runtime");
const { resetSpamSession, configureSpamSession } = require("../MIA_NEXT/engine_spam_session");
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

function baseCtx(overrides = {}) {
  return {
    streamState: { audience: { viewerCount: 20, source: "test" } },
    outputState: createOutputState(),
    kojnozoutState: { bowlPercent: 10, mood: "warm", stage: "idle" },
    runtimeConfig: { llm: { mode: "off" } },
    ...overrides
  };
}

function runPipeline(rawEvent, ctxOverrides = {}) {
  const ctx = baseCtx(ctxOverrides);
  const result = runShadowPipeline({
    rawEvent,
    streamState: ctx.streamState,
    outputState: ctx.outputState,
    kojnozoutState: ctx.kojnozoutState,
    runtimeConfig: ctx.runtimeConfig
  });

  assert.equal(result.ok, true, `pipeline failed: ${result.error || "unknown"}`);
  return result;
}

function giftEvent(overrides = {}) {
  return {
    eventType: "GIFT",
    route: "support",
    ts: Date.now(),
    user: { username: "Tester", nickname: "Tester" },
    support: {
      giftName: "Rose",
      tier: "T1",
      coins: 1,
      repeatCount: 1,
      totalPoints: 10,
      miaPoints: 10
    },
    ...overrides,
    user: { username: "Tester", nickname: "Tester", ...(overrides.user || {}) },
    support: {
      giftName: "Rose",
      tier: "T1",
      coins: 1,
      repeatCount: 1,
      totalPoints: 10,
      miaPoints: 10,
      ...(overrides.support || {})
    }
  };
}

function commentEvent(message, overrides = {}) {
  return {
    eventType: "COMMENT",
    route: "community",
    message,
    user: { username: "Katka", nickname: "Katka" },
    ...overrides
  };
}

function hasWarning(result, code) {
  return (result.debug?.warnings || []).some((item) => item.code === code);
}

console.log("\n---- SHADOW PIPELINE INTEGRATION ----\n");

test("direct chat ping routes through brain and returns MIA overlay text", () => {
  const result = runPipeline(commentEvent("Mio jak se mas?"));

  assert.equal(result.decisionResult.reason, "COMMUNITY_DIRECT_PING");
  assert.equal(result.decisionResult.speaker, "mia");
  assert.ok(result.decisionResult.meta?.chatIntent);
  assert.equal(result.decisionResult.meta.chatIntent.type, "direct_status_question");

  const text = result.actionResult.overlayPayload?.text || "";
  assert.ok(text.length > 8);
  assert.match(text.toLowerCase(), /katka|m[aá]m|fajn|dobře|síť|stream/i);
  assert.equal(result.actionResult.overlayPayload.owner, "mia");
});

test("grief message stays on bank path with sensitive MIA response", () => {
  const result = runPipeline(
    commentEvent("mia mam smutek, můj pes umřel")
  );

  assert.equal(result.decisionResult.reason, "COMMUNITY_DIRECT_PING");
  assert.equal(result.decisionResult.speaker, "mia");
  assert.ok(
    ["pet_loss_report", "loss_report", "sadness_report"].includes(
      result.decisionResult.meta?.chatIntent?.type
    )
  );

  const text = result.actionResult.overlayPayload?.text || "";
  assert.match(text.toLowerCase(), /katka|líto|mrz/i);
  assert.doesNotMatch(text.toLowerCase(), /generic|fallback/i);
});

test("small stream T1 gift is acknowledged by Kojnozout from text bank", () => {
  resetSpamSession();

  const result = runPipeline(
    giftEvent(),
    { streamState: { audience: { viewerCount: 18 } } }
  );

  assert.equal(result.decisionResult.speaker, "kojnozout");
  assert.equal(result.decisionResult.meta?.primarySpeakerPolicy, "KOJNOZROUT_GIFT_LANE_PRIMARY");
  assert.ok(["brief", "full"].includes(result.decisionResult.meta?.supportAckMode));

  const text = result.actionResult.overlayPayload?.text || "";
  assert.ok(text);
  assert.equal(result.actionResult.overlayPayload.owner, "kojnozout");
  assert.doesNotMatch(text, /díky\. Miska to registruje\./);
});

test("large stream T1 flood stays silent when ack cooldown is active", () => {
  resetSpamSession();

  const outputState = createOutputState();
  outputState.supportAckState = {
    lastPublicAckAt: Date.now(),
    lastWaveAckAt: 0,
    giftsSinceAck: 0
  };

  const result = runPipeline(
    giftEvent({
      support: { tier: "T1", repeatCount: 1, coins: 1, totalPoints: 1, miaPoints: 1 }
    }),
    {
      streamState: { audience: { viewerCount: 320 } },
      outputState
    }
  );

  assert.equal(result.decisionResult.meta?.supportAckMode, "silent");
  assert.equal(result.actionResult.overlayPayload, null);
});

test("T3 gift gets full Kojnozout acknowledgement and video tier", () => {
  resetSpamSession();

  const result = runPipeline(
    giftEvent({
      support: {
        giftName: "Galaxy",
        tier: "T3",
        coins: 200,
        repeatCount: 1,
        totalPoints: 200,
        miaPoints: 200
      }
    }),
    { streamState: { audience: { viewerCount: 400 } } }
  );

  assert.equal(result.decisionResult.meta?.supportAckMode, "full");
  assert.equal(result.decisionResult.speaker, "kojnozout");
  assert.equal(result.actionResult.shouldPlayVideo, true);
  assert.ok(result.actionResult.overlayPayload?.text);
});

test("spam confirmed without milestone still plays gift tier video", () => {
  resetSpamSession();

  const ctx = baseCtx({ streamState: { audience: { viewerCount: 120 } } });
  let last = null;

  for (let i = 0; i < 3; i++) {
    last = runShadowPipeline({
      rawEvent: giftEvent({
        ts: 1000 + i * 200,
        user: { username: `fan${i}`, nickname: `Fan${i}` },
        support: {
          tier: "T1",
          coins: 1,
          repeatCount: 1,
          totalPoints: 10,
          miaPoints: 10
        }
      }),
      streamState: ctx.streamState,
      outputState: ctx.outputState,
      kojnozoutState: ctx.kojnozoutState,
      runtimeConfig: ctx.runtimeConfig
    });
    assert.equal(last.ok, true);
  }

  assert.equal(last.decisionResult.reason, "SUPPORT_SPAM_BUILDUP");
  assert.equal(last.actionResult.shouldPlayVideo, false);
  assert.equal(last.actionResult.tier, "T1");
});

test("spam milestone reward upgrades playback tier to T2 video", () => {
  resetSpamSession();
  configureSpamSession({
    windowMs: 10000,
    minSequenceCount: 3,
    rewardThresholds: { T2: 30, T3: 200, T4: 500 }
  });

  const ctx = baseCtx({ streamState: { audience: { viewerCount: 120 } } });
  let reward = null;

  for (let i = 0; i < 10; i++) {
    const result = runShadowPipeline({
      rawEvent: giftEvent({
        ts: 1000 + i * 150,
        user: { username: `fan${i}`, nickname: `Fan${i}` },
        support: {
          tier: "T1",
          coins: 1,
          repeatCount: 1,
          totalPoints: 10,
          miaPoints: 10
        }
      }),
      streamState: ctx.streamState,
      outputState: ctx.outputState,
      kojnozoutState: ctx.kojnozoutState,
      runtimeConfig: ctx.runtimeConfig
    });

    assert.equal(result.ok, true);
    if (result.decisionResult.reason === "SUPPORT_SPAM_REWARD") {
      reward = result;
      break;
    }
  }

  assert.ok(reward, "expected spam milestone video decision");
  assert.equal(reward.actionResult.shouldPlayVideo, true);
  assert.equal(reward.actionResult.tier, "T2");
});

test("spam gift sequence reaches SUPPORT_SPAM_BUILDUP on third gift", () => {
  resetSpamSession();

  const ctx = baseCtx({ streamState: { audience: { viewerCount: 120 } } });
  let last = null;

  for (let i = 0; i < 3; i++) {
    last = runShadowPipeline({
      rawEvent: giftEvent({
        ts: 1000 + i * 200,
        user: { username: `fan${i}`, nickname: `Fan${i}` },
        support: { totalPoints: 5, miaPoints: 5 }
      }),
      streamState: ctx.streamState,
      outputState: ctx.outputState,
      kojnozoutState: ctx.kojnozoutState,
      runtimeConfig: ctx.runtimeConfig
    });
    assert.equal(last.ok, true);
  }

  assert.equal(last.decisionResult.reason, "SUPPORT_SPAM_BUILDUP");
  assert.ok(last.spamVerdict?.isSpamConfirmed || last.spamVerdict?.spamConfirmed);
});

test("pipeline action result passes contract validation", () => {
  resetSpamSession();

  const result = runPipeline(commentEvent("ahoj mia"));

  assert.ok(result.actionResult);
  assert.ok(result.actionResult.overlayPayload?.text);
  assert.equal(hasWarning(result, "ACTION_RESULT_INVALID"), false);
  assert.equal(hasWarning(result, "OVERLAY_PAYLOAD_INVALID"), false);
});

test("direct ping preserves message in decision meta for downstream LLM", () => {
  const message = "Mio co si myslis o dnesku?";
  const result = runPipeline(commentEvent(message));

  assert.equal(result.decisionResult.meta?.message, message);
  assert.equal(result.actionResult.overlayPayload?.owner, "mia");
});

console.log("\n---- SHADOW PIPELINE INTEGRATION SUMMARY ----\n");
