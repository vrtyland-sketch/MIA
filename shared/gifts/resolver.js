"use strict";

/**
 * Gift Map resolver — jediné místo, kde se rozhoduje, co gift znamená.
 * Platform gift event → normalizace → katalog → tier/priority/care/bowl/video/overlay/voice/XP.
 */

const fs = require("fs");
const path = require("path");

const MAP_DIR = path.join(__dirname, "gift_map");

function loadJson(name) {
  const file = path.join(MAP_DIR, name);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const catalog = loadJson("gift_catalog.json");
const aliases = loadJson("gift_aliases.json");
const tiers = loadJson("gift_tiers.json");
const categories = loadJson("gift_categories.json");
const effects = loadJson("gift_effects.json");
const rewards = loadJson("gift_rewards.json");
const videoMap = loadJson("gift_video_map.json");
const overlayMap = loadJson("gift_overlay_map.json");
const voiceMap = loadJson("gift_voice_map.json");
const careMap = loadJson("gift_care_map.json");
const bowlMap = loadJson("gift_bowl_map.json");
const shareMap = loadJson("gift_share_map.json");
const achievements = loadJson("gift_achievements.json");

const ALIAS_TO_KEY = (() => {
  const out = new Map();
  for (const [key, list] of Object.entries(aliases.aliases || {})) {
    out.set(normalizeKey(key), key);
    for (const alias of list) {
      out.set(normalizeKey(alias), key);
    }
  }
  for (const key of Object.keys(catalog.gifts || {})) {
    out.set(normalizeKey(key), key);
    const gift = catalog.gifts[key];
    if (gift?.label) out.set(normalizeKey(gift.label), key);
  }
  return out;
})();

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value) {
  const raw = safeString(value);
  if (!raw) return "";
  // Emoji / symbol-only tokens stay intact (🌹 ≠ empty key).
  if (!/[\p{L}\p{N}]/u.test(raw)) {
    return raw;
  }
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeGiftKey(giftName = "", giftId = null) {
  const nameKey = normalizeKey(giftName);
  if (nameKey) {
    const fromName = ALIAS_TO_KEY.get(nameKey);
    if (fromName) return fromName;
  }
  const idKey = normalizeKey(String(giftId || ""));
  if (idKey) {
    const fromId = ALIAS_TO_KEY.get(idKey);
    if (fromId) return fromId;
  }
  const compact = nameKey.toUpperCase().replace(/\s+/g, "_");
  if (compact && catalog.gifts[compact]) return compact;
  return "GENERIC";
}

function normalizePlatform(value, fallback = "unknown") {
  const platform = safeString(value, fallback).toLowerCase();
  if (["tiktok", "kick", "twitch", "youtube"].includes(platform)) return platform;
  return fallback;
}

function resolveTierFromCoins(totalCoins = 0) {
  const coins = Math.max(0, toNumber(totalCoins, 0));
  if (coins <= 0) return "T0";
  const thresholds = tiers.coinThresholds || {};
  for (const tier of ["T6", "T5", "T4", "T3", "T2", "T1"]) {
    if (coins >= toNumber(thresholds[tier], Number.POSITIVE_INFINITY)) return tier;
  }
  return "T1";
}

function tierRank(tier = "T1") {
  return Number(String(tier).replace(/\D/g, "")) || 0;
}

function pickHigherTier(a, b) {
  return tierRank(a) >= tierRank(b) ? a : b;
}

function computeMiaPoints(totalCoins = 0) {
  return Math.round(Math.max(0, toNumber(totalCoins, 0)) * toNumber(tiers.miaPointsPerCoin, 7.5) * 100) / 100;
}

function renderTemplate(template, vars = {}) {
  return safeString(template, "{user} poslal dárek").replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : ""
  );
}

