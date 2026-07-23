"use strict";

const { isDualVoiceEnabled } = require("./MIA_DUAL_VOICE");

let vitalsCompanionModule = null;

function getVitalsCompanionModule() {
  if (vitalsCompanionModule) return vitalsCompanionModule;
  try {
    vitalsCompanionModule = require("./MIA_KOJNOZROUT_VITALS_COMPANION");
  } catch (_err) {
    vitalsCompanionModule = {};
  }
  return vitalsCompanionModule;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTier(value, fallback = "T1") {
  const tier = safeString(value, fallback).toUpperCase();
  return ["T1", "T2", "T3", "T4", "T5", "T6"].includes(tier) ? tier : fallback;
}

function getReactMode() {
  const mode = safeString(process.env.MIA_KOJ_GIFT_REACT_MODE, "selective").toLowerCase();
  if (mode === "always" || mode === "minimal" || mode === "selective") {
    return mode;
  }
  return "selective";
}

/**
 * Kojnožrout owns the gift lane (thanks, bowl, pet-game reactions).
 * MIA lives on the stream as host/AI — she only supplements big moments.
 */
function shouldKojnozoutOwnGiftAck(
  event = {},
  kojnozoutState = {},
  decision = {},
  ackPlan = {}
) {
  const mode = getReactMode();
  const ackMode = safeString(ackPlan?.mode, "full");
  const ctx = resolveSupportContext(event, kojnozoutState, decision);

  if (ackMode === "silent") {
    return false;
  }

  if (mode === "always") {
    return true;
  }

  if (mode === "minimal") {
    return (
      isMilestoneReason(ctx.reason) ||
      ctx.tier === "T4" ||
      ctx.tier === "T3" ||
      ctx.bowlPercent >= 95
    );
  }

  // selective (default): whenever we publicly ack a gift, Kojnožrout speaks
  return true;
}

function shouldMiaSupplementGift(ctx = {}, ackPlan = {}, kojnozoutState = {}, outputState = {}) {
  if (!isDualVoiceEnabled()) {
    return false;
  }

  if (safeString(ackPlan?.mode) === "silent") {
    return false;
  }

  if (ctx.bowlPercent >= 95 || ctx.reason === "SUPPORT_FULL_BOWL") {
    return true;
  }

  if (isMilestoneReason(ctx.reason)) {
    return true;
  }

  if (ctx.reason === "SUPPORT_SPAM_REWARD" || ctx.reason === "SUPPORT_DIRECT_INTERRUPT") {
    return true;
  }

  if (ctx.tier === "T4" || ctx.tier === "T3") {
    return true;
  }

  if (ctx.reason === "SUPPORT_SPAM_BUILDUP" && ctx.spamEventCount >= 2) {
    return true;
  }

  const vitalsCompanion = getVitalsCompanionModule();
  if (
    typeof vitalsCompanion.shouldMiaVitalsCompanion === "function" &&
    vitalsCompanion.shouldMiaVitalsCompanion(kojnozoutState, outputState, {
      ackMode: safeString(ackPlan?.mode)
    })
  ) {
    return true;
  }

  return false;
}

function resolveMiaCompanionReason(ctx = {}, ackPlan = {}, kojnozoutState = {}, outputState = {}) {
  if (ctx.bowlPercent >= 95 || ctx.reason === "SUPPORT_FULL_BOWL") {
    return "MIA_CARETAKER_FULL_BOWL";
  }

  if (ctx.reason === "SUPPORT_SPAM_REWARD") {
    return "MIA_STREAM_HOST_SPAM_REWARD";
  }

  if (ctx.tier === "T4" || ctx.tier === "T3") {
    return "MIA_HOST_BIG_GIFT_SUPPLEMENT";
  }

  if (ctx.reason === "SUPPORT_SPAM_BUILDUP" && ctx.spamEventCount >= 5) {
    return "MIA_HOST_SPAM_BUILDUP_SUPPLEMENT";
  }

  const vitalsCompanion = getVitalsCompanionModule();
  if (
    typeof vitalsCompanion.resolveVitalsCompanionPlan === "function"
  ) {
    const plan = vitalsCompanion.resolveVitalsCompanionPlan(
      kojnozoutState,
      outputState,
      {},
      { ackMode: safeString(ackPlan?.mode) }
    );
    if (plan?.enabled && plan.reason) {
      return plan.reason;
    }
  }

  return "MIA_HOST_GIFT_SUPPLEMENT";
}

function getAckModeSetting() {
  const mode = safeString(process.env.MIA_SUPPORT_ACK_MODE, "adaptive").toLowerCase();
  if (mode === "always" || mode === "adaptive" || mode === "minimal") {
    return mode;
  }
  return "adaptive";
}

function resolveAudienceBand(viewerCount = 0) {
  const viewers = Math.max(0, toNumber(viewerCount, 0));

  if (viewers <= 0) return "unknown";
  if (viewers < 25) return "tiny";
  if (viewers < 75) return "small";
  if (viewers < 200) return "medium";
  if (viewers < 500) return "large";
  return "huge";
}

function resolveAudienceContext(streamState = {}, decision = {}) {
  const viewerCount = toNumber(
    streamState?.audience?.viewerCount,
    toNumber(decision?.meta?.viewerCount, 15)
  );

  return {
    viewerCount: Math.max(0, viewerCount),
    band: resolveAudienceBand(viewerCount)
  };
}

function resolveGiftMapVoice(support = {}) {
  const voice =
    (support.giftVoice && typeof support.giftVoice === "object" && support.giftVoice) ||
    (support.giftMapRuntime?.voice && typeof support.giftMapRuntime.voice === "object"
      ? support.giftMapRuntime.voice
      : null) ||
    (support.giftMap?.voice && typeof support.giftMap.voice === "object"
      ? support.giftMap.voice
      : null) ||
    {};

  const ownerRaw = safeString(voice.owner, "").toLowerCase();
  const owner =
    ownerRaw === "mia" ||
    ownerRaw === "kojnozout" ||
    ownerRaw === "both" ||
    ownerRaw === "none"
      ? ownerRaw
      : "";

  return {
    owner,
    speak: voice.speak !== false && owner !== "none",
    tone: safeString(voice.tone || voice.style)
  };
}

function resolveSupportContext(event = {}, kojnozoutState = {}, decision = {}) {
  const support = event?.support || {};
  const resolved = decision?.resolvedSupport || {};
  const giftVoice = resolveGiftMapVoice(support);

  return {
    tier: normalizeTier(resolved.tier || support.tier || decision?.tier, "T1"),
    bowlPercent: toNumber(kojnozoutState?.bowlPercent, 0),
    repeatCount: clamp(
      toNumber(resolved.repeatCount, toNumber(support.repeatCount, 1)),
      1,
      999
    ),
    coins: toNumber(
      resolved.coins,
      toNumber(
        support.totalCoins,
        toNumber(support.coins, toNumber(support.rawValue, 0))
      )
    ),
    giftPriority: toNumber(
      support.giftPriority,
      toNumber(support.giftMap?.priority, 0)
    ),
    giftKey: safeString(support.giftKey || support.giftMap?.giftKey),
    giftVoice,
    reason: safeString(decision?.reason).toUpperCase(),
    spamEventCount: toNumber(
      decision?.spamVerdict?.eventCount,
      toNumber(decision?.meta?.eventCount, 0)
    ),
    contributorCount: toNumber(
      decision?.spamVerdict?.contributorCount ??
        decision?.spamVerdict?.participantCount,
      0
    ),
    spamTotalPoints: toNumber(decision?.spamVerdict?.totalPoints, 0)
  };
}

const userAckThrottle = require("./MIA_USER_ACK_THROTTLE");

function getSupportAckState(outputState = {}) {
  if (!outputState || typeof outputState !== "object") {
    return { lastPublicAckAt: 0, lastWaveAckAt: 0, giftsSinceAck: 0 };
  }

  if (!outputState.supportAckState || typeof outputState.supportAckState !== "object") {
    outputState.supportAckState = {
      lastPublicAckAt: 0,
      lastWaveAckAt: 0,
      giftsSinceAck: 0
    };
  }

  return outputState.supportAckState;
}

function shouldBypassUserGiftThrottle(ctx = {}) {
  if (ctx.giftPriority >= 8) return true;
  if (isMilestoneReason(ctx.reason)) return true;
  const tier = safeString(ctx.tier, "T1").toUpperCase();
  if (tier === "T3" || tier === "T4" || tier === "T5" || tier === "T6") return true;
  return false;
}

function getAckCooldownMs(audienceBand = "medium", baseMs = 8000) {
  const scale = {
    tiny: 0.45,
    small: 0.65,
    medium: 1.4,
    large: 3.2,
    huge: 5.5,
    unknown: 0.9
  };

  return Math.round(baseMs * (scale[audienceBand] || 1.4));
}

function isWithinAckCooldown(outputState, audienceBand, baseMs = 8000) {
  const state = getSupportAckState(outputState);
  const gap = getAckCooldownMs(audienceBand, baseMs);
  return Date.now() - toNumber(state.lastPublicAckAt, 0) < gap;
}

function noteSupportAck(outputState, mode = "full", event = {}) {
  const state = getSupportAckState(outputState);
  const now = Date.now();

  state.giftsSinceAck = toNumber(state.giftsSinceAck, 0) + 1;

  if (mode === "silent") {
    return state;
  }

  state.lastPublicAckAt = now;
  state.giftsSinceAck = 0;

  if (mode === "wave") {
    state.lastWaveAckAt = now;
  }

  const userKey = userAckThrottle.resolveUserKey(event);
  userAckThrottle.noteUserPublicAck(outputState, userKey, "gift");

  return state;
}

function isMilestoneReason(reason = "") {
  const r = safeString(reason).toUpperCase();
  return (
    r === "SUPPORT_FULL_BOWL" ||
    r === "SUPPORT_SPAM_REWARD" ||
    r === "SUPPORT_DIRECT_INTERRUPT"
  );
}

function shouldKojnozoutReactToGift(event = {}, kojnozoutState = {}, decision = {}, ackPlan = null) {
  if (ackPlan && typeof ackPlan === "object") {
    return shouldKojnozoutOwnGiftAck(event, kojnozoutState, decision, ackPlan);
  }

  return shouldKojnozoutOwnGiftAck(event, kojnozoutState, decision, { mode: "full" });
}

function resolveSupportAckPlan(
  event = {},
  kojnozoutState = {},
  decision = {},
  streamState = {},
  outputState = {}
) {
  const ackSetting = getAckModeSetting();
  const ctx = resolveSupportContext(event, kojnozoutState, decision);
  const audience = resolveAudienceContext(streamState, decision);

  if (ackSetting === "always") {
    return {
      mode: "full",
      playVideo: true,
      reason: "ack_always"
    };
  }

  if (ackSetting === "minimal") {
    const milestone =
      isMilestoneReason(ctx.reason) ||
      ctx.tier === "T4" ||
      ctx.tier === "T3" ||
      ctx.giftPriority >= 8;
    return {
      mode: milestone ? "full" : "silent",
      playVideo: milestone,
      reason: milestone
        ? ctx.giftPriority >= 8
          ? "ack_minimal_gift_map_priority"
          : "ack_minimal_milestone"
        : "ack_minimal_skip"
    };
  }

  // Gift mapa priorita (Lion/Galaxy) vždy plný ack + video, i na velkém streamu.
  if (ctx.giftPriority >= 8) {
    return { mode: "full", playVideo: true, reason: "gift_map_priority" };
  }

  if (isMilestoneReason(ctx.reason)) {
    return { mode: "full", playVideo: true, reason: "milestone" };
  }

  if (ctx.tier === "T4" || ctx.tier === "T3") {
    return { mode: "full", playVideo: true, reason: "big_gift" };
  }

  // Per-user throttle: stejný člověk nedostane díky dokola (oddělené od community wave spam).
  if (!shouldBypassUserGiftThrottle(ctx)) {
    const userKey = userAckThrottle.resolveUserKey(event);
    if (
      userAckThrottle.isUserPublicAckCooling(
        outputState,
        userKey,
        "gift",
        audience.band
      )
    ) {
      return {
        mode: "silent",
        playVideo: false,
        reason: "user_gift_ack_throttle"
      };
    }
  }

  if (ctx.reason === "SUPPORT_SPAM_BUILDUP") {
    const every = audience.band === "tiny" || audience.band === "small" ? 3 : 4;

    if (ctx.spamEventCount >= every && ctx.spamEventCount % every === 0) {
      return {
        mode: "wave",
        playVideo: true,
        reason: "spam_buildup_wave"
      };
    }

    return { mode: "silent", playVideo: false, reason: "spam_buildup_throttle" };
  }

  if (ctx.tier === "T2") {
    if (ctx.repeatCount >= 3 || ctx.coins >= 50) {
      if (audience.band === "large" || audience.band === "huge") {
        if (ctx.repeatCount >= 5 || ctx.coins >= 80) {
          return { mode: "full", playVideo: true, reason: "t2_large_notable" };
        }
        if (isWithinAckCooldown(outputState, audience.band, 18000)) {
          return { mode: "silent", playVideo: false, reason: "t2_large_cooldown" };
        }
        return { mode: "brief", playVideo: false, reason: "t2_large_rare_brief" };
      }

      return { mode: "full", playVideo: true, reason: "t2_notable" };
    }

    if (
      (audience.band === "large" || audience.band === "huge") &&
      (ctx.spamEventCount >= 2 || ctx.contributorCount >= 2)
    ) {
      return { mode: "silent", playVideo: false, reason: "t2_large_stream_flood" };
    }

    if (audience.band === "large" || audience.band === "huge") {
      return { mode: "silent", playVideo: false, reason: "t2_large_skip" };
    }

    if (isWithinAckCooldown(outputState, audience.band, 10000)) {
      return { mode: "silent", playVideo: true, reason: "t2_cooldown" };
    }

    return { mode: "brief", playVideo: true, reason: "t2_brief" };
  }

  // T1 and smaller moments
  if (ctx.repeatCount >= 5 || ctx.coins >= 20) {
    return { mode: "brief", playVideo: true, reason: "t1_combo" };
  }

  if (audience.band === "tiny") {
    if (ctx.spamEventCount >= 5 && ctx.spamEventCount % 5 === 0) {
      return { mode: "wave", playVideo: false, reason: "tiny_stream_wave" };
    }

    if (ctx.spamEventCount >= 4 && ctx.contributorCount >= 4) {
      if (isWithinAckCooldown(outputState, audience.band, 4000)) {
        return { mode: "silent", playVideo: false, reason: "tiny_stream_heavy_flood" };
      }
    }

    if (isWithinAckCooldown(outputState, audience.band, 4000)) {
      const giftsSince = toNumber(getSupportAckState(outputState).giftsSinceAck, 0);
      if (giftsSince < 2) {
        return { mode: "silent", playVideo: false, reason: "tiny_stream_cooldown" };
      }
    }

    return { mode: "brief", playVideo: true, reason: "tiny_stream_brief" };
  }

  if (audience.band === "small") {
    if (ctx.spamEventCount >= 4 && ctx.contributorCount >= 3) {
      if (ctx.spamEventCount >= 4 && ctx.spamEventCount % 4 === 0) {
        return { mode: "wave", playVideo: false, reason: "small_stream_wave" };
      }
      if (isWithinAckCooldown(outputState, audience.band, 6000)) {
        return { mode: "silent", playVideo: false, reason: "small_stream_flood" };
      }
    }

    if (isWithinAckCooldown(outputState, audience.band, 6500)) {
      return { mode: "silent", playVideo: false, reason: "small_stream_cooldown" };
    }

    return { mode: "brief", playVideo: true, reason: "small_stream_brief" };
  }

  if (audience.band === "medium") {
    if (ctx.spamEventCount >= 2 || ctx.contributorCount >= 2) {
      if (ctx.spamEventCount >= 4 && ctx.spamEventCount % 4 === 0) {
        return { mode: "wave", playVideo: false, reason: "medium_stream_wave" };
      }
      return { mode: "silent", playVideo: false, reason: "medium_stream_flood" };
    }
    if (isWithinAckCooldown(outputState, audience.band, 12000)) {
      return { mode: "silent", playVideo: false, reason: "medium_stream_cooldown" };
    }
    return { mode: "brief", playVideo: false, reason: "medium_stream_brief" };
  }

  // large / huge — skoro nikdy per-gift díky u T1
  if (ctx.spamEventCount >= 2 || ctx.contributorCount >= 2) {
    const waveEvery = audience.band === "huge" ? 7 : 6;
    if (ctx.spamEventCount >= waveEvery && ctx.spamEventCount % waveEvery === 0) {
      return { mode: "wave", playVideo: false, reason: "large_stream_wave" };
    }
    return { mode: "silent", playVideo: false, reason: "large_stream_flood" };
  }

  if (ctx.repeatCount >= 8 || ctx.coins >= 35) {
    if (isWithinAckCooldown(outputState, audience.band, 22000)) {
      return { mode: "silent", playVideo: false, reason: "large_stream_cooldown" };
    }
    return { mode: "brief", playVideo: false, reason: "large_stream_rare_brief" };
  }

  return { mode: "silent", playVideo: false, reason: "large_stream_skip" };
}

function resolveSupportGiftVideo(ctx = {}, decision = {}, ackPlan = {}) {
  const tier = normalizeTier(ctx.tier || decision.tier, "");
  if (!tier) {
    return false;
  }

  if (decision.shouldPlayVideo === false) {
    return false;
  }

  const ackSetting = getAckModeSetting();
  if (ackSetting === "minimal") {
    return ackPlan.playVideo === true;
  }

  if (ackPlan.playVideo === false) {
    return false;
  }

  const reason = safeString(decision?.reason).toUpperCase();
  if (reason === "SUPPORT_SPAM_BUILDUP") {
    const spamEventCount = toNumber(
      decision?.spamVerdict?.eventCount ?? decision?.meta?.eventCount,
      0
    );
    const every = 4;
    if (spamEventCount >= 2 && !(spamEventCount >= every && spamEventCount % every === 0)) {
      return false;
    }
  }

  return true;
}

function resolveSupportPresentation(
  event = {},
  kojnozoutState = {},
  decision = {},
  streamState = {},
  outputState = {}
) {
  const ctx = resolveSupportContext(event, kojnozoutState, decision);
  const audience = resolveAudienceContext(streamState, decision);
  const ackPlan = resolveSupportAckPlan(
    event,
    kojnozoutState,
    decision,
    streamState,
    outputState
  );
  const kojOwnsGiftLane = shouldKojnozoutOwnGiftAck(
    event,
    kojnozoutState,
    decision,
    ackPlan
  );
  const allowMiaSupplement = shouldMiaSupplementGift(
    ctx,
    ackPlan,
    kojnozoutState,
    outputState
  );
  const vitalsCompanion = getVitalsCompanionModule();
  const vitalsPlan =
    typeof vitalsCompanion.resolveVitalsCompanionPlan === "function"
      ? vitalsCompanion.resolveVitalsCompanionPlan(
          kojnozoutState,
          outputState,
          event,
          { ackMode: safeString(ackPlan?.mode) }
        )
      : null;

  let speaker = "kojnozout";
  let actorRoles = {
    primary: "kojnozout",
    companion: "mia",
    allowCompanion: false,
    companionReason: ""
  };
  let primarySpeakerPolicy = "KOJNOZROUT_GIFT_LANE_PRIMARY";
  const giftVoice = ctx.giftVoice || resolveGiftMapVoice(event?.support || {});

  if (ackPlan.mode === "silent") {
    speaker = "kojnozout";
    actorRoles = {
      primary: "kojnozout",
      companion: "mia",
      allowCompanion: false,
      companionReason: ""
    };
    primarySpeakerPolicy = "SUPPORT_SILENT_FEED";
  } else if (giftVoice.owner === "mia") {
    speaker = "mia";
    actorRoles = {
      primary: "mia",
      companion: "kojnozout",
      allowCompanion: false,
      companionReason: "GIFT_MAP_VOICE_MIA"
    };
    primarySpeakerPolicy = "GIFT_MAP_VOICE_MIA";
  } else if (giftVoice.owner === "both") {
    if (isDualVoiceEnabled()) {
      speaker = "kojnozout";
      actorRoles = {
        primary: "kojnozout",
        companion: "mia",
        allowCompanion: true,
        companionReason: "GIFT_MAP_VOICE_BOTH"
      };
      primarySpeakerPolicy = "GIFT_MAP_VOICE_BOTH";
    } else {
      // Default: one voice only — Koj owns gift lane; no MIA companion follow-up.
      speaker = "kojnozout";
      actorRoles = {
        primary: "kojnozout",
        companion: "mia",
        allowCompanion: false,
        companionReason: "GIFT_MAP_VOICE_BOTH_SINGLE"
      };
      primarySpeakerPolicy = "GIFT_MAP_VOICE_KOJ";
    }
  } else if (giftVoice.owner === "kojnozout" || kojOwnsGiftLane) {
    speaker = "kojnozout";
    actorRoles = {
      primary: "kojnozout",
      companion: "mia",
      allowCompanion: allowMiaSupplement,
      companionReason: allowMiaSupplement
        ? vitalsPlan?.enabled && vitalsPlan.reason
          ? vitalsPlan.reason
          : resolveMiaCompanionReason(ctx, ackPlan, kojnozoutState, outputState)
        : giftVoice.owner === "kojnozout"
          ? "GIFT_MAP_VOICE_KOJ"
          : ""
    };
    primarySpeakerPolicy =
      giftVoice.owner === "kojnozout"
        ? "GIFT_MAP_VOICE_KOJ"
        : "KOJNOZROUT_GIFT_LANE_PRIMARY";
  } else {
    speaker = "mia";
    actorRoles = {
      primary: "mia",
      companion: "kojnozout",
      allowCompanion: false,
      companionReason: "MIA_FALLBACK_GIFT_ACK"
    };
    primarySpeakerPolicy = "MIA_FALLBACK_GIFT_ACK";
  }

  // Gift mapa: speak=false → žádný hlas, video může zůstat.
  if (ackPlan.mode !== "silent" && giftVoice.speak === false) {
    primarySpeakerPolicy = "GIFT_MAP_VOICE_MUTE";
    actorRoles = {
      ...actorRoles,
      allowCompanion: false,
      companionReason: "GIFT_MAP_VOICE_MUTE"
    };
  }

  return {
    speaker,
    actorRoles,
    ackPlan,
    meta: {
      primarySpeakerPolicy,
      kojnozoutReaction:
        speaker === "kojnozout" &&
        ackPlan.mode !== "silent" &&
        giftVoice.speak !== false,
      miaSupplement:
        actorRoles.allowCompanion === true ||
        (speaker === "mia" && giftVoice.speak !== false),
      giftMapVoice: giftVoice,
      giftMapPriority: ctx.giftPriority,
      giftKey: ctx.giftKey,
      suppressVoice: giftVoice.speak === false,
      supportReactMode: getReactMode(),
      supportAckMode: ackPlan.mode,
      supportAckReason: ackPlan.reason,
      audienceBand: audience.band,
      viewerCount: audience.viewerCount,
      vitalsCompanion: vitalsPlan && vitalsPlan.enabled ? vitalsPlan : null,
      supportVideoLane: true,
      supportVideoAckGate: ackPlan.playVideo === true
    },
    shouldPlayVideo: resolveSupportGiftVideo(ctx, decision, ackPlan)
  };
}

function applySupportPresentation(
  decision = {},
  event = {},
  kojnozoutState = {},
  streamState = {},
  outputState = {}
) {
  if (!decision || typeof decision !== "object") {
    return decision;
  }

  if (safeString(decision.route).toLowerCase() !== "support") {
    return decision;
  }

  const presentation = resolveSupportPresentation(
    event,
    kojnozoutState,
    decision,
    streamState,
    outputState
  );

  return {
    ...decision,
    speaker: presentation.speaker,
    actorRoles: presentation.actorRoles,
    shouldPlayVideo: Boolean(
      presentation.shouldPlayVideo && decision.shouldPlayVideo !== false
    ),
    meta: {
      ...(decision.meta || {}),
      ...presentation.meta
    }
  };
}

module.exports = {
  getReactMode,
  getAckModeSetting,
  resolveAudienceBand,
  resolveSupportAckPlan,
  shouldKojnozoutReactToGift,
  resolveSupportPresentation,
  applySupportPresentation,
  noteSupportAck,
  getSupportAckState,
  getAckCooldownMs,
  isWithinAckCooldown
};
