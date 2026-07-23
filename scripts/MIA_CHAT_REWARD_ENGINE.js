"use strict";

/**
 * Interaktivní chat odměny.
 * Interně: dárek zvyšuje váhu šance.
 * Veřejně: nikdy „zaplaceno“ / „paywall“ — jen odměna / šance po dárku.
 */

const itemMeta = require("./MIA_KOJNOZROUT_ITEM_META");
const roster = require("./MIA_KOJ_ROSTER");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Per-user recent gift weight (session). */
const recentGiftWeight = new Map();

function noteGift(userLabel = "", miaPoints = 0) {
  const key = safeString(userLabel, "anon").toLowerCase();
  const prev = recentGiftWeight.get(key) || { gifts: 0, points: 0, at: 0 };
  const now = Date.now();
  const fresh = now - prev.at < 10 * 60 * 1000 ? prev : { gifts: 0, points: 0, at: now };
  fresh.gifts += 1;
  fresh.points += Math.max(0, toNumber(miaPoints, 0));
  fresh.at = now;
  recentGiftWeight.set(key, fresh);
  return fresh;
}

function getGiftWeight(userLabel = "") {
  const key = safeString(userLabel, "anon").toLowerCase();
  const row = recentGiftWeight.get(key);
  if (!row) return { gifts: 0, points: 0 };
  if (Date.now() - row.at > 10 * 60 * 1000) {
    recentGiftWeight.delete(key);
    return { gifts: 0, points: 0 };
  }
  return row;
}

function buildPublicRewardLine(platform, reward, itemLabel = "") {
  const profile = roster.getKojProfile(platform);
  const koj = profile.name || "Kojnožrout";
  if (reward.rewardId === "item_drop" && itemLabel) {
    return `${koj} ti hází do batohu: ${itemLabel}. Dárek zvyšuje šanci na odměnu.`;
  }
  if (reward.rewardId === "combat_bite") {
    return `${koj} cítí boj — výzva je ve vzduchu. Dárek zvyšuje šanci na bojovou odměnu.`;
  }
  if (reward.rewardId === "love_pulse") {
    return `${koj} posílá love pulse. Dárek zvyšuje šanci na love odměnu.`;
  }
  if (reward.rewardId === "play_spark") {
    return `${koj} jiskří — hra je otevřená. Dárek zvyšuje šanci na herní odměnu.`;
  }
  if (reward.rewardId === "arena_boost") {
    return `${koj} tlačí stack arény pro svou platformu. Dárek zvyšuje šanci na boost.`;
  }
  if (reward.rewardId === "special_lane") {
    return `${koj} spouští speciál lane. Dárek zvyšuje šanci na speciální odměnu.`;
  }
  return `${koj} reaguje. Dárek zvyšuje šanci na odměnu.`;
}

/**
 * Vyhodnoť interaktivní odměnu pro chat/gift event.
 * @returns {{ hit, reward, item, line, platform, hook }}
 */
function evaluateChatReward({
  platform = "tiktok",
  eventType = "COMMENT",
  message = "",
  userLabel = "",
  miaPoints = 0,
  backpackModule = null,
  backpackState = null
} = {}) {
  const plat = safeString(platform, "tiktok").toLowerCase();
  const type = safeString(eventType, "COMMENT").toUpperCase();
  const weight = getGiftWeight(userLabel);

  if (type === "GIFT") {
    noteGift(userLabel, miaPoints);
  }

  const hook = roster.matchChatHook(message, plat);
  const rewardId = roster.resolveHookDomain(hook || "");
  const roll = roster.rollReward({
    rewardId,
    miaPoints: type === "GIFT" ? miaPoints : weight.points,
    eventType: type,
    recentGifts: weight.gifts + (type === "GIFT" ? 0 : 0)
  });

  // Bez háčku a bez dárku — nižší frekvence náhodných odměn.
  if (!hook && type === "COMMENT" && Math.random() > 0.12) {
    return { hit: false, reward: roll, item: null, line: "", platform: plat, hook: null };
  }

  if (!roll.hit) {
    return { hit: false, reward: roll, item: null, line: "", platform: plat, hook };
  }

  let item = null;
  let itemLabel = "";
  let nextBackpack = backpackState;

  if (roll.rewardId === "item_drop" && backpackModule && backpackState) {
    const itemId = roster.pickBiasedItemId(plat);
    const def = itemMeta.getItemDef(itemId) || itemMeta.ITEM_CATALOG.snack;
    item = { ...def };
    itemLabel = def.label || def.id;
    if (typeof backpackModule.addItemToBackpack === "function") {
      nextBackpack = backpackModule.addItemToBackpack(
        backpackState,
        userLabel,
        item,
        { source: "chat_reward", platform: plat }
      );
    }
  }

  const line = buildPublicRewardLine(plat, roll, itemLabel);
  return {
    hit: true,
    reward: roll,
    item,
    line,
    platform: plat,
    hook,
    backpackState: nextBackpack,
    arenaBoost:
      roll.rewardId === "arena_boost" ? Math.max(5, Math.round(toNumber(miaPoints, 0) * 0.15) || 8) : 0
  };
}

module.exports = {
  noteGift,
  getGiftWeight,
  evaluateChatReward,
  buildPublicRewardLine
};
