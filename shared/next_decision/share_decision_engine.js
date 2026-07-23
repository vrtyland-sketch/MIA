"use strict";

/**
 * shared/next_decision/share_decision_engine.js
 *
 * NOVÁ ČISTÁ SHARE DECISION VRSTVA
 *
 * Tohle zatím není napojené do starého runtime.
 * Je to samostatný nový decision modul pro share větev,
 * který se bude později připojovat čistě a bezpečně.
 *
 * Cíl:
 * - oddělit SHARE od legacy community větve
 * - definovat čistý decision output pro next architekturu
 * - nerozbít funkční MIA/gift/bowl flow
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isDualVoiceEnabled() {
  return String(process.env.MIA_DUAL_VOICE || "").trim() === "1";
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clone(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function normalizeUserLabel(user = {}) {
  if (!user || typeof user !== "object") return "někdo";

  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "někdo"
  );
}

function normalizeUserKey(user = {}) {
  if (!user || typeof user !== "object") return "";

  return (
    safeString(user.userId) ||
    safeString(user.id) ||
    safeString(user.username) ||
    safeString(user.nickname) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    ""
  );
}

function getUserActivity(streamState = {}, user = null) {
  const store = streamState?.userActivity;
  if (!store || typeof store !== "object") {
    return null;
  }

  const directKey = normalizeUserKey(user);
  if (directKey && store[directKey] && typeof store[directKey] === "object") {
    return store[directKey];
  }

  const fallbackKeys = [
    safeString(user?.nickname),
    safeString(user?.displayName),
    safeString(user?.username),
    safeString(user?.name)
  ].filter(Boolean);

  for (const key of fallbackKeys) {
    if (store[key] && typeof store[key] === "object") {
      return store[key];
    }
  }

  return null;
}

function getUserShareCount(streamState = {}, user = null) {
  const activity = getUserActivity(streamState, user);
  if (!activity) return 0;
  return toNumber(activity.shareCount, 0);
}

function getTotalCommunityShares(streamState = {}) {
  const store = streamState?.userActivity;
  if (!store || typeof store !== "object") return 0;

  let total = 0;

  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (!entry || typeof entry !== "object") continue;
    total += toNumber(entry.shareCount, 0);
  }

  return total;
}

function getShareMeta(event = {}, streamState = {}, kojnozoutState = {}) {
  const user = event.user || null;
  const userLabel = normalizeUserLabel(user);
  const userShareCount = getUserShareCount(streamState, user);
  const totalCommunityShares = getTotalCommunityShares(streamState);
  const platform = safeString(event.platform, "unknown");
  const bowlPercent = clamp(toNumber(kojnozoutState?.bowlPercent, 0), 0, 100);
  const mood = safeString(kojnozoutState?.mood, "neutral").toLowerCase();

  return {
    userLabel,
    userShareCount,
    totalCommunityShares,
    platform,
    bowlPercent,
    mood
  };
}

function resolveShareMode(meta = {}) {
  const userShareCount = toNumber(meta.userShareCount, 0);
  const totalCommunityShares = toNumber(meta.totalCommunityShares, 0);

  if (userShareCount >= 3) {
    return "share_streak";
  }

  if (userShareCount >= 2) {
    return "share_repeat";
  }

  if (totalCommunityShares >= 10) {
    return "share_wave";
  }

  if (totalCommunityShares >= 5) {
    return "share_milestone";
  }

  return "share_single";
}

function resolvePrimaryActor(meta = {}) {
  const mood = safeString(meta.mood, "neutral");
  const bowlPercent = toNumber(meta.bowlPercent, 0);

  if (bowlPercent >= 90) {
    return "kojnozout";
  }

  if (mood === "excited" && bowlPercent >= 70) {
    return "kojnozout";
  }

  return "mia";
}

function resolveCompanionPolicy(mode = "", meta = {}) {
  if (!isDualVoiceEnabled()) {
    return {
      allowCompanion: false,
      companion: "kojnozout",
      companionReason: ""
    };
  }

  const bowlPercent = toNumber(meta.bowlPercent, 0);

  if (mode === "share_wave") {
    return {
      allowCompanion: true,
      companion: "kojnozout",
      companionReason: "SHARE_WAVE_COMPANION"
    };
  }

  if (mode === "share_milestone") {
    return {
      allowCompanion: true,
      companion: "kojnozout",
      companionReason: "SHARE_MILESTONE_COMPANION"
    };
  }

  if (mode === "share_streak") {
    return {
      allowCompanion: true,
      companion: "kojnozout",
      companionReason: "SHARE_STREAK_COMPANION"
    };
  }

  if (bowlPercent >= 85) {
    return {
      allowCompanion: true,
      companion: "kojnozout",
      companionReason: "SHARE_HIGH_BOWL_COMPANION"
    };
  }

  return {
    allowCompanion: false,
    companion: "kojnozout",
    companionReason: ""
  };
}

function resolveIntensity(mode = "", meta = {}) {
  const bowlPercent = toNumber(meta.bowlPercent, 0);

  if (mode === "share_wave") return 3;
  if (mode === "share_milestone") return 3;
  if (mode === "share_streak") return 3;
  if (mode === "share_repeat") return bowlPercent >= 80 ? 3 : 2;
  return 2;
}

function createShareDecision(event = {}, streamState = {}, kojnozoutState = {}) {
  const meta = getShareMeta(event, streamState, kojnozoutState);
  const mode = resolveShareMode(meta);
  const primary = resolvePrimaryActor(meta);
  const companionPolicy = resolveCompanionPolicy(mode, meta);
  const intensity = resolveIntensity(mode, meta);

  return {
    contractVersion: "v1",
    domain: "share",
    route: "community",
    decisionType: "share",
    reason: "NEXT_SHARE_DECISION",
    shouldPlayVideo: false,
    speaker: primary,
    intensity: clamp(toNumber(intensity, 2), 1, 4),
    shareMode: mode,
    actorRoles: {
      primary,
      companion: companionPolicy.companion,
      allowCompanion: Boolean(companionPolicy.allowCompanion),
      companionReason: safeString(companionPolicy.companionReason)
    },
    meta: {
      userLabel: meta.userLabel,
      userShareCount: meta.userShareCount,
      totalCommunityShares: meta.totalCommunityShares,
      platform: meta.platform,
      bowlPercent: meta.bowlPercent,
      mood: meta.mood,
      sourceEventId: safeString(event.eventId),
      traceId: safeString(event.traceId)
    },
    legacy: {
      event: clone(event, {}),
      streamStateSummary: {
        hasUserActivity: Boolean(streamState?.userActivity),
        totalCommunityShares: meta.totalCommunityShares
      }
    }
  };
}

function isShareDecision(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.contractVersion === "v1" &&
    value.domain === "share" &&
    value.decisionType === "share"
  );
}

module.exports = {
  createShareDecision,
  isShareDecision,
  getUserShareCount,
  getTotalCommunityShares,
  resolveShareMode
};