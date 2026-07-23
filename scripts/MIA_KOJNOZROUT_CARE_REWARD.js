"use strict";

/**
 * Odměny do batohu za CARE aktivitu (kánon § batoh — péče přidává zdroje).
 */

const { addItemToBackpack } = require("./MIA_KOJNOZROUT_BACKPACK");
const { ITEM_CATALOG } = require("./MIA_KOJNOZROUT_ITEM_META");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function rollCareReward(careActionId = "") {
  const action = safeString(careActionId, "pozornost");
  const roll = Math.random();

  if (action === "podrbat") {
    if (roll < 0.28) return { ...ITEM_CATALOG.kartac };
    if (roll < 0.48) return { ...ITEM_CATALOG.cheer };
  }

  if (action === "lecit") {
    if (roll < 0.22) return { ...ITEM_CATALOG.obvaz };
    if (roll < 0.38) return { ...ITEM_CATALOG.lektvar };
  }

  if (action === "nakrmit") {
    if (roll < 0.32) return { ...ITEM_CATALOG.jablko };
    if (roll < 0.52) return { ...ITEM_CATALOG.granule };
  }

  if (action === "vencit" && roll < 0.25) {
    return { ...ITEM_CATALOG.micek };
  }

  if (action === "uklidnit" && roll < 0.2) {
    return { ...ITEM_CATALOG.cheer };
  }

  if (roll < 0.18) return { ...ITEM_CATALOG.spark };
  if (roll < 0.08) return { ...ITEM_CATALOG.cheer };

  return null;
}

function applyCareReward(backpackState = {}, userLabel = "", careActionId = "") {
  const item = rollCareReward(careActionId);
  if (!item) {
    return { state: backpackState, item: null, granted: false };
  }

  const state = addItemToBackpack(backpackState, userLabel, item, {
    source: "care"
  });

  return { state, item, granted: true };
}

function buildCareRewardSpeech(userLabel = "", item = null) {
  if (!item) return "";
  const name = safeString(userLabel, "kamaráde").split(/\s+/)[0];
  return `${name}, za péči dostáváš ${item.label} do batohu!`;
}

module.exports = {
  rollCareReward,
  applyCareReward,
  buildCareRewardSpeech
};
