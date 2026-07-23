"use strict";

/**
 * MIA_SPEAKER_ROUTING — kdo mluví (TTS) a kdo zůstane jen vizuálně.
 *
 * Canon (voice-first):
 * - Jedna mluvená věta = jeden TTS event (audioSink: MIA_VOICE only)
 * - MIA: TTS horor/dětský hlas, textová bublina se skryje
 * - Kojnožrout: TTS digitální/UFO hlas, bublina zmizí
 * - Companion / dual TTS jen při MIA_DUAL_VOICE=1 (default OFF)
 * - Deferred Koj overlay (vizuál/text po MIA) běží i bez dual-voice — bez TTS cirkusu
 * - Companion smí mluvit jen jiný text — nikdy stejnou větu jako primary
 */

const { tierRequiresEmbeddedAudio } = require("./MIA_MEDIA_CATALOG");
const { isDualVoiceEnabled } = require("./MIA_DUAL_VOICE");

function normalizeOwner(payload) {
  if (!payload || typeof payload !== "object") return "";
  return safeString(payload.owner || payload.speaker).toLowerCase();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Normalize for utterance dedupe (cross-speaker same line). */
function normalizeSpeakText(text) {
  return safeString(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSameUtterance(a, b) {
  const left = normalizeSpeakText(a);
  const right = normalizeSpeakText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  return shorter.length >= 12 && longer.includes(shorter);
}

function scrubDuplicateCompanionVoice(plan = {}) {
  const companionVoiceText = safeString(plan.companionVoiceText);
  if (!companionVoiceText) return plan;
  if (!isSameUtterance(plan.text, companionVoiceText)) return plan;
  return {
    ...plan,
    companionVoiceText: "",
    companionSuppressedReason: "duplicate_utterance"
  };
}

function extractOverlayText(payload, actionResult = {}) {
  if (!payload && !actionResult) return "";
  return safeString(
    payload?.text ||
      payload?.overlay_text ||
      actionResult.response?.text ||
      actionResult.speech_text ||
      actionResult.overlay_text
  );
}

function isKojGiftVoice(actionResult = {}) {
  const route = safeString(actionResult.route).toLowerCase();
  if (route !== "support") {
    return false;
  }

  const speaker = safeString(
    actionResult.meta?.speaker || actionResult.response?.speaker
  ).toLowerCase();
  if (speaker === "kojnozout" || speaker === "kojnozrout") {
    return true;
  }

  const policy = safeString(actionResult.meta?.primarySpeakerPolicy);
  return policy !== "MIA_FALLBACK_GIFT_ACK";
}

function isSupportSpamThrottled(actionResult = {}) {
  const ackReason = safeString(actionResult.meta?.supportAckReason);
  if (ackReason === "spam_buildup_throttle") {
    return true;
  }

  const reason = safeString(actionResult.reason || actionResult.meta?.reason).toUpperCase();
  const ackMode = safeString(actionResult.meta?.supportAckMode);
  if (reason === "SUPPORT_SPAM_BUILDUP" && ackMode === "silent") {
    return true;
  }

  return false;
}

function resolveKojGiftVoiceLine(actionResult = {}) {
  if (isSupportSpamThrottled(actionResult)) {
    return "";
  }

  const payload = actionResult.overlayPayload || actionResult.overlay;
  const fromOverlay = extractOverlayText(payload, actionResult);
  if (fromOverlay) {
    return fromOverlay;
  }

  const ack = safeString(actionResult.meta?.supportAckMode, "full");
  const tier = safeString(actionResult.tier, "T1");
  const user = safeString(
    payload?.userLabel || payload?.user || actionResult.response?.user
  );

  if (ack === "silent" || ack === "wave") {
    const silentLines = [
      "Prijato. Do misky.",
      "Signal prijat. Dekuji.",
      "Dalsi energie. Beru.",
      "Miska citi pulz."
    ];
    return silentLines[Math.floor(Date.now() / 4200) % silentLines.length];
  }

  if (user) {
    return `Diky, ${user}. Beru to do misky.`;
  }

  if (tier === "T4" || tier === "T3") {
    return "Silny dar. Miska roste.";
  }

  return "Jo, neco pristalo. To beru.";
}

function peekNextGiftVideoSource(videoEngine, tier = "T1") {
  const safeTier = normalizeTier(tier);

  if (typeof videoEngine?.peekNextSourceForTier === "function") {
    return safeString(videoEngine.peekNextSourceForTier(safeTier));
  }

  if (typeof videoEngine?.getSnapshot !== "function") {
    return "";
  }

  const snapshot = videoEngine.getSnapshot();
  const pool = snapshot?.tierSources?.[safeTier] || [];
  if (!pool.length) {
    return "";
  }

  const currentIndex = Number(snapshot?.rotationIndexByTier?.[safeTier] || 0);
  return safeString(pool[currentIndex % pool.length]);
}

function applyGiftVideoPresentationPolicy(actionResult = {}, ctx = {}) {
  if (actionResult?.shouldPlayVideo !== true) {
    return actionResult;
  }

  const tier = normalizeTier(
    actionResult.tier ||
      actionResult.videoTier ||
      actionResult.support?.tier ||
      "T1"
  );
  const pick = ctx.giftVideoPick || null;
  const sourceName = safeString(pick?.obsSource) || peekNextGiftVideoSource(ctx.videoEngine, tier);
  const audioMap = ctx.obsSourceAudioMap || {};
  const hasEmbeddedAudio = tierRequiresEmbeddedAudio(tier)
    ? true
    : pick?.hasEmbeddedAudio === true
      ? true
      : pick?.hasEmbeddedAudio === false
        ? false
        : audioMap[sourceName] === true;
  const profile = {
    tier,
    sourceName,
    hasEmbeddedAudio,
    presentation: hasEmbeddedAudio ? "bubble" : "voice"
  };

  if (!hasEmbeddedAudio) {
    return {
      ...actionResult,
      meta: {
        ...(actionResult.meta || {}),
        giftVideoProfile: profile
      }
    };
  }

  const existingPayload = actionResult.overlayPayload || actionResult.overlay;
  const companion =
    actionResult.companionOverlayPayload || actionResult.companionOverlay;
  const companionText = safeString(companion?.text);
  const companionOwner = normalizeOwner(companion);
  const overlayPayload =
    extractOverlayText(existingPayload, actionResult) && existingPayload
      ? existingPayload
      : {
          owner: "kojnozout",
          text: resolveKojGiftVoiceLine(actionResult),
          user: safeString(
            existingPayload?.userLabel ||
              existingPayload?.user ||
              actionResult.response?.user
          ),
          tier
        };

  const next = {
    ...actionResult,
    overlayPayload,
    overlay: overlayPayload,
    meta: {
      ...(actionResult.meta || {}),
      giftVideoProfile: profile,
      suppressGiftVoice: true,
      giftVideoPresentation: "bubble_over_music"
    }
  };

  if (isDualVoiceEnabled() && companionText && companionOwner === "mia") {
    next.companionOverlayPayload = null;
    next.companionOverlay = null;
    next.meta = {
      ...next.meta,
      miaVoiceDeferredForVideo: true,
      deferredVoicePlan: {
        shouldSpeak: true,
        text: companionText,
        voiceMode: "companion",
        voiceSpeaker: "mia",
        primaryOwner: "kojnozout",
        companionOwner: "mia",
        companionVoiceText: ""
      }
    };
  } else if (companionText) {
    // Default: drop companion — one event = one voice / one bubble lane.
    next.companionOverlayPayload = null;
    next.companionOverlay = null;
  }

  return next;
}

function resolveVoiceDeliveryPlan(actionResult = {}) {
  if (isSupportSpamThrottled(actionResult)) {
    return {
      voiceMode: "none",
      text: "",
      voiceSpeaker: "mia",
      primaryOwner: normalizeOwner(actionResult.overlayPayload),
      companionOwner: normalizeOwner(
        actionResult.companionOverlayPayload || actionResult.companionOverlay
      ),
      companionVoiceText: "",
      shouldSpeak: false
    };
  }

  if (
    actionResult?.meta?.suppressGiftVoice === true ||
    actionResult?.meta?.suppressVoice === true
  ) {
    return {
      voiceMode: "none",
      text: "",
      voiceSpeaker: "mia",
      primaryOwner: normalizeOwner(actionResult.overlayPayload),
      companionOwner: normalizeOwner(
        actionResult.companionOverlayPayload || actionResult.companionOverlay
      ),
      companionVoiceText: "",
      shouldSpeak: false
    };
  }

  const payload = actionResult.overlayPayload || actionResult.overlay;
  const companion =
    actionResult.companionOverlayPayload || actionResult.companionOverlay;

  const primaryOwner = normalizeOwner(payload);
  const companionOwner = normalizeOwner(companion);
  const primaryText = extractOverlayText(payload, actionResult);
  const companionText = safeString(companion?.text);

  if (primaryOwner === "kojnozout" && primaryText) {
    return scrubDuplicateCompanionVoice({
      voiceMode: "primary",
      text: primaryText,
      voiceSpeaker: "kojnozout",
      primaryOwner,
      companionOwner,
      companionVoiceText:
        isDualVoiceEnabled() && companionOwner === "mia" && companionText
          ? companionText
          : "",
      shouldSpeak: true
    });
  }

  if (primaryOwner === "mia" && primaryText) {
    // MIA primary: Koj companion remains visual-only (never same TTS line).
    return {
      voiceMode: "primary",
      text: primaryText,
      voiceSpeaker: "mia",
      primaryOwner,
      companionOwner,
      companionVoiceText: "",
      shouldSpeak: true
    };
  }

  if (companionOwner === "mia" && companionText) {
    return {
      voiceMode: "companion",
      text: companionText,
      voiceSpeaker: "mia",
      primaryOwner,
      companionOwner,
      companionVoiceText: "",
      shouldSpeak: true
    };
  }

  if (
    !primaryOwner &&
    safeString(actionResult.response?.speaker).toLowerCase() === "mia"
  ) {
    const text = extractOverlayText(null, actionResult);
    if (text) {
      return {
        voiceMode: "primary",
        text,
        voiceSpeaker: "mia",
        primaryOwner: "mia",
        companionOwner,
        companionVoiceText: "",
        shouldSpeak: true
      };
    }
  }

  if (isKojGiftVoice(actionResult)) {
    const text = resolveKojGiftVoiceLine(actionResult);
    if (text) {
      return scrubDuplicateCompanionVoice({
        voiceMode: "primary",
        text,
        voiceSpeaker: "kojnozout",
        primaryOwner: "kojnozout",
        companionOwner: normalizeOwner(companion),
        companionVoiceText: isDualVoiceEnabled()
          ? safeString(companion?.text)
          : "",
        shouldSpeak: true
      });
    }
  }

  return {
    voiceMode: "none",
    text: "",
    voiceSpeaker: "mia",
    primaryOwner,
    companionOwner,
    companionVoiceText: "",
    shouldSpeak: false
  };
}

function applyVoiceOverlayPolicy(
  actionResult = {},
  voiceMode = "none",
  voiceSpeaker = "mia"
) {
  if (voiceMode === "none") {
    return actionResult;
  }

  const next = { ...actionResult };
  const payload = actionResult.overlayPayload || actionResult.overlay;
  const companion =
    actionResult.companionOverlayPayload || actionResult.companionOverlay;
  const companionText = safeString(companion?.text);
  const primaryOwner = normalizeOwner(payload);
  const speaker = safeString(voiceSpeaker, "mia").toLowerCase();

  if (voiceMode === "primary") {
    next.overlayPayload = null;
    next.overlay = null;

    if (speaker === "kojnozout" || primaryOwner === "kojnozout") {
      if (isDualVoiceEnabled()) {
        const pendingCompanion = isSameUtterance(
          extractOverlayText(payload, actionResult),
          companionText
        )
          ? ""
          : companionText;
        if (pendingCompanion && normalizeOwner(companion) === "mia") {
          next.meta = {
            ...(next.meta || {}),
            pendingCompanionVoice: pendingCompanion
          };
        }
      }
      // Voice-first: žádná druhá bublina během Koj TTS.
      next.companionOverlayPayload = null;
      next.companionOverlay = null;
    } else {
      // MIA primary TTS: drop immediate companion bubble.
      // Koj may still follow as deferred OVERLAY (visual/text) without dual-voice TTS.
      next.companionOverlayPayload = null;
      next.companionOverlay = null;

      if (
        companionText &&
        normalizeOwner(companion) === "kojnozout" &&
        !next.deferredKojCompanion?.overlayPayload
      ) {
        next.deferredKojCompanion = {
          delayMs: Math.max(
            500,
            Number(actionResult?.deferredKojCompanion?.delayMs) || 2800
          ),
          overlayPayload: {
            ...companion,
            owner: "kojnozout",
            text: companionText,
            meta: {
              ...(companion?.meta || {}),
              source: "voice_policy_deferred_koj",
              companionAfterMiaVoice: true
            }
          }
        };
      }

      if (next.deferredKojCompanion?.overlayPayload) {
        const dual = isDualVoiceEnabled();
        const payload = next.deferredKojCompanion.overlayPayload;
        next.deferredKojCompanion = {
          ...next.deferredKojCompanion,
          overlayPayload: {
            ...payload,
            meta: {
              ...(payload.meta || {}),
              overlayOnly: !dual,
              voiceSuppressed: !dual
            }
          }
        };
      }
    }
  } else if (voiceMode === "companion") {
    next.companionOverlayPayload = null;
    next.companionOverlay = null;
  }

  return next;
}

function normalizeTier(value) {
  const tier = safeString(value).toUpperCase();
  if (["T1", "T2", "T3", "T4", "T5", "T6"].includes(tier)) {
    return tier;
  }
  return "T1";
}

function shouldDeferVoiceForGiftVideo(actionResult = {}) {
  if (actionResult?.shouldPlayVideo !== true) {
    return false;
  }

  const plan = resolveVoiceDeliveryPlan(actionResult);
  if (plan.shouldSpeak !== true) {
    return false;
  }

  // Koj mluví hned — nikdy neposouvat pet hlas za gift video.
  const speaker = safeString(plan.voiceSpeaker || plan.primaryOwner).toLowerCase();
  if (speaker === "kojnozout" || speaker === "kojnozrout") {
    return false;
  }

  return true;
}

function resolveDeferredVoicePlan(actionResult = {}) {
  const plan = resolveVoiceDeliveryPlan(actionResult);
  if (!plan.shouldSpeak) {
    return null;
  }

  const speaker = safeString(plan.voiceSpeaker || plan.primaryOwner).toLowerCase();
  if (speaker === "kojnozout" || speaker === "kojnozrout") {
    // Default: no deferred MIA companion after Koj — dual TTS only when enabled.
    if (!isDualVoiceEnabled() || !plan.companionVoiceText) {
      return null;
    }
    return {
      shouldSpeak: true,
      text: plan.companionVoiceText,
      voiceMode: "companion",
      voiceSpeaker: "mia",
      primaryOwner: plan.primaryOwner,
      companionOwner: "mia",
      companionVoiceText: ""
    };
  }

  return {
    shouldSpeak: true,
    text: plan.text,
    voiceMode: plan.voiceMode,
    voiceSpeaker: plan.voiceSpeaker || "mia",
    primaryOwner: plan.primaryOwner,
    companionOwner: plan.companionOwner,
    companionVoiceText: ""
  };
}

function resolveGiftVideoVoiceDeferMs(actionResult = {}, runtimeConfig = {}) {
  const timing = actionResult?.meta?.giftVideoTiming || null;
  if (timing && Number.isFinite(Number(timing.deferVoiceMs))) {
    return Math.max(0, Number(timing.deferVoiceMs));
  }

  if (timing && Number.isFinite(Number(timing.maxWaitMs))) {
    const settleMs = Number(runtimeConfig?.obs?.sceneSwitchSettleMs) || 280;
    const queueAhead = Math.max(0, Number(timing.queueAhead) || 0);
    const playbackMs = Number(timing.playbackMs) || 5000;
    return queueAhead * playbackMs + Number(timing.maxWaitMs) + settleMs + 180;
  }

  const tier = normalizeTier(
    actionResult?.tier ||
      actionResult?.videoTier ||
      actionResult?.support?.tier ||
      "T1"
  );

  const playbackMs =
    Number(runtimeConfig?.obs?.tierPlaybackMs?.[tier]) ||
    (tier === "T1"
      ? 5000
      : tier === "T2"
        ? 10000
        : tier === "T3"
          ? 15000
          : 20000);

  const settleMs = Number(runtimeConfig?.obs?.sceneSwitchSettleMs) || 280;

  return playbackMs + settleMs + 180;
}

function describeEventResponder(decision = {}) {
  const route = safeString(decision.route, "community").toLowerCase();
  const domain = safeString(decision.meta?.domain || decision.domain).toUpperCase();
  const speaker = safeString(decision.speaker, "mia").toLowerCase();
  const companion = safeString(decision.actorRoles?.companion).toLowerCase();
  const allowCompanion = decision.actorRoles?.allowCompanion === true;

  if (route === "support") {
    return {
      primary: speaker === "kojnozout" ? "kojnozout" : "mia",
      companion: allowCompanion ? companion || "mia" : null,
      tts:
        speaker === "kojnozout"
          ? allowCompanion && companion === "mia"
            ? "koj_primary_mia_companion"
            : "koj_primary"
          : speaker === "mia"
            ? "mia_primary"
            : "none",
      channel: "gift_lane"
    };
  }

  if (domain === "CARE") {
    return {
      primary: speaker === "kojnozout" ? "kojnozout" : "mia",
      companion: allowCompanion ? companion || null : null,
      tts: speaker === "kojnozout" ? "koj_primary" : "mia_primary",
      channel: "care"
    };
  }

  if (domain === "STREAM_HOST") {
    return {
      primary: "mia",
      companion: allowCompanion ? companion || "kojnozout" : null,
      tts: "mia_primary",
      channel: "host_mode"
    };
  }

  return {
    primary: speaker === "kojnozout" ? "kojnozout" : "mia",
    companion: allowCompanion ? companion || null : null,
    tts: speaker === "kojnozout" ? "koj_primary" : "mia_primary",
    channel: route === "voice" ? "voice_command" : "community"
  };
}

module.exports = {
  resolveVoiceDeliveryPlan,
  applyVoiceOverlayPolicy,
  shouldDeferVoiceForGiftVideo,
  resolveDeferredVoicePlan,
  resolveGiftVideoVoiceDeferMs,
  describeEventResponder,
  normalizeOwner,
  normalizeSpeakText,
  isSameUtterance,
  scrubDuplicateCompanionVoice,
  peekNextGiftVideoSource,
  applyGiftVideoPresentationPolicy,
  isDualVoiceEnabled
};
