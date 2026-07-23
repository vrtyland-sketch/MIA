"use strict";

/**
 * Co komunita může pro Kojnožrouta udělat podle vitals stavu.
 * Zobrazuje se v overlay / na příkaz pece.
 */

const { getUserBackpackView } = require("./MIA_KOJNOZROUT_BACKPACK");
const {
  isFoodItem,
  isHealItem,
  isComfortItem,
  isCareItem,
  getItemDef,
  listUserFoodItems,
  listUserHealItems
} = require("./MIA_KOJNOZROUT_ITEM_META");
const {
  ensureCareQuest,
  getCareQuestSnapshot,
  pickQuestForNeed
} = require("./MIA_KOJNOZROUT_CARE_QUEST");
const { applyCareAction, CARE_ACTIONS } = require("./MIA_KOJNOZROUT_CARE");
const {
  applyCareBondImpact,
  careImpactForAction,
  getBondSnapshot
} = require("./MIA_KOJNOZROUT_BOND");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const NEED_MATRIX = {
  hungry: {
    id: "hungry",
    label: "Má hlad",
    emoji: "🍽️",
    priority: 70,
    description: "Potřebuje jídlo do misky nebo z batohu."
  },
  sad: {
    id: "sad",
    label: "Je smutný",
    emoji: "😢",
    priority: 65,
    description: "Chybí mu aktivita a pozornost komunity."
  },
  sick: {
    id: "sick",
    label: "Je nemocný",
    emoji: "🤢",
    priority: 90,
    description: "Potřebuje léčbu, štít nebo silnější gift."
  },
  annoyed: {
    id: "annoyed",
    label: "Je naštvaný",
    emoji: "😤",
    priority: 75,
    description: "Má hlad a málo jídla — rychle nakrm."
  },
  sleepy: {
    id: "sleepy",
    label: "Spí",
    emoji: "😴",
    priority: 50,
    description: "Odpočívá, ale reaguje na gift a chat."
  },
  happy: {
    id: "happy",
    label: "Spokojený",
    emoji: "💚",
    priority: 10,
    description: "Komunita se o něj stará."
  },
  restless: {
    id: "restless",
    label: "Potřebuje ven",
    emoji: "🐾",
    priority: 58,
    description: "Málo energie — venčení nebo procházka."
  }
};

function resolvePrimaryNeed(kojnozoutState = {}) {
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const affliction = safeString(kojnozoutState.affliction).toLowerCase();
  const hunger = toNumber(kojnozoutState.hunger, 0);
  const sleepDepth = toNumber(kojnozoutState?.vitals?.sleepDepth, 0);
  const energy = toNumber(kojnozoutState.energy, 100);
  const isSleeping = Boolean(kojnozoutState.isSleeping) || sleepDepth >= 55;

  if (isSleeping || mood === "sleepy") return "sleepy";
  if (affliction === "sick" || mood === "sick") return "sick";
  if (affliction === "sad" || mood === "sad") return "sad";
  if (affliction === "annoyed" || mood === "annoyed") return "annoyed";
  if (mood === "hungry" || hunger >= 52) return "hungry";

  try {
    const walkModule = require("./MIA_KOJNOZROUT_WALK");
    if (typeof walkModule.resolveWalkNeed === "function" && walkModule.resolveWalkNeed(kojnozoutState)) {
      return "restless";
    }
  } catch (_err) {
    /* optional module */
  }

  if (mood === "happy" || mood === "excited" || mood === "full") return "happy";
  if (hunger >= 40) return "hungry";
  return "happy";
}

function option(id, label, command, type, extra = {}) {
  return {
    id,
    label,
    command,
    type,
    available: extra.available !== false,
    reason: safeString(extra.reason) || null,
    itemId: safeString(extra.itemId) || null
  };
}

