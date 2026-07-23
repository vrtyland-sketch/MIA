"use strict";

/**
 * T0 community engagement — like / follow / share / comment → light XP + optional overlay ack.
 */

const giftSupporterProfile = require("./MIA_GIFT_SUPPORTER_PROFILE");

const T0_XP = {
  LIKE: 1,
  FOLLOW: 3,
  SHARE: 2,
  COMMENT: 1
};

const T0_EVENTS = new Set(["LIKE", "FOLLOW", "SHARE", "COMMENT"]);

const T0_FLYBY_STYLE = {
  FOLLOW: { accent: "#38d976", label: "Nový follower" },
  SHARE: { accent: "#ffb400", label: "Sdílení streamu" },
  LIKE: { accent: "#ff6090", label: "Like milestone" }
};

const ackCooldownMs = new Map();

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

function upper(value) {
  return safeString(value).toUpperCase();
}

function envFlag(name, fallback = "on") {
  const raw = safeString(process.env[name], fallback).toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

function resolveT0Xp(eventType = "", normalized = {}) {
  const type = upper(eventType);
  if (type === "COMMENT") {
    const text = safeString(normalized.message);
    return text.length > 20 ? 2 : T0_XP.COMMENT;
  }
  return toNumber(T0_XP[type], 0);
}

function isT0CommunityEvent(eventType = "") {
  return T0_EVENTS.has(upper(eventType));
}

function wasRecentAck(userKey = "", eventType = "", windowMs = 60000) {
  const key = `${userKey}:${upper(eventType)}`;
  const last = toNumber(ackCooldownMs.get(key), 0);
  if (!last) return false;
  return nowTs() - last < windowMs;
}

function markAck(userKey = "", eventType = "") {
  ackCooldownMs.set(`${userKey}:${upper(eventType)}`, nowTs());
}

function shouldShowT0Overlay(eventType = "", userKey = "", supporter = {}) {
  if (!envFlag("MIA_T0_OVERLAY", "on")) {
    return false;
  }

  const type = upper(eventType);
  if (type === "COMMENT") {
    return false;
  }

  if (type === "FOLLOW") {
    return !wasRecentAck(userKey, type, 300000);
  }

  if (type === "SHARE") {
    return !wasRecentAck(userKey, type, 90000);
  }

  if (type === "LIKE") {
    const every = Math.max(0, toNumber(process.env.MIA_T0_LIKE_ACK_EVERY, 50));
    if (every <= 0) {
      return false;
    }
    const count = toNumber(supporter?.engagementCounts?.like, 0);
    return count > 0 && count % every === 0;
  }

  return false;
}

function buildT0OverlayPlan(eventType = "", normalized = {}, supporter = {}) {
  const type = upper(eventType);
  const userLabel = safeString(
    normalized?.user?.nickname ||
      normalized?.user?.username ||
      normalized?.nickname ||
      normalized?.username,
    "Divák"
  );

  if (type === "FOLLOW") {
    return {
      owner: "mia",
      route: "community",
      stage: "t0_follow",
      title: "Nový follower",
      text: `Vítej v komunitě, ${userLabel}!`,
      subtext: "T0 · follow",
      mood: "warm",
      holdMs: 5200,
      user: userLabel
    };
  }

  if (type === "SHARE") {
    return {
      owner: "mia",
      route: "community",
      stage: "t0_share",
      title: "Sdílení streamu",
      text: `${userLabel} právě sdílí stream — děkujeme!`,
      subtext: "T0 · share",
      mood: "happy",
      holdMs: 4800,
      user: userLabel
    };
  }

  if (type === "LIKE") {
    const count = toNumber(supporter?.engagementCounts?.like, 0);
    return {
      owner: "mia",
      route: "community",
      stage: "t0_like_milestone",
      title: "Like milestone",
      text: `${userLabel} — ${count} liků! Děkujeme za podporu.`,
      subtext: "T0 · like",
      mood: "warm",
      holdMs: 4200,
      user: userLabel
    };
  }

  return null;
}

function buildT0FlybyMoment(eventType = "", normalized = {}, supporter = {}) {
  if (!envFlag("MIA_T0_FLYBY", "on")) {
    return null;
  }

  const type = upper(eventType);
  if (!["FOLLOW", "SHARE", "LIKE"].includes(type)) {
    return null;
  }

  const style = T0_FLYBY_STYLE[type] || T0_FLYBY_STYLE.FOLLOW;
  const userLabel = safeString(
    normalized?.user?.nickname ||
      normalized?.user?.username ||
      normalized?.nickname ||
      normalized?.username,
    "Divák"
  );

  return {
    eventType: type,
    userLabel,
    avatarUrl: safeString(
      normalized?.user?.avatarUrl ||
        normalized?.user?.avatar ||
        normalized?.avatarUrl
    ) || null,
    accent: style.accent,
    label: style.label,
    subtext:
      type === "LIKE"
        ? `${toNumber(supporter?.engagementCounts?.like, 0)} liků`
        : userLabel,
    holdMs: type === "LIKE" ? 4200 : 4800
  };
}

function processT0Engagement(ctx = {}) {
  const eventType = upper(ctx.eventType);
  if (!isT0CommunityEvent(eventType)) {
    return { state: ctx.state, recorded: null, overlayPlan: null, flybyPlan: null, skipped: true };
  }

  const normalized = ctx.normalized && typeof ctx.normalized === "object" ? ctx.normalized : {};
  const xpAward = resolveT0Xp(eventType, normalized);

  if (typeof giftSupporterProfile.recordCommunityEngagement !== "function") {
    return { state: ctx.state, recorded: null, overlayPlan: null, flybyPlan: null, skipped: true };
  }

  const recorded = giftSupporterProfile.recordCommunityEngagement(ctx.state, normalized, {
    eventType,
    xpAward
  });

  const userKey =
    typeof giftSupporterProfile.resolveSupporterKey === "function"
      ? giftSupporterProfile.resolveSupporterKey(normalized)
      : safeString(normalized?.user?.nickname, "unknown");

  let overlayPlan = null;
  let flybyPlan = null;
  if (shouldShowT0Overlay(eventType, userKey, recorded.supporter)) {
    overlayPlan = buildT0OverlayPlan(eventType, normalized, recorded.supporter);
    flybyPlan = buildT0FlybyMoment(eventType, normalized, recorded.supporter);
    if (overlayPlan) {
      markAck(userKey, eventType);
    }
  }

  return {
    state: recorded.state,
    recorded,
    overlayPlan,
    flybyPlan,
    eventType,
    xpAward,
    userKey,
    skipped: false
  };
}

function resetT0AckCooldowns() {
  ackCooldownMs.clear();
}

module.exports = {
  T0_XP,
  T0_EVENTS,
  resolveT0Xp,
  isT0CommunityEvent,
  shouldShowT0Overlay,
  buildT0OverlayPlan,
  buildT0FlybyMoment,
  processT0Engagement,
  resetT0AckCooldowns
};
