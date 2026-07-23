"use strict";

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

function normalizeTier(value, fallback = "") {
  const tier = safeString(value).toUpperCase();
  return tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4"
    ? tier
    : fallback;
}

function getEventType(event = {}) {
  return safeString(event.eventType || event.type).toUpperCase();
}

function getRoute(event = {}) {
  return safeString(event.route).toLowerCase();
}

function getUserLabel(user) {
  if (!user || typeof user !== "object") return "někdo";

  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "někdo"
  );
}

function getMessage(event = {}) {
  return (
    safeString(event.message) ||
    safeString(event.comment) ||
    safeString(event.content) ||
    safeString(event.text) ||
    ""
  );
}

function normalizeText(value) {
  return safeString(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function mentionsMia(text = "") {
  return /\bmia\b|mí[aá]|\bmio\b|\bmiu?o\b/.test(text);
}

function mentionsKojnozout(text = "") {
  return /kojno|žrout|zrout|miska|nakrm|krm|podrbe|drbat|ot[ií]rat o nohu|kl[ií]n/.test(
    text
  );
}

function isGreeting(text = "") {
  return /^(ahoj|čau|cau|nazdar|zdar|dobrý den|dobry den|zdrav[ií]m|dobr[eé] r[aá]no|dobr[eé] ve[čc]er)\b/.test(
    text
  );
}

function isIllnessMessage(text = "") {
  return /nemoc|nemocn|chřip|chrip|hore[čc]k|teplot|kašel|kasel|rým|rym|marod|le[žz][ií]m|bol[ií] m[eě]/.test(
    text
  );
}

function buildActorRoles(
  primary = "mia",
  companion = "kojnozout",
  allowCompanion = false,
  companionReason = ""
) {
  return {
    primary,
    companion,
    allowCompanion,
    companionReason: safeString(companionReason)
  };
}

function buildIgnoreDecision(reason = "IGNORE", extra = {}) {
  return {
    route: safeString(extra.route, "ignore"),
    decisionType: safeString(extra.decisionType, "ignore"),
    shouldPlayVideo: false,
    tier: "",
    intensity: toNumber(extra.intensity, 0),
    speaker: safeString(extra.speaker, "mia"),
    reason,
    actorRoles: extra.actorRoles || buildActorRoles("mia", "kojnozout", false),
    meta: extra.meta || null
  };
}

function isSupportBowlMoment(event = {}, kojnozoutState = {}) {
  const support = event.support || {};
  const tier = normalizeTier(support.tier, "T1");
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);

  if (bowlPercent >= 95) return true;
  if (tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4") return true;

  return false;
}

function resolveGiftAnimationOwner(event = {}) {
  const owner = safeString(
    event?.support?.giftProfile?.animationOwner,
    "kojnozout"
  ).toLowerCase();

  if (owner === "mia" || owner === "kojnozout" || owner === "both") {
    return owner;
  }

  return "kojnozout";
}

function chooseSupportSpeaker(event = {}, kojnozoutState = {}) {
  const animationOwner = resolveGiftAnimationOwner(event);
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);

  if (animationOwner === "mia") {
    return "mia";
  }

  if (animationOwner === "kojnozout") {
    return "kojnozout";
  }

  if (animationOwner === "both") {
    if (bowlPercent >= 95) {
      return "kojnozout";
    }

    return "mia";
  }

  if (isSupportBowlMoment(event, kojnozoutState)) {
    return "kojnozout";
  }

  return "kojnozout";
}

function buildSupportActorRoles(event = {}, kojnozoutState = {}) {
  const animationOwner = resolveGiftAnimationOwner(event);
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);
  const isFullBowl = bowlPercent >= 95;

  if (animationOwner === "mia") {
    return buildActorRoles(
      "mia",
      "kojnozout",
      false,
      "GIFT_PROFILE_OWNER_MIA"
    );
  }

  if (animationOwner === "kojnozout") {
    return buildActorRoles(
      "kojnozout",
      "mia",
      isFullBowl,
      isFullBowl ? "FULL_BOWL_COMPANION_ALLOWED" : "GIFT_PROFILE_OWNER_KOJNOZOUT"
    );
  }

  if (animationOwner === "both") {
    if (isFullBowl) {
      return buildActorRoles(
        "kojnozout",
        "mia",
        true,
        "FULL_BOWL_AND_GIFT_PROFILE_BOTH"
      );
    }

    return buildActorRoles(
      "mia",
      "kojnozout",
      true,
      "GIFT_PROFILE_OWNER_BOTH"
    );
  }

  return buildActorRoles(
    "kojnozout",
    "mia",
    isFullBowl,
    isFullBowl ? "MIA_CARETAKER_FULL_BOWL" : ""
  );
}

