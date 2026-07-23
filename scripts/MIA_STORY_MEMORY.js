"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_STORE = path.resolve(__dirname, "..", "data", "story-memory.json");
const MAX_USERS = 300;
const FEED_MILESTONES = [3, 8, 15, 25, 40];

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

function createEmptyStore() {
  return {
    version: 1,
    updatedAt: 0,
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
  }, 3000);
}

function ensureUser(userLabel = "") {
  const safeStore = ensureStore();
  const userKey = normalizeUserKey(userLabel);
  const label = safeString(userLabel, "Divák");

  if (!safeStore.users[userKey]) {
    safeStore.users[userKey] = {
      userLabel: label,
      feedCount: 0,
      giftFeedCount: 0,
      careFeedCount: 0,
      lastFeedAt: 0,
      lastFeedType: "",
      storiesPlayed: {},
      milestonesHit: []
    };
  }

  const user = safeStore.users[userKey];
  user.userLabel = label;
  return { safeStore, userKey, user };
}

function pruneUsers(safeStore) {
  const keys = Object.keys(safeStore.users);
  if (keys.length <= MAX_USERS) return;

  const sorted = keys.sort(
    (a, b) => toNumber(safeStore.users[b].lastFeedAt, 0) - toNumber(safeStore.users[a].lastFeedAt, 0)
  );
  for (const key of sorted.slice(MAX_USERS)) {
    delete safeStore.users[key];
  }
}

function observeFeedEvent(ctx = {}) {
  const feedType = safeString(ctx.feedType, "gift");
  const userLabel = safeString(ctx.userLabel, "Divák");
  const { safeStore, user } = ensureUser(userLabel);
  const now = Date.now();

  user.feedCount = toNumber(user.feedCount, 0) + 1;
  if (feedType === "care") {
    user.careFeedCount = toNumber(user.careFeedCount, 0) + 1;
  } else {
    user.giftFeedCount = toNumber(user.giftFeedCount, 0) + 1;
  }
  user.lastFeedAt = now;
  user.lastFeedType = feedType;

  const milestone = FEED_MILESTONES.find((m) => m === user.feedCount) || null;
  if (milestone && !user.milestonesHit.includes(milestone)) {
    user.milestonesHit.push(milestone);
  }

  pruneUsers(safeStore);
  scheduleSave();

  return {
    userLabel: user.userLabel,
    userKey: normalizeUserKey(userLabel),
    feedCount: user.feedCount,
    milestone,
    isReturningFeeder: user.feedCount > 1
  };
}

function getUserFeedStats(userLabel = "") {
  const { user } = ensureUser(userLabel);
  return {
    userLabel: user.userLabel,
    feedCount: toNumber(user.feedCount, 0),
    giftFeedCount: toNumber(user.giftFeedCount, 0),
    careFeedCount: toNumber(user.careFeedCount, 0),
    lastFeedAt: toNumber(user.lastFeedAt, 0),
    milestonesHit: Array.isArray(user.milestonesHit) ? [...user.milestonesHit] : [],
    storiesPlayed: { ...(user.storiesPlayed || {}) }
  };
}

function noteStoryPlayed(userLabel = "", storyId = "") {
  const id = safeString(storyId);
  if (!id) return null;

  const { user } = ensureUser(userLabel);
  const now = Date.now();
  const prev = user.storiesPlayed[id] || { count: 0, lastAt: 0 };
  user.storiesPlayed[id] = {
    count: toNumber(prev.count, 0) + 1,
    lastAt: now
  };
  scheduleSave();
  return user.storiesPlayed[id];
}

function resolveFeedMilestone(userLabel = "", milestones = FEED_MILESTONES) {
  const stats = getUserFeedStats(userLabel);
  const hit = milestones.find((m) => m === stats.feedCount);
  if (!hit) return null;
  return { milestone: hit, feedCount: stats.feedCount, stats };
}

function resetStoreForTests() {
  store = createEmptyStore();
  dirty = false;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

module.exports = {
  observeFeedEvent,
  getUserFeedStats,
  noteStoryPlayed,
  resolveFeedMilestone,
  normalizeUserKey,
  FEED_MILESTONES,
  resetStoreForTests,
  loadStore
};