function buildNeedOptions(need, userView = {}, duelActive = false) {
  const options = [];
  const foodItems = listUserFoodItems(userView.items || []);
  const healItems = listUserHealItems(userView.items || []);

  if (need === "hungry" || need === "annoyed") {
    options.push(
      option("feed_gift", "Pošli gift do misky", null, "gift", { available: true })
    );

    for (const item of foodItems) {
      options.push(
        option(
          `feed_${item.id}`,
          `Dej ${item.label} z batohu`,
          `item feed ${item.id}`,
          "backpack_food",
          { available: true, itemId: item.id }
        )
      );
    }

    if (foodItems.length === 0) {
      options.push(
        option(
          "earn_snack",
          "Získej svačinu: gift / chat / like",
          "item",
          "earn",
          { available: true, reason: "batoh_prázdný" }
        )
      );
    }

    options.push(
      option("care_nakrm", "Napiš: nakrm koj", "nakrm koj", "care_chat", {
        available: true
      })
    );
  }

  if (need === "sad") {
    options.push(
      option("care_scratch", "Podrbi: podrbi koj", "podrbi koj", "care_chat"),
      option("care_attention", "Pozornost: pozornost koj", "pozornost koj", "care_chat"),
      option("care_calm", "Uklidni: uklidni koj", "uklidni koj", "care_chat"),
      option("comfort_cheer", "Napiš do chatu (povzbudí)", null, "chat")
    );

    const cheer = (userView.items || []).find((row) => row.id === "cheer");
    if (cheer) {
      options.push(
        option("feed_cheer", "Dej povzbuzovačku", "item feed cheer", "backpack_comfort", {
          itemId: "cheer"
        })
      );
    }
  }

  if (need === "sick") {
    options.push(
      option("care_heal", "Leč: leč koj", "lec koj", "care_chat"),
      option("feed_gift_t2", "Gift T2+ do misky", null, "gift")
    );

    for (const item of foodItems) {
      options.push(
        option(
          `feed_${item.id}`,
          `Nakrm: item feed ${item.id}`,
          `item feed ${item.id}`,
          "backpack_food",
          { itemId: item.id }
        )
      );
    }

    for (const item of healItems) {
      options.push(
        option(
          `heal_${item.id}`,
          `Použij ${item.label}`,
          `item feed ${item.id}`,
          "backpack_heal",
          { itemId: item.id }
        )
      );
    }
  }

  if (need === "sleepy") {
    options.push(
      option("wake_gift", "Gift probudí a nakrmí", null, "gift"),
      option("wake_chat", "Napiš ahoj koj", "ahoj koj", "chat")
    );
  }

  if (need === "restless") {
    options.push(
      option("care_walk", "Venč: venc koj", "venc koj", "care_chat"),
      option("care_walk_alt", "Procházka: procházka koj", "procházka koj", "care_chat"),
      option("feed_gift_energy", "Gift dodá energii", null, "gift")
    );
  }

  if (need === "happy") {
    options.push(
      option("maintain_gift", "Udržuj misku gifty", null, "gift"),
      option("show_backpack", "Zkontroluj batoh", "item · batoh · položka", "info")
    );
  }

  if (duelActive) {
    options.push(
      option("duel_use", "V duelu: item use boost", "item use boost", "duel", {
        available: true
      })
    );
  }

  return options;
}

function syncCareContext(kojnozoutState = {}, need = "") {
  if (need === "happy" || need === "sleepy") {
    return { state: kojnozoutState, quest: kojnozoutState.careQuest || null };
  }
  return ensureCareQuest(kojnozoutState, need);
}

function buildCareOpportunities(ctx = {}) {
  const kojnozoutState = ctx.kojnozoutState || {};
  const backpackState = ctx.backpackState || {};
  const userLabel = safeString(ctx.userLabel);
  const duelActive = Boolean(ctx.duelState?.active);

  const need = resolvePrimaryNeed(kojnozoutState);
  const needMeta = NEED_MATRIX[need] || NEED_MATRIX.happy;
  const bond = getBondSnapshot(kojnozoutState);

  const userView = userLabel
    ? getUserBackpackView(backpackState, userLabel)
    : { items: [], itemCount: 0 };

  const options = buildNeedOptions(need, userView, duelActive);
  let quest = getCareQuestSnapshot(kojnozoutState);
  const questDef = pickQuestForNeed(need);

  if (!quest && questDef && need !== "happy" && need !== "sleepy") {
    quest = {
      active: true,
      type: questDef.id,
      need: questDef.need,
      label: questDef.label,
      hint: questDef.hint,
      progress: 0,
      target: questDef.target,
      percent: 0,
      preview: true
    };
  }

  if (
    questDef &&
    (need === "hungry" || need === "sad") &&
    listUserFoodItems(userView.items).length === 0
  ) {
    options.push(
      option(
        "community_quest",
        `Úkol: ${questDef.label}`,
        questDef.hint,
        "quest",
        { available: true }
      )
    );
  }

  return {
    need,
    needLabel: needMeta.label,
    needEmoji: needMeta.emoji,
    needDescription: needMeta.description,
    mood: safeString(kojnozoutState.mood, "idle"),
    hunger: Math.round(toNumber(kojnozoutState.hunger, 0)),
    bowlPercent: Math.round(toNumber(kojnozoutState.bowlPercent, 0)),
    options,
    quest,
    bond,
    behaviorHint: describeBehavior(need, kojnozoutState, bond),
    updatedAt: Date.now()
  };
}

