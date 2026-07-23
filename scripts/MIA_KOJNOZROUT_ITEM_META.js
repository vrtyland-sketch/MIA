"use strict";

/**
 * Metadata itemů — kánon § batoh (Jablko, Granule, Lektvar, Obvaz, Kartáč, Míček, Útok…).
 */

function normalizeToken(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const ITEM_CATALOG = {
  snack: {
    id: "snack",
    label: "Svačina",
    power: 6,
    source: "gift",
    role: "food",
    feedHunger: 14,
    feedBowl: 4,
    feedWellbeing: 4
  },
  jablko: {
    id: "jablko",
    label: "Jablko",
    power: 5,
    source: "gift",
    role: "food",
    feedHunger: 12,
    feedBowl: 3,
    feedWellbeing: 5
  },
  granule: {
    id: "granule",
    label: "Granule",
    power: 7,
    source: "gift",
    role: "food",
    feedHunger: 16,
    feedBowl: 5,
    feedWellbeing: 4
  },
  feast: {
    id: "feast",
    label: "Hostina",
    power: 18,
    source: "gift",
    role: "food",
    feedHunger: 28,
    feedBowl: 11,
    feedWellbeing: 10
  },
  cheer: {
    id: "cheer",
    label: "Povzbuzovačka",
    power: 4,
    source: "comment",
    role: "comfort",
    feedHunger: 0,
    socialBoost: 8,
    feedWellbeing: 6
  },
  micek: {
    id: "micek",
    label: "Míček",
    power: 5,
    source: "comment",
    role: "comfort",
    socialBoost: 10,
    feedWellbeing: 8
  },
  kartac: {
    id: "kartac",
    label: "Kartáč",
    power: 4,
    source: "care",
    role: "care",
    careAction: "podrbat",
    socialBoost: 6,
    feedWellbeing: 9
  },
  spark: {
    id: "spark",
    label: "Jiskra",
    power: 2,
    source: "like",
    role: "comfort",
    socialBoost: 4,
    feedWellbeing: 2
  },
  boost: {
    id: "boost",
    label: "Boost",
    power: 12,
    source: "gift",
    role: "duel",
    feedHunger: 8,
    feedBowl: 3
  },
  utok: {
    id: "utok",
    label: "Útok",
    power: 14,
    source: "gift",
    role: "duel",
    feedHunger: 0,
    feedBowl: 0
  },
  posileni: {
    id: "posileni",
    label: "Posílení",
    power: 10,
    source: "gift",
    role: "duel",
    feedHunger: 0,
    feedBowl: 0
  },
  shield: {
    id: "shield",
    label: "Štít",
    power: 8,
    source: "gift",
    role: "heal",
    clearsAffliction: true,
    feedWellbeing: 12
  },
  lektvar: {
    id: "lektvar",
    label: "Lektvar",
    power: 9,
    source: "gift",
    role: "heal",
    clearsAffliction: true,
    feedWellbeing: 14
  },
  obvaz: {
    id: "obvaz",
    label: "Obvaz",
    power: 6,
    source: "gift",
    role: "heal",
    clearsAffliction: true,
    feedWellbeing: 10
  },
  // Rozšířený inventář — aréna / turnaj / péče
  ryba: {
    id: "ryba",
    label: "Ryba",
    power: 8,
    source: "gift",
    role: "food",
    feedHunger: 18,
    feedBowl: 6,
    feedWellbeing: 5
  },
  kolac: {
    id: "kolac",
    label: "Koláč",
    power: 9,
    source: "gift",
    role: "food",
    feedHunger: 15,
    feedBowl: 5,
    feedWellbeing: 8
  },
  energie: {
    id: "energie",
    label: "Energie",
    power: 11,
    source: "gift",
    role: "duel",
    feedHunger: 4,
    feedBowl: 2
  },
  koruna: {
    id: "koruna",
    label: "Koruna arény",
    power: 16,
    source: "gift",
    role: "duel",
    feedHunger: 0,
    feedBowl: 0
  },
  prapor: {
    id: "prapor",
    label: "Prapor platformy",
    power: 13,
    source: "gift",
    role: "duel",
    feedHunger: 0,
    feedBowl: 0
  },
  balzam: {
    id: "balzam",
    label: "Balzám",
    power: 7,
    source: "gift",
    role: "heal",
    clearsAffliction: true,
    feedWellbeing: 11
  },
  hvezda: {
    id: "hvezda",
    label: "Hvězda chatu",
    power: 5,
    source: "comment",
    role: "comfort",
    socialBoost: 12,
    feedWellbeing: 7
  },
  talisman: {
    id: "talisman",
    label: "Talisman",
    power: 10,
    source: "gift",
    role: "care",
    careAction: "pohladit",
    socialBoost: 8,
    feedWellbeing: 10
  },
  box: {
    id: "box",
    label: "Box",
    power: 15,
    source: "gift",
    role: "duel",
    feedHunger: 0,
    feedBowl: 0
  }
};

const ITEM_ALIASES = {
  snack: "snack",
  svacina: "snack",
  svačinka: "snack",
  jablko: "jablko",
  apple: "jablko",
  granule: "granule",
  krmivo: "granule",
  feast: "feast",
  hostina: "feast",
  cheer: "cheer",
  povzbuzovacka: "cheer",
  micek: "micek",
  micicek: "micek",
  mice: "micek",
  kartac: "kartac",
  kartace: "kartac",
  brush: "kartac",
  spark: "spark",
  jiskra: "spark",
  boost: "boost",
  utok: "utok",
  attack: "utok",
  posileni: "posileni",
  posílení: "posileni",
  posil: "posileni",
  shield: "shield",
  stit: "shield",
  lektvar: "lektvar",
  lek: "lektvar",
  leky: "lektvar",
  obvaz: "obvaz",
  bandage: "obvaz",
  ryba: "ryba",
  fish: "ryba",
  kolac: "kolac",
  cake: "kolac",
  energie: "energie",
  energy: "energie",
  koruna: "koruna",
  crown: "koruna",
  prapor: "prapor",
  flag: "prapor",
  balzam: "balzam",
  balm: "balzam",
  hvezda: "hvezda",
  star: "hvezda",
  talisman: "talisman",
  box: "box",
  krabice: "box",
  bedna: "box"
};

const FOOD_ITEM_IDS = ["snack", "feast", "jablko", "granule", "ryba", "kolac"];
const HEAL_ITEM_IDS = ["shield", "lektvar", "obvaz", "balzam"];
const COMFORT_ITEM_IDS = ["cheer", "spark", "micek", "hvezda"];
const CARE_ITEM_IDS = ["kartac", "talisman"];
const DUEL_ITEM_IDS = ["boost", "utok", "posileni", "energie", "koruna", "prapor", "box"];

function resolveItemAlias(token = "") {
  const norm = normalizeToken(token);
  if (!norm) return null;
  return ITEM_ALIASES[norm] || (ITEM_CATALOG[norm] ? norm : null);
}

function getItemDef(itemId = "") {
  const resolved = resolveItemAlias(itemId) || itemId;
  return ITEM_CATALOG[resolved] || null;
}

function isFoodItem(itemId = "") {
  const def = getItemDef(itemId);
  return Boolean(def && def.role === "food");
}

function isHealItem(itemId = "") {
  const def = getItemDef(itemId);
  return Boolean(def && def.role === "heal");
}

function isComfortItem(itemId = "") {
  const def = getItemDef(itemId);
  return Boolean(def && def.role === "comfort");
}

function isCareItem(itemId = "") {
  const def = getItemDef(itemId);
  return Boolean(def && def.role === "care");
}

function isDuelItem(itemId = "") {
  const def = getItemDef(itemId);
  return Boolean(def && def.role === "duel");
}

function listUserFoodItems(userItems = []) {
  return (userItems || []).filter((row) => isFoodItem(row.id));
}

function listUserHealItems(userItems = []) {
  return (userItems || []).filter((row) => isHealItem(row.id));
}

function rollCanonGiftVariant(baseItem = {}) {
  const roll = Math.random();
  if (baseItem.id === "snack" && roll < 0.42) {
    if (roll < 0.12) return { ...ITEM_CATALOG.ryba };
    return roll < 0.27 ? { ...ITEM_CATALOG.jablko } : { ...ITEM_CATALOG.granule };
  }
  if (baseItem.id === "feast" && roll < 0.28) {
    return { ...ITEM_CATALOG.kolac };
  }
  if (baseItem.id === "shield" && roll < 0.35) {
    if (roll < 0.12) return { ...ITEM_CATALOG.balzam };
    return roll < 0.24 ? { ...ITEM_CATALOG.lektvar } : { ...ITEM_CATALOG.obvaz };
  }
  if (baseItem.id === "boost" && roll < 0.42) {
    if (roll < 0.1) return { ...ITEM_CATALOG.box };
    if (roll < 0.18) return { ...ITEM_CATALOG.koruna };
    if (roll < 0.26) return { ...ITEM_CATALOG.prapor };
    if (roll < 0.32) return { ...ITEM_CATALOG.energie };
    return roll < 0.37 ? { ...ITEM_CATALOG.utok } : { ...ITEM_CATALOG.posileni };
  }
  if (baseItem.id === "cheer" && roll < 0.28) {
    return roll < 0.14 ? { ...ITEM_CATALOG.hvezda } : { ...ITEM_CATALOG.micek };
  }
  return baseItem;
}

module.exports = {
  ITEM_CATALOG,
  ITEM_ALIASES,
  FOOD_ITEM_IDS,
  HEAL_ITEM_IDS,
  COMFORT_ITEM_IDS,
  CARE_ITEM_IDS,
  DUEL_ITEM_IDS,
  resolveItemAlias,
  getItemDef,
  isFoodItem,
  isHealItem,
  isComfortItem,
  isCareItem,
  isDuelItem,
  listUserFoodItems,
  listUserHealItems,
  rollCanonGiftVariant
};