function resolveGift(input = {}) {
  const platform = normalizePlatform(input.platform, "unknown");
  const displayName = safeString(input.displayName || input.nickname || input.user || "Viewer", "Viewer");
  const giftNameRaw = safeString(input.giftName || input.name || "", "");
  const giftId = input.giftId ?? input.id ?? null;
  const count = Math.max(1, toNumber(input.count ?? input.repeatCount ?? input.quantity, 1));
  const unitCoins = Math.max(0, toNumber(input.coins ?? input.coinValue ?? input.value ?? input.giftValue, 0));
  const explicitTotal = Math.max(0, toNumber(input.totalCoins ?? input.totalValue, 0));
  const totalCoins = explicitTotal > 0 ? explicitTotal : unitCoins * count;

  const giftKey = normalizeGiftKey(giftNameRaw, giftId);
  const entry = catalog.gifts[giftKey] || catalog.gifts.GENERIC;
  const categoryKey = entry.category || "GENERIC";
  const category = categories.categories[categoryKey] || categories.categories.GENERIC;

  const coinTier = resolveTierFromCoins(totalCoins);
  const catalogTier = safeString(entry.defaultTier, "T1").toUpperCase();
  const tier = pickHigherTier(coinTier, catalogTier);
  const priority = Math.max(
    toNumber(entry.priority, 1),
    toNumber((tiers.priorityByTier || {})[tier], 1)
  );

  const care = safeString(entry.care || category.care, "SUPPORT").toUpperCase();
  const careMeta = careMap.groups[care] || careMap.groups.SUPPORT;
  const careEffects = effects.byCare[care] || effects.byCare.SUPPORT;
  const tierEffects = effects.byTier[tier] || effects.byTier.T1;

  const bowlBase = bowlMap.byTier[tier] || bowlMap.byTier.T1;
  const bowlCfg = entry.bowl || {};
  const fillMul = toNumber(bowlCfg.fillMul, 1);
  const bowl = {
    food: bowlCfg.food !== false,
    water: Math.round(toNumber(bowlBase.water, 0) * fillMul),
    fill: Math.round(toNumber(bowlBase.fill, 0) * fillMul * Math.min(count, 20)),
    specialFood: bowlMap.specialFoodByKey[giftKey] || (bowlCfg.special ? `${giftKey.toLowerCase()}_special` : null),
    bias: careMeta.bowlBias || "food"
  };

  const miaPoints = computeMiaPoints(totalCoins);
  const xpCfg = rewards.xp || {};
  const xpMul = entry.xp || {};
  const xp = {
    viewer: Math.round(totalCoins * toNumber(xpCfg.viewerPerCoin, 1) * toNumber(xpMul.viewerMul, 1)),
    community: Math.round(totalCoins * toNumber(xpCfg.communityPerCoin, 0.25) * toNumber(xpMul.communityMul, 1)),
    koj: Math.round(totalCoins * toNumber(xpCfg.kojPerCoin, 0.5) * toNumber(xpMul.kojMul, 1)),
    streamer: Math.round(totalCoins * toNumber(xpCfg.streamerPerCoin, 0.1))
  };

  const videoTier = videoMap.byTier[tier] || videoMap.byTier.T1;
  const videoFamily = entry.video?.family || "generic";
  const video = {
    tierPool: entry.video?.preferTier || videoTier.pool || tier,
    family: videoFamily,
    preferKeys: (videoMap.byFamily[videoFamily] || videoMap.byFamily.generic).preferKeys || [],
    maxMs: videoTier.maxMs,
    volume: tierEffects.volume,
    animation: tierEffects.animation,
    fx: tierEffects.fx || []
  };

  const overlayTier = overlayMap.byTier[tier] || overlayMap.byTier.T1;
  const overlayDefaults = overlayMap.defaults || {};
  const overlayCfg = entry.overlay || {};
  const overlayText = renderTemplate(overlayCfg.template, {
    user: displayName,
    gift: entry.label || giftNameRaw || giftKey,
    count
  });
  const overlay = {
    text: overlayText,
    color: overlayCfg.color || "#9b8cff",
    style: overlayCfg.style || "soft",
    icon: overlayCfg.icon || "🎁",
    position: overlayDefaults.position || "bottom-center",
    displayMs: overlayTier.displayMs || overlayDefaults.displayMs || 4500,
    animation: overlayTier.animation || overlayDefaults.animation || "fade_up",
    showCoins: false,
    showMiaPoints: overlayDefaults.showMiaPoints !== false,
    miaPoints
  };

  const voiceTier = voiceMap.byTier[tier] || voiceMap.byTier.T1;
  const voiceCare = voiceMap.byCare[care] || {};
  const voiceCfg = entry.voice || {};
  const voice = {
    speak: voiceTier.speak !== false && tier !== "T0",
    owner: voiceCfg.owner || voiceCare.ownerBias || voiceTier.owner || "kojnozout",
    tone: voiceCfg.tone || voiceTier.style || "thanks",
    style: voiceTier.style || "thanks"
  };

  const share =
    shareMap.byKey[giftKey] ||
    shareMap.byTier[tier] ||
    { shareHint: null };

  const future = {
    inventory: entry.rewards || [],
    economyHooks: ["inventory", "backpack", "currency", "shop", "crafting", "world", "npc", "city", "house", "farm", "animals"],
    memoryHints: {
      favoriteGift: giftKey,
      careRole: care === "CARE" || care === "PET" ? "feeder" : "supporter"
    }
  };

  return {
    version: catalog.version || "1.0.0",
    platform,
    displayName,
    giftId,
    giftName: giftNameRaw || entry.label,
    giftKey,
    label: entry.label || giftNameRaw || giftKey,
    category: categoryKey,
    categoryMeta: category,
    tier,
    tierLabel: (tiers.labels || {})[tier] || tier,
    priority,
    count,
    unitCoins,
    totalCoins,
    miaPoints,
    care,
    careMeta,
    careEffects,
    bowl,
    video,
    overlay,
    voice,
    xp,
    share,
    rewards: entry.rewards || [],
    achievementIds: entry.achievements || [],
    effects: tierEffects,
    future,
    maps: {
      catalog: catalog.version,
      tiers: tiers.version,
      categories: categories.version
    }
  };
}

function listCatalogKeys() {
  return Object.keys(catalog.gifts || {});
}

module.exports = {
  MAP_DIR,
  resolveGift,
  normalizeGiftKey,
  normalizeKey,
  resolveTierFromCoins,
  computeMiaPoints,
  tierRank,
  listCatalogKeys,
  catalog,
  aliases,
  tiers,
  categories,
  effects,
  rewards,
  videoMap,
  overlayMap,
  voiceMap,
  careMap,
  bowlMap,
  shareMap,
  achievements
};
