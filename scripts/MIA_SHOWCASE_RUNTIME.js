"use strict";

/**
 * Koj state showcase voice line — managed queue + speech overlay mirror + playback hold.
 * speakMiaShowcaseLine resolves only after that line's hold, or when the line is
 * dropped, evicted, rejected, or fails synthesis. Queue acceptance is not completion.
 */

function createShowcaseRuntime(deps = {}) {
  const {
    safeString,
    ttsEngine,
    runtimeConfig,
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

    const runtime = typeof deliveryRuntime === "function" ? deliveryRuntime() : null;
    if (!runtime || typeof runtime.maybeDeliverMiaVoice !== "function") {
      return { ok: false, reason: "voice_queue_missing" };
    }

    const spk =
      speaker === "kojnozout" || speaker === "kojnozrout" ? "kojnozout" : "mia";

    let settled = false;
    let resolveDone;
    const done = new Promise((resolve) => {
      resolveDone = resolve;
    });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveDone(result);
    };

    let delivered;
    try {
      delivered = await runtime.maybeDeliverMiaVoice(
        {
          ok: true,
          route: "system",
          meta: { source: "koj_state_showcase_voice" },
          overlayPayload: {
            owner: spk,
            route: "system",
            text: phrase,
            meta: { source: "koj_state_showcase_voice" }
          }
        },
        {
          shouldSpeak: true,
          text: phrase,
          voiceMode: "primary",
          voiceSpeaker: spk,
          primaryOwner: spk,
          source: "koj_state_showcase_voice",
          recordReply: false
        },
        {
          bypassActionQueue: true,
          onPlaybackStarted(playback) {
            try {
              mirrorSpeechOverlayFromVoice({
                speaker: playback?.speaker || spk,
                text: phrase,
                holdUntilTs: playback?.holdUntilTs,
                source: "koj_state_showcase_voice"
              });
              if (typeof invalidateOverlayStateCache === "function") {
                invalidateOverlayStateCache();
              }
              const waitMs = Math.min(
                9000,
                Math.max(0, Number(playback?.holdUntilTs) - Date.now())
              );
              const result = {
                ok: true,
                started: true,
                playbackId: playback?.playbackId,
                durationMs: playback?.durationMs,
                waitMs
              };
              if (waitMs > 0) setTimeout(() => finish(result), waitMs);
              else finish(result);
            } catch (err) {
              finish({
                ok: false,
                reason: "showcase_playback_hook",
                error: err?.message || String(err)
              });
            }
          },
          onDropped(info) {
            finish({
              ok: false,
              skipped: true,
              reason: info?.reason || "dropped"
            });
          },
          onPlaybackFailed(info) {
            finish({
              ok: false,
              reason: info?.reason || "tts_failed"
            });
          }
        }
      );
    } catch (err) {
      finish({ ok: false, reason: err?.message || "voice_failed" });
      return done;
    }

    const admission = delivered?.voiceAdmission || {};
    if (admission.started === true || admission.queued === true) {
      return done;
    }

    finish({
      ok: false,
      skipped: true,
      reason: admission.reason || "voice_not_accepted"
    });
    return done;
  }

  return { speakMiaShowcaseLine };
}

module.exports = { createShowcaseRuntime };
