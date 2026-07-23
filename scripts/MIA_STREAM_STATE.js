"use strict";

/**
 * MIA_STREAM_STATE.js
 *
 * Canonical stream/community state helpers.
 * Tento modul nedělá ingest ani overlay.
 * Jen vytváří a bezpečně upravuje stream state.
 *
 * HARDENING UPDATE:
 * - user activity vrstva pro viewer avatary
 * - avatarRuntime je teď vždy bezpečně zajištěný
 * - žádné padání na undefined při markViewerAvatarAction
 */

function nowTs() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUsername(user) {
  if (!user) return null;

  if (typeof user === "string") {
    const trimmed = user.trim();
    return trimmed || null;
  }

  const candidates = [
    user.nickname,
    user.displayName,
    user.username,
    user.name,
    user.slug,
    user.id,
    user.userId
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate !== undefined && candidate !== null) {
      return String(candidate);
    }
  }

  return null;
}

function normalizeUserId(user) {
  if (!user) return null;

  if (typeof user === "string") {
    const trimmed = user.trim();
    return trimmed || null;
  }

  const candidates = [
    user.userId,
    user.id,
    user.username,
    user.nickname,
    user.displayName,
    user.name,
    user.slug
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate !== undefined && candidate !== null) {
      return String(candidate);
    }
  }

  return null;
}

function getUserKey(user) {
  return normalizeUserId(user) || normalizeUsername(user) || null;
}

function createAvatarRuntime() {
  return {
    lastViewerAvatarCandidateId: null,
    lastViewerAvatarCandidateLabel: null,
    lastViewerAvatarActionAt: null
  };
}

function ensureAvatarRuntime(state) {
  if (!state || typeof state !== "object") {
    return createAvatarRuntime();
  }

  if (!state.avatarRuntime || typeof state.avatarRuntime !== "object") {
    state.avatarRuntime = createAvatarRuntime();
  }

  if (!Object.prototype.hasOwnProperty.call(state.avatarRuntime, "lastViewerAvatarCandidateId")) {
    state.avatarRuntime.lastViewerAvatarCandidateId = null;
  }

  if (!Object.prototype.hasOwnProperty.call(state.avatarRuntime, "lastViewerAvatarCandidateLabel")) {
    state.avatarRuntime.lastViewerAvatarCandidateLabel = null;
  }

  if (!Object.prototype.hasOwnProperty.call(state.avatarRuntime, "lastViewerAvatarActionAt")) {
    state.avatarRuntime.lastViewerAvatarActionAt = null;
  }

  return state.avatarRuntime;
}

function buildUserActivityEntry(user) {
  return {
    userId: normalizeUserId(user),
    label: normalizeUsername(user),
    firstSeenAt: nowTs(),
    lastSeenAt: nowTs(),
    chatCount: 0,
    likeCount: 0,
    followCount: 0,
    shareCount: 0,
    supportEvents: 0,
    totalCoins: 0,
    totalSupportIndex: 0,
    totalMiaPoints: 0,
    avatarEligible: false,
    lastSupportAt: null,
    lastChatAt: null,
    lastEventType: ""
  };
}

function ensureUserActivityStore(state) {
  if (!state.userActivity || typeof state.userActivity !== "object") {
    state.userActivity = {};
  }

  return state.userActivity;
}

function ensureUserActivity(state, user) {
  const key = getUserKey(user);
  if (!key) return null;

  const store = ensureUserActivityStore(state);

  if (!store[key] || typeof store[key] !== "object") {
    store[key] = buildUserActivityEntry(user);
  }

  const entry = store[key];
  entry.userId = normalizeUserId(user) || entry.userId;
  entry.label = normalizeUsername(user) || entry.label;
  entry.lastSeenAt = nowTs();

  return entry;
}

function recomputeAvatarEligibility(entry) {
  if (!entry || typeof entry !== "object") return false;

  const hasSupport = entry.supportEvents >= 1 || entry.totalCoins > 0;
  const hasChatActivity = entry.chatCount >= 1;

  entry.avatarEligible = Boolean(hasSupport && hasChatActivity);
  return entry.avatarEligible;
}

