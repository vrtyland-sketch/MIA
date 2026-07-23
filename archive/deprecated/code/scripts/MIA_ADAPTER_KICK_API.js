"use strict";

/**
 * MIA_ADAPTER_KICK_API.js
 *
 * Pomocná API vrstva pro Kick.
 *
 * Účel:
 * - nedělat druhý realtime bridge
 * - sloužit jen jako utility/helper nad HTTP API
 * - být bezpečný a volitelný
 *
 * Tento modul:
 * - nic sám nespouští
 * - nic neposílá do /ingest automaticky
 * - neotevírá websocket
 */

const axios = require("axios");
const configModule = require("./MIA_CONFIG");

const runtimeConfig =
  configModule && configModule.runtimeConfig
    ? configModule.runtimeConfig
    : (typeof configModule.buildRuntimeConfig === "function"
        ? configModule.buildRuntimeConfig(process.env)
        : null);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function log(...args) {
  console.log("[MIA_ADAPTER_KICK_API]", ...args);
}

function warn(...args) {
  console.warn("[MIA_ADAPTER_KICK_API]", ...args);
}

function error(...args) {
  console.error("[MIA_ADAPTER_KICK_API]", ...args);
}

function getDefaultKickApiConfig() {
  const kick = runtimeConfig && runtimeConfig.kick ? runtimeConfig.kick : {};

  return {
    baseUrl: safeString(process.env.MIA_KICK_API_BASE_URL, "https://kick.com/api/v2"),
    chatroomId: safeString(kick.chatroomId, "95746130"),
    timeoutMs: toNumber(process.env.MIA_KICK_API_TIMEOUT_MS, 7000),
    enabled: Boolean(kick.enabled)
  };
}

function buildAxiosClient(override = {}) {
  const cfg = {
    ...getDefaultKickApiConfig(),
    ...override
  };

  return axios.create({
    baseURL: cfg.baseUrl,
    timeout: cfg.timeoutMs,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });
}

function normalizeKickApiMessage(item = {}) {
  const sender = item.sender && typeof item.sender === "object" ? item.sender : {};

  return {
    messageId: item.id ?? item.message_id ?? item.uuid ?? null,
    content:
      safeString(item.content) ||
      safeString(item.message) ||
      safeString(item.text),
    createdAt:
      item.created_at ||
      item.createdAt ||
      null,
    sender: {
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
        safeString(sender.avatar) ||
        safeString(sender.avatar_url)
    },
    raw: item
  };
}

async function fetchKickChatMessages(override = {}) {
  const cfg = {
    ...getDefaultKickApiConfig(),
    ...override
  };

  if (!cfg.enabled) {
    return {
      ok: false,
      reason: "kick_disabled",
      messages: []
    };
  }

  const client = buildAxiosClient(cfg);

  try {
    /**
     * Poznámka:
     * Kick API endpointy se mohou lišit.
     * Tohle držíme jako helper vrstvu, ne jako hlavní realtime pipeline.
     */
    const url = `/messages?chatroom_id=${encodeURIComponent(cfg.chatroomId)}`;
    const response = await client.get(url);

    const rawItems = Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const messages = rawItems.map(normalizeKickApiMessage);

    return {
      ok: true,
      reason: "fetched",
      count: messages.length,
      messages
    };
  } catch (err) {
    error("fetchKickChatMessages failed:", err.message);
    return {
      ok: false,
      reason: "fetch_failed",
      message: err.message,
      messages: []
    };
  }
}

async function fetchKickChatroomInfo(override = {}) {
  const cfg = {
    ...getDefaultKickApiConfig(),
    ...override
  };

  if (!cfg.enabled) {
    return {
      ok: false,
      reason: "kick_disabled",
      chatroom: null
    };
  }

  const client = buildAxiosClient(cfg);

  try {
    const url = `/chatrooms/${encodeURIComponent(cfg.chatroomId)}`;
    const response = await client.get(url);

    return {
      ok: true,
      reason: "fetched",
      chatroom: response?.data || null
    };
  } catch (err) {
    error("fetchKickChatroomInfo failed:", err.message);
    return {
      ok: false,
      reason: "fetch_failed",
      message: err.message,
      chatroom: null
    };
  }
}

function mapApiMessageToIngestPayload(message = {}) {
  return {
    source: "kick_api",
    provider: "kick",
    platform: "kick",
    eventType: "chat.message",
    rawType: "kick_api_message",

    messageId: message.messageId ?? null,
    content: safeString(message.content),
    message: safeString(message.content),
    text: safeString(message.content),

    username: safeString(message?.sender?.username),
    nickname: safeString(message?.sender?.nickname),
    avatarUrl: safeString(message?.sender?.avatarUrl),
    userId: message?.sender?.userId ?? null,

    user: {
      userId: message?.sender?.userId ?? null,
      username: safeString(message?.sender?.username),
      nickname: safeString(message?.sender?.nickname),
      avatarUrl: safeString(message?.sender?.avatarUrl)
    },

    raw: message.raw || message
  };
}

async function fetchKickMessagesAsIngestPayloads(override = {}) {
  const result = await fetchKickChatMessages(override);

  if (!result.ok) {
    return {
      ...result,
      payloads: []
    };
  }

  return {
    ok: true,
    reason: "mapped",
    count: result.count,
    payloads: result.messages.map(mapApiMessageToIngestPayload)
  };
}

module.exports = {
  getDefaultKickApiConfig,
  buildAxiosClient,
  normalizeKickApiMessage,
  fetchKickChatMessages,
  fetchKickChatroomInfo,
  mapApiMessageToIngestPayload,
  fetchKickMessagesAsIngestPayloads
};