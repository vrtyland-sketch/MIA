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
 *
 * SAFE SHARE EXTENSION:
 * - share pipeline už v systému existuje níž
 * - tady pouze rozšiřujeme detekci share eventů na vstupu
 * - bez zásahu do support/video/overlay logiky
 */

const crypto = require("crypto");
const languageModule = require("../../scripts/MIA_LANGUAGE");

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

function hasOwn(input, key) {
  return !!(input && Object.prototype.hasOwnProperty.call(input, key));
}

function hasAnyOwn(input, keys = []) {
  if (!input || typeof input !== "object") return false;
  return keys.some((key) => hasOwn(input, key));
}

function hasPositiveNumber(input, keys = []) {
  if (!input || typeof input !== "object") return false;
  return keys.some((key) => {
    const n = Number(input[key]);
    return Number.isFinite(n) && n > 0;
  });
}

function detectPlatform(input = {}) {
  const source = pickFirstString(
    input.source,
    input.platform,
    input.provider,
    input.origin
  ).toLowerCase();

  if (
    source.includes("twitch") ||
    input.twitchEventType ||
    input.broadcaster_user_id ||
    input.subscription_type?.startsWith?.("channel.")
  ) {
    return "twitch";
  }

  if (
    source.includes("kick") ||
    input.chatroomId ||
    (input.channel && !input.broadcaster_user_id) ||
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
    input.tikfinityUsername ||
    input.uniqueId ||
    input.secUid ||
    hasAnyOwn(input, [
      "shareCount",
      "totalShareCount",
      "share",
      "shares",
      "shareType",
      "isShare"
    ])
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

  if (platform === "twitch") {
    if (input.source?.includes("eventsub") || input.twitchEventType) return "twitch_eventsub";
    return "twitch";
  }

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
    input.tikfinityUsername,
    input.user_login,
    user.username,
    user.userName,
    user.uniqueId,
    user.slug,
    user.tikfinityUsername
  );

  const nickname = pickFirstString(
    input.nickname,
    input.displayName,
    input.name,
    input.value1,
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

  const rawUserId =
    input.userId ??
    input.userid ??
    input.user_id ??
    input.tikfinityUserId ??
    user.userId ??
    user.user_id ??
    user.id ??
    user.tikfinityUserId ??
    null;

  const userId = resolveStableUserId(rawUserId, input, user);

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

function isPlaceholderUserId(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return (
    !normalized ||
    normalized === "0" ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "anonymous"
  );
}

function resolveStableUserId(rawUserId, input = {}, user = {}) {
  if (!isPlaceholderUserId(rawUserId)) {
    return rawUserId;
  }

  const fallback = pickFirstString(
    input.tikfinityUserId,
    user.tikfinityUserId,
    input.secUid,
    user.secUid,
    input.uniqueId,
    user.uniqueId,
    input.tikfinityUsername,
    user.tikfinityUsername
  );

  if (fallback) return fallback;
  return isPlaceholderUserId(rawUserId) ? null : rawUserId;
}

function getExplicitIntent(input = {}) {
  const raw = pickFirstString(
    input.intent,
    input.routeHint,
    input.forceType,
    input.eventIntent,
    input.type
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

function detectMessage(input = {}) {
  return pickFirstString(
    input.comment,
    input.message,
    input.text,
    input.body,
    input.commandParams,
    input.value2,
    input.content
  );
}

function isTikfinitySource(input = {}, platform = "unknown") {
  return detectSource(input, platform) === "tikfinity";
}

function isTikfinityGiftPayload(input = {}, platform = "unknown") {
  if (platform !== "tiktok" && !isTikfinitySource(input, platform)) {
    return false;
  }

  if (!isTikfinitySource(input, platform)) {
    return false;
  }

  const hasGiftIdentityField =
    hasAnyOwn(input, ["giftName", "giftId", "gift", "diamondCount"]) ||
    !!safeString(input.giftName) ||
    !!safeString(input.giftId);

  const hasGiftValueField =
    hasPositiveNumber(input, [
      "coins",
      "coinValue",
      "giftValue",
      "repeatCount",
      "count",
      "quantity",
      "diamondCount",
      "totalCoinValue",
      "totalCoins"
    ]);

  return hasGiftIdentityField && hasGiftValueField;
}

function detectEventType(input = {}, platform = "unknown") {
  const explicitIntent = getExplicitIntent(input);
  if (explicitIntent) {
    return explicitIntent;
  }

  const eventTypeRaw = safeString(input.eventType).toLowerCase();
  const rawType = safeString(input.rawType).toLowerCase();
  const event = safeString(input.event).toLowerCase();
  const eventName = safeString(input.eventName).toLowerCase();
  const kind = safeString(input.kind).toLowerCase();
  const action = safeString(input.action).toLowerCase();

  const joined = [
    eventTypeRaw,
    rawType,
    event,
    eventName,
    kind,
    action
  ]
    .filter(Boolean)
    .join(" | ");

  const typeRaw = safeString(input.type).toLowerCase();

  const hasMessageField =
    hasAnyOwn(input, [
      "comment",
      "message",
      "content",
      "text",
      "body",
      "commandParams",
      "value2"
    ]) && !!detectMessage(input);

  const hasGiftIdentityField =
    hasAnyOwn(input, ["giftName", "giftId", "gift", "diamondCount"]);

  const hasGiftValueField =
    hasPositiveNumber(input, [
      "coins",
      "coinValue",
      "giftValue",
      "repeatCount",
      "count",
      "quantity",
      "diamondCount",
      "totalCoinValue",
      "totalCoins"
    ]);

  const hasGiftLikePayload = hasGiftIdentityField || hasGiftValueField;

  const hasCommentLikePayload =
    hasMessageField ||
    joined.includes("comment") ||
    joined.includes("chat") ||
    joined.includes("message") ||
    typeRaw === "comment" ||
    typeRaw === "chat" ||
    typeRaw === "message";

  const hasExplicitGiftSignalInEventName =
    joined.includes("gift") ||
    joined.includes("tip") ||
    joined.includes("donation") ||
    typeRaw === "gift" ||
    typeRaw === "support" ||
    typeRaw === "donation" ||
    typeRaw === "tip";

  const hasExplicitCommentSignalInEventName =
    joined.includes("comment") ||
    joined.includes("chat") ||
    joined.includes("message") ||
    typeRaw === "comment" ||
    typeRaw === "chat" ||
    typeRaw === "message";

  if (hasExplicitCommentSignalInEventName) {
    return "COMMENT";
  }

  if (hasExplicitGiftSignalInEventName) {
    return "GIFT";
  }

  if (platform === "tiktok") {
    if (hasCommentLikePayload && !hasGiftLikePayload) {
      return "COMMENT";
    }

    if (hasGiftLikePayload && !hasCommentLikePayload) {
      return "GIFT";
    }

    if (hasCommentLikePayload && hasGiftLikePayload) {
      if (isTikfinityGiftPayload(input, platform)) {
        return "GIFT";
      }

      if (hasMessageField) {
        return "COMMENT";
      }

      return "GIFT";
    }
  }

  if (hasCommentLikePayload) {
    return "COMMENT";
  }

  if (hasGiftLikePayload) {
    return "GIFT";
  }

  if (
    input.likeCount !== undefined ||
    input.likes !== undefined ||
    input.totalLikeCount !== undefined ||
    joined.includes("like") ||
    typeRaw === "like"
  ) {
    return "LIKE";
  }

  if (
    input.followCount !== undefined ||
    input.isFollower === true ||
    joined.includes("follow") ||
    typeRaw === "follow"
  ) {
    return "FOLLOW";
  }

  if (
    joined.includes("share") ||
    joined.includes("repost") ||
    typeRaw === "share" ||
    typeRaw === "repost" ||
    hasAnyOwn(input, [
      "shareCount",
      "totalShareCount",
      "shareType",
      "isShare"
    ]) ||
    hasPositiveNumber(input, ["shareCount", "totalShareCount", "shares"]) ||
    input.share === true
  ) {
    return "SHARE";
  }

  if (platform === "kick" && (input.content || input.message)) {
    return "COMMENT";
  }

  return "UNKNOWN";
}

function buildSupportPayload(input = {}) {
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
    toNumber(input.giftCount, NaN) ||
    1;

  const giftCount =
    toNumber(input.giftCount, NaN) ||
    repeatCount;

  const explicitTotalCoins =
    toNumber(input.totalCoins, NaN) ||
    toNumber(input.totalCoinValue, NaN) ||
    0;

  const totalCoins = explicitTotalCoins > 0 ? explicitTotalCoins : (coins * repeatCount);
  const giftValue =
    toNumber(input.giftValue, NaN) ||
    totalCoins ||
    coins;

  return {
    giftId: input.giftId ?? input.id ?? null,
    giftName: pickFirstString(input.giftName, input.gift, input.name, input.value1),
    coins,
    repeatCount,
    giftCount,
    giftValue,
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
    miaPoints: textLength > 0 ? 1.5 : 0,
    kojnozoutFeedDelta: 0
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

  if (eventType === "COMMENT" && normalized.message) {
    languageModule.attachLanguageToEvent(normalized);
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
  resolveStableUserId,
  buildSupportPayload,
  buildCommunityImpact,
  getExplicitIntent,
  sanitizeRawInput
};