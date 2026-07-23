"use strict";

const chatBrain = require("../../scripts/MIA_CHAT_BRAIN");
const userAckThrottle = require("../../scripts/MIA_USER_ACK_THROTTLE");
const { isDualVoiceEnabled } = require("../../scripts/MIA_DUAL_VOICE");

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
  return ["T1", "T2", "T3", "T4", "T5", "T6"].includes(tier) ? tier : fallback;
}

function resolveTierIntensity(tier = "T1") {
  const map = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5, T6: 6 };
  return map[normalizeTier(tier, "T1")] || 1;
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
  return /nemoc|nemocn|nemocne|chřip|chrip|hore[čc]k|teplot|kašel|kasel|rým|rym|marod|le[žz][ií]m|bol[ií] m[eě]|deti.*nemoc|nemoc.*deti/.test(
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

function chooseSupportSpeaker(event = {}, kojnozoutState = {}, decision = {}) {
  return "kojnozout";
}

function buildSupportDecision(event = {}, streamState = {}, kojnozoutState = {}) {
  const support = event.support || {};
  const tier = normalizeTier(support.tier, "T1");
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);
  const isFullBowl = bowlPercent >= 95;

  const baseDecision = {
    route: "support",
    decisionType: "support",
    shouldPlayVideo: true,
    tier,
    intensity: resolveTierIntensity(tier),
    speaker: "kojnozout",
    reason: isFullBowl ? "SUPPORT_FULL_BOWL" : "SUPPORT_RESOLVED",
    actorRoles: buildActorRoles("kojnozout", "mia", false),
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
      supportMomentType: isFullBowl ? "full_bowl" : "bowl_progress"
    }
  };

  return baseDecision;
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

function resolveCommentIntent(event = {}) {
  const message = getMessage(event);
  if (!message || typeof chatBrain.resolveChatIntent !== "function") {
    return null;
  }
  return chatBrain.resolveChatIntent(message);
}

function shouldRouteCommentToDirectChat(intent = null) {
  if (!intent) return false;
  if (intent.direct) return true;
  if (intent.mentionsMiaAlias || intent.mentionsKojnozoutAlias) return true;
  if (safeString(intent.priority) === "high") return true;
  if (
    intent.type === "direct_status_question" ||
    intent.type === "direct_thanks" ||
    intent.type === "care_offer" ||
    intent.type === "direct_statement" ||
    intent.type === "emotional_statement"
  ) {
    return true;
  }
  return false;
}

function buildCommunityDecision(
  event = {},
  streamState = {},
  kojnozoutState = {},
  outputState = {}
) {
  const eventType = getEventType(event);
  const message = getMessage(event);
  const lowered = normalizeText(message);
  const chatIntent = resolveCommentIntent(event);
  const speakerFromIntent =
    chatIntent?.speakerHint === "kojnozout" ? "kojnozout" : chatIntent?.speakerHint === "mia" ? "mia" : "";
  const speaker = speakerFromIntent || chooseCommunitySpeaker(event, streamState, kojnozoutState);
  const userLabel = getUserLabel(event.user);
  const userKey = userAckThrottle.resolveUserKey(event);
  const audienceBand = userAckThrottle.resolveBandFromStreamState(streamState);
  const chatMeta = chatIntent
    ? {
        chatIntent: {
          type: chatIntent.type,
          tone: chatIntent.tone,
          priority: chatIntent.priority,
          speakerHint: chatIntent.speakerHint,
          addressedTo: chatIntent.addressedTo
        }
      }
    : {};

  if (eventType === "COMMENT") {
    if (!message) {
      return buildIgnoreDecision("EMPTY_COMMENT", {
        route: "community",
        decisionType: "community",
        speaker,
        meta: chatMeta
      });
    }

    if (shouldRouteCommentToDirectChat(chatIntent)) {
      const emptyPing = userAckThrottle.isEmptyEntityPing(message);
      if (
        emptyPing &&
        userAckThrottle.isUserPublicAckCooling(
          outputState,
          userKey,
          "ping",
          audienceBand
        )
      ) {
        return buildIgnoreDecision("USER_PING_THROTTLE", {
          route: "ignore",
          decisionType: "ignore",
          speaker,
          meta: { message, userLabel, userKey, throttleKind: "ping", ...chatMeta }
        });
      }

      return {
        route: "community",
        decisionType: "community",
        shouldPlayVideo: false,
        tier: "",
        intensity: chatIntent?.priority === "high" ? 3 : 2,
        speaker,
        reason: "COMMUNITY_DIRECT_PING",
        actorRoles: buildActorRoles(
          speaker,
          speaker === "mia" ? "kojnozout" : "mia",
          false
        ),
        meta: {
          message,
          userLabel,
          userKey,
          noteUserPingAck: emptyPing,
          ...chatMeta
        }
      };
    }

    if (isGreeting(lowered)) {
      // Per-user throttle: MIA neopakuje ahoj stejnému člověku (≠ community gift-wave spam).
      if (
        userAckThrottle.isUserPublicAckCooling(
          outputState,
          userKey,
          "greeting",
          audienceBand
        )
      ) {
        return buildIgnoreDecision("USER_GREETING_THROTTLE", {
          route: "ignore",
          decisionType: "ignore",
          speaker: "mia",
          meta: {
            message,
            userLabel,
            userKey,
            throttleKind: "greeting",
            ...chatMeta
          }
        });
      }

      return {
        route: "community",
        decisionType: "community",
        shouldPlayVideo: false,
        tier: "",
        intensity: 1,
        speaker: "mia",
        reason: "COMMUNITY_GREETING_DUAL",
        actorRoles: buildActorRoles(
          "mia",
          "kojnozout",
          isDualVoiceEnabled(),
          isDualVoiceEnabled() ? "GREETING_COMPANION" : ""
        ),
        meta: {
          message,
          userLabel,
          userKey,
          noteUserGreetingAck: true
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
        actorRoles: buildActorRoles(
          "mia",
          "kojnozout",
          isDualVoiceEnabled(),
          isDualVoiceEnabled() ? "ILLNESS_COMPANION" : ""
        ),
        meta: {
          message,
          userLabel
        }
      };
    }

    if (mentionsMia(lowered) || mentionsKojnozout(lowered)) {
      // Prázdný ping „mia“ / „koj“ — neopakovat dokola (per-user, ne gift-wave).
      if (userAckThrottle.isEmptyEntityPing(message)) {
        if (
          userAckThrottle.isUserPublicAckCooling(
            outputState,
            userKey,
            "ping",
            audienceBand
          )
        ) {
          return buildIgnoreDecision("USER_PING_THROTTLE", {
            route: "ignore",
            decisionType: "ignore",
            speaker,
            meta: { message, userLabel, userKey, throttleKind: "ping", ...chatMeta }
          });
        }
      }

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
          userLabel,
          userKey,
          noteUserPingAck: userAckThrottle.isEmptyEntityPing(message),
          ...chatMeta
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
        userLabel,
        ...chatMeta
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
    if (
      userAckThrottle.isUserPublicAckCooling(
        outputState,
        userKey,
        "follow",
        audienceBand
      )
    ) {
      return buildIgnoreDecision("USER_FOLLOW_THROTTLE", {
        route: "ignore",
        decisionType: "ignore",
        speaker: "mia",
        meta: { userLabel, userKey, throttleKind: "follow" }
      });
    }

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
        userLabel,
        userKey,
        noteUserFollowAck: true
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
  const outputState = input.outputState || {};

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
    return buildCommunityDecision(event, streamState, kojnozoutState, outputState);
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