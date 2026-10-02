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
  enabled: false,
  closedByUser: false,
  status: "",
  inFlight: false,
  pageToken: "",
  liveChatId: "",
  videoId: "",
  pollMs: 0,
  lastPollAt: 0,
  lastSuccessAt: 0,
  lastErrorAt: 0,
  lastError: "",
  lastHttpStatus: 0,
  lastDeliveredAt: 0,
  deliveredCount: 0,
  lastMessageId: "",
  lastMessageUser: "",
  lastMessagePreview: "",
  dedupe: new Map()
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

function haltPollLoop() {
  ACTIVE.closedByUser = true;
  if (ACTIVE.timer) {
    clearInterval(ACTIVE.timer);
    ACTIVE.timer = null;
  }
  ACTIVE.started = false;
}

function bridgeReady() {
  return (
    ACTIVE.enabled === true &&
    ACTIVE.started === true &&
    Boolean(ACTIVE.liveChatId) &&
    ACTIVE.timer != null &&
    ACTIVE.closedByUser !== true
  );
}

function notePollError(message, httpStatus = 0) {
  ACTIVE.lastErrorAt = Date.now();
  ACTIVE.lastError = safeString(message, "poll_error").slice(0, 180);
  ACTIVE.lastHttpStatus = Number(httpStatus) || 0;
}

function notePollSuccess(httpStatus = 200) {
  ACTIVE.lastSuccessAt = Date.now();
  ACTIVE.lastHttpStatus = Number(httpStatus) || 200;
  ACTIVE.lastError = "";
  ACTIVE.lastErrorAt = 0;
}

function recordDelivery(payload = {}) {
  ACTIVE.deliveredCount += 1;
  ACTIVE.lastDeliveredAt = Date.now();
  ACTIVE.lastMessageId = safeString(payload.messageId);
  ACTIVE.lastMessageUser = safeString(payload.username || payload.nickname || payload.userId);
  ACTIVE.lastMessagePreview = safeString(payload.message || payload.text || payload.content).slice(0, 80);
}

function conciseHttpError(res) {
  const msg = res?.data?.error?.message || res?.data?.error?.status || "";
  return safeString(typeof msg === "string" ? msg : "").slice(0, 180) || `http_${res?.status || "error"}`;
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
  ACTIVE.lastPollAt = Date.now();
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
      notePollError(conciseHttpError(res), res.status);
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

      recordDelivery(payload);
      rememberDedupe(id);
    }

    ACTIVE.pageToken = nextPageToken || ACTIVE.pageToken;
    notePollSuccess(res.status);
    return { ok: true, skipped: false, pageToken: ACTIVE.pageToken };
  } catch (err) {
    notePollError(err?.message, err?.response?.status);
    throw err;
  } finally {
    ACTIVE.inFlight = false;
  }
}

function getYouTubePollSnapshot() {
  const now = Date.now();
  const dedupe = [...ACTIVE.dedupe.entries()].map(([id, expiresAt]) => ({
    id,
    expiresAt,
    ttlRemainingMs: expiresAt - now
  }));
  return {
    enabled: ACTIVE.enabled === true,
    started: ACTIVE.started === true,
    ready: bridgeReady(),
    status: ACTIVE.status || "",
    inFlight: ACTIVE.inFlight === true,
    liveChatId: ACTIVE.liveChatId || "",
    videoId: ACTIVE.videoId || "",
    pollMs: ACTIVE.pollMs || 0,
    pageToken: ACTIVE.pageToken || "",
    lastPollAt: ACTIVE.lastPollAt || 0,
    lastSuccessAt: ACTIVE.lastSuccessAt || 0,
    lastErrorAt: ACTIVE.lastErrorAt || 0,
    lastError: ACTIVE.lastError || "",
    lastHttpStatus: ACTIVE.lastHttpStatus || 0,
    lastDeliveredAt: ACTIVE.lastDeliveredAt || 0,
    deliveredCount: ACTIVE.deliveredCount || 0,
    lastMessageId: ACTIVE.lastMessageId || "",
    lastMessageUser: ACTIVE.lastMessageUser || "",
    lastMessagePreview: ACTIVE.lastMessagePreview || "",
    dedupeSize: dedupe.length,
    dedupe
  };
}

