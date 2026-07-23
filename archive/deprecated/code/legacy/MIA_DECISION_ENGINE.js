"use strict";

const streamStateModule = require("../scripts/MIA_STREAM_STATE");

const INTERNAL = {
  lastCommunityTs: 0,
  lastMilestoneTs: 0,
  lastWakeTs: 0
};

function nowTs() {
  return Date.now();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getEventType(normalized = {}) {
  return safeString(normalized.eventType, "UNKNOWN").toUpperCase();
}

function getChatText(normalized = {}) {
  return (
    safeString(normalized.message) ||
    safeString(normalized.comment) ||
    safeString(normalized.content) ||
    safeString(normalized.text) ||
    ""
  );
}

function getUserLabel(user) {
  if (!user) return "někdo";
  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "někdo"
  );
}

function checkCooldown(bucket, cooldownMs) {
  const ts = nowTs();
  const prev = INTERNAL[bucket] || 0;
  if (ts - prev < cooldownMs) {
    return false;
  }
  INTERNAL[bucket] = ts;
  return true;
}

function pickBankKeyByTier(tier = "T1") {
  const safeTier = safeString(tier, "T1").toUpperCase();
  if (safeTier === "T4") return "support_t4";
  if (safeTier === "T3") return "support_t3";
  if (safeTier === "T2") return "support_t2";
  return "support_t1";
}

function detectDirectTarget(message = "") {
  const text = safeString(message).toLowerCase();

  if (!text) return "";

  if (
    text.includes("mia") ||
    text.includes("mía") ||
    text.includes("mio") ||
    text.includes("mija") ||
    text.includes("mina")
  ) {
    return "mia";
  }

  if (
    text.includes("kojno") ||
    text.includes("žrout") ||
    text.includes("zroute") ||
    text.includes("kojnožrout")
  ) {
    return "kojnozout";
  }

  return "";
}

function chooseSupportSpeaker(normalized = {}, streamState = {}, kojnozoutState = {}) {
  const userId = safeString(
    normalized?.user?.userId ||
      normalized?.user?.id ||
      normalized?.user?.username ||
      normalized?.user?.nickname
  );

  const moodState = toNumber(streamState?.moodState, 0);
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);

  if (bowlPercent >= 80) return "kojnozout";
  if (moodState >= 65) return "mia";

  if (!userId) {
    return bowlPercent >= 40 ? "kojnozout" : "mia";
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % 1000;
  }

  return hash % 2 === 0 ? "mia" : "kojnozout";
}

function chooseCommunitySpeaker(normalized = {}, streamState = {}, kojnozoutState = {}) {
  const message = getChatText(normalized);
  const directTarget = detectDirectTarget(message);

  if (directTarget === "mia") return "mia";
  if (directTarget === "kojnozout") return "kojnozout";

  const moodState = toNumber(streamState?.moodState, 0);
  const bowlPercent = toNumber(kojnozoutState?.bowlPercent, 0);

  if (bowlPercent >= 75) return "kojnozout";
  if (moodState >= 60) return "mia";

  return message.length % 2 === 0 ? "mia" : "kojnozout";
}

function buildBaseDecision(normalized = {}) {
  return {
    mode: "OBSERVE",
    route: "ignore",
    reason: "no_action",
    recommendedAction: null,
    meta: {
      ts: nowTs(),
      eventType: getEventType(normalized)
    }
  };
}

function buildSupportDecision(normalized = {}, streamState = {}, kojnozoutState = {}) {
  const decision = buildBaseDecision(normalized);
  const support = normalized.support || {};
  const tier = safeString(support.tier, "T1").toUpperCase();
  const rawValue = toNumber(support.rawValue, 0);
  const miaPoints = toNumber(support.miaPoints, rawValue);
  const speaker = chooseSupportSpeaker(normalized, streamState, kojnozoutState);
  const supportIndex = toNumber(streamState?.support?.totalSupportEvents, 0) + 1;

  decision.mode = "ACT";
  decision.route = "support";
  decision.reason = "support_event";
  decision.recommendedAction = {
    type: "support_reaction",
    bankKey: pickBankKeyByTier(tier),
    tier,
    supportIndex,
    miaPoints,
    intensity: tier === "T3" ? 3 : tier === "T2" ? 2 : 1,
    speaker,
    useKojnozout: true,
    useVideoFallback: true,
    actorRoles: {
      primary: speaker,
      companion: speaker === "mia" ? "kojnozout" : "mia",
      viewerAvatar: null
    },
    viewerAvatarPlan: null
  };

  decision.meta = {
    ts: nowTs(),
    eventType: getEventType(normalized),
    tier,
    rawValue,
    supportIndex,
    miaPoints,
    moodState: toNumber(streamState?.moodState, 0),
    kojnozoutMood: safeString(kojnozoutState?.mood, "hungry"),
    supportUser: getUserLabel(normalized?.user),
    speaker,
    viewerAvatarCandidate: ""
  };

  return decision;
}

