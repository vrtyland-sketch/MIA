"use strict";

/**
 * Logika + vizuální efekt použití itemu z batohu.
 * Mapuje role/id → nálada, prop, battle póza, projectile (arena FX).
 */

const { applyFeedFromItem } = require("./MIA_KOJNOZROUT_CARE_OPPORTUNITIES");
const {
  getItemDef,
  isFoodItem,
  isHealItem,
  isComfortItem,
  isCareItem,
  isDuelItem
} = require("./MIA_KOJNOZROUT_ITEM_META");

const ITEM_USE_MS = 6500;

const ROLE_DEFAULTS = {
  food: {
    role: "food",
    mood: "eating",
    spriteAsset: "eating",
    prop: "bowl",
    behavior: "feeding",
    pose: null,
    cycleId: null,
    projectile: "food",
    panelClass: "eating"
  },
  heal: {
    role: "heal",
    mood: "heal-glow",
    spriteAsset: "heal-glow",
    prop: "hand",
    behavior: "care_react",
    pose: "item_heal",
    cycleId: "battle-defend",
    projectile: "heart",
    panelClass: "gift"
  },
  comfort: {
    role: "comfort",
    mood: "play",
    spriteAsset: "play",
    prop: "ball",
    behavior: "play_with_chat",
    pose: null,
    cycleId: null,
    projectile: "star",
    panelClass: "combo"
  },
  care: {
    role: "care",
    mood: "bond-warm",
    spriteAsset: "bond-warm",
    prop: "hand",
    behavior: "care_react",
    pose: "item_heal",
    cycleId: "battle-defend",
    projectile: "heart",
    panelClass: "gift"
  },
  duel: {
    role: "duel",
    mood: "duel-ready",
    spriteAsset: "duel-ready",
    prop: null,
    behavior: "item_use",
    pose: "item_box",
    cycleId: "battle-attack",
    projectile: "box",
    panelClass: "duel"
  }
};

