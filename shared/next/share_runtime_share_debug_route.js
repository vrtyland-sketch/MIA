"use strict";

/**
 * shared/next/share_runtime_share_debug_route.js
 *
 * ČISTÝ DEBUG ROUTE MODUL PRO NOVOU SHARE ARCHITEKTURU
 *
 * DŮLEŽITÉ:
 * - tohle samo nic nemountuje
 * - tohle samo nezasahuje do live /ingest
 * - je to bezpečný mezikrok pro testování nové share větve
 *
 * Později:
 * - může se namountovat do indexu
 * - ale až ve chvíli, kdy budeš chtít preview endpoint opravdu zapnout
 */

const path = require("path");
const { buildSharePreview } = require(path.join(__dirname, "share_runtime_share_preview"));

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "y" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "n" ||
    normalized === "off"
  ) {
    return false;
  }

  return fallback;
}

function clone(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function buildMergedInput(body = {}, query = {}) {
  return {
    ...(body && typeof body === "object" ? body : {}),
    ...(query && typeof query === "object" ? query : {})
  };
}

function normalizeUserFromInput(input = {}) {
  const userId =
    input.userId ??
    input.userid ??
    input.user_id ??
    input.id ??
    null;

  const username =
    safeString(input.username) ||
    safeString(input.userName) ||
    safeString(input.uniqueId) ||
    "";

  const nickname =
    safeString(input.nickname) ||
    safeString(input.displayName) ||
    safeString(input.name) ||
    username ||
    "";

  const avatarUrl =
    safeString(input.avatarUrl) ||
    safeString(input.avatar) ||
    safeString(input.profilePictureUrl) ||
    "";

  return {
    userId,
    username,
    nickname,
    avatarUrl
  };
}

function buildSyntheticShareEvent(input = {}) {
  const user = normalizeUserFromInput(input);

  return {
    eventId:
      safeString(input.eventId) ||
      `debug_share_${Date.now()}`,
    traceId:
      safeString(input.traceId) ||
      `debug_trace_${Date.now()}`,
    platform: safeString(input.platform, "tiktok"),
    source: safeString(input.source, "share_debug_route"),
    route: "community",
    eventType: "SHARE",
    type: "share",
    rawType: safeString(input.rawType, "debug_share"),
    message: safeString(input.message),
    content: safeString(input.content || input.message),
    comment: safeString(input.comment || input.message),
    user,
    communityImpact: {
      moodDelta: toNumber(input.moodDelta, 1),
      engagementDelta: toNumber(input.engagementDelta, 3),
      kojnozoutFeedDelta: toNumber(input.kojnozoutFeedDelta, 1)
    },
    raw: clone(input, {})
  };
}

function buildSyntheticStreamState(input = {}, fallbackState = {}) {
  const state = clone(fallbackState, {}) || {};

  if (!state.userActivity || typeof state.userActivity !== "object") {
    state.userActivity = {};
  }

  const user = normalizeUserFromInput(input);

  const userKey =
    safeString(user.userId) ||
    safeString(user.username) ||
    safeString(user.nickname) ||
    "debug-user";

  const existing =
    state.userActivity[userKey] &&
    typeof state.userActivity[userKey] === "object"
      ? clone(state.userActivity[userKey], {})
      : {};

  const userShareCount = toNumber(
    input.userShareCount,
    existing.shareCount || 1
  );

  state.userActivity[userKey] = {
    ...existing,
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
    shareCount: userShareCount
  };

  if (toBoolean(input.injectSyntheticCommunity, true)) {
    const totalCommunityShares = toNumber(input.totalCommunityShares, userShareCount);

    if (totalCommunityShares > userShareCount) {
      state.userActivity.__share_debug_community__ = {
        userId: "__share_debug_community__",
        username: "share-debug-community",
        nickname: "share-debug-community",
        shareCount: Math.max(0, totalCommunityShares - userShareCount)
      };
    }
  }

  return state;
}

function buildSyntheticKojnozoutState(input = {}, fallbackState = {}) {
  const state = clone(fallbackState, {}) || {};

  state.bowlPercent = toNumber(
    input.bowlPercent,
    toNumber(state.bowlPercent, 0)
  );

  state.mood = safeString(
    input.mood,
    safeString(state.mood, "neutral")
  );

  return state;
}

function buildPreviewInput(httpInput = {}, options = {}) {
  const baseStreamState =
    typeof options.getStreamState === "function"
      ? clone(options.getStreamState(), {})
      : clone(options.streamState, {});

  const baseKojnozoutState =
    typeof options.getKojnozoutState === "function"
      ? clone(options.getKojnozoutState(), {})
      : clone(options.kojnozoutState, {});

  const event = buildSyntheticShareEvent(httpInput);
  const streamState = buildSyntheticStreamState(httpInput, baseStreamState);
  const kojnozoutState = buildSyntheticKojnozoutState(httpInput, baseKojnozoutState);

  return {
    event,
    streamState,
    kojnozoutState
  };
}

function mountSharePreviewDebugRoute(app, options = {}) {
  if (!app || typeof app.get !== "function") {
    throw new Error("mountSharePreviewDebugRoute requires express app");
  }

  const routePath = safeString(
    options.routePath,
    "/debug/next/share-preview"
  );

  const handler = (req, res) => {
    try {
      const httpInput = buildMergedInput(req.body || {}, req.query || {});
      const previewInput = buildPreviewInput(httpInput, options);
      const preview = buildSharePreview(previewInput);

      return res.json({
        ok: true,
        route: routePath,
        preview
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        route: routePath,
        error: err?.message || "share_preview_failed"
      });
    }
  };

  app.get(routePath, handler);

  if (typeof app.post === "function") {
    app.post(routePath, handler);
  }

  return {
    ok: true,
    routePath
  };
}

module.exports = {
  mountSharePreviewDebugRoute,
  buildPreviewInput,
  buildSyntheticShareEvent,
  buildSyntheticStreamState,
  buildSyntheticKojnozoutState
};