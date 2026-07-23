"use strict";

/**
 * Koj state showcase voice line — TTS + speech overlay mirror + playback hold.
 */

function createShowcaseRuntime(deps = {}) {
  const {
    safeString,
    ttsEngine,
    runtimeConfig,
    voiceHoldUntilTs,
    deliveryRuntime,
    mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache
  } = deps;

  async function speakMiaShowcaseLine(text, speaker = "mia") {
    const phrase = safeString(text);
    if (!phrase) return { ok: false, reason: "empty" };

    const ttsCfg =
      ttsEngine && typeof ttsEngine.resolveConfig === "function"
        ? ttsEngine.resolveConfig(runtimeConfig)
        : null;
    if (!ttsCfg?.enabled || !ttsEngine || typeof ttsEngine.speak !== "function") {
      return { ok: false, reason: "tts_disabled" };
    }

    const spk =
      speaker === "kojnozout" || speaker === "kojnozrout" ? "kojnozout" : "mia";

    const voiceResult = await ttsEngine.speak({ text: phrase, speaker: spk, runtimeConfig });
    if (!voiceResult?.ok) {
      return { ok: false, reason: voiceResult?.reason || "tts_failed" };
    }

    const now = Date.now();
    const playbackId = deliveryRuntime().bumpVoicePlaybackSeq();
    const holdUntilTs = voiceHoldUntilTs(now, voiceResult.durationMs);
    deliveryRuntime().setVoicePlaybackState({
      playbackId,
      speaker: spk,
      audioUrl: voiceResult.audioUrl,
      textPreview: phrase,
      updatedAt: now,
      holdUntilTs
    });

    mirrorSpeechOverlayFromVoice({
      speaker: spk,
      text: phrase,
      holdUntilTs,
      source: "koj_state_showcase_voice"
    });
    invalidateOverlayStateCache();

    const waitMs = Math.min(9000, Math.max(0, holdUntilTs - Date.now()));
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return { ok: true, durationMs: voiceResult.durationMs, waitMs };
  }

  return { speakMiaShowcaseLine };
}

module.exports = { createShowcaseRuntime };