const ITEM_OVERRIDES = {
  utok: { mood: "duel-ready", spriteAsset: "duel-ready", pose: "attack", cycleId: "battle-attack", projectile: "spark" },
  posileni: { mood: "happy", spriteAsset: "happy", pose: "item_buff", cycleId: "battle-buff", projectile: "star" },
  boost: { mood: "excited", spriteAsset: "excited", pose: "item_buff", cycleId: "battle-buff", projectile: "orb" },
  energie: { mood: "excited", spriteAsset: "excited", pose: "item_buff", cycleId: "battle-buff", projectile: "spark" },
  koruna: { mood: "celebrate", spriteAsset: "celebrate", pose: "item_buff", cycleId: "battle-buff", projectile: "star" },
  prapor: { mood: "cheer-loud", spriteAsset: "cheer-loud", pose: "item_buff", cycleId: "battle-buff", projectile: "star" },
  box: { mood: "duel-ready", spriteAsset: "duel-ready", pose: "item_box", cycleId: "battle-attack", projectile: "box" },
  micek: { prop: "ball", mood: "play", spriteAsset: "play" },
  kartac: { prop: "hand", mood: "bond-warm", spriteAsset: "bond-warm", behavior: "care_react" },
  talisman: { prop: "hand", mood: "bond-warm", spriteAsset: "bond-warm", behavior: "care_react" },
  spark: { mood: "excited", spriteAsset: "excited", projectile: "spark" },
  cheer: { mood: "cheer-loud", spriteAsset: "cheer-loud", prop: "ball" },
  hvezda: { mood: "love", spriteAsset: "love", projectile: "star" },
  feast: { mood: "eating", spriteAsset: "eating", prop: "bowl" },
  granule: { mood: "munch", spriteAsset: "munch", prop: "bowl" },
  jablko: { mood: "munch", spriteAsset: "munch", prop: "bowl" },
  snack: { mood: "snack", spriteAsset: "snack", prop: "bowl" },
  ryba: { mood: "eating", spriteAsset: "eating", prop: "bowl" },
  kolac: { mood: "eating", spriteAsset: "eating", prop: "bowl" },
  lektvar: { mood: "heal-glow", spriteAsset: "heal-glow", prop: "hand", pose: "item_heal", cycleId: "battle-defend" },
  obvaz: { mood: "heal-glow", spriteAsset: "heal-glow", prop: "hand", pose: "item_heal", cycleId: "battle-defend" },
  shield: { mood: "guard", spriteAsset: "guard", pose: "defend", cycleId: "battle-defend", projectile: "heart", prop: null },
  balzam: { mood: "heal-glow", spriteAsset: "heal-glow", prop: "hand", pose: "item_heal", cycleId: "battle-defend" }
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveItemRole(item = {}) {
  const def = getItemDef(item.id) || item;
  return safeString(def.role, "comfort");
}

function resolveItemUseEffect(item = {}, ctx = {}) {
  const def = getItemDef(item.id) || item;
  const role = resolveItemRole(item);
  const base = { ...(ROLE_DEFAULTS[role] || ROLE_DEFAULTS.comfort) };
  const overrides = ITEM_OVERRIDES[item.id] || {};

  const effect = {
    ...base,
    ...overrides,
    itemId: safeString(item.id),
    itemLabel: safeString(item.label || def.label),
    power: toNumber(item.power, def.power || 0),
    duelActive: Boolean(ctx.duelActive),
    action: safeString(ctx.action, "use")
  };

  if (ctx.action === "feed" || isFoodItem(item.id)) {
    effect.role = "food";
    effect.action = "feed";
    if (!ITEM_OVERRIDES[item.id]) {
      effect.mood = "eating";
      effect.spriteAsset = "eating";
      effect.prop = "bowl";
      effect.behavior = "feeding";
    }
  }

  if (ctx.duelActive && isDuelItem(item.id)) {
    effect.role = "duel";
    if (!overrides.pose) {
      effect.pose = effect.pose || "item_box";
      effect.cycleId = effect.cycleId || "battle-attack";
    }
  }

  return effect;
}

function applyItemUseToState(kojnozoutState = {}, item = {}, ctx = {}) {
  if (!item?.id) return kojnozoutState;

  const effect = resolveItemUseEffect(item, ctx);
  const now = toNumber(ctx.now, Date.now());
  const def = getItemDef(item.id) || item;
  let next = applyFeedFromItem(kojnozoutState, item);

  if (!isFoodItem(item.id) && effect.role !== "food") {
    next = { ...next, behavior: effect.behavior || next.behavior };
    if (toNumber(def.feedHunger, 0) <= 0) {
      next.lastFedAt = toNumber(kojnozoutState.lastFedAt, 0);
    }
  }

  if (isDuelItem(item.id) && !ctx.duelActive) {
    next = { ...next };
    next.socialState = clamp(toNumber(next.socialState, 0) + 4, -100, 100);
    if (next.vitals && typeof next.vitals === "object") {
      next.vitals = {
        ...next.vitals,
        wellbeing: clamp(toNumber(next.vitals.wellbeing, 0) + 3, -100, 100)
      };
    }
  }

  if (effect.behavior && effect.behavior !== "feeding") {
    next = { ...next, behavior: effect.behavior };
  }

  if (effect.role === "care" || effect.role === "heal") {
    next = { ...next, lastCareAt: now };
  }

  next.lastItemUseAt = now;
  next.lastItemUse = buildItemUseRecord(item, effect, ctx, now);

  return next;
}

function buildItemUseRecord(item = {}, effect = {}, ctx = {}, now = Date.now()) {
  const holdMs = toNumber(ctx.holdMs, ITEM_USE_MS);
  return {
    at: now,
    holdUntil: now + holdMs,
    holdMs,
    userLabel: safeString(ctx.userLabel),
    itemId: safeString(item.id),
    itemLabel: safeString(item.label || effect.itemLabel),
    power: toNumber(item.power, effect.power || 0),
    duelActive: Boolean(ctx.duelActive),
    action: safeString(ctx.action, effect.action || "use"),
    effect: {
      role: effect.role,
      mood: effect.mood,
      spriteAsset: effect.spriteAsset,
      prop: effect.prop,
      behavior: effect.behavior,
      pose: effect.pose,
      cycleId: effect.cycleId,
      projectile: effect.projectile,
      panelClass: effect.panelClass
    }
  };
}

function buildItemUseSummary(item = {}, effect = {}, ctx = {}, now = Date.now()) {
  return buildItemUseRecord(item, effect, ctx, now);
}

function isItemUseActive(record = {}, now = Date.now()) {
  if (!record || typeof record !== "object") return false;
  const holdUntil = toNumber(record.holdUntil, 0);
  if (holdUntil > now) return true;
  const at = toNumber(record.at, 0);
  return at > 0 && now - at < ITEM_USE_MS;
}

function resolveActiveItemUse(state = {}, backpack = null, now = Date.now()) {
  const fromState = state?.lastItemUse;
  if (isItemUseActive(fromState, now)) return fromState;

  const fromBackpack = backpack?.display?.lastUseSummary;
  if (isItemUseActive(fromBackpack, now)) return fromBackpack;

  return null;
}

function buildItemUseOverlayPayload(item = {}, effect = {}, ctx = {}) {
  const user = safeString(ctx.userLabel, "Divák").split(/\s+/)[0];
  const duelActive = Boolean(ctx.duelActive);
  const action = safeString(ctx.action, effect.action || "use");

  const hints = {
    food: `${user} nakrmil Koje — ${effect.itemLabel || item.label}`,
    heal: `${user} vyléčil Koje — ${effect.itemLabel || item.label}`,
    comfort: `${user} povzbudil Koje — ${effect.itemLabel || item.label}`,
    care: `${user} pečuje o Koje — ${effect.itemLabel || item.label}`,
    duel: duelActive
      ? `${user} použil ${effect.itemLabel || item.label} · +${effect.power || item.power} bodů`
      : `${user} trénuje s ${effect.itemLabel || item.label}`
  };

  const stageMap = {
    feed: "item_feed",
    use: duelActive && effect.role === "duel" ? "item_duel" : "item_use"
  };

  return {
    owner: "kojnozout",
    route: "community",
    stage: stageMap[action] || "item_use",
    title: action === "feed" ? "Krmení z batohu" : "Item použit",
    text: hints[effect.role] || `${user} použil ${effect.itemLabel || item.label}`,
    subtext: effect.itemLabel || item.label,
    user: ctx.userLabel,
    mood: effect.mood || "happy",
    holdMs: toNumber(ctx.holdMs, ITEM_USE_MS),
    meta: {
      itemUse: true,
      itemId: item.id,
      itemAction: action,
      itemRole: effect.role,
      itemProp: effect.prop,
      itemPose: effect.pose,
      duelActive
    }
  };
}

module.exports = {
  ITEM_USE_MS,
  ROLE_DEFAULTS,
  ITEM_OVERRIDES,
  resolveItemRole,
  resolveItemUseEffect,
  applyItemUseToState,
  buildItemUseRecord,
  buildItemUseSummary,
  isItemUseActive,
  resolveActiveItemUse,
  buildItemUseOverlayPayload
};
