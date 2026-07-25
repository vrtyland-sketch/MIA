"use strict";

/**
 * MIA_KICK_BRIDGE.js
 *
 * Účel:
 * - webhook bridge pro Kick -> /ingest
 * - realtime Kick chat bridge přes Pusher websocket -> /ingest
 *
 * Tenhle modul:
 * - neřeší OBS
 * - neřeší overlay
 * - neřeší MIA response
 * - jen bezpečně dopraví Kick data do root /ingest
 *
 * KOMPTAIBILITA PRO index.js:
 * - exportuje i start()
 * - exportuje i stop()
 */

const axios = require("axios");

let WebSocketImpl = null;
try {
  WebSocketImpl = require("ws");
} catch (_error) {
  WebSocketImpl = null;
}

const DEFAULT_PUSHER_KEY = "32cbd69e4b950bf97679";
const DEFAULT_CLUSTER = "us2";
const DEFAULT_CHATROOM_ID = "95746130";

const ACTIVE_RUNTIME = {
  ws: null,
  reconnectTimer: null,
  started: false,
  closedByUser: false,
  dedupe: new Map(),
  lastConfig: null
};

function nowTs() {
  return Date.now();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function log(...args) {
  console.log("[MIA_KICK_BRIDGE]", ...args);
}

function warn(...args) {
  console.warn("[MIA_KICK_BRIDGE]", ...args);
}

function error(...args) {
  console.error("[MIA_KICK_BRIDGE]", ...args);
}

function makePusherUrl(pusherKey, cluster = DEFAULT_CLUSTER) {
  return `wss://ws-${cluster}.pusher.com/app/${pusherKey}?protocol=7&client=js&version=8.4.0&flash=false`;
}

function getChannelCandidates(chatroomId) {
  const id = String(chatroomId || DEFAULT_CHATROOM_ID).trim();

  return [
    `chatrooms.${id}.v2`,
    `chatrooms.${id}`,
    `chatroom_${id}`
  ];
}

async function postToIngest(ingestUrl, payload) {
  await axios.post(ingestUrl, payload, {
    timeout: 7000,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function buildWebhookForwardPayload(body = {}) {
  return {
    ...body,
    source: safeString(body.source, "kick_webhook"),
    provider: safeString(body.provider, "kick"),
    platform: safeString(body.platform, "kick")
  };
}

async function resolveKickChatroomId(config = {}) {
  const explicit = safeString(config.chatroomId);
  if (explicit) {
    return explicit;
  }

  const channel = safeString(config.channel);
  if (!channel) {
    return DEFAULT_CHATROOM_ID;
  }

  try {
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`,
      {
        timeout: 7000,
        headers: {
          Accept: "application/json",
          "User-Agent": "MIA-KickBridge/1.0"
        }
      }
    );
    const chatroomId = response?.data?.chatroom?.id;
    if (chatroomId) {
      log(`Resolved Kick channel "${channel}" -> chatroomId=${chatroomId}`);
      return String(chatroomId);
    }
    warn(`Kick channel "${channel}" has no chatroom.id in API response`);
  } catch (err) {
    error(
      `Failed to resolve Kick channel "${channel}" (${err.response?.status || "network"}):`,
      err.message
    );
  }

  warn(`Falling back to default chatroomId=${DEFAULT_CHATROOM_ID}`);
  return DEFAULT_CHATROOM_ID;
}

function createKickWebhookBridge({
  app,
  webhookPath = "/kick/webhook",
  ingestUrl = "http://127.0.0.1:3000/ingest",
  onEvent = null
} = {}) {
  if (!app || typeof app.post !== "function") {
    throw new Error("createKickWebhookBridge requires express app");
  }

  app.post(webhookPath, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : null;

      if (!body) {
        return res.status(400).json({
          ok: false,
          error: "invalid_body"
        });
      }

      const payload = buildWebhookForwardPayload(body);
      if (typeof onEvent === "function") {
        await onEvent(payload);
      } else {
        await postToIngest(ingestUrl, payload);
      }

      return res.json({
        ok: true,
        forwarded: true
      });
    } catch (err) {
      error("Webhook forward failed:", err.message);
      return res.status(500).json({
        ok: false,
        error: "kick_webhook_forward_failed",
        message: err.message
      });
    }
  });

  log(`Webhook bridge registered on ${webhookPath} -> ${typeof onEvent === "function" ? "onEvent" : ingestUrl}`);
}

function parseJsonSafe(input) {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch (_err) {
    return null;
  }
}

function normalizeSender(sender = {}) {
  return {
    userId: sender.id ?? null,
    username:
      safeString(sender.username) ||
      safeString(sender.slug) ||
      safeString(sender.name),
    nickname:
      safeString(sender.username) ||
      safeString(sender.slug) ||
      safeString(sender.name),
    avatarUrl:
      safeString(sender.profile_pic) ||
      safeString(sender.profilePic) ||
      safeString(sender.avatar) ||
      safeString(sender.avatar_url)
  };
}

function extractMessageText(parsedData = {}) {
  return (
    safeString(parsedData.content) ||
    safeString(parsedData.message) ||
    safeString(parsedData.text) ||
    safeString(parsedData.body)
  );
}

function extractMessageId(parsedData = {}) {
  return (
    parsedData.id ??
    parsedData.message_id ??
    parsedData.messageId ??
    parsedData.uuid ??
    null
  );
}

function extractEventName(pusherEvent = {}) {
  return safeString(pusherEvent.event);
}

function rememberDedupe(key, ttlMs = 60_000) {
  const now = nowTs();

  for (const [entryKey, expiresAt] of ACTIVE_RUNTIME.dedupe.entries()) {
    if (expiresAt <= now) {
      ACTIVE_RUNTIME.dedupe.delete(entryKey);
    }
  }

  if (!key) return false;
  if (ACTIVE_RUNTIME.dedupe.has(key)) return true;

  ACTIVE_RUNTIME.dedupe.set(key, now + ttlMs);
  return false;
}

function buildRealtimeIngestPayload({
  parsedData,
  rawEnvelope,
  chatroomId,
  channelName,
  eventName
}) {
  const sender = normalizeSender(parsedData?.sender || {});
  const content = extractMessageText(parsedData);

  return {
    source: "kick_realtime",
    provider: "kick",
    platform: "kick",

    type: "comment",
    eventType: "comment",
    rawType: eventName || "App\\Events\\ChatMessageEvent",

    channel: channelName || "",
    chatroomId: String(chatroomId || DEFAULT_CHATROOM_ID),

    messageId: extractMessageId(parsedData),
    content,
    message: content,
    text: content,
    comment: content,

    username: sender.username,
    nickname: sender.nickname,
    avatarUrl: sender.avatarUrl,
    userId: sender.userId,

    user: {
      userId: sender.userId,
      username: sender.username,
      nickname: sender.nickname,
      avatarUrl: sender.avatarUrl
    },

    raw: {
      envelope: rawEnvelope,
      data: parsedData
    }
  };
}

async function handleKickChatEvent({
  parsedData,
  rawEnvelope,
  ingestUrl,
  onEvent,
  chatroomId,
  channelName,
  eventName
}) {
  const content = extractMessageText(parsedData);
  if (!content) return;

  const username = safeString(parsedData?.sender?.username);
  const messageId = extractMessageId(parsedData);

  const dedupeKey = messageId
    ? `msg:${messageId}`
    : `txt:${username}:${content}`;

  if (rememberDedupe(dedupeKey)) {
    return;
  }

  const payload = buildRealtimeIngestPayload({
    parsedData,
    rawEnvelope,
    chatroomId,
    channelName,
    eventName
  });

  if (typeof onEvent === "function") {
    await onEvent(payload);
    return;
  }

  await postToIngest(ingestUrl, payload);
}

function subscribeToChannels(ws, channels = []) {
  for (const channel of channels) {
    ws.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: {
          channel
        }
      })
    );
  }
}

function scheduleReconnect(startFn, delayMs = 5000) {
  if (ACTIVE_RUNTIME.closedByUser) return;
  if (ACTIVE_RUNTIME.reconnectTimer) return;

  ACTIVE_RUNTIME.reconnectTimer = setTimeout(() => {
    ACTIVE_RUNTIME.reconnectTimer = null;
    startFn();
  }, delayMs);
}

function stopKickRealtimeBridge() {
  ACTIVE_RUNTIME.closedByUser = true;

  if (ACTIVE_RUNTIME.reconnectTimer) {
    clearTimeout(ACTIVE_RUNTIME.reconnectTimer);
    ACTIVE_RUNTIME.reconnectTimer = null;
  }

  if (ACTIVE_RUNTIME.ws) {
    try {
      ACTIVE_RUNTIME.ws.close();
    } catch (_err) {
      // ignore
    }
    ACTIVE_RUNTIME.ws = null;
  }

  ACTIVE_RUNTIME.started = false;
  log("Realtime bridge stopped");
}

function startKickRealtimeBridge({
  ingestUrl = "http://127.0.0.1:3000/ingest",
  onEvent = null,
  chatroomId = DEFAULT_CHATROOM_ID,
  pusherKey = DEFAULT_PUSHER_KEY,
  cluster = DEFAULT_CLUSTER
} = {}) {
  if (!WebSocketImpl) {
    warn('Package "ws" is not available. Realtime bridge not started.');
    return {
      ok: false,
      reason: "ws_not_installed"
    };
  }

  if (ACTIVE_RUNTIME.started && ACTIVE_RUNTIME.ws) {
    log("Realtime bridge already running");
    return {
      ok: true,
      reason: "already_running"
    };
  }

  ACTIVE_RUNTIME.closedByUser = false;
  ACTIVE_RUNTIME.lastConfig = {
    ingestUrl,
    chatroomId,
    pusherKey,
    cluster
  };

  const wsUrl = makePusherUrl(pusherKey, cluster);
  const channels = getChannelCandidates(chatroomId);

  const connect = () => {
    log(`Connecting realtime bridge -> ${wsUrl}`);
    const ws = new WebSocketImpl(wsUrl);

    ACTIVE_RUNTIME.ws = ws;
    ACTIVE_RUNTIME.started = true;

    ws.on("open", () => {
      log("Realtime websocket connected");
    });

    ws.on("message", async (buffer) => {
      try {
        const rawText = buffer?.toString ? buffer.toString("utf8") : String(buffer || "");
        const envelope = parseJsonSafe(rawText);

        if (!envelope || typeof envelope !== "object") {
          return;
        }

        const eventName = extractEventName(envelope);

        if (eventName === "pusher:connection_established") {
          const data = parseJsonSafe(envelope.data);
          subscribeToChannels(ws, channels);

          if (data && data.socket_id) {
            log(`Pusher connected, socket_id=${data.socket_id}`);
          }
          return;
        }

        if (eventName === "pusher:ping") {
          ws.send(JSON.stringify({ event: "pusher:pong", data: {} }));
          return;
        }

        if (
          eventName === "pusher_internal:subscription_succeeded" ||
          eventName === "pusher:subscription_succeeded"
        ) {
          return;
        }

        const channelName = safeString(envelope.channel);

        if (
          eventName === "App\\Events\\ChatMessageEvent" ||
          eventName === "chat.message" ||
          eventName === "chat.message.sent"
        ) {
          const parsedData = parseJsonSafe(envelope.data);
          if (!parsedData || typeof parsedData !== "object") {
            return;
          }

          await handleKickChatEvent({
            parsedData,
            rawEnvelope: envelope,
            ingestUrl,
            onEvent,
            chatroomId,
            channelName,
            eventName
          });

          return;
        }
      } catch (err) {
        error("Realtime message handling failed:", err.message);
      }
    });

    ws.on("close", (code, reasonBuffer) => {
      const reason = reasonBuffer?.toString ? reasonBuffer.toString("utf8") : "";
      warn(`Realtime websocket closed (code=${code}, reason=${reason})`);
      ACTIVE_RUNTIME.ws = null;
      ACTIVE_RUNTIME.started = false;

      if (!ACTIVE_RUNTIME.closedByUser) {
        scheduleReconnect(() =>
          startKickRealtimeBridge({
            ingestUrl,
            onEvent,
            chatroomId,
            pusherKey,
            cluster
          })
        );
      }
    });

    ws.on("error", (err) => {
      error("Realtime websocket error:", err.message);
    });
  };

  connect();

  return {
    ok: true,
    reason: "starting"
  };
}

/**
 * Kompatibilní wrapper pro index.js
 * index.js volá:
 *   kickBridge.start({ config, onEvent })
 */
async function start(options = {}) {
  const config = options?.config || {};
  const ingestUrl =
    safeString(config.ingestUrl) || "http://127.0.0.1:3000/ingest";
  const chatroomId = await resolveKickChatroomId(config);
  const pusherKey =
    safeString(config.pusherKey) || DEFAULT_PUSHER_KEY;
  const cluster =
    safeString(config.cluster) || DEFAULT_CLUSTER;
  const onEvent =
    typeof options?.onEvent === "function" ? options.onEvent : null;

  if (!onEvent) {
    warn(
      "Kick bridge started without onEvent callback — events will POST to ingestUrl only"
    );
  }

  log(
    `Starting Kick realtime bridge chatroomId=${chatroomId}` +
      (safeString(config.channel) ? ` channel=${safeString(config.channel)}` : "") +
      ` -> ${onEvent ? "processEvent(onEvent)" : ingestUrl}`
  );

  return startKickRealtimeBridge({
    ingestUrl,
    onEvent,
    chatroomId,
    pusherKey,
    cluster
  });
}

function stop() {
  return stopKickRealtimeBridge();
}

function getKickBridgeStatus() {
  const ws = ACTIVE_RUNTIME.ws;
  const wsOpen = Boolean(ws && ws.readyState === 1);

  return {
    started: Boolean(ACTIVE_RUNTIME.started),
    connected: wsOpen,
    reconnectPending: Boolean(ACTIVE_RUNTIME.reconnectTimer),
    chatroomId: safeString(
      ACTIVE_RUNTIME.lastConfig?.chatroomId,
      DEFAULT_CHATROOM_ID
    ),
    ingestUrl: safeString(
      ACTIVE_RUNTIME.lastConfig?.ingestUrl,
      "http://127.0.0.1:3000/ingest"
    )
  };
}

module.exports = {
  createKickWebhookBridge,
  startKickRealtimeBridge,
  stopKickRealtimeBridge,
  resolveKickChatroomId,
  start,
  stop,
  getKickBridgeStatus
};