function buildWakeDecision(normalized = {}) {
  const decision = buildBaseDecision(normalized);

  if (!checkCooldown("lastWakeTs", 60000)) {
    decision.reason = "wake_cooldown";
    return decision;
  }

  decision.mode = "ACT";
  decision.reason = "wake_chat";
  decision.route = "community";
  decision.recommendedAction = {
    type: "wake_reaction",
    speaker: "mia",
    intensity: 1,
    bankKey: "wake_up_chat",
    actorRoles: {
      primary: "mia",
      companion: "kojnozout"
    }
  };

  return decision;
}

function buildMilestoneDecision(normalized = {}) {
  const decision = buildBaseDecision(normalized);

  if (!checkCooldown("lastMilestoneTs", 30000)) {
    decision.reason = "milestone_cooldown";
    return decision;
  }

  decision.mode = "ACT";
  decision.reason = "community_milestone";
  decision.route = "community";
  decision.recommendedAction = {
    type: "milestone_reaction",
    speaker: "mia",
    intensity: 2,
    bankKey: "milestone_chat",
    actorRoles: {
      primary: "mia",
      companion: "kojnozout"
    }
  };

  return decision;
}

function buildCommunityDecision(normalized = {}, streamState = {}, kojnozoutState = {}) {
  const decision = buildBaseDecision(normalized);
  const eventType = getEventType(normalized);
  const message = getChatText(normalized);
  const totalMessages = toNumber(streamState?.chat?.totalMessages, 0);
  const speaker = chooseCommunitySpeaker(normalized, streamState, kojnozoutState);

  decision.route = "community";
  decision.meta = {
    ...decision.meta,
    eventType,
    totalMessages,
    moodState: toNumber(streamState?.moodState, 0),
    engagementState: toNumber(streamState?.engagementState, 0),
    kojnozoutMood: safeString(kojnozoutState?.mood, "hungry"),
    speaker
  };

  if (eventType === "COMMENT") {
    const directTarget = detectDirectTarget(message);

    if (totalMessages > 0 && totalMessages % 10 === 0) {
      return buildMilestoneDecision(normalized);
    }

    if (directTarget === "mia") {
      decision.mode = "ACT";
      decision.reason = "direct_chat_mia";
      decision.recommendedAction = {
        type: "direct_chat_reaction",
        speaker: "mia",
        intensity: 1,
        bankKey: "direct_mia",
        message,
        actorRoles: {
          primary: "mia",
          companion: "kojnozout"
        }
      };
      return decision;
    }

    if (directTarget === "kojnozout") {
      decision.mode = "ACT";
      decision.reason = "direct_chat_kojnozout";
      decision.recommendedAction = {
        type: "direct_chat_reaction",
        speaker: "kojnozout",
        intensity: 1,
        bankKey: "direct_kojnozout",
        message,
        actorRoles: {
          primary: "kojnozout",
          companion: "mia"
        }
      };
      return decision;
    }

    if (/^mia\b|^mina\b|^míňa\b|^mio\b/i.test(message)) {
      return buildWakeDecision(normalized);
    }

    decision.mode = "ACT";
    decision.reason = "community_comment";
    decision.recommendedAction = {
      type: "community_reaction",
      speaker,
      intensity: 1,
      bankKey: "community_ping",
      message,
      actorRoles: {
        primary: speaker,
        companion: speaker === "mia" ? "kojnozout" : "mia"
      }
    };
    return decision;
  }

  if (eventType === "LIKE") {
    if (!checkCooldown("lastCommunityTs", 15000)) {
      decision.mode = "OBSERVE";
      decision.reason = "community_like_cooldown";
      return decision;
    }

    decision.mode = "ACT";
    decision.reason = "community_like";
    decision.recommendedAction = {
      type: "community_reaction",
      speaker,
      intensity: 1,
      bankKey: "community_ping",
      eventType: "LIKE",
      actorRoles: {
        primary: speaker,
        companion: speaker === "mia" ? "kojnozout" : "mia"
      }
    };
    return decision;
  }

  if (eventType === "FOLLOW" || eventType === "SHARE") {
    decision.mode = "ACT";
    decision.reason = eventType === "FOLLOW" ? "community_follow" : "community_share";
    decision.recommendedAction = {
      type: "community_reaction",
      speaker,
      intensity: 2,
      bankKey: "community_ping",
      eventType,
      actorRoles: {
        primary: speaker,
        companion: speaker === "mia" ? "kojnozout" : "mia"
      }
    };
    return decision;
  }

  return decision;
}

function decide(normalized = {}, streamState = {}, kojnozoutState = {}) {
  const eventType = getEventType(normalized);

  if (!eventType || eventType === "UNKNOWN") {
    return buildBaseDecision(normalized);
  }

  if (eventType === "GIFT") {
    return buildSupportDecision(normalized, streamState, kojnozoutState);
  }

  if (
    eventType === "COMMENT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE"
  ) {
    return buildCommunityDecision(normalized, streamState, kojnozoutState);
  }

  return buildBaseDecision(normalized);
}

module.exports = {
  decide,
  buildBaseDecision,
  buildSupportDecision,
  buildCommunityDecision,
  buildWakeDecision,
  buildMilestoneDecision,
  chooseSupportSpeaker,
  chooseCommunitySpeaker
};