function describeBehavior(need, state = {}, bondSnapshot = null) {
  let hint;
  switch (need) {
    case "sleepy":
      hint = "Spí v rohu, ale gift nebo chat ho částečně probudí.";
      break;
    case "sick":
      hint = "Reaguje pomaleji — preferuj léčbu nebo hostinu.";
      break;
    case "sad":
      hint = "Potřebuje pozornost chatu, ne jen ticho.";
      break;
    case "annoyed":
      hint = "Hlad + prázdno v misce = podrážděný. Rychlé jídlo pomůže.";
      break;
    case "hungry":
      hint = "Čeká na jídlo — gift, batoh nebo komunitní úkol.";
      break;
    default:
      hint = "V klidu sleduje stream.";
  }

  if (!bondSnapshot) return hint;

  if (bondSnapshot.neglectLevel === "critical") {
    return `${hint} Zanedbávání kritické — komunita musí pečovat.`;
  }
  if (bondSnapshot.neglectLevel === "high") {
    return `${hint} Roste zanedbání — někdo ať se postará.`;
  }
  if (bondSnapshot.neglectLevel === "moderate") {
    return `${hint} Občasná péče udrží vztah silný.`;
  }

  if (bondSnapshot.bondTier === "family" || bondSnapshot.bondTier === "legend") {
    return `${hint} Silný vztah s komunitou (${bondSnapshot.careBond} bond).`;
  }

  return hint;
}

function applyFeedFromItem(kojnozoutState = {}, item = {}) {
  const def = getItemDef(item.id) || {};
  const next = { ...kojnozoutState };
  const vitals =
    next.vitals && typeof next.vitals === "object" ? { ...next.vitals } : {};

  if (isFoodItem(item.id)) {
    next.hunger = clamp(toNumber(next.hunger, 0) - toNumber(def.feedHunger, item.power || 6), 0, 100);
    next.bowlPercent = clamp(
      toNumber(next.bowlPercent, 0) + toNumber(def.feedBowl, 3),
      0,
      100
    );
    vitals.wellbeing = clamp(
      toNumber(vitals.wellbeing, 0) + toNumber(def.feedWellbeing, 4),
      -100,
      100
    );
  }

  if (isComfortItem(item.id)) {
    next.socialState = clamp(
      toNumber(next.socialState, 0) + toNumber(def.socialBoost, 4),
      -100,
      100
    );
    vitals.wellbeing = clamp(
      toNumber(vitals.wellbeing, 0) + toNumber(def.feedWellbeing, 3),
      -100,
      100
    );
  }

  if (isHealItem(item.id) || def.clearsAffliction) {
    next.affliction = null;
    vitals.affliction = null;
    vitals.wellbeing = clamp(toNumber(vitals.wellbeing, 0) + 12, -100, 100);
  }

  if (toNumber(def.feedHunger, 0) > 0 && !isFoodItem(item.id)) {
    next.hunger = clamp(toNumber(next.hunger, 0) - toNumber(def.feedHunger, 0), 0, 100);
  }

  next.vitals = vitals;
  next.behavior = "feed_react";
  next.lastFedAt = Date.now();

  let result = next;
  if (isCareItem(item.id) && def.careAction && CARE_ACTIONS[def.careAction]) {
    return applyCareAction(result, CARE_ACTIONS[def.careAction]);
  }

  return applyCareBondImpact(result, careImpactForAction("feed_item"));
}

function buildPeceOverlayPayload(opportunities = {}, userLabel = "") {
  const lines = (opportunities.options || [])
    .filter((row) => row.available)
    .slice(0, 4)
    .map((row) => (row.command ? `${row.label} → ${row.command}` : row.label));

  const quest = opportunities.quest;
  let text = `${opportunities.needEmoji || ""} ${opportunities.needLabel}. ${opportunities.needDescription || ""}`.trim();

  if (quest?.active) {
    text += ` Úkol: ${quest.progress}/${quest.target} — ${quest.hint}.`;
  }

  return {
    owner: "kojnozout",
    route: "community",
    stage: "care_menu",
    title: "Péče · Kojnožrout",
    text,
    subtext: lines.join(" · ") || "Gift · item feed · pece",
    user: safeString(userLabel),
    mood: opportunities.mood || "idle",
    meta: {
      careOpportunities: true,
      need: opportunities.need
    },
    holdMs: 11000
  };
}

module.exports = {
  NEED_MATRIX,
  resolvePrimaryNeed,
  buildCareOpportunities,
  applyFeedFromItem,
  buildPeceOverlayPayload,
  syncCareContext
};
