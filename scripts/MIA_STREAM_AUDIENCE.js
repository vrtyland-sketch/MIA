"use strict";

const MANUAL_AUDIENCE_TTL_MS = 10 * 60 * 1000;
const SIGNAL_AUDIENCE_TTL_MS = 5 * 60 * 1000;
const MANUAL_SOURCES = new Set([
  "payload",
  "mod_command",
  "audience_endpoint"
]);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function extractViewerCountFromPayload(input = {}) {
  if (!input || typeof input !== "object") {
    return 0;
  }

  const nested = [
    input.audience,
    input.stats,
    input.stream,
    input.live,
    input.room,
    input.meta,
    input.raw
  ].filter((item) => item && typeof item === "object");

  const sources = [input, ...nested];

  for (const source of sources) {
    const count = pickFirstPositiveNumber(
      source.viewerCount,
      source.viewers,
      source.totalViewers,
      source.liveViewerCount,
      source.liveViewers,
      source.roomUserCount,
      source.roomUser,
      source.roomUsers,
      source.audienceCount,
      source.memberCount,
      source.onlineUserCount,
      source.userCount,
      source.currentViewers,
      source.viewer_count,
      source.total_viewers
    );

    if (count > 0) {
      return Math.round(count);
    }
  }

  return 0;
}

function isTikfinityPayload(input = {}) {
  if (!input || typeof input !== "object") {
    return false;
  }

  const platform = String(input.platform || "").toLowerCase();
  const source = String(input.source || "").toLowerCase();

  return Boolean(
    input.tikfinityUserId ||
      input.tikfinityUsername ||
      platform === "tiktok" ||
      source.includes("tikfinity")
  );
}

