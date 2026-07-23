"use strict";

/**
 * Twitch EventSub WebSocket -> MIA /ingest
 * (stejny vzor jako MIA_KICK_BRIDGE.js)
 */

const axios = require("axios");

let WebSocketImpl = null;
try {
  WebSocketImpl = require("ws");
} catch (_e) {
  WebSocketImpl = null;
}

const TWITCH_WS = "wss://eventsub.wss.twitch.tv/ws";
const HELIX = "https://api.twitch.tv/helix";

const ACTIVE = {
  ws: null,
  sessionId: null,
  reconnectUrl: null,
  started: false,
  closedByUser: false,
  reconnectTimer: null,
  lastConfig: null,
  subscriptions: [],
  dedupe: new Map()
};

const PHASE1_SUBSCRIPTIONS = [
  { type: "channel.chat.message", version: "1", conditionKey: "broadcaster_user_id" },
  { type: "channel.follow", version: "2", conditionKey: "broadcaster_user_id" },
  { type: "channel.subscribe", version: "1", conditionKey: "broadcaster_user_id" },
  { type: "channel.subscription.gift", version: "1", conditionKey: "broadcaster_user_id" },
  { type: "channel.cheer", version: "1", conditionKey: "broadcaster_user_id" },
  { type: "channel.raid", version: "1", conditionKey: "to_broadcaster_user_id" },
  { type: "stream.online", version: "1", conditionKey: "broadcaster_user_id" },
  { type: "stream.offline", version: "1", conditionKey: "broadcaster_user_id" }
];

function log(...args) {
  console.log("[MIA_TWITCH_BRIDGE]", ...args);
}

function warn(...args) {
  console.warn("[MIA_TWITCH_BRIDGE]", ...args);
}

function error(...args) {
  console.error("[MIA_TWITCH_BRIDGE]", ...args);
}

function safeString(v, fb = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fb;
}

function rememberDedupe(key, ttlMs = 60_000) {
  const now = Date.now();
  for (const [k, exp] of ACTIVE.dedupe.entries()) {
    if (exp <= now) ACTIVE.dedupe.delete(k);
  }
  if (!key || ACTIVE.dedupe.has(key)) return true;
  ACTIVE.dedupe.set(key, now + ttlMs);
  return false;
}

