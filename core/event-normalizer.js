"use strict";

/**
 * Phase 1 — unified internal event shape (roadmap §2).
 * Adapts TikFinity / Kick / test / legacy normalized payloads → common contract.
 *
 * Internal events may carry coins for mapping; overlay must only use miaPoints.
 */

const crypto = require("crypto");
const path = require("path");

const giftTiers = safeRequire(path.join(__dirname, "..", "scripts", "MIA_GIFT_TIERS"), {});
const platformNormalizer = safeRequire(
  path.join(__dirname, "..", "shared", "platform_normalizers", "normalize_event"),
  {}
);

const MIA_POINTS_PER_COIN = Number(giftTiers.MIA_POINTS_PER_COIN) || 7.5;

function safeRequire(modPath, fallback) {
  try {
    return require(modPath);
  } catch (_err) {
    return fallback;
  }
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
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function coinsToMiaPoints(coins, count = 1) {
  const unit = Math.max(0, toNumber(coins, 0));
  const qty = Math.max(1, toNumber(count, 1));
  return unit * qty * MIA_POINTS_PER_COIN;
}

function makeEventId(parts = {}) {
  if (typeof crypto.randomUUID === "function") {
    return `event-${crypto.randomUUID()}`;
  }
  const base = JSON.stringify(parts);
  const hash = crypto.createHash("sha1").update(base).digest("hex").slice(0, 16);
  return `event-${hash}`;
}

function normalizeType(raw) {
  const t = safeString(raw).toLowerCase();
  if (t === "gift" || t === "support" || t === "donation" || t === "tip") return "gift";
  if (t === "comment" || t === "chat" || t === "message") return "chat";
  if (t === "like") return "like";
  if (t === "follow") return "follow";
  if (t === "share" || t === "repost") return "share";
  if (t === "unknown") return "unknown";
  return t || "unknown";
}

function legacyTypeToRuntime(eventType) {
  const upper = safeString(eventType).toUpperCase();
  if (upper === "GIFT") return "gift";
  if (upper === "COMMENT") return "chat";
  if (upper === "LIKE") return "like";
  if (upper === "FOLLOW") return "follow";
  if (upper === "SHARE") return "share";
  return normalizeType(eventType);
}

function normalizePlatform(value) {
  const p = safeString(value).toLowerCase();
  if (p.includes("kick")) return "kick";
  if (p.includes("twitch")) return "twitch";
  if (p.includes("tiktok") || p.includes("tikfinity") || p === "test") return "tiktok";
  return p || "unknown";
}

function normalizeUser(input = {}) {
  const user = input.user && typeof input.user === "object" ? input.user : {};
  const id =
    user.id ??
    user.userId ??
    input.userId ??
    input.tikfinityUserId ??
    null;
  const name = pickFirstString(
    user.name,
    user.nickname,
    user.displayName,
    user.username,
    input.nickname,
    input.displayName,
    input.username,
    input.uniqueId,
    "Viewer"
  );
  const avatar = pickFirstString(
    user.avatar,
    user.avatarUrl,
    user.profilePictureUrl,
    input.avatarUrl,
    input.profilePictureUrl
  );
  return {
    id: id != null && String(id).trim() ? String(id) : null,
    name,
    avatar: avatar || undefined
  };
}

function buildGiftBlock(input = {}, support = {}) {
  const giftName = pickFirstString(
    support.giftName,
    input.giftName,
    input.gift,
    support.gift?.name
  );
  const coins = Math.max(
    0,
    toNumber(
      support.coins ??
        support.totalCoins ??
        input.coins ??
        input.coinValue ??
        input.diamondCount,
      0
    )
  );
  const count = Math.max(
    1,
    toNumber(support.repeatCount ?? support.giftCount ?? input.repeatCount ?? input.count, 1)
  );
  const totalCoins = Math.max(
    0,
    toNumber(support.totalCoins, NaN) || coins * count
  );
  const explicitMia = toNumber(support.miaPoints ?? input.miaPoints, NaN);
  const miaPoints = Number.isFinite(explicitMia) && explicitMia >= 0
    ? explicitMia
    : coinsToMiaPoints(coins > 0 ? coins : totalCoins / count, count);

  if (!giftName && totalCoins <= 0 && miaPoints <= 0) {
    return undefined;
  }

  return {
    name: giftName || "Gift",
    coins: coins > 0 ? coins : Math.max(0, Math.round(totalCoins / count)),
    totalCoins,
    miaPoints,
    count,
    tier: support.streamTier || support.tier || support.coinTier || undefined,
    giftKey: support.giftKey || undefined
  };
}

/**
 * Convert raw platform payload → Phase 1 runtime event.
 * Prefer live gift path: call after legacy normalize + support enrich when available.
 */
function normalizeToMiaEvent(rawInput = {}, options = {}) {
  let legacy = null;
  if (options.skipPlatformNormalize === true) {
    legacy = rawInput && typeof rawInput === "object" ? rawInput : {};
  } else if (typeof platformNormalizer.normalizeEvent === "function") {
    legacy = platformNormalizer.normalizeEvent(rawInput);
  } else {
    legacy = rawInput && typeof rawInput === "object" ? rawInput : {};
  }

  return fromLegacyNormalized(legacy, options);
}

/**
 * Adapter for the live ingest path: takes already-normalized (+ enriched) events.
 * Preserves coins→miaPoints mapping from support resolver when present.
 */
function fromLegacyNormalized(normalized = {}, options = {}) {
  const support =
    normalized.support && typeof normalized.support === "object"
      ? normalized.support
      : {};
  const type = legacyTypeToRuntime(
    normalized.eventType || normalized.type || options.type
  );
  const platform = normalizePlatform(
    normalized.platform || normalized.source || options.platform
  );
  const user = normalizeUser(normalized);
  const timestamp = toNumber(
    normalized.tsUnixMs ?? normalized.ts ?? normalized.timestamp,
    Date.now()
  );
  const id =
    safeString(normalized.eventId) ||
    safeString(options.id) ||
    makeEventId({ platform, type, user: user.id || user.name, timestamp });

  const gift = type === "gift" ? buildGiftBlock(normalized, support) : undefined;
  const text =
    type === "chat" || type === "comment"
      ? pickFirstString(normalized.message, normalized.content, normalized.text)
      : pickFirstString(normalized.message, normalized.content, normalized.text) ||
        undefined;

  const miaPoints =
    gift && Number.isFinite(gift.miaPoints)
      ? gift.miaPoints
      : toNumber(support.miaPoints ?? normalized.miaPoints ?? normalized.communityImpact?.miaPoints, 0);

  const event = {
    id,
    platform,
    type,
    user: {
      id: user.id,
      name: user.name,
      ...(user.avatar ? { avatar: user.avatar } : {})
    },
    timestamp,
    miaPoints
  };

  if (gift) event.gift = gift;
  if (text) event.text = text;

  // Internal-only: keep legacy pointers for gradual re-export (not for overlay).
  if (options.includeLegacy === true) {
    event._legacy = {
      eventId: normalized.eventId || null,
      eventType: normalized.eventType || null,
      route: normalized.route || null,
      supportTier: support.streamTier || support.tier || null
    };
  }

  return event;
}

/** Overlay-safe projection — never exposes coins. */
function toOverlaySafe(event = {}) {
  const gift = event.gift
    ? {
        name: event.gift.name,
        miaPoints: event.gift.miaPoints,
        count: event.gift.count,
        tier: event.gift.tier,
        giftKey: event.gift.giftKey
      }
    : undefined;

  return {
    id: event.id,
    platform: event.platform,
    type: event.type,
    user: event.user,
    timestamp: event.timestamp,
    miaPoints: event.miaPoints,
    ...(gift ? { gift } : {}),
    ...(event.text ? { text: event.text } : {})
  };
}

module.exports = {
  MIA_POINTS_PER_COIN,
  coinsToMiaPoints,
  normalizeToMiaEvent,
  fromLegacyNormalized,
  toOverlaySafe,
  normalizeType,
  normalizePlatform
};