function parseNumericCommandParams(input = {}) {
  const raw = String(input.commandParams ?? "").trim();
  if (!/^\d+$/.test(raw)) {
    return 0;
  }

  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function estimateFromTikfinitySignals(input = {}) {
  if (!isTikfinityPayload(input)) {
    return 0;
  }

  const burst = pickFirstPositiveNumber(
    input.likeCount,
    input.likes,
    input.like_count
  );
  const total = pickFirstPositiveNumber(
    input.totalLikeCount,
    input.total_likes,
    input.totalLikes
  );

  if (burst >= 100) {
    return Math.min(800, burst * 3);
  }
  if (burst >= 50) {
    return Math.min(400, burst * 2);
  }
  if (burst >= 15) {
    return Math.max(30, burst + 15);
  }
  if (burst >= 5) {
    return Math.max(20, burst + 10);
  }

  if (total >= 50000) {
    return 500;
  }
  if (total >= 10000) {
    return 200;
  }
  if (total >= 2000) {
    return 75;
  }
  if (total >= 500) {
    return 35;
  }
  if (total >= 100) {
    return 20;
  }
  if (total > 0) {
    return 12;
  }

  return 0;
}

function isManualAudienceFresh(audience = {}) {
  if (!audience || !MANUAL_SOURCES.has(audience.source)) {
    return false;
  }

  const updatedAt = toNumber(audience.updatedAt, 0);
  if (updatedAt <= 0) {
    return false;
  }

  return Date.now() - updatedAt <= MANUAL_AUDIENCE_TTL_MS;
}

function isSignalAudienceFresh(audience = {}) {
  if (!audience || audience.source !== "tikfinity_signals") {
    return false;
  }

  const updatedAt = toNumber(audience.updatedAt, 0);
  if (updatedAt <= 0) {
    return false;
  }

  return Date.now() - updatedAt <= SIGNAL_AUDIENCE_TTL_MS;
}

function estimateActiveAudience(streamState = {}) {
  const activity = streamState?.userActivity || {};
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  let active = 0;

  for (const entry of Object.values(activity)) {
    if (toNumber(entry?.lastSeenAt, 0) >= now - windowMs) {
      active += 1;
    }
  }

  if (active > 0) {
    return Math.max(active + 3, active * 4);
  }

  const communityUsers = Object.keys(streamState?.community?.activeUsers || {}).length;
  if (communityUsers > 0) {
    return Math.max(communityUsers + 2, communityUsers * 3);
  }

  return 0;
}

function resolveAudienceCount(input = {}, streamState = {}) {
  const storedAudience = streamState?.audience || {};
  const explicit = extractViewerCountFromPayload(input);
  const commandMod = parseNumericCommandParams(input);
  const storedCount = toNumber(storedAudience.viewerCount, 0);
  const tikfinityEstimate = estimateFromTikfinitySignals(input);
  const estimated = estimateActiveAudience(streamState);

  if (explicit > 0) {
    const source =
      input.source === "audience_endpoint"
        ? "audience_endpoint"
        : input.source === "mod_command"
          ? "mod_command"
          : "payload";

    return {
      viewerCount: explicit,
      source
    };
  }

  if (commandMod > 0) {
    return {
      viewerCount: commandMod,
      source: "mod_command"
    };
  }

  if (isManualAudienceFresh(storedAudience) && storedCount > 0) {
    return {
      viewerCount: storedCount,
      source: storedAudience.source
    };
  }

  if (tikfinityEstimate > 0) {
    return {
      viewerCount: tikfinityEstimate,
      source: "tikfinity_signals"
    };
  }

  if (isSignalAudienceFresh(storedAudience) && storedCount > 0) {
    return {
      viewerCount: storedCount,
      source: "tikfinity_signals"
    };
  }

  if (estimated > 0) {
    return {
      viewerCount: estimated,
      source: "estimated_activity"
    };
  }

  return {
    viewerCount: 15,
    source: "default_small_stream"
  };
}

function updateStreamAudience(streamState, input = {}) {
  const safeState = streamState && typeof streamState === "object" ? streamState : {};

  if (!safeState.audience || typeof safeState.audience !== "object") {
    safeState.audience = {};
  }

  const resolved = resolveAudienceCount(input, safeState);

  safeState.audience.viewerCount = resolved.viewerCount;
  safeState.audience.source = resolved.source;
  safeState.audience.updatedAt = Date.now();

  const likeCount = pickFirstPositiveNumber(input.likeCount, input.likes, input.like_count);
  const totalLikeCount = pickFirstPositiveNumber(
    input.totalLikeCount,
    input.total_likes,
    input.totalLikes
  );

  if (likeCount > 0) {
    safeState.audience.lastLikeCount = likeCount;
  }
  if (totalLikeCount > 0) {
    safeState.audience.lastTotalLikeCount = totalLikeCount;
  }

  return safeState;
}

function applyAudienceUpdate(streamState, input = {}) {
  const safeState = streamState && typeof streamState === "object" ? streamState : {};

  if (!safeState.audience || typeof safeState.audience !== "object") {
    safeState.audience = {};
  }

  const viewerCount =
    extractViewerCountFromPayload(input) || parseNumericCommandParams(input);

  if (viewerCount <= 0) {
    return {
      ok: false,
      error: "viewerCount must be a positive number",
      state: safeState
    };
  }

  const rounded = Math.round(viewerCount);
  const source =
    input.source === "mod_command" ? "mod_command" : "audience_endpoint";

  safeState.audience.viewerCount = rounded;
  safeState.audience.source = source;
  safeState.audience.platform = String(input.platform || "tiktok").toLowerCase();
  safeState.audience.updatedAt = Date.now();

  return {
    ok: true,
    audience: { ...safeState.audience },
    state: safeState
  };
}

module.exports = {
  MANUAL_AUDIENCE_TTL_MS,
  extractViewerCountFromPayload,
  estimateFromTikfinitySignals,
  estimateActiveAudience,
  resolveAudienceCount,
  updateStreamAudience,
  applyAudienceUpdate
};
