"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "mia-session-memory.json");
const MAX_RECENT = 12;
const MAX_BOT_REPLIES = 24;
const MAX_USER_ENTRIES = 200;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUserKey(userLabel = "") {
  return safeString(userLabel).toLowerCase().replace(/\s+/g, "_").slice(0, 64) || "anonymous";
}

function normalizeSpeaker(speaker = "") {
  const hint = safeString(speaker).toLowerCase();
  if (hint === "kojnozout" || hint === "kojnozrout" || hint === "koj") {
    return "kojnozout";
  }
  return "mia";
}

function createEmptyStore() {
  return {
    version: 1,
    updatedAt: 0,
    recentMessages: [],
    recentBotReplies: [],
    users: {}
  };
}

let store = null;
let storePath = DEFAULT_STORE;
let dirty = false;
let saveTimer = null;

function loadStore(filePath = DEFAULT_STORE) {
  storePath = filePath || DEFAULT_STORE;

  if (!fs.existsSync(storePath)) {
    store = createEmptyStore();
    return store;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    store = parsed && typeof parsed === "object" ? parsed : createEmptyStore();
  } catch (_err) {
    store = createEmptyStore();
  }

  if (!Array.isArray(store.recentMessages)) store.recentMessages = [];
  if (!Array.isArray(store.recentBotReplies)) store.recentBotReplies = [];
  if (!store.users || typeof store.users !== "object") store.users = {};

  return store;
}

function ensureStore() {
  if (!store) loadStore(storePath);
  return store;
}

function scheduleSave() {
  dirty = true;
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!dirty) return;
    dirty = false;

    try {
      const dir = path.dirname(storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      ensureStore().updatedAt = Date.now();
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
    } catch (_err) {
      dirty = true;
    }
  }, 4000);
}

function observeChatMessage(ctx = {}) {
  const safeStore = ensureStore();
  const now = Date.now();
  const userLabel = safeString(ctx.userLabel, "divák");
  const userKey = normalizeUserKey(userLabel);
  const message = safeString(ctx.message).slice(0, 240);
  const intentType = safeString(ctx.intentType);

  if (!message) return safeStore;

  safeStore.recentMessages.unshift({
    at: now,
    userLabel,
    userKey,
    message,
    intentType
  });
  safeStore.recentMessages = safeStore.recentMessages.slice(0, MAX_RECENT);

  if (!safeStore.users[userKey]) {
    safeStore.users[userKey] = {
      userLabel,
      visitCount: 0,
      lastMessageAt: 0,
      lastIntentType: "",
      lastMessage: ""
    };
  }

  const user = safeStore.users[userKey];
  user.visitCount = toNumber(user.visitCount, 0) + 1;
  user.lastMessageAt = now;
  user.lastIntentType = intentType || user.lastIntentType;
  user.lastMessage = message;
  user.userLabel = userLabel;

  const userKeys = Object.keys(safeStore.users);
  if (userKeys.length > MAX_USER_ENTRIES) {
    const sorted = userKeys.sort(
      (a, b) => toNumber(safeStore.users[b].lastMessageAt, 0) - toNumber(safeStore.users[a].lastMessageAt, 0)
    );
    for (const key of sorted.slice(MAX_USER_ENTRIES)) {
      delete safeStore.users[key];
    }
  }

  scheduleSave();
  return safeStore;
}

function getRecentMessages(limit = 6) {
  const safeStore = ensureStore();
  return safeStore.recentMessages.slice(0, Math.max(1, limit));
}

function observeBotReply(ctx = {}) {
  const safeStore = ensureStore();
  const now = Date.now();
  const userLabel = safeString(ctx.userLabel, "divák");
  const userKey = normalizeUserKey(userLabel);
  const speaker = normalizeSpeaker(ctx.speaker);
  const text = safeString(ctx.text).slice(0, 320);

  if (!text) return safeStore;

  safeStore.recentBotReplies.unshift({
    at: now,
    userLabel,
    userKey,
    speaker,
    text,
    source: safeString(ctx.source),
    intentType: safeString(ctx.intentType)
  });
  safeStore.recentBotReplies = safeStore.recentBotReplies.slice(0, MAX_BOT_REPLIES);

  if (!safeStore.users[userKey]) {
    safeStore.users[userKey] = {
      userLabel,
      visitCount: 0,
      lastMessageAt: 0,
      lastIntentType: "",
      lastMessage: ""
    };
  }

  const user = safeStore.users[userKey];
  user.lastBotReplyAt = now;
  user.lastBotReplySpeaker = speaker;
  user.lastBotReplyText = text;
  user.userLabel = userLabel;

  scheduleSave();
  return safeStore;
}

function getRecentBotReplies(limit = 6) {
  const safeStore = ensureStore();
  return safeStore.recentBotReplies.slice(0, Math.max(1, limit));
}

function getLastBotReplyToUser(userLabel = "", speaker = null) {
  const userKey = normalizeUserKey(userLabel);
  const safeSpeaker = speaker ? normalizeSpeaker(speaker) : "";
  const safeStore = ensureStore();

  for (const item of safeStore.recentBotReplies) {
    if (item.userKey !== userKey) continue;
    if (safeSpeaker && item.speaker !== safeSpeaker) continue;
    return item;
  }

  const user = safeStore.users[userKey];
  if (!user?.lastBotReplyText) return null;

  if (safeSpeaker && normalizeSpeaker(user.lastBotReplySpeaker) !== safeSpeaker) {
    return null;
  }

  return {
    at: toNumber(user.lastBotReplyAt, 0),
    userLabel: safeString(user.userLabel, userLabel),
    userKey,
    speaker: normalizeSpeaker(user.lastBotReplySpeaker),
    text: safeString(user.lastBotReplyText),
    source: "user_snapshot",
    intentType: ""
  };
}

function getRecentBotRepliesForUser(userLabel = "", limit = 3) {
  const userKey = normalizeUserKey(userLabel);
  const safeStore = ensureStore();

  return safeStore.recentBotReplies
    .filter((item) => item.userKey === userKey)
    .slice(0, Math.max(1, limit));
}

function getUserSessionHints(userLabel = "") {
  const userKey = normalizeUserKey(userLabel);
  const user = ensureStore().users[userKey];

  if (!user) {
    return {
      userKey,
      visitCount: 0,
      isReturning: false,
      lastMessage: "",
      lastIntentType: ""
    };
  }

  return {
    userKey,
    visitCount: toNumber(user.visitCount, 0),
    isReturning: toNumber(user.visitCount, 0) > 1,
    lastMessage: safeString(user.lastMessage),
    lastIntentType: safeString(user.lastIntentType)
  };
}

function getSessionSnapshot() {
  const safeStore = ensureStore();
  return {
    recentCount: safeStore.recentMessages.length,
    userCount: Object.keys(safeStore.users).length,
    updatedAt: toNumber(safeStore.updatedAt, 0)
  };
}

module.exports = {
  loadStore,
  observeChatMessage,
  observeBotReply,
  getRecentMessages,
  getRecentBotReplies,
  getRecentBotRepliesForUser,
  getLastBotReplyToUser,
  getUserSessionHints,
  getSessionSnapshot
};
