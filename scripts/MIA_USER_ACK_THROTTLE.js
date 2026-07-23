"use strict";

const streamEconomy = require("./MIA_STREAM_ECONOMY_CONFIG");
const throttleCfg = streamEconomy.getUserAckThrottleConfig();

/**
 * Per-user public reaction throttle.
 *
 * DVA oddělené „spam“ systémy v MIA:
 * 1) Community gift-wave — MIA_NEXT/engine_spam_session.js
 *    (vlna dárků → milestone odměna, pozitivní herní mechanika)
 * 2) Tento modul — stejný člověk se nesmí donekonečna zdravít / děkovat
 *    (MIA neopakuje „ahoj“ / thanks dokola jednomu viewerovi)
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowMs() {
  return Date.now();
}

/** Cooldown veřejného gift ack na stejného usera (ms). */
const GIFT_ACK_COOLDOWN_MS = Object.freeze({ ...(throttleCfg.giftAckCooldownMs || {}) });

/** Cooldown pozdravu stejnému userovi (ms) — delší než gift. */
const GREETING_COOLDOWN_MS = Object.freeze({ ...(throttleCfg.greetingCooldownMs || {}) });

/** Prázdný ping „mia“ / „koj“ bez obsahu. */
const PING_COOLDOWN_MS = Object.freeze({ ...(throttleCfg.pingCooldownMs || {}) });

/** Follow welcome stejnému userovi. */
const FOLLOW_COOLDOWN_MS = Object.freeze({ ...(throttleCfg.followCooldownMs || {}) });

/** Chat CARE (podrbat, nakrmit…) — delší než gift thanks, kratší než greeting. */
const CARE_COOLDOWN_MS = Object.freeze({ ...(throttleCfg.careCooldownMs || {}) });

const MAX_USER_ENTRIES = 240;

function resolveAudienceBand(viewerCount = 0) {
  const viewers = Math.max(0, toNumber(viewerCount, 0));
  if (viewers <= 0) return "unknown";
  if (viewers < 25) return "tiny";
  if (viewers < 75) return "small";
  if (viewers < 200) return "medium";
  if (viewers < 500) return "large";
  return "huge";
}

function resolveUserKey(eventOrUser = {}) {
  const user =
    eventOrUser?.user && typeof eventOrUser.user === "object"
      ? eventOrUser.user
      : eventOrUser;

  const userId =
    user?.userId ??
    eventOrUser?.userId ??
    user?.uniqueId ??
    eventOrUser?.uniqueId ??
    null;

  if (userId !== null && userId !== undefined && safeString(String(userId))) {
    return `id:${safeString(String(userId)).toLowerCase()}`;
  }

  const label = safeString(
    user?.nickname ||
      user?.username ||
      user?.displayName ||
      eventOrUser?.nickname ||
      eventOrUser?.username ||
      eventOrUser?.userLabel ||
      "viewer"
  ).toLowerCase();

  return `nick:${label}`;
}

function getThrottleState(outputState = {}) {
  if (!outputState || typeof outputState !== "object") {
    return { byUser: {} };
  }

  if (!outputState.userAckThrottle || typeof outputState.userAckThrottle !== "object") {
    outputState.userAckThrottle = { byUser: {} };
  }

  if (
    !outputState.userAckThrottle.byUser ||
    typeof outputState.userAckThrottle.byUser !== "object"
  ) {
    outputState.userAckThrottle.byUser = {};
  }

  return outputState.userAckThrottle;
}

function cooldownMsFor(kind = "gift", audienceBand = "medium") {
  const tables = {
    gift: GIFT_ACK_COOLDOWN_MS,
    greeting: GREETING_COOLDOWN_MS,
    ping: PING_COOLDOWN_MS,
    follow: FOLLOW_COOLDOWN_MS,
    care: CARE_COOLDOWN_MS
  };
  const table = tables[kind] || GIFT_ACK_COOLDOWN_MS;
  return toNumber(table[audienceBand], table.medium || 45000);
}

function pruneUsers(state) {
  const keys = Object.keys(state.byUser || {});
  if (keys.length <= MAX_USER_ENTRIES) return;

  keys
    .sort(
      (a, b) =>
        toNumber(state.byUser[a]?.lastAnyAt, 0) -
        toNumber(state.byUser[b]?.lastAnyAt, 0)
    )
    .slice(0, keys.length - MAX_USER_ENTRIES)
    .forEach((key) => {
      delete state.byUser[key];
    });
}

