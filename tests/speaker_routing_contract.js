"use strict";

const assert = require("assert/strict");
const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const { buildActionResult } = require("../shared/platform_runtime/action_builder");
const { decide } = require("../shared/platform_runtime_rules/decision_engine");
const {
  resolveVoiceDeliveryPlan,
  applyVoiceOverlayPolicy,
  describeEventResponder,
  shouldDeferVoiceForGiftVideo,
  resolveDeferredVoicePlan,
  resolveGiftVideoVoiceDeferMs,
  applyGiftVideoPresentationPolicy
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

const giftT1 = {
  eventType: "GIFT",
  route: "support",
  user: { username: "Tester", nickname: "Tester" },
  support: { giftName: "Rose", tier: "T1", coins: 1, repeatCount: 1 }
};

(async () => {
  await test("T1 gift: Koj voice primary, no overlay bubble", async () => {
    const decision = policy.applySupportPresentation(
      decide({
        event: giftT1,
        streamState: { audience: { viewerCount: 18 } },
        kojnozoutState: { bowlPercent: 8 }
      }),
      giftT1,
      { bowlPercent: 8 },
      { audience: { viewerCount: 18 } },
      {}
    );

    const action = buildActionResult({
      decision,
      event: giftT1,
      streamState: { audience: { viewerCount: 18 } },
      kojnozoutState: { bowlPercent: 8 }
    });

    const plan = resolveVoiceDeliveryPlan(action);
    assert.equal(plan.voiceMode, "primary");
    assert.equal(plan.voiceSpeaker, "kojnozout");
    assert.ok(plan.text.length > 0);

    const voiced = applyVoiceOverlayPolicy(action, "primary", "kojnozout");
    assert.equal(voiced.overlayPayload, null);
    assert.equal(voiced.companionOverlayPayload, null);
  });

  await test("T1 gift: koj voice is never deferred for video", async () => {
    const decision = policy.applySupportPresentation(
      decide({
        event: giftT1,
        streamState: { audience: { viewerCount: 18 } },
        kojnozoutState: { bowlPercent: 8 }
      }),
      giftT1,
      { bowlPercent: 8 },
      { audience: { viewerCount: 18 } },
      {}
    );

    const action = buildActionResult({
      decision,
      event: giftT1,
      streamState: { audience: { viewerCount: 18 } },
      kojnozoutState: { bowlPercent: 8 }
    });

    assert.equal(shouldDeferVoiceForGiftVideo(action), false);
  });

  await test("T3 gift: no deferred MIA companion by default", async () => {
    const giftT3 = {
      ...giftT1,
      support: { giftName: "Galaxy", tier: "T3", coins: 200, repeatCount: 1 }
    };

    const decision = policy.applySupportPresentation(
      decide({
        event: giftT3,
        streamState: { audience: { viewerCount: 120 } },
        kojnozoutState: { bowlPercent: 30 }
      }),
      giftT3,
      { bowlPercent: 30 },
      { audience: { viewerCount: 120 } },
      {}
    );

    const action = buildActionResult({
      decision,
      event: giftT3,
      streamState: { audience: { viewerCount: 120 } },
      kojnozoutState: { bowlPercent: 30 }
    });

    assert.equal(shouldDeferVoiceForGiftVideo(action), false);

    const deferred = resolveDeferredVoicePlan(action);
    assert.equal(deferred, null);

    assert.ok(
      resolveGiftVideoVoiceDeferMs(action, {
        obs: { tierPlaybackMs: { T3: 15000 }, sceneSwitchSettleMs: 280 }
      }) >= 15000
    );
  });

  await test("MIA-only gift voice can still defer for video", async () => {
    const action = {
      overlayPayload: { owner: "mia", text: "MIA primary gift line." },
      shouldPlayVideo: true
    };
    assert.equal(shouldDeferVoiceForGiftVideo(action), true);
  });

  await test("T3 gift: Koj voice only, no pending MIA companion", async () => {
    const giftT3 = {
      ...giftT1,
      support: { giftName: "Galaxy", tier: "T3", coins: 200, repeatCount: 1 }
    };

    const decision = policy.applySupportPresentation(
      decide({
        event: giftT3,
        streamState: { audience: { viewerCount: 120 } },
        kojnozoutState: { bowlPercent: 30 }
      }),
      giftT3,
      { bowlPercent: 30 },
      { audience: { viewerCount: 120 } },
      {}
    );

    const action = buildActionResult({
      decision,
      event: giftT3,
      streamState: { audience: { viewerCount: 120 } },
      kojnozoutState: { bowlPercent: 30 }
    });

    const plan = resolveVoiceDeliveryPlan(action);
    assert.equal(plan.voiceSpeaker, "kojnozout");
    assert.equal(plan.companionVoiceText, "");

    const voiced = applyVoiceOverlayPolicy(action, "primary", "kojnozout");
    assert.equal(voiced.overlayPayload, null);
    assert.equal(voiced.meta?.pendingCompanionVoice || null, null);
  });

  await test("MIA_DUAL_VOICE=1 restores Koj+MIA companion chain", async () => {
    const prev = process.env.MIA_DUAL_VOICE;
    process.env.MIA_DUAL_VOICE = "1";
    try {
      const action = {
        overlayPayload: { owner: "kojnozout", text: "Koj thanks." },
        companionOverlayPayload: { owner: "mia", text: "MIA also thanks." }
      };
      const plan = resolveVoiceDeliveryPlan(action);
      assert.equal(plan.voiceSpeaker, "kojnozout");
      assert.ok(plan.companionVoiceText.length > 0);
      const voiced = applyVoiceOverlayPolicy(action, "primary", "kojnozout");
      assert.ok(voiced.meta.pendingCompanionVoice.length > 0);
    } finally {
      if (prev === undefined) delete process.env.MIA_DUAL_VOICE;
      else process.env.MIA_DUAL_VOICE = prev;
    }
  });

  await test("direct chat to Koj: voice primary, no bubble", async () => {
    const action = {
      overlayPayload: {
        owner: "kojnozout",
        text: "Ham ham."
      }
    };

    const plan = resolveVoiceDeliveryPlan(action);
    assert.equal(plan.voiceSpeaker, "kojnozout");
  });

  await test("spam throttled gift skips koj voice line", async () => {
    const plan = resolveVoiceDeliveryPlan({
      route: "support",
      tier: "T1",
      shouldPlayVideo: false,
      overlayPayload: null,
      meta: {
        speaker: "kojnozout",
        supportAckMode: "silent",
        supportAckReason: "spam_buildup_throttle",
        primarySpeakerPolicy: "SUPPORT_SILENT_FEED"
      }
    });

    assert.equal(plan.shouldSpeak, false);
    assert.equal(plan.text, "");
  });

  await test("silent gift still gets koj voice line", async () => {
    const plan = resolveVoiceDeliveryPlan({
      route: "support",
      tier: "T1",
      shouldPlayVideo: true,
      overlayPayload: null,
      meta: {
        speaker: "kojnozout",
        supportAckMode: "silent",
        primarySpeakerPolicy: "SUPPORT_SILENT_FEED"
      }
    });

    assert.equal(plan.voiceSpeaker, "kojnozout");
    assert.equal(plan.shouldSpeak, true);
    assert.ok(plan.text.length > 0);
  });

  await test("silent gift video keeps koj voice, no bubble", async () => {
    const action = applyGiftVideoPresentationPolicy(
      {
        route: "support",
        tier: "T1",
        shouldPlayVideo: true,
        overlayPayload: null,
        meta: { speaker: "kojnozout", supportAckMode: "full" }
      },
      {
        videoEngine: {
          peekNextSourceForTier: () => "T1_VIDEO_01"
        },
        obsSourceAudioMap: { T1_VIDEO_01: false }
      }
    );

    const plan = resolveVoiceDeliveryPlan(action);
    assert.equal(plan.voiceSpeaker, "kojnozout");
    assert.equal(plan.shouldSpeak, true);
    assert.equal(action.meta.suppressGiftVoice, undefined);

    const voiced = applyVoiceOverlayPolicy(action, "primary", "kojnozout");
    assert.equal(voiced.overlayPayload, null);
  });

  await test("duplicate companion utterance is scrubbed from voice plan", async () => {
    const same = "Diky, Tester. Beru to do misky.";
    const prev = process.env.MIA_DUAL_VOICE;
    process.env.MIA_DUAL_VOICE = "1";
    try {
      const plan = resolveVoiceDeliveryPlan({
        overlayPayload: { owner: "kojnozout", text: same },
        companionOverlayPayload: { owner: "mia", text: same }
      });
      assert.equal(plan.voiceSpeaker, "kojnozout");
      assert.equal(plan.shouldSpeak, true);
      assert.equal(plan.companionVoiceText, "");
      assert.equal(plan.companionSuppressedReason, "duplicate_utterance");
    } finally {
      if (prev === undefined) delete process.env.MIA_DUAL_VOICE;
      else process.env.MIA_DUAL_VOICE = prev;
    }
  });

  await test("mia primary defers koj companion overlay without dual-voice TTS", async () => {
    const prev = process.env.MIA_DUAL_VOICE;
    delete process.env.MIA_DUAL_VOICE;
    try {
      const action = {
        overlayPayload: { owner: "mia", text: "Ahoj, vítej." },
        companionOverlayPayload: {
          owner: "kojnozout",
          text: "Já si tě tu pohlídám."
        }
      };
      const voiced = applyVoiceOverlayPolicy(action, "primary", "mia");
      assert.equal(voiced.overlayPayload, null);
      assert.equal(voiced.companionOverlayPayload, null);
      assert.ok(voiced.deferredKojCompanion?.overlayPayload);
      assert.equal(voiced.deferredKojCompanion.overlayPayload.owner, "kojnozout");
      assert.equal(voiced.deferredKojCompanion.overlayPayload.meta.overlayOnly, true);
      assert.equal(voiced.deferredKojCompanion.overlayPayload.meta.voiceSuppressed, true);
      const plan = resolveVoiceDeliveryPlan(voiced);
      assert.equal(plan.companionVoiceText, "");
    } finally {
      if (prev === undefined) delete process.env.MIA_DUAL_VOICE;
      else process.env.MIA_DUAL_VOICE = prev;
    }
  });

  await test("music gift video shows bubble and skips koj TTS", async () => {
    const action = applyGiftVideoPresentationPolicy(
      {
        route: "support",
        tier: "T3",
        shouldPlayVideo: true,
        overlayPayload: {
          owner: "kojnozout",
          text: "Diky, Tester. Beru to do misky."
        },
        meta: { speaker: "kojnozout", supportAckMode: "full" }
      },
      {
        videoEngine: {
          peekNextSourceForTier: () => "T3_VIDEO_11"
        },
        obsSourceAudioMap: { T3_VIDEO_11: true }
      }
    );

    assert.equal(action.meta.suppressGiftVoice, true);
    assert.equal(action.meta.giftVideoPresentation, "bubble_over_music");
    assert.ok(action.overlayPayload?.text.length > 0);

    const plan = resolveVoiceDeliveryPlan(action);
    assert.equal(plan.shouldSpeak, false);
  });

  console.log("\n---- SPEAKER ROUTING CONTRACT SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
})();
