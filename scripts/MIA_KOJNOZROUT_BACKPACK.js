"use strict";

/**
 * Batoh diváka — itemy z giftů, chatu a liků pro duely + péči.
 * Gift mapa: support.giftMap.rewards / giftPriority / tier → roll do inventáře.
 */

const {
  ITEM_CATALOG,
  getItemDef,
  rollCanonGiftVariant
} = require("./MIA_KOJNOZROUT_ITEM_META");

let giftRewardsConfig = null;
try {
  giftRewardsConfig = require("../shared/gifts").rewards || null;
} catch (_err) {
  giftRewardsConfig = null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nowTs() {
  return Date.now();
}

function normalizeUserKey(userLabel = "") {
  return safeString(userLabel).toLowerCase().replace(/\s+/g, "_").slice(0, 64) || "anonymous";
}

function createBackpackState(seed = {}) {
  return {
    users: seed.users && typeof seed.users === "object" ? seed.users : {},
    totalItems: toNumber(seed.totalItems, 0),
    updatedAt: toNumber(seed.updatedAt, nowTs())
  };
}

function resolveGiftRewardIds(support = {}) {
  const lists = [
    support.rewards,
    support.giftMapRuntime?.rewards,
    support.giftMap?.rewards
  ];
  for (const list of lists) {
    if (!Array.isArray(list) || !list.length) continue;
    const ids = list
      .map((row) => safeString(row).toLowerCase())
      .filter(Boolean);
    if (ids.length) return ids;
  }
  return [];
}

function resolveGiftMapItemChance(support = {}) {
  const tier = safeString(
    support.streamTier || support.tier || support.giftMap?.tier,
    "T1"
  ).toUpperCase();
  const table = giftRewardsConfig?.itemChanceByTier || {
    T0: 0.05,
    T1: 0.12,
    T2: 0.22,
    T3: 0.35,
    T4: 0.5,
    T5: 0.65,
    T6: 0.8
  };
  return {
    tier,
    chance: toNumber(table[tier], 0.12),
    priority: toNumber(
      support.giftPriority ?? support.giftMap?.priority ?? support.giftMapRuntime?.priority,
      0
    )
  };
}

function pickGiftMapRewardItem(support = {}, rng = Math.random) {
  const rewardIds = resolveGiftRewardIds(support);
  if (!rewardIds.length) return null;

  const { chance, priority } = resolveGiftMapItemChance(support);
  const forceGrant = priority >= 8;
  if (!forceGrant && rng() > chance) {
    return null;
  }

  const pickId = rewardIds[Math.floor(rng() * rewardIds.length)] || rewardIds[0];
  const def = getItemDef(pickId);
  if (!def) return null;

  const item = rollCanonGiftVariant({ ...def });
  item.source = "gift_map";
  item.giftKey = safeString(support.giftKey || support.giftMap?.giftKey);
  return item;
}

function rollGiftItemLegacy(support = {}) {
  const tier = safeString(support.streamTier || support.tier, "T1").toUpperCase();
  const miaPoints = toNumber(support.miaPoints, 0);

  if (tier === "T4" || tier === "T3" || miaPoints >= 80) {
    return rollCanonGiftVariant({ ...ITEM_CATALOG.feast });
  }
  if (tier === "T2" || miaPoints >= 25) {
    return rollCanonGiftVariant({ ...ITEM_CATALOG.boost });
  }
  if (Math.random() < 0.18) {
    return rollCanonGiftVariant({ ...ITEM_CATALOG.shield });
  }
  return rollCanonGiftVariant({ ...ITEM_CATALOG.snack });
}

function rollGiftItem(support = {}, options = {}) {
  const rng = typeof options.rng === "function" ? options.rng : Math.random;
  const fromMap = pickGiftMapRewardItem(support, rng);
  if (fromMap) return fromMap;
  // Mapped gift s rewards, ale roll nevyšel → žádný item (mapa řídí šanci).
  if (resolveGiftRewardIds(support).length) return null;
  return rollGiftItemLegacy(support);
}

function resolveItemFromEvent(eventType = "", support = {}, options = {}) {
  const type = safeString(eventType).toUpperCase();
  if (type === "GIFT") return rollGiftItem(support, options);
  if (type === "COMMENT") return { ...ITEM_CATALOG.cheer };
  if (type === "LIKE") return { ...ITEM_CATALOG.spark };
  return null;
}

function addItemToBackpack(backpackState, userLabel, item, meta = {}) {
  const state = createBackpackState(backpackState);
  const key = normalizeUserKey(userLabel);
  if (!item) return state;

  if (!state.users[key]) {
    state.users[key] = {
      userLabel: safeString(userLabel, key),
      items: [],
      miaPointsBanked: 0
    };
  }

  const entry = {
    id: item.id,
    label: item.label,
    power: toNumber(item.power, 1),
    source: safeString(meta.source, item.source),
    ts: nowTs()
  };

  state.users[key].items.unshift(entry);
  state.users[key].items = state.users[key].items.slice(0, 8);
  state.totalItems = toNumber(state.totalItems, 0) + 1;
  state.updatedAt = nowTs();

  return state;
}

function consumeItem(backpackState, userLabel, itemId) {
  const state = createBackpackState(backpackState);
  const key = normalizeUserKey(userLabel);
  const user = state.users[key];
  if (!user || !Array.isArray(user.items)) return { state, item: null };

  const index = user.items.findIndex((row) => row.id === itemId);
  if (index < 0) return { state, item: null };

  const [item] = user.items.splice(index, 1);
  state.updatedAt = nowTs();
  return { state, item };
}

function getUserBackpackView(backpackState, userLabel) {
  const key = normalizeUserKey(userLabel);
  const user = backpackState?.users?.[key];
  if (!user) {
    return {
      userLabel: safeString(userLabel, key),
      userKey: key,
      items: [],
      itemCount: 0
    };
  }

  return {
    userLabel: user.userLabel || userLabel,
    userKey: key,
    items: (user.items || []).slice(0, 8),
    itemCount: (user.items || []).length
  };
}

function getBackpackSnapshot(backpackState, limit = 8) {
  const state = createBackpackState(backpackState);
  const leaders = Object.values(state.users)
    .map((user) => ({
      userLabel: user.userLabel,
      itemCount: user.items.length,
      topItem: user.items[0] || null,
      items: user.items.slice(0, 3)
    }))
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, limit);

  return {
    totalItems: state.totalItems,
    userCount: Object.keys(state.users).length,
    leaders,
    updatedAt: state.updatedAt
  };
}

module.exports = {
  ITEM_CATALOG,
  createBackpackState,
  resolveItemFromEvent,
  rollGiftItem,
  pickGiftMapRewardItem,
  addItemToBackpack,
  consumeItem,
  getUserBackpackView,
  getBackpackSnapshot,
  normalizeUserKey
};
