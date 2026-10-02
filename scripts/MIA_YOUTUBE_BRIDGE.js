"use strict";

/**
 * YouTube Live Chat → MIA /ingest (adapter only).
 * Chat-only — no Super Chat / monetization mapping into gift lane.
 * Does not touch economy, overlays, Genesis, or video queues.
 */

const axios = require("axios");

const YT_API = "https://www.googleapis.com/youtube/v3";

const ACTIVE = {
  timer: null,
  started: false,
  closedByUser: false,
  inFlight: false,
  pageToken: "",
  liveChatId: "",
  dedupe: new Map(),
  lastConfig: null
};

function log(...args) {
  console.log("[MIA_YOUTUBE_BRIDGE]", ...args);
}

function warn(...args) {
  console.warn("[MIA_YOUTUBE_BRIDGE]", ...args);
}

function error(...args) {
  console.error("[MIA_YOUTUBE_BRIDGE]", ...args);
}

function safeString(v, fb = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fb;
}

function pruneDedupe(now = Date.now()) {
  for (const [key, exp] of ACTIVE.dedupe.entries()) {
    if (exp <= now) ACTIVE.dedupe.delete(key);
  }
}

function hasDelivered(key) {
  if (!key) return false;
  pruneDedupe();
  return ACTIVE.dedupe.has(key);
}

function rememberDedupe(key, ttlMs = 120_000) {
  if (!key) return false;
  const now = Date.now();
  pruneDedupe(now);
  ACTIVE.dedupe.set(key, now + ttlMs);
  return true;
}