function createStreamState() {
  const state = {
    moodState: 0,
    engagementState: 0,
    kojnozoutFeedState: 0,
    supportState: 0,

    lastEventAt: null,
    lastCommunityEventAt: null,
    lastSupportEventAt: null,

    counters: {
      totalEvents: 0,
      communityEvents: 0,
      supportEvents: 0
    },

    chat: {
      totalMessages: 0,
      lastMessageAt: null,
      lastMessageUser: null
    },

    support: {
      totalCoins: 0,
      totalGiftEvents: 0,
      lastCoins: 0,
      lastTier: null,
      lastSupportUser: null
    },

    community: {
      lastActiveUser: null,
      activeUsers: {}
    },

    userActivity: {},
    avatarRuntime: createAvatarRuntime()
  };

  ensureAvatarRuntime(state);
  return state;
}

function ensureBaseState(state) {
  const safeState = state && typeof state === "object"
    ? state
    : createStreamState();

  if (!safeState.counters || typeof safeState.counters !== "object") {
    safeState.counters = {
      totalEvents: 0,
      communityEvents: 0,
      supportEvents: 0
    };
  }

  if (!safeState.chat || typeof safeState.chat !== "object") {
    safeState.chat = {
      totalMessages: 0,
      lastMessageAt: null,
      lastMessageUser: null
    };
  }

  if (!safeState.support || typeof safeState.support !== "object") {
    safeState.support = {
      totalCoins: 0,
      totalGiftEvents: 0,
      lastCoins: 0,
      lastTier: null,
      lastSupportUser: null
    };
  }

  if (!safeState.community || typeof safeState.community !== "object") {
    safeState.community = {
      lastActiveUser: null,
      activeUsers: {}
    };
  }

  if (!safeState.community.activeUsers || typeof safeState.community.activeUsers !== "object") {
    safeState.community.activeUsers = {};
  }

  if (!safeState.userActivity || typeof safeState.userActivity !== "object") {
    safeState.userActivity = {};
  }

  ensureAvatarRuntime(safeState);

  return safeState;
}

function touchTotalEvent(state) {
  state.lastEventAt = nowTs();
  state.counters.totalEvents += 1;
}

function touchCommunityUser(state, user) {
  const username = normalizeUsername(user);
  if (!username) return;

  state.community.activeUsers[username] = true;
  state.community.lastActiveUser = username;
}

function applySupportImpact(state, support) {
  const safeState = ensureBaseState(state);
  const safeSupport = support || {};

  const coins =
    toNumber(safeSupport.totalCoins, NaN) ||
    toNumber(safeSupport.coins, NaN) ||
    toNumber(safeSupport.value, NaN) ||
    toNumber(safeSupport.rawValue, NaN) ||
    0;

  const tier =
    typeof safeSupport.tier === "string" && safeSupport.tier.trim()
      ? safeSupport.tier.trim()
      : null;

  touchTotalEvent(safeState);

  safeState.supportState = coins;
  safeState.lastSupportEventAt = nowTs();
  safeState.counters.supportEvents += 1;

  safeState.support.totalCoins += coins;
  safeState.support.totalGiftEvents += 1;
  safeState.support.lastCoins = coins;
  safeState.support.lastTier = tier;
  safeState.support.lastSupportUser = normalizeUsername(safeSupport.user);

  touchCommunityUser(safeState, safeSupport.user);

  const activity = ensureUserActivity(safeState, safeSupport.user);
  if (activity) {
    activity.supportEvents += 1;
    activity.totalCoins += coins;
    activity.totalSupportIndex += toNumber(safeSupport.supportIndex, 0);
    activity.totalMiaPoints += toNumber(safeSupport.miaPoints, 0);
    activity.lastSupportAt = nowTs();
    activity.lastEventType = "GIFT";

    recomputeAvatarEligibility(activity);

    const avatarRuntime = ensureAvatarRuntime(safeState);
    avatarRuntime.lastViewerAvatarCandidateId =
      activity.userId || getUserKey(safeSupport.user);
    avatarRuntime.lastViewerAvatarCandidateLabel =
      activity.label || normalizeUsername(safeSupport.user);
  }

  return clone(safeState);
}

