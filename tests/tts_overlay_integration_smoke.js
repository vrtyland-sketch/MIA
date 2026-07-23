"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { runRuntimeExecutionBridge } = require("../shared/runtime_execution");
const { createVoicePriorityLayer } = require("../scripts/MIA_VOICE_PRIORITY");
const { createTtsEngine } = require("../scripts/MIA_TTS_ENGINE");
const {
  resolveVoiceDeliveryPlan,
  applyVoiceOverlayPolicy
} = require("../scripts/MIA_SPEAKER_ROUTING");

const results = { passed: 0, failed: 0 };

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function simulateVoiceDelivery(actionResult, ttsEnabled = true) {
  if (!ttsEnabled) return actionResult;

  const plan = resolveVoiceDeliveryPlan(actionResult);
  if (plan.voiceMode === "none") return actionResult;

  const next = applyVoiceOverlayPolicy(
    {
      ...actionResult,
      voicePlayback: {
        speaker: plan.voiceSpeaker,
        audioUrl: "/audio-cache/test.mp3"
      },
      meta: {
        ...(actionResult.meta || {}),
        voiceSpeaker: plan.voiceSpeaker,
        miaVoiceMode: plan.voiceMode
      }
    },
    plan.voiceMode,
    plan.voiceSpeaker
  );

  return next;
}

(async () => {
  await test("gift lane: koj voice only, no text overlays emitted", async () => {
    const action = {
      route: "support",
      overlayPayload: {
        owner: "kojnozout",
        text: "Hezky. I mensi sousto se pocita."
      },
      companionOverlayPayload: {
        owner: "mia",
        text: "Dekuju. I mala podpora je videt."
      },
      shouldPlayVideo: true
    };

    const voiced = simulateVoiceDelivery(action);
    assert.equal(voiced.overlayPayload, null);
    assert.equal(voiced.companionOverlayPayload, null);
    assert.equal(voiced.meta?.pendingCompanionVoice || null, null);
    assert.equal(voiced.voicePlayback.speaker, "kojnozout");
  });

  await test("execution bridge emits no bubbles when voice-first", async () => {
    const emitted = [];

    const voiced = simulateVoiceDelivery({
      route: "support",
      overlayPayload: { owner: "kojnozout", text: "Koj line" },
      companionOverlayPayload: { owner: "mia", text: "MIA thanks" },
      shouldPlayVideo: false
    });

    const result = await runRuntimeExecutionBridge({
      eventId: "gift_dual_lane",
      actionResult: voiced,
      executeOverlay: async (payload) => {
        emitted.push(payload.owner);
        return { ok: true, emitted: true, reason: "ok", meta: { acceptedOverlay: payload } };
      }
    });

    assert.equal(result.metrics.primaryOverlayEmitted, false);
    assert.equal(result.metrics.companionOverlayEmitted, false);
    assert.deepEqual(emitted, []);
  });

  await test("voice priority blocks chat overlay during TTS lock", async () => {
    const layer = createVoicePriorityLayer({
      nowTs: () => 10_000,
      appendJsonLog() {}
    });

    layer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "tts_primary",
      holdMs: 5000
    });

    const block = layer.shouldBlockOverlay({
      owner: "kojnozout",
      stage: "community",
      text: "chat bubble"
    });

    assert.equal(block.blocked, true);
    assert.equal(block.reason, "voice_priority_lock_active");

    const allow = layer.shouldBlockOverlay({
      owner: "kojnozout",
      stage: "support",
      tier: "T3",
      text: "big gift"
    });

    assert.equal(allow.blocked, false);
    assert.equal(allow.reason, "high_tier_override");
  });

  await test("TTS engine generates mp3 for MIA and Koj speakers", async () => {
    const cacheDir = path.join(__dirname, "..", "mia-output-overlay", "audio-cache");
    const engine = createTtsEngine({ cacheDir });
    const cfg = {
      tts: {
        enabled: true,
        provider: "edge",
        edgeRateMia: "-18%",
        edgePitchMia: "+22Hz",
        edgeRateKoj: "+14%",
        edgePitchKoj: "+28Hz"
      }
    };

    for (const speaker of ["mia", "kojnozout"]) {
      const result = await engine.speak({
        text: `Voice audit ${speaker}.`,
        speaker,
        runtimeConfig: cfg
      });

      if (!result?.ok) {
        console.log(`   (skip offline: Edge TTS unavailable for ${speaker} —`, result?.reason, ")");
        continue;
      }

      const filePath = path.join(cacheDir, path.basename(result.audioUrl));
      assert.ok(fs.existsSync(filePath));
      assert.ok(fs.statSync(filePath).size > 128);
    }
  });

  console.log("");
  console.log("---- TTS OVERLAY INTEGRATION SMOKE ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) process.exit(1);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
