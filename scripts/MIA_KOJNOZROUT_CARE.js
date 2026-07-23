"use strict";

/**
 * CARE doména — péče o Kojnožrouta (kánon §14).
 * Chat akce: podrbat, venčit, léčit, uklidnit, pozornost, nakrmit.
 */

const {
  applyCareBondImpact,
  careImpactForAction
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

function normalizeCommandText(message = "") {
  return safeString(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!?.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CARE_ACTIONS = Object.freeze({
  podrbat: {
    id: "podrbat",
    label: "Podrbání",
    bankKey: "koj_care_scratch",
    wellbeing: 10,
    socialState: 6,
    sleepDepth: -8,
    hunger: -2
  },
  vencit: {
    id: "vencit",
    label: "Venčení",
    bankKey: "koj_care_walk",
    energy: 14,
    wellbeing: 8,
    sleepDepth: -12,
    hunger: 4
  },
  lecit: {
    id: "lecit",
    label: "Léčení",
    bankKey: "koj_care_heal",
    clearAffliction: true,
    wellbeing: 18,
    hunger: -6
  },
  uklidnit: {
    id: "uklidnit",
    label: "Uklidnění",
    bankKey: "koj_care_calm",
    wellbeing: 12,
    socialState: 8,
    sleepDepth: -6
  },
  pozornost: {
    id: "pozornost",
    label: "Pozornost",
    bankKey: "koj_care_attention",
    socialState: 10,
    wellbeing: 6
  },
  nakrmit: {
    id: "nakrmit",
    label: "Krmení",
    bankKey: "koj_care_feed",
    hunger: -16,
    bowlPercent: 6,
    wellbeing: 5
  }
});

const CARE_VERB_PATTERNS = [
  {
    action: "podrbat",
    words: [
      "podrbat",
      "podrbit",
      "podrbi",
      "pohladit",
      "hladit",
      "drbani",
      "drb",
      "podrb",
      "mazlit",
      "pomazlit koj"
    ]
  },
  {
    action: "vencit",
    words: [
      "vencit",
      "venc",
      "prochazka",
      "projitka",
      "projit se",
      "projit",
      "ven s koj",
      "koj ven",
      "ven",
      "jdeme ven",
      "vencit koj"
    ]
  },
  {
    action: "lecit",
    words: ["lecit", "vylecit", "vylecit", "leky", "lektvar", "obvaz", "lek", "vylec", "lecit koj"]
  },
  {
    action: "uklidnit",
    words: ["uklidnit", "uklidni", "uklidni se", "klid", "uklidni koj", "uklidni ho"]
  },
  {
    action: "pozornost",
    words: ["pozornost", "ven pozornost", "pomazlit", "vsimni si", "koukni na koj"]
  },
  {
    action: "nakrmit",
    words: [
      "nakrmit",
      "nakrm",
      "dej najist",
      "papej",
      "krmim",
      "papani",
      "nakrm koj",
      "dej jidlo",
      "nakrmit kojnozrouta"
    ]
  }
];

function mentionsKojTarget(text = "") {
  return (
    text.includes("koj") ||
    text.includes("nozrout") ||
    text.includes("noz rout") ||
    text.includes("zroute") ||
    text.includes("zrout")
  );
}

function parseCareCommand(message = "") {
  const text = normalizeCommandText(message);
  if (!text) return null;

  for (const pattern of CARE_VERB_PATTERNS) {
    const hit = pattern.words.some((word) => text.includes(word));
    if (!hit) continue;

  if (mentionsKojTarget(text) || pattern.action === "nakrmit" || pattern.action === "vencit") {
      return { action: pattern.action, config: CARE_ACTIONS[pattern.action] };
    }
  }

  return null;
}

/**
 * Gift mapa care skupiny → CARE akce (pasivní, slabší než chat příkaz).
 * CARE/SUPPORT/LOVE/HELP/PET/HEAL/SPECIAL
 */
function resolveCareActionFromGiftCare(careGroup = "") {
  const care = safeString(careGroup).toUpperCase();
  const map = {
    CARE: "nakrmit",
    SUPPORT: "pozornost",
    LOVE: "podrbat",
    HELP: "uklidnit",
    PET: "podrbat",
    HEAL: "lecit",
    SPECIAL: "pozornost"
  };
  const actionId = map[care] || "";
  if (!actionId || !CARE_ACTIONS[actionId]) return null;
  return { action: actionId, config: CARE_ACTIONS[actionId] };
}

function scaleCareConfig(careConfig = {}, scale = 0.35) {
  const mul = Math.max(0.1, Math.min(1, toNumber(scale, 0.35)));
  const next = { ...careConfig, id: careConfig.id, label: careConfig.label };
  for (const key of [
    "wellbeing",
    "socialState",
    "sleepDepth",
    "hunger",
    "energy",
    "bowlPercent"
  ]) {
    if (careConfig[key] != null) {
      next[key] = Math.round(toNumber(careConfig[key], 0) * mul);
    }
  }
  // Gift HEAL jen lehce — plné léčení zůstává chat/item.
  if (careConfig.clearAffliction && mul >= 0.5) {
    next.clearAffliction = true;
  } else {
    next.clearAffliction = false;
  }
  return next;
}

function applyGiftMapCareAction(kojnozoutState = {}, support = {}) {
  const careGroup = safeString(
    support.giftCare || support.giftMap?.care || support.giftMapRuntime?.care
  );
  const resolved = resolveCareActionFromGiftCare(careGroup);
  if (!resolved?.config) {
    return { state: kojnozoutState, applied: false, action: null };
  }

  const priority = toNumber(
    support.giftPriority ?? support.giftMap?.priority,
    1
  );
  const scale = priority >= 8 ? 0.55 : priority >= 4 ? 0.4 : 0.3;
  const scaled = scaleCareConfig(resolved.config, scale);
  const state = applyCareAction(kojnozoutState, scaled);
  state.lastGiftCareAction = resolved.action;
  state.lastGiftCareGroup = careGroup.toUpperCase();
  return { state, applied: true, action: resolved.action, careGroup: careGroup.toUpperCase() };
}

function applyCareAction(kojnozoutState = {}, careConfig = {}) {
  const next = { ...kojnozoutState };
  const vitals =
    next.vitals && typeof next.vitals === "object"
      ? { ...next.vitals }
      : {};

  next.hunger = clamp(toNumber(next.hunger, 0) + toNumber(careConfig.hunger, 0), 0, 100);
  next.bowlPercent = clamp(
    toNumber(next.bowlPercent, 0) + toNumber(careConfig.bowlPercent, 0),
    0,
    100
  );
  next.socialState = clamp(
    toNumber(next.socialState, 0) + toNumber(careConfig.socialState, 0),
    -100,
    100
  );
  next.energy = clamp(toNumber(next.energy, 0) + toNumber(careConfig.energy, 0), 0, 100);
  vitals.sleepDepth = clamp(
    toNumber(vitals.sleepDepth, 0) + toNumber(careConfig.sleepDepth, 0),
    0,
    100
  );

  try {
    const longTerm = require("../core/koj-long-term-needs");
    if (typeof longTerm.applyCareToLongTermNeeds === "function") {
      longTerm.applyCareToLongTermNeeds(next, careConfig);
    }
  } catch (_err) {
    /* optional Phase 3 */
  }

  if (careConfig.clearAffliction) {
    next.affliction = null;
    vitals.affliction = null;
  }

  next.vitals = vitals;
  next.lastCareAt = Date.now();
  next.behavior = "care_react";

  const kojnozoutVitalsModule = safeRequireVitals();
  if (kojnozoutVitalsModule) {
    if (typeof kojnozoutVitalsModule.syncVitals === "function") {
      kojnozoutVitalsModule.syncVitals(next, {}, { minutesElapsed: 0 });
    }
    if (typeof kojnozoutVitalsModule.applyCareHealing === "function") {
      kojnozoutVitalsModule.applyCareHealing(next, careConfig);
      if (typeof kojnozoutVitalsModule.resolveExpressiveMood === "function") {
        next.mood = kojnozoutVitalsModule.resolveExpressiveMood(next, next.vitals || {});
      }
      next.affliction = next.vitals?.affliction || null;
    }
  }

  const actionId = safeString(careConfig.id, "pozornost");
  return applyCareBondImpact(next, careImpactForAction(actionId));
}

function safeRequireVitals() {
  try {
    return require("./MIA_KOJNOZROUT_VITALS");
  } catch (_err) {
    return null;
  }
}

function resolveVitalsBankKey(kojnozoutState = {}) {
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const affliction = safeString(kojnozoutState.affliction).toLowerCase();
  const vitalsModule = safeRequireVitals();

  if (affliction === "sick" || mood === "sick") {
    if (
      vitalsModule &&
      typeof vitalsModule.resolveSickReactionBankKey === "function"
    ) {
      return vitalsModule.resolveSickReactionBankKey(kojnozoutState.vitals || {});
    }
    return "koj_vitals_sick";
  }

  if (mood === "sleepy" || kojnozoutState.isSleeping) return "koj_vitals_sleepy";
  if (affliction === "sad" || mood === "sad") return "koj_vitals_sad";
  if (affliction === "annoyed" || mood === "annoyed") return "koj_vitals_annoyed";
  if (mood === "hungry" || toNumber(kojnozoutState.hunger, 0) >= 55) return "koj_vitals_hungry";
  if (mood === "full" || toNumber(kojnozoutState.bowlPercent, 0) >= 95) return "koj_full_bowl";
  if (mood === "excited") return "koj_feed_medium";
  return "koj_direct_status";
}

function buildCareOverlayPayload(userLabel, speechText, careConfig = {}) {
  return {
    owner: "kojnozout",
    route: "community",
    stage: "care",
    title: safeString(careConfig.label, "Péče"),
    text: speechText,
    subtext: "CARE · komunitní péče",
    user: safeString(userLabel),
    mood: "happy",
    meta: {
      careAction: careConfig.id || null
    },
    holdMs: 8200
  };
}

module.exports = {
  CARE_ACTIONS,
  resolveCareActionFromGiftCare,
  scaleCareConfig,
  applyGiftMapCareAction,
  parseCareCommand,
  applyCareAction,
  resolveVitalsBankKey,
  buildCareOverlayPayload
};