function getUserEntry(state, userKey) {
  if (!state.byUser[userKey]) {
    state.byUser[userKey] = {
      lastGiftAckAt: 0,
      lastGreetingAt: 0,
      lastPingAt: 0,
      lastFollowAt: 0,
      lastCareAt: 0,
      lastAnyAt: 0,
      giftAckCount: 0,
      greetingCount: 0,
      pingCount: 0,
      followCount: 0,
      careCount: 0
    };
  }
  return state.byUser[userKey];
}

function lastAtForKind(entry, kind) {
  if (kind === "greeting") return toNumber(entry?.lastGreetingAt, 0);
  if (kind === "ping") return toNumber(entry?.lastPingAt, 0);
  if (kind === "follow") return toNumber(entry?.lastFollowAt, 0);
  if (kind === "care") return toNumber(entry?.lastCareAt, 0);
  return toNumber(entry?.lastGiftAckAt, 0);
}

/**
 * @returns {{ cooling: boolean, remainingMs: number, lastAt: number, cooldownMs: number }}
 */
function checkUserPublicAck(outputState, userKey, kind = "gift", audienceBand = "medium") {
  const key = safeString(userKey);
  if (!key) {
    return { cooling: false, remainingMs: 0, lastAt: 0, cooldownMs: 0 };
  }

  const state = getThrottleState(outputState);
  const entry = state.byUser[key];
  const cooldownMs = cooldownMsFor(kind, audienceBand);
  const lastAt = lastAtForKind(entry, kind);

  if (!lastAt) {
    return { cooling: false, remainingMs: 0, lastAt: 0, cooldownMs };
  }

  const elapsed = nowMs() - lastAt;
  if (elapsed >= cooldownMs) {
    return { cooling: false, remainingMs: 0, lastAt, cooldownMs };
  }

  return {
    cooling: true,
    remainingMs: cooldownMs - elapsed,
    lastAt,
    cooldownMs
  };
}

function isUserPublicAckCooling(
  outputState,
  userKey,
  kind = "gift",
  audienceBand = "medium"
) {
  return checkUserPublicAck(outputState, userKey, kind, audienceBand).cooling;
}

function noteUserPublicAck(outputState, userKey, kind = "gift") {
  const key = safeString(userKey);
  if (!key || !outputState || typeof outputState !== "object") {
    return null;
  }

  const state = getThrottleState(outputState);
  const entry = getUserEntry(state, key);
  const now = nowMs();

  entry.lastAnyAt = now;
  if (kind === "greeting") {
    entry.lastGreetingAt = now;
    entry.greetingCount = toNumber(entry.greetingCount, 0) + 1;
  } else if (kind === "ping") {
    entry.lastPingAt = now;
    entry.pingCount = toNumber(entry.pingCount, 0) + 1;
  } else if (kind === "follow") {
    entry.lastFollowAt = now;
    entry.followCount = toNumber(entry.followCount, 0) + 1;
  } else if (kind === "care") {
    entry.lastCareAt = now;
    entry.careCount = toNumber(entry.careCount, 0) + 1;
  } else {
    entry.lastGiftAckAt = now;
    entry.giftAckCount = toNumber(entry.giftAckCount, 0) + 1;
  }

  pruneUsers(state);
  return entry;
}

function resolveBandFromStreamState(streamState = {}) {
  return resolveAudienceBand(
    streamState?.audience?.viewerCount ?? streamState?.viewerCount ?? 0
  );
}

function isEmptyEntityPing(message = "") {
  const text = safeString(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;
  return /^(mia|koj|kojnozrout|kojnozout|zrout|ahoj mia|cau mia|nazdar mia)$/.test(
    text
  );
}

module.exports = {
  GIFT_ACK_COOLDOWN_MS,
  GREETING_COOLDOWN_MS,
  PING_COOLDOWN_MS,
  FOLLOW_COOLDOWN_MS,
  CARE_COOLDOWN_MS,
  resolveAudienceBand,
  resolveUserKey,
  resolveBandFromStreamState,
  getThrottleState,
  checkUserPublicAck,
  isUserPublicAckCooling,
  noteUserPublicAck,
  cooldownMsFor,
  isEmptyEntityPing
};
