"use strict";

/**
 * Master Canon 0002 — entity categories (§6).
 */

const ENTITY_CATEGORY = Object.freeze({
  SYSTEM: "system",
  USER: "user",
  GAME: "game",
  GRAPHIC: "graphic",
  DATA: "data",
  AI: "ai"
});

const ENTITY_CATEGORY_LABELS = Object.freeze({
  [ENTITY_CATEGORY.SYSTEM]: "Systémové entity",
  [ENTITY_CATEGORY.USER]: "Uživatelské entity",
  [ENTITY_CATEGORY.GAME]: "Herní entity",
  [ENTITY_CATEGORY.GRAPHIC]: "Grafické entity",
  [ENTITY_CATEGORY.DATA]: "Datové entity",
  [ENTITY_CATEGORY.AI]: "AI entity"
});

function isEntityCategory(value) {
  return typeof value === "string" && Object.values(ENTITY_CATEGORY).includes(value);
}

module.exports = {
  ENTITY_CATEGORY,
  ENTITY_CATEGORY_LABELS,
  isEntityCategory
};