function chooseCommunitySpeaker(event = {}, streamState = {}, kojnozoutState = {}) {
  const message = normalizeText(getMessage(event));
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);
  const mood = safeString(kojnozoutState?.mood).toLowerCase();

  if (mentionsKojnozout(message) && !mentionsMia(message)) {
    return "kojnozout";
  }

  if (mentionsMia(message) && !mentionsKojnozout(message)) {
    return "mia";
  }

  if (isGreeting(message) || isIllnessMessage(message)) {
    return "mia";
  }

  if (bowlPercent >= 90) {
    return "kojnozout";
  }

  if (mood === "hungry" && bowlPercent >= 55) {
    return "kojnozout";
  }

  if (mood === "excited" && bowlPercent >= 75) {
    return "kojnozout";
  }

  return "mia";
}

function buildSupportDecision(event = {}, streamState = {}, kojnozoutState = {}) {
  const support = event.support || {};
  const tier = normalizeTier(support.tier, "T1");
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);
  const speaker = chooseSupportSpeaker(event, kojnozoutState);
  const actorRoles = buildSupportActorRoles(event, kojnozoutState);
  const giftProfile = event?.support?.giftProfile || null;
  const animationOwner = resolveGiftAnimationOwner(event);

  const isFullBowl = bowlPercent >= 95;

  return {
    route: "support",
    decisionType: "support",
    shouldPlayVideo: true,
    tier,
    intensity: tier === "T4" ? 4 : tier === "T3" ? 3 : tier === "T2" ? 2 : 1,
    speaker,
    reason: isFullBowl ? "SUPPORT_FULL_BOWL" : "SUPPORT_RESOLVED",
    actorRoles,
    resolvedSupport: {
      tier,
      giftName: safeString(support.giftName),
      coins: toNumber(
        support.totalCoins,
        toNumber(support.coins, toNumber(support.rawValue, 0))
      ),
      repeatCount: clamp(toNumber(support.repeatCount, 1), 1, 999)
    },
    meta: {
      userLabel: getUserLabel(event.user),
      bowlPercent,
      supportMoment: true,
      supportMomentType: isFullBowl ? "full_bowl" : "bowl_progress",
      primarySpeakerPolicy:
        animationOwner === "mia"
          ? "GIFT_PROFILE_OWNER_MIA"
          : animationOwner === "both"
            ? isFullBowl
              ? "GIFT_PROFILE_OWNER_BOTH_FULL_BOWL_PRIMARY_KOJNOZOUT"
              : "GIFT_PROFILE_OWNER_BOTH_PRIMARY_MIA"
            : isFullBowl
              ? "KOJNOZROUT_PRIMARY_WITH_MIA_CARETAKER_FULL_BOWL"
              : "KOJNOZROUT_ONLY_FOR_SUPPORT_GIFTS",
      giftAnimationOwner: animationOwner,
      giftVisualFamily: safeString(giftProfile?.visualFamily),
      giftEffectProgram: safeString(giftProfile?.effectProgram),
      giftMoodHint: safeString(giftProfile?.moodHint)
    }
  };
}