function resetYouTubePollState(seed = {}) {
  haltPollLoop();
  ACTIVE.pageToken = safeString(seed.pageToken);
  ACTIVE.liveChatId = safeString(seed.liveChatId);
  ACTIVE.videoId = safeString(seed.videoId);
  ACTIVE.dedupe.clear();
  ACTIVE.inFlight = false;
  ACTIVE.closedByUser = false;
  ACTIVE.started = false;
  ACTIVE.enabled = false;
  ACTIVE.status = "";
  ACTIVE.pollMs = 0;
  ACTIVE.lastPollAt = 0;
  ACTIVE.lastSuccessAt = 0;
  ACTIVE.lastErrorAt = 0;
  ACTIVE.lastError = "";
  ACTIVE.lastHttpStatus = 0;
  ACTIVE.lastDeliveredAt = 0;
  ACTIVE.deliveredCount = 0;
  ACTIVE.lastMessageId = "";
  ACTIVE.lastMessageUser = "";
  ACTIVE.lastMessagePreview = "";
}

function stopYouTubeBridge() {
  haltPollLoop();
  ACTIVE.status = "stopped";
  log("stopped");
  return { ok: true };
}

async function startYouTubeBridge(options = {}) {
  const config = options.config || options || {};
  ACTIVE.videoId = safeString(config.videoId);
  haltPollLoop();

  if (config.enabled === false) {
    ACTIVE.enabled = false;
    ACTIVE.closedByUser = false;
    ACTIVE.status = "disabled";
    ACTIVE.liveChatId = "";
    ACTIVE.pollMs = 0;
    log("disabled (youtube.enabled=false)");
    return { ok: false, reason: "disabled" };
  }

  ACTIVE.enabled = true;
  const apiKey = safeString(config.apiKey);
  if (!apiKey) {
    ACTIVE.closedByUser = false;
    ACTIVE.status = "missing_api_key";
    ACTIVE.liveChatId = "";
    ACTIVE.pollMs = 0;
    warn("Missing YOUTUBE_API_KEY");
    return { ok: false, reason: "missing_api_key" };
  }

  let liveChatId = null;
  try {
    liveChatId = await resolveLiveChatId(config);
  } catch (err) {
    ACTIVE.closedByUser = false;
    ACTIVE.status = "resolve_failed";
    ACTIVE.liveChatId = "";
    ACTIVE.pollMs = 0;
    notePollError(err?.message || "resolve_failed", err?.response?.status);
    error("resolveLiveChatId failed:", err.message);
    return { ok: false, reason: "resolve_failed", error: err.message };
  }

  if (!liveChatId) {
    ACTIVE.closedByUser = false;
    ACTIVE.status = "missing_live_chat_id";
    ACTIVE.liveChatId = "";
    ACTIVE.pollMs = 0;
    warn("Missing YOUTUBE_LIVE_CHAT_ID or resolvable YOUTUBE_VIDEO_ID");
    return { ok: false, reason: "missing_live_chat_id" };
  }

  ACTIVE.closedByUser = false;
  ACTIVE.liveChatId = liveChatId;
  ACTIVE.pageToken = "";
  ACTIVE.started = true;
  ACTIVE.status = "running";

  const pollMs = Math.max(2500, Number(config.pollMs) || 4000);
  ACTIVE.pollMs = pollMs;
  const ctx = {
    onEvent: options.onEvent,
    ingestUrl: safeString(config.ingestUrl, "http://127.0.0.1:3000/ingest"),
    ingestSecret: safeString(config.ingestSecret),
    fetchPage: options.fetchPage
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
