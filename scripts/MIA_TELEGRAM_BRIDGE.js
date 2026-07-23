"use strict";

/**
 * Telegram bridge — User Mode messaging (oddělené od stream overlay/OBS).
 * Text → MIA LLM hybrid. Soubory/audio/video zatím jen přijme a ohlásí.
 */

const axios = require("axios");
const streamerAccessModule = require("./MIA_STREAMER_ACCESS");

const ACTIVE = {
  started: false,
  closedByUser: false,
  pollTimer: null,
  offset: 0,
  lastConfig: null,
  lastError: "",
  lastMessageAt: 0,
  messagesHandled: 0
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function log(...args) {
  console.log("[MIA_TELEGRAM]", ...args);
}

function warn(...args) {
  console.warn("[MIA_TELEGRAM]", ...args);
}

function parseAllowedUserIds(raw = "") {
  return safeString(raw)
    .split(/[,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveTelegramConfig(config = {}) {
  const env = process.env;
  const enabled =
    config.enabled === true ||
    String(env.MIA_TELEGRAM_ENABLED || "").toLowerCase() === "1" ||
    String(env.MIA_TELEGRAM_ENABLED || "").toLowerCase() === "true";

  return {
    enabled,
    botToken: safeString(config.botToken || env.MIA_TELEGRAM_BOT_TOKEN),
    pollMs: Math.max(500, toNumber(config.pollMs ?? env.MIA_TELEGRAM_POLL_MS, 1500)),
    allowedUserIds: parseAllowedUserIds(
      config.allowedUserIds || env.MIA_TELEGRAM_ALLOWED_USER_IDS
    ),
    streamerOnly:
      config.streamerOnly === true ||
      String(env.MIA_TELEGRAM_STREAMER_ONLY || "1").toLowerCase() === "1" ||
      String(env.MIA_TELEGRAM_STREAMER_ONLY || "").toLowerCase() === "true",
    runtimeConfig: config.runtimeConfig || {}
  };
}

function isUserAllowed(updateUser = {}, cfg = {}) {
  const userId = safeString(updateUser?.id);
  const username = safeString(updateUser?.username || updateUser?.first_name, "telegram_user");

  if (cfg.allowedUserIds.length > 0) {
    return cfg.allowedUserIds.includes(userId);
  }

  if (cfg.streamerOnly) {
    const access =
      typeof streamerAccessModule.resolveStreamerAccess === "function"
        ? streamerAccessModule.resolveStreamerAccess(username, cfg.runtimeConfig)
        : { isStreamerBoss: false };
    return access.isStreamerBoss === true;
  }

  return true;
}

function detectAttachmentKind(message = {}) {
  if (message.photo && message.photo.length) return "photo";
  if (message.document) return "document";
  if (message.video) return "video";
  if (message.voice) return "voice";
  if (message.audio) return "audio";
  if (message.video_note) return "video_note";
  if (message.sticker) return "sticker";
  return "";
}

function buildIncomingContext(update = {}) {
  const message = update.message || update.edited_message || null;
  if (!message) return null;

  const user = message.from || {};
  const chat = message.chat || {};
  const attachmentKind = detectAttachmentKind(message);
  const text = safeString(message.text || message.caption);

  return {
    updateId: update.update_id,
    chatId: safeString(chat.id),
    messageId: safeString(message.message_id),
    userId: safeString(user.id),
    username: safeString(user.username, safeString(user.first_name, "telegram_user")),
    userLabel: safeString(user.username, safeString(user.first_name, `tg_${user.id}`)),
    text,
    attachmentKind,
    fileId:
      message.document?.file_id ||
      message.voice?.file_id ||
      message.audio?.file_id ||
      message.video?.file_id ||
      message.video_note?.file_id ||
      (Array.isArray(message.photo) && message.photo.length
        ? message.photo[message.photo.length - 1].file_id
        : ""),
    raw: message
  };
}

async function telegramApi(method, body = {}, botToken = "") {
  const token = safeString(botToken);
  if (!token) throw new Error("telegram_bot_token_missing");

  const response = await axios.post(`https://api.telegram.org/bot${token}/${method}`, body, {
    timeout: 15000,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400 || response.data?.ok !== true) {
    const detail = safeString(response.data?.description, `http_${response.status}`);
    throw new Error(`telegram_api_${detail}`);
  }

  return response.data?.result;
}

async function sendTelegramMessage(chatId, text, botToken) {
  const payload = safeString(text);
  if (!chatId || !payload) return null;

  return telegramApi(
    "sendMessage",
    {
      chat_id: chatId,
      text: payload.slice(0, 3900),
      disable_web_page_preview: true
    },
    botToken
  );
}

function buildAttachmentAck(ctx = {}) {
  const kind = safeString(ctx.attachmentKind, "soubor");
  const labels = {
    photo: "fotku",
    document: "dokument",
    video: "video",
    voice: "hlasovku",
    audio: "audio",
    video_note: "video zprávu",
    sticker: "sticker"
  };
  const label = labels[kind] || kind;
  return `Přijala jsem ${label}. Multimediální analýza přijde v další fázi — zatím mi napiš, co s tím mám udělat.`;
}

async function handleUpdate(update = {}, cfg = {}, onMessage) {
  const ctx = buildIncomingContext(update);
  if (!ctx || !ctx.chatId) return { handled: false, reason: "no_message" };

  if (!isUserAllowed({ id: ctx.userId, username: ctx.username }, cfg)) {
    await sendTelegramMessage(
      ctx.chatId,
      "Tenhle Telegram účet nemá přístup k MIA. Přidej své user ID do MIA_TELEGRAM_ALLOWED_USER_IDS.",
      cfg.botToken
    );
    return { handled: true, reason: "denied" };
  }

  let replyText = "";

  if (typeof onMessage === "function") {
    const result = await onMessage(ctx);
    replyText = safeString(result?.text || result?.reply);
  }

  if (!replyText && ctx.attachmentKind) {
    replyText = buildAttachmentAck(ctx);
  }

  if (!replyText && ctx.text) {
    replyText = "Moment — zkus to prosím znovu za chvíli.";
  }

  if (!replyText) {
    return { handled: false, reason: "empty" };
  }

  await sendTelegramMessage(ctx.chatId, replyText, cfg.botToken);
  ACTIVE.messagesHandled += 1;
  ACTIVE.lastMessageAt = Date.now();
  return { handled: true, reason: "replied" };
}

async function pollOnce(cfg = {}, onMessage) {
  if (!cfg.enabled || !cfg.botToken || ACTIVE.closedByUser) return;

  try {
    const updates = await telegramApi(
      "getUpdates",
      {
        offset: ACTIVE.offset,
        timeout: 0,
        allowed_updates: ["message", "edited_message"]
      },
      cfg.botToken
    );

    const list = Array.isArray(updates) ? updates : [];
    for (const update of list) {
      const updateId = toNumber(update?.update_id, 0);
      if (updateId >= ACTIVE.offset) {
        ACTIVE.offset = updateId + 1;
      }
      await handleUpdate(update, cfg, onMessage);
    }

    ACTIVE.lastError = "";
  } catch (err) {
    ACTIVE.lastError = safeString(err?.message, "telegram_poll_failed");
    warn(ACTIVE.lastError);
  }
}

function startTelegramBridge(options = {}) {
  const cfg = resolveTelegramConfig(options.config || {});
  ACTIVE.lastConfig = cfg;

  if (!cfg.enabled) {
    return { ok: false, reason: "telegram_disabled" };
  }

  if (!cfg.botToken) {
    warn("MIA_TELEGRAM_ENABLED=1 ale chybí MIA_TELEGRAM_BOT_TOKEN (@BotFather).");
    return { ok: false, reason: "telegram_token_missing" };
  }

  if (ACTIVE.started) {
    return { ok: true, reason: "already_started" };
  }

  ACTIVE.started = true;
  ACTIVE.closedByUser = false;
  const onMessage = typeof options.onMessage === "function" ? options.onMessage : null;

  const tick = () => {
    if (!ACTIVE.started || ACTIVE.closedByUser) return;
    void pollOnce(cfg, onMessage).finally(() => {
      if (ACTIVE.started && !ACTIVE.closedByUser) {
        ACTIVE.pollTimer = setTimeout(tick, cfg.pollMs);
      }
    });
  };

  log(
    `start · poll ${cfg.pollMs}ms · allowed=${cfg.allowedUserIds.length || "streamer_only"}`
  );
  tick();

  return { ok: true, reason: "started" };
}

function stopTelegramBridge() {
  ACTIVE.closedByUser = true;
  ACTIVE.started = false;
  if (ACTIVE.pollTimer) {
    clearTimeout(ACTIVE.pollTimer);
    ACTIVE.pollTimer = null;
  }
  return { ok: true, stopped: true };
}

function getTelegramBridgeStatus() {
  const cfg = ACTIVE.lastConfig || resolveTelegramConfig({});
  return {
    enabled: cfg.enabled === true,
    started: ACTIVE.started === true,
    connected: ACTIVE.started === true && !ACTIVE.lastError,
    tokenConfigured: Boolean(cfg.botToken),
    pollMs: cfg.pollMs,
    allowedUserIds: cfg.allowedUserIds,
    streamerOnly: cfg.streamerOnly === true,
    messagesHandled: ACTIVE.messagesHandled,
    lastMessageAt: ACTIVE.lastMessageAt || null,
    lastError: ACTIVE.lastError || null
  };
}

module.exports = {
  resolveTelegramConfig,
  isUserAllowed,
  detectAttachmentKind,
  buildIncomingContext,
  buildAttachmentAck,
  sendTelegramMessage,
  startTelegramBridge,
  stopTelegramBridge,
  getTelegramBridgeStatus
};
