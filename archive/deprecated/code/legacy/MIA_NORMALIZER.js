"use strict";

/**
 * MIA_NORMALIZER.js
 *
 * Převádí syrový input z TikFinity / Kick / test payloadů
 * na jeden stabilní root runtime formát.
 *
 * ROOT runtime očekává eventType:
 * - GIFT
 * - COMMENT
 * - LIKE
 * - FOLLOW
 * - SHARE
 *
 * DŮLEŽITÉ:
 * - finální support tier NEURČUJE normalizer
 * - tier je source-of-truth v MIA_SUPPORT_RESOLVER
 * - explicitní intent z query/body.type má přednost před „špinavým“ payloadem
 *   (např. TikFinity test chat, který v body zároveň posílá giftName/coins)
 */

const crypto = require("crypto");

function nowTs() {
  return Date.now();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function detectPlatform(input = {}) {
  const source = pickFirstString(
    input.source,
    input.platform,
    input.provider,
    input.origin
  ).toLowerCase();

  if (
    source.includes("kick") ||
    input.chatroomId ||
    input.channel ||
    input.pusherKey
  ) {
    return "kick";
  }

  if (
    source.includes("tiktok") ||
    source.includes("tikfinity") ||
    input.giftName ||
    input.repeatCount !== undefined ||
    input.profilePictureUrl ||
    input.tikfinityUserId ||
    input.tikfinityUsername
  ) {
    return "tiktok";
  }

  return source || "unknown";
}

function detectSource(input = {}, platform = "unknown") {
  const raw = pickFirstString(
    input.source,
    input.provider,
    input.origin
  ).toLowerCase();

  if (raw) return raw;

  if (platform === "kick") {
    if (input.chatroomId || input.channel) return "kick_realtime";
    return "kick";
  }

  if (platform === "tiktok") {
    if (String(input.tikfinityUserId || input.tikfinityUsername || "").trim()) {
      return "tikfinity";
    }
    return "tiktok";
  }

  return "unknown";
}

function normalizeUser(input = {}) {
  const user = input.user && typeof input.user === "object" ? input.user : {};

  const username = pickFirstString(
    input.username,
    input.userName,
    input.uniqueId,
    input.slug,
    user.username,
    user.userName,
    user.uniqueId,
    user.slug
  );

  const nickname = pickFirstString(
    input.nickname,
    input.displayName,
    input.name,
    user.nickname,
    user.displayName,
    user.name,
    username
  );

  const avatarUrl = pickFirstString(
    input.avatarUrl,
    input.avatar,
    input.profilePictureUrl,
    user.avatarUrl,
    user.avatar,
    user.profilePictureUrl
  );

  const userId =
    input.userId ??
    input.userid ??
    input.user_id ??
    user.userId ??
    user.user_id ??
    user.id ??
    null;

  if (!username && !nickname && !avatarUrl && userId === null) {
    return null;
  }

  return {
    userId,
    username: username || nickname || "",
    nickname: nickname || username || "",
    avatarUrl: avatarUrl || ""
  };
}

function getExplicitIntent(input = {}) {
  const raw = pickFirstString(
    input.type,
    input.intent,
    input.routeHint,
    input.forceType,
    input.eventIntent
  ).toLowerCase();

  if (!raw) return "";

  if (raw === "gift" || raw === "support" || raw === "donation" || raw === "tip") {
    return "GIFT";
  }

  if (raw === "chat" || raw === "comment" || raw === "message") {
    return "COMMENT";
  }

  if (raw === "like") {
    return "LIKE";
  }

  if (raw === "follow") {
    return "FOLLOW";
  }

  if (raw === "share" || raw === "repost") {
    return "SHARE";
  }

  return "";
}

function detectEventType(input = {}, platform = "unknown") {
  const explicitIntent = getExplicitIntent(input);
  if (explicitIntent) {
    return explicitIntent;
  }

  const candidates = [
    input.eventType,
    input.type,
    input.event,
    input.rawType,
    input.name,
    input.eventName
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  const joined = candidates.join(" | ");

  if (
    input.giftName !== undefined ||
    input.giftId !== undefined ||
    joined.includes("gift") ||
    joined.includes("tip") ||
    joined.includes("donation")
  ) {
    return "GIFT";
  }

  if (
    input.comment !== undefined ||
    input.message !== undefined ||
    input.content !== undefined ||
    joined.includes("comment") ||
    joined.includes("chat") ||
    joined.includes("message")
  ) {
    return "COMMENT";
  }

  if (
    input.likeCount !== undefined ||
    input.likes !== undefined ||
    joined.includes("like")
  ) {
    return "LIKE";
  }

  if (joined.includes("follow")) {
    return "FOLLOW";
  }

  if (joined.includes("share") || joined.includes("repost")) {
    return "SHARE";
  }

  if (platform === "kick" && (input.content || input.message)) {
    return "COMMENT";
  }

  return "UNKNOWN";
}

function detectMessage(input = {}) {
  return pickFirstString(
    input.comment,
    input.message,
    input.content,
    input.text,
    input.body,
    input.commandParams,
    input.value2
  );
}

function buildSupportPayload(input = {}) {
  /**
   * KRITICKÝ FIX:
   * - generic input.value / totalValue dělaly bordel u některých TikFinity payloadů
   * - pro support bereme přednostně explicitní coin pole
   * - totalCoins dopočítáme z coins * repeatCount, pokud nepřišlo explicitně
   */
  const coins =
    toNumber(input.coins, NaN) ||
    toNumber(input.coinValue, NaN) ||
    toNumber(input.totalCoinValue, NaN) ||
    toNumber(input.giftValue, NaN) ||
    toNumber(input.diamondCount, NaN) ||
    0;

  const repeatCount =
    toNumber(input.repeatCount, NaN) ||
    toNumber(input.count, NaN) ||
    toNumber(input.quantity, NaN) ||
    1;

  const explicitTotalCoins =
    toNumber(input.totalCoins, NaN) ||
    toNumber(input.totalCoinValue, NaN) ||
    0;

  const totalCoins = explicitTotalCoins > 0 ? explicitTotalCoins : (coins * repeatCount);

  return {
    giftId: input.giftId ?? input.id ?? null,
    giftName: pickFirstString(input.giftName, input.gift, input.name, input.value1),
    coins,
    repeatCount,
    totalCoins
  };
}

function buildCommunityImpact(input = {}, eventType = "COMMENT") {
  if (eventType === "LIKE") {
    return {
      moodDelta: 0,
      engagementDelta: 1,
      kojnozoutFeedDelta: 0
    };
  }

  if (eventType === "FOLLOW") {
    return {
      moodDelta: 1,
      engagementDelta: 2,
      kojnozoutFeedDelta: 2
    };
  }

  if (eventType === "SHARE") {
    return {
      moodDelta: 1,
      engagementDelta: 3,
      kojnozoutFeedDelta: 1
    };
  }

  const textLength = detectMessage(input).length;

  return {
    moodDelta: textLength > 60 ? 1 : 0,
    engagementDelta: textLength > 0 ? 1 : 0,
    kojnozoutFeedDelta: textLength > 0 ? 0.075 : 0
  };
}

function resolveRawType(input = {}) {
  return pickFirstString(
    input.rawType,
    input.eventType,
    input.event,
    input.type,
    input.eventName,
    input.name
  );
}

function sanitizeRawInput(input = {}, eventType = "UNKNOWN") {
  const safeInput = input && typeof input === "object" ? clone(input) : {};

  if (
    eventType === "COMMENT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE"
  ) {
    delete safeInput.giftId;
    delete safeInput.giftName;
    delete safeInput.gift;
    delete safeInput.giftValue;
    delete safeInput.coins;
    delete safeInput.repeatCount;
    delete safeInput.totalCoins;
    delete safeInput.totalValue;
    delete safeInput.quantity;
    delete safeInput.diamondCount;
  }

  if (eventType === "GIFT") {
    if (!safeString(safeInput.comment) && safeString(safeInput.content)) {
      safeInput.comment = "";
    }
  }

  return safeInput;
}

function buildEventIdentity(input = {}, platform = "unknown", eventType = "UNKNOWN", user = null) {
  const ts = nowTs();

  const sourceEventId = pickFirstString(
    input.eventId,
    input.messageId,
    input.id,
    input.uuid,
    input.traceId
  );

  const userPart =
    user && user.userId !== null && user.userId !== undefined
      ? String(user.userId)
      : (user && user.username ? String(user.username) : "anon");

  const hashBase = JSON.stringify({
    platform,
    eventType,
    sourceEventId,
    userPart,
    giftName: input.giftName || "",
    coins: input.coins || input.value || 0,
    repeatCount: input.repeatCount || input.count || 1,
    message: detectMessage(input),
    tsBucket: Math.floor(ts / 1000)
  });

  const hash = crypto
    .createHash("sha1")
    .update(hashBase)
    .digest("hex")
    .slice(0, 16);

  const eventId = sourceEventId
    ? `${platform}_${eventType.toLowerCase()}_${String(sourceEventId)}`
    : `${platform}_${eventType.toLowerCase()}_${hash}`;

  const traceId = `${platform}_${hash}`;

  return {
    ts,
    isoTime: new Date(ts).toISOString(),
    eventId,
    traceId
  };
}

function normalizeEvent(input = {}) {
  const platform = detectPlatform(input);
  const source = detectSource(input, platform);
  const initialEventType = detectEventType(input, platform);
  const sanitizedInput = sanitizeRawInput(input, initialEventType);
  const eventType = detectEventType(sanitizedInput, platform);
  const user = normalizeUser(sanitizedInput);
  const identity = buildEventIdentity(sanitizedInput, platform, eventType, user);

  const route =
    eventType === "GIFT"
      ? "support"
      : (
          eventType === "COMMENT" ||
          eventType === "LIKE" ||
          eventType === "FOLLOW" ||
          eventType === "SHARE"
        )
        ? "community"
        : "ignore";

  const normalized = {
    ts: identity.ts,
    tsUnixMs: identity.ts,
    isoTime: identity.isoTime,
    eventId: identity.eventId,
    traceId: identity.traceId,

    platform,
    source,
    rawType: resolveRawType(input),
    eventType,
    route,

    user,
    message: detectMessage(sanitizedInput),
    content: detectMessage(sanitizedInput),

    raw: clone(input),
    sanitizedRaw: sanitizedInput
  };

  if (eventType === "GIFT") {
    normalized.support = buildSupportPayload(sanitizedInput);
  }

  if (
    eventType === "COMMENT" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE"
  ) {
    normalized.communityImpact = buildCommunityImpact(sanitizedInput, eventType);
  }

  return normalized;
}

module.exports = {
  normalizeEvent,
  detectPlatform,
  detectSource,
  detectEventType,
  detectMessage,
  normalizeUser,
  buildSupportPayload,
  buildCommunityImpact,
  getExplicitIntent,
  sanitizeRawInput
};