function buildCommunityDecision(event = {}, streamState = {}, kojnozoutState = {}) {
  const eventType = getEventType(event);
  const message = getMessage(event);
  const lowered = normalizeText(message);
  const speaker = chooseCommunitySpeaker(event, streamState, kojnozoutState);
  const userLabel = getUserLabel(event.user);

  if (eventType === "COMMENT") {
    if (!message) {
      return buildIgnoreDecision("EMPTY_COMMENT", {
        route: "community",
        decisionType: "community",
        speaker
      });
    }

    if (isGreeting(lowered)) {
      return {
        route: "community",
        decisionType: "community",
        shouldPlayVideo: false,
        tier: "",
        intensity: 1,
        speaker: "mia",
        reason: "COMMUNITY_GREETING_DUAL",
        actorRoles: buildActorRoles("mia", "kojnozout", true, "GREETING_COMPANION"),
        meta: {
          message,
          userLabel
        }
      };
    }

    if (isIllnessMessage(lowered)) {
      return {
        route: "community",
        decisionType: "community",
        shouldPlayVideo: false,
        tier: "",
        intensity: 2,
        speaker: "mia",
        reason: "COMMUNITY_ILLNESS_DUAL",
        actorRoles: buildActorRoles("mia", "kojnozout", true, "ILLNESS_COMPANION"),
        meta: {
          message,
          userLabel
        }
      };
    }

    if (mentionsMia(lowered) || mentionsKojnozout(lowered)) {
      return {
        route: "community",
        decisionType: "community",
        shouldPlayVideo: false,
        tier: "",
        intensity: 2,
        speaker,
        reason: "COMMUNITY_DIRECT_PING",
        actorRoles: buildActorRoles(
          speaker,
          speaker === "mia" ? "kojnozout" : "mia",
          mentionsMia(lowered) && mentionsKojnozout(lowered),
          "DIRECT_PING_COMPANION"
        ),
        meta: {
          message,
          userLabel
        }
      };
    }

    return {
      route: "community",
      decisionType: "community",
      shouldPlayVideo: false,
      tier: "",
      intensity: 1,
      speaker,
      reason: "COMMUNITY_COMMENT",
      actorRoles: buildActorRoles(
        speaker,
        speaker === "mia" ? "kojnozout" : "mia",
        false
      ),
      meta: {
        message,
        userLabel
      }
    };
  }

  if (eventType === "LIKE") {
    return {
      route: "community",
      decisionType: "community",
      shouldPlayVideo: false,
      tier: "",
      intensity: 1,
      speaker,
      reason: "COMMUNITY_LIKE",
      actorRoles: buildActorRoles(
        speaker,
        speaker === "mia" ? "kojnozout" : "mia",
        false
      ),
      meta: {
        userLabel
      }
    };
  }

  if (eventType === "FOLLOW") {
    return {
      route: "community",
      decisionType: "community",
      shouldPlayVideo: false,
      tier: "",
      intensity: 2,
      speaker: "mia",
      reason: "COMMUNITY_FOLLOW",
      actorRoles: buildActorRoles("mia", "kojnozout", true, "FOLLOW_COMPANION"),
      meta: {
        userLabel
      }
    };
  }

  if (eventType === "SHARE") {
    return {
      route: "community",
      decisionType: "community",
      shouldPlayVideo: false,
      tier: "",
      intensity: 2,
      speaker: "mia",
      reason: "COMMUNITY_SHARE",
      actorRoles: buildActorRoles("mia", "kojnozout", false),
      meta: {
        userLabel
      }
    };
  }

  return buildIgnoreDecision("UNHANDLED_COMMUNITY_EVENT", {
    route: "community",
    decisionType: "community",
    speaker
  });
}

function decide(input = {}) {
  const event = input.event || {};
  const streamState = input.streamState || {};
  const kojnozoutState = input.kojnozoutState || {};

  const route = getRoute(event);
  const eventType = getEventType(event);

  if (!event || typeof event !== "object" || !eventType) {
    return buildIgnoreDecision("INVALID_EVENT", {
      route: "ignore",
      decisionType: "ignore"
    });
  }

  if (route === "support" || eventType === "GIFT") {
    return buildSupportDecision(event, streamState, kojnozoutState);
  }

  if (
    route === "community" ||
    eventType === "COMMENT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE"
  ) {
    return buildCommunityDecision(event, streamState, kojnozoutState);
  }

  if (route === "system") {
    return buildIgnoreDecision("SYSTEM_EVENT", {
      route: "system",
      decisionType: "system",
      speaker: "mia"
    });
  }

  return buildIgnoreDecision("UNROUTED_EVENT", {
    route: route || "unknown",
    decisionType: "ignore",
    speaker: "mia"
  });
}

module.exports = {
  decide
};