async function postToIngest(ingestUrl, payload, headers = {}) {
  await axios.post(ingestUrl, payload, {
    timeout: 7000,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

async function resolveLiveChatId(config = {}) {
  const explicit = safeString(config.liveChatId);
  if (explicit) return explicit;

  const videoId = safeString(config.videoId);
  const apiKey = safeString(config.apiKey);
  if (!videoId || !apiKey) return null;

  const res = await axios.get(`${YT_API}/videos`, {
    params: {
      part: "liveStreamingDetails",
      id: videoId,
      key: apiKey
    },
    timeout: 10000
  });
  const details = res.data?.items?.[0]?.liveStreamingDetails || {};
  return safeString(details.activeLiveChatId) || null;
}

function mapChatItemToIngest(item = {}) {
  const snippet = item.snippet || {};
  const author = item.authorDetails || {};
  const text =
    safeString(snippet.displayMessage) ||
    safeString(snippet.textMessageDetails?.messageText);
  if (!text) return null;

  // Explicitly skip paid / gift-like message types — protect frozen gift pipeline
  const type = safeString(snippet.type).toLowerCase();
  if (
    type.includes("superchat") ||
    type.includes("supersticker") ||
    type.includes("membership") ||
    type.includes("gift")
  ) {
    return null;
  }

  const userId = safeString(author.channelId);
  const nickname = safeString(author.displayName);
  const username = nickname || userId;

  return {
    source: "youtube_live_chat",
    provider: "youtube",
    platform: "youtube",
    type: "comment",
    eventType: "comment",
    rawType: "youtube.liveChat.message",
    message: text,
    content: text,
    text,
    comment: text,
    messageId: safeString(item.id),
    username,
    nickname,
    userId,
    user: {
      userId,
      username,
      nickname,
      avatarUrl: safeString(author.profileImageUrl)
    },
    liveChatId: ACTIVE.liveChatId || null
  };
}

async function pollOnce(config = {}, options = {}) {
  if (ACTIVE.inFlight) {
    return { ok: false, skipped: true, reason: "in_flight" };
  }

  const { onEvent, ingestUrl, ingestSecret, fetchPage } = options;
  const apiKey = safeString(config.apiKey);
  const liveChatId = ACTIVE.liveChatId || safeString(config.liveChatId);
  if (!apiKey || !liveChatId) {
    return { ok: false, skipped: false, reason: "not_ready" };
  }

  ACTIVE.inFlight = true;
  const pageToken = ACTIVE.pageToken || "";
  try {
    const res =
      typeof fetchPage === "function"
        ? await fetchPage({ pageToken, liveChatId, apiKey })
        : await axios.get(`${YT_API}/liveChat/messages`, {
            params: {
              liveChatId,
              part: "snippet,authorDetails",
              maxResults: 50,
              pageToken: pageToken || undefined,
              key: apiKey
            },
            timeout: 12000,
            validateStatus: () => true
          });

    if (res.status >= 400) {
      warn("poll failed", res.status, res.data?.error?.message || res.data);
      return { ok: false, skipped: false, reason: "http_error", status: res.status };
    }

    const nextPageToken = safeString(res.data?.nextPageToken);
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    for (const item of items) {
      const id = safeString(item.id);
      if (!id || hasDelivered(id)) continue;

      const payload = mapChatItemToIngest(item);
      if (!payload) continue;

      const headers = ingestSecret ? { "x-mia-ingest-secret": ingestSecret } : {};
      if (typeof onEvent === "function") {
        await onEvent(payload);
      } else {
        await postToIngest(ingestUrl, payload, headers);
      }

      rememberDedupe(id);
    }

    ACTIVE.pageToken = nextPageToken || ACTIVE.pageToken;
    return { ok: true, skipped: false, pageToken: ACTIVE.pageToken };
  } finally {
    ACTIVE.inFlight = false;
  }
}

function getYouTubePollSnapshot() {
  const now = Date.now();
  return {
    pageToken: ACTIVE.pageToken,
    inFlight: ACTIVE.inFlight === true,
    dedupe: [...ACTIVE.dedupe.entries()].map(([id, expiresAt]) => ({
      id,
      expiresAt,
      ttlRemainingMs: expiresAt - now
    }))
  };
}

function resetYouTubePollState(seed = {}) {
  ACTIVE.pageToken = safeString(seed.pageToken);
  ACTIVE.liveChatId = safeString(seed.liveChatId);
  ACTIVE.dedupe.clear();
  ACTIVE.inFlight = false;
  ACTIVE.closedByUser = false;
}

function stopYouTubeBridge() {
  ACTIVE.closedByUser = true;
  if (ACTIVE.timer) {
    clearInterval(ACTIVE.timer);
    ACTIVE.timer = null;
  }
  ACTIVE.started = false;
  log("stopped");
  return { ok: true };
}

async function startYouTubeBridge(options = {}) {
  const config = options.config || options || {};
  if (config.enabled === false) {
    log("disabled (youtube.enabled=false)");
    return { ok: false, reason: "disabled" };
  }

  const apiKey = safeString(config.apiKey);
  if (!apiKey) {
    warn("Missing YOUTUBE_API_KEY");
    return { ok: false, reason: "missing_api_key" };
  }

  let liveChatId = null;
  try {
    liveChatId = await resolveLiveChatId(config);
  } catch (err) {
    error("resolveLiveChatId failed:", err.message);
    return { ok: false, reason: "resolve_failed", error: err.message };
  }

  if (!liveChatId) {
    warn("Missing YOUTUBE_LIVE_CHAT_ID or resolvable YOUTUBE_VIDEO_ID");
    return { ok: false, reason: "missing_live_chat_id" };
  }

  if (ACTIVE.started) stopYouTubeBridge();
  ACTIVE.closedByUser = false;
  ACTIVE.liveChatId = liveChatId;
  ACTIVE.pageToken = "";
  ACTIVE.lastConfig = config;
  ACTIVE.started = true;

  const pollMs = Math.max(2500, Number(config.pollMs) || 4000);
  const ctx = {
    onEvent: options.onEvent,
    ingestUrl: safeString(config.ingestUrl, "http://127.0.0.1:3000/ingest"),
    ingestSecret: safeString(config.ingestSecret)
  };

  log("starting chat-only poll", { liveChatId, pollMs });
  const tick = () => {
    if (ACTIVE.closedByUser) return;
    pollOnce(config, ctx).catch((err) => error("poll error:", err.message));
  };
  tick();
  ACTIVE.timer = setInterval(tick, pollMs);
  return { ok: true, liveChatId, pollMs, chatOnly: true };
}

function start(options) {
  return startYouTubeBridge(options);
}

function stop() {
  return stopYouTubeBridge();
}

module.exports = {
  startYouTubeBridge,
  stopYouTubeBridge,
  start,
  stop,
  mapChatItemToIngest,
  resolveLiveChatId,
  pollOnce,
  getYouTubePollSnapshot,
  resetYouTubePollState
};