async function postToIngest(ingestUrl, payload, headers = {}) {
  await axios.post(ingestUrl, payload, {
    timeout: 7000,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

function helixHeaders(config = {}) {
  return {
    "Client-Id": safeString(config.clientId),
    Authorization: `Bearer ${safeString(config.accessToken)}`,
    "Content-Type": "application/json"
  };
}

async function resolveBroadcasterId(config = {}) {
  if (safeString(config.broadcasterId)) return config.broadcasterId;
  const login = safeString(config.channelLogin);
  if (!login) return null;

  const res = await axios.get(`${HELIX}/users`, {
    params: { login },
    headers: helixHeaders(config),
    timeout: 8000
  });
  const user = res.data?.data?.[0];
  return user?.id || null;
}

function buildUserFromTwitch(event = {}) {
  const chatter = event.chatter || event.user || event.from_broadcaster_user || {};
  return {
    userId: chatter.user_id || event.user_id || event.userId || null,
    username: safeString(chatter.login || chatter.user_login || event.user_login),
    nickname: safeString(chatter.user_name || chatter.display_name || event.user_name),
    avatarUrl: ""
  };
}

function basePayload(extra = {}) {
  return {
    source: "twitch_eventsub",
    provider: "twitch",
    platform: "twitch",
    ...extra
  };
}

function mapEventSubToIngest(subscriptionType, event = {}) {
  const user = buildUserFromTwitch(event);

  switch (subscriptionType) {
    case "channel.chat.message": {
      const message = safeString(event.message?.text || event.message);
      if (!message) return null;
      return basePayload({
        type: "comment",
        eventType: "comment",
        rawType: subscriptionType,
        message,
        content: message,
        text: message,
        comment: message,
        messageId: event.message_id || null,
        username: user.username,
        nickname: user.nickname,
        userId: user.userId,
        user,
        channel: event.broadcaster_user_login || "",
        broadcasterId: event.broadcaster_user_id || null
      });
    }
    case "channel.follow":
      return basePayload({
        type: "follow",
        eventType: "follow",
        rawType: subscriptionType,
        username: user.username || safeString(event.user_login),
        nickname: user.nickname || safeString(event.user_name),
        userId: event.user_id || user.userId,
        user: {
          userId: event.user_id,
          username: event.user_login,
          nickname: event.user_name
        },
        followedAt: event.followed_at
      });
    case "channel.subscribe":
    case "channel.subscription.gift":
      return basePayload({
        type: "gift",
        eventType: "gift",
        rawType: subscriptionType,
        giftName: subscriptionType === "channel.subscription.gift" ? "gift_sub" : "sub",
        coins: Number(event.tier || 1) * 100,
        tier: event.tier,
        isGift: subscriptionType === "channel.subscription.gift",
        total: event.total,
        username: user.username,
        nickname: user.nickname,
        userId: user.userId,
        user
      });
    case "channel.cheer":
      return basePayload({
        type: "gift",
        eventType: "gift",
        rawType: subscriptionType,
        giftName: "bits",
        coins: Number(event.bits || 0),
        bits: Number(event.bits || 0),
        message: safeString(event.message),
        username: user.username || safeString(event.user_login),
        nickname: user.nickname || safeString(event.user_name),
        userId: event.user_id,
        user: {
          userId: event.user_id,
          username: event.user_login,
          nickname: event.user_name
        }
      });
    case "channel.raid":
      return basePayload({
        type: "share",
        eventType: "share",
        rawType: subscriptionType,
        shareType: "raid",
        viewers: Number(event.viewers || 0),
        username: safeString(event.from_broadcaster_user_login),
        nickname: safeString(event.from_broadcaster_user_name),
        userId: event.from_broadcaster_user_id,
        user: {
          userId: event.from_broadcaster_user_id,
          username: event.from_broadcaster_user_login,
          nickname: event.from_broadcaster_user_name
        }
      });
    case "stream.online":
    case "stream.offline":
      return basePayload({
        type: "meta",
        eventType: "meta",
        rawType: subscriptionType,
        streamOnline: subscriptionType === "stream.online",
        startedAt: event.started_at || null
      });
    default:
      return basePayload({
        type: "meta",
        eventType: "meta",
        rawType: subscriptionType,
        rawEvent: event
      });
  }
}

async function createEventSubSubscription(config, subDef, sessionId, broadcasterId) {
  const condition = {};
  if (subDef.conditionKey === "to_broadcaster_user_id") {
    condition.to_broadcaster_user_id = broadcasterId;
  } else {
    condition.broadcaster_user_id = broadcasterId;
  }
  if (subDef.type === "channel.chat.message") {
    condition.moderator_user_id = broadcasterId;
  }

  const body = {
    type: subDef.type,
    version: subDef.version,
    condition,
    transport: {
      method: "websocket",
      session_id: sessionId
    }
  };

  const res = await axios.post(`${HELIX}/eventsub/subscriptions`, body, {
    headers: helixHeaders(config),
    timeout: 10000,
    validateStatus: () => true
  });

  if (res.status >= 400) {
    warn(`Subscription ${subDef.type} failed:`, res.status, res.data?.message || res.data);
    return { ok: false, type: subDef.type, status: res.status, data: res.data };
  }

  log(`Subscribed: ${subDef.type}`);
  return { ok: true, type: subDef.type, data: res.data };
}

async function subscribeAll(config, sessionId, broadcasterId) {
  const results = [];
  for (const sub of PHASE1_SUBSCRIPTIONS) {
    try {
      results.push(await createEventSubSubscription(config, sub, sessionId, broadcasterId));
    } catch (err) {
      results.push({ ok: false, type: sub.type, error: err.message });
    }
  }
  ACTIVE.subscriptions = results;
  return results;
}

async function handleNotification(message, { ingestUrl, onEvent, ingestSecret }) {
  const subType = message?.metadata?.subscription_type;
  const event = message?.payload?.event;
  if (!subType || !event) return;

  const dedupeKey = message?.metadata?.message_id;
  if (rememberDedupe(dedupeKey)) return;

  const payload = mapEventSubToIngest(subType, event);
  if (!payload || payload.eventType === "meta") {
    log(`Meta event: ${subType}`);
    return;
  }

  const headers = ingestSecret ? { "x-mia-ingest-secret": ingestSecret } : {};

  if (typeof onEvent === "function") {
    await onEvent(payload);
    return;
  }

  await postToIngest(ingestUrl, payload, headers);
}

function connectWebSocket(config) {
  if (!WebSocketImpl) {
    return { ok: false, reason: "ws_not_installed" };
  }

  const wsUrl = ACTIVE.reconnectUrl || TWITCH_WS;
  log(`Connecting EventSub WS: ${wsUrl}`);

  const ws = new WebSocketImpl(wsUrl);
  ACTIVE.ws = ws;
  ACTIVE.started = true;

  ws.on("message", async (buf) => {
    try {
      const message = JSON.parse(buf.toString("utf8"));
      const type = message?.metadata?.message_type;

      if (type === "session_welcome") {
        ACTIVE.sessionId = message?.payload?.session?.id;
        ACTIVE.reconnectUrl = null;
        log(`Session welcome: ${ACTIVE.sessionId}`);
        const broadcasterId = await resolveBroadcasterId(config);
        if (!broadcasterId) {
          error("Missing broadcaster ID — set TWITCH_BROADCASTER_ID or TWITCH_CHANNEL_LOGIN");
          return;
        }
        await subscribeAll(config, ACTIVE.sessionId, broadcasterId);
        return;
      }

      if (type === "session_keepalive") return;

      if (type === "session_reconnect") {
        ACTIVE.reconnectUrl = message?.payload?.session?.reconnect_url || null;
        ws.close();
        return;
      }

      if (type === "notification") {
        await handleNotification(message, config);
        return;
      }

      if (type === "revocation") {
        warn("Subscription revoked:", message?.payload);
      }
    } catch (err) {
      error("WS message error:", err.message);
    }
  });

  ws.on("close", () => {
    ACTIVE.ws = null;
    ACTIVE.started = false;
    if (!ACTIVE.closedByUser) {
      if (ACTIVE.reconnectTimer) return;
      ACTIVE.reconnectTimer = setTimeout(() => {
        ACTIVE.reconnectTimer = null;
        connectWebSocket(config);
      }, 5000);
    }
  });

  ws.on("error", (err) => error("WS error:", err.message));

  return { ok: true, reason: "connecting" };
}

function stopTwitchBridge() {
  ACTIVE.closedByUser = true;
  if (ACTIVE.reconnectTimer) {
    clearTimeout(ACTIVE.reconnectTimer);
    ACTIVE.reconnectTimer = null;
  }
  if (ACTIVE.ws) {
    try {
      ACTIVE.ws.close();
    } catch (_e) {
      /* ignore */
    }
    ACTIVE.ws = null;
  }
  ACTIVE.started = false;
  log("Stopped");
}

async function start(options = {}) {
  const config = options?.config || {};
  const merged = {
    clientId: safeString(config.clientId || process.env.TWITCH_CLIENT_ID),
    accessToken: safeString(config.accessToken || process.env.TWITCH_ACCESS_TOKEN),
    broadcasterId: safeString(config.broadcasterId || process.env.TWITCH_BROADCASTER_ID),
    channelLogin: safeString(config.channelLogin || process.env.TWITCH_CHANNEL_LOGIN),
    ingestUrl: safeString(config.ingestUrl, "http://127.0.0.1:3000/ingest"),
    ingestSecret: safeString(config.ingestSecret || process.env.MIA_INGEST_SECRET),
    onEvent: typeof options?.onEvent === "function" ? options.onEvent : null
  };

  if (!merged.clientId || !merged.accessToken) {
    warn("Missing TWITCH_CLIENT_ID or TWITCH_ACCESS_TOKEN — run: npm run twitch:login");
    return { ok: false, reason: "missing_credentials" };
  }

  ACTIVE.closedByUser = false;
  ACTIVE.lastConfig = merged;
  return connectWebSocket(merged);
}

function stop() {
  return stopTwitchBridge();
}

function getTwitchBridgeStatus() {
  const ws = ACTIVE.ws;
  return {
    started: Boolean(ACTIVE.started),
    connected: Boolean(ws && ws.readyState === 1),
    sessionId: ACTIVE.sessionId,
    subscriptions: ACTIVE.subscriptions,
    channelLogin: safeString(ACTIVE.lastConfig?.channelLogin),
    ingestUrl: safeString(ACTIVE.lastConfig?.ingestUrl)
  };
}

function createTwitchWebhookBridge(app, { webhookPath = "/twitch/webhook", ingestUrl, onEvent } = {}) {
  if (!app?.post) throw new Error("express app required");

  app.post(webhookPath, async (req, res) => {
    const body = req.body || {};
    if (body.challenge) {
      return res.status(200).send(body.challenge);
    }

    try {
      const subType = body?.subscription?.type;
      const event = body?.event;
      const payload = mapEventSubToIngest(subType, event);
      if (payload && payload.eventType !== "meta") {
        if (typeof onEvent === "function") await onEvent(payload);
        else await postToIngest(ingestUrl, payload);
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      error("Webhook error:", err.message);
      res.status(500).json({ ok: false });
    }
  });

  log(`Webhook registered ${webhookPath}`);
}

module.exports = {
  start,
  stop,
  getTwitchBridgeStatus,
  createTwitchWebhookBridge,
  mapEventSubToIngest,
  PHASE1_SUBSCRIPTIONS
};