function applyCommunityImpact(state, impact, meta = {}) {
  const safeState = ensureBaseState(state);
  const safeImpact = impact || {};
  const safeMeta = meta || {};

  const moodDelta = toNumber(safeImpact.moodDelta, 0);
  const engagementDelta = toNumber(safeImpact.engagementDelta, 0);
  const kojnozoutFeedDelta = toNumber(safeImpact.kojnozoutFeedDelta, 0);
  const eventType = safeString(safeMeta.eventType).toUpperCase();

  touchTotalEvent(safeState);

  safeState.moodState += moodDelta;
  safeState.engagementState += engagementDelta;
  safeState.kojnozoutFeedState += kojnozoutFeedDelta;

  safeState.lastCommunityEventAt = nowTs();
  safeState.counters.communityEvents += 1;

  if (eventType === "COMMENT" || eventType === "CHAT_MESSAGE") {
    safeState.chat.totalMessages += 1;
    safeState.chat.lastMessageAt = nowTs();
    safeState.chat.lastMessageUser = normalizeUsername(safeMeta.user);
  }

  touchCommunityUser(safeState, safeMeta.user);

  const activity = ensureUserActivity(safeState, safeMeta.user);
  if (activity) {
    if (eventType === "COMMENT" || eventType === "CHAT_MESSAGE") {
      activity.chatCount += 1;
      activity.lastChatAt = nowTs();
    } else if (eventType === "LIKE") {
      activity.likeCount += 1;
    } else if (eventType === "FOLLOW") {
      activity.followCount += 1;
    } else if (eventType === "SHARE") {
      activity.shareCount += 1;
    }

    activity.lastEventType = eventType || "COMMUNITY";
    recomputeAvatarEligibility(activity);
  }

  return clone(safeState);
}

function getViewerAvatarCandidate(state, options = {}) {
  const safeState = ensureBaseState(state);
  const store = ensureUserActivityStore(safeState);
  const now = nowTs();

  const maxAgeMs = Math.max(1000, toNumber(options.maxAgeMs, 10 * 60 * 1000));
  const requireSupport = options.requireSupport !== false;
  const requireChat = options.requireChat !== false;

  let best = null;

  Object.keys(store).forEach((key) => {
    const entry = store[key];
    if (!entry || typeof entry !== "object") return;

    if (now - toNumber(entry.lastSeenAt, 0) > maxAgeMs) {
      return;
    }

    if (requireSupport && entry.supportEvents < 1 && entry.totalCoins <= 0) {
      return;
    }

    if (requireChat && entry.chatCount < 1) {
      return;
    }

    const score =
      (entry.chatCount * 5) +
      (entry.supportEvents * 20) +
      Math.min(100, toNumber(entry.totalCoins, 0)) +
      (entry.followCount * 3) +
      (entry.shareCount * 4) +
      (entry.likeCount * 1);

    if (!best || score > best.score || (score === best.score && toNumber(entry.lastSeenAt, 0) > toNumber(best.lastSeenAt, 0))) {
      best = {
        key,
        score,
        lastSeenAt: toNumber(entry.lastSeenAt, 0),
        entry: clone(entry)
      };
    }
  });

  return best ? clone(best) : null;
}

function markViewerAvatarAction(state, candidate) {
  const safeState = ensureBaseState(state);
  const avatarRuntime = ensureAvatarRuntime(safeState);

  avatarRuntime.lastViewerAvatarActionAt = nowTs();
  avatarRuntime.lastViewerAvatarCandidateId =
    safeString(candidate?.entry?.userId) ||
    safeString(candidate?.key) ||
    avatarRuntime.lastViewerAvatarCandidateId;

  avatarRuntime.lastViewerAvatarCandidateLabel =
    safeString(candidate?.entry?.label) ||
    avatarRuntime.lastViewerAvatarCandidateLabel;

  return clone(avatarRuntime);
}

function getStreamStateSnapshot(state) {
  return clone(ensureBaseState(state));
}

module.exports = {
  createStreamState,
  applySupportImpact,
  applyCommunityImpact,
  getViewerAvatarCandidate,
  markViewerAvatarAction,
  getStreamStateSnapshot
};