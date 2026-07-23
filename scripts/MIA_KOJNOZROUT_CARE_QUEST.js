"use strict";

/**
 * Komunitní úkoly (mise) když Kojnožrout potřebuje péči
 * a divák nemá v batohu jídlo.
 */

const { normalizeUserKey } = require("./MIA_KOJNOZROUT_BACKPACK");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowTs() {
  return Date.now();
}

function normalizeText(message = "") {
  return safeString(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mentionsKoj(text = "") {
  return (
    text.includes("koj") ||
    text.includes("nozrout") ||
    text.includes("zroute") ||
    text.includes("zrout")
  );
}

const QUEST_TTL_MS = 8 * 60 * 1000;

const QUEST_CATALOG = {
  HUNGRY_GREET_WAVE: {
    id: "HUNGRY_GREET_WAVE",
    need: "hungry",
    label: "3× pozdrav pro Kojnožrouta",
    hint: "Napiš: ahoj koj / nakrm koj",
    target: 3,
    reward: { hunger: -18, bowlPercent: 8, wellbeing: 8, socialState: 6 }
  },
  SAD_CARE_WAVE: {
    id: "SAD_CARE_WAVE",
    need: "sad",
    label: "2× péče od komunity",
    hint: "Podrbi koj · pozornost koj · uklidni koj",
    target: 2,
    reward: { wellbeing: 16, socialState: 14, hunger: -4 }
  },
  SICK_HEAL_PUSH: {
    id: "SICK_HEAL_PUSH",
    need: "sick",
    label: "Vyléč Kojnožrouta",
    hint: "leč koj · gift T2+ · item feed snack",
    target: 1,
    reward: { clearAffliction: true, wellbeing: 20, hunger: -10, bowlPercent: 6 }
  },
  ANNOYED_FEED_PUSH: {
    id: "ANNOYED_FEED_PUSH",
    need: "annoyed",
    label: "Uklidni hlad",
    hint: "Gift do misky nebo item feed snack",
    target: 1,
    reward: { hunger: -20, bowlPercent: 10, wellbeing: 10, clearAffliction: true }
  }
};

function createCareQuestState(seed = {}) {
  if (!seed || typeof seed !== "object" || !seed.active) {
    return { active: false, type: null, progress: 0, target: 0, contributors: [] };
  }
  return {
    active: true,
    type: safeString(seed.type),
    need: safeString(seed.need),
    label: safeString(seed.label),
    hint: safeString(seed.hint),
    progress: toNumber(seed.progress, 0),
    target: toNumber(seed.target, 1),
    contributors: Array.isArray(seed.contributors) ? seed.contributors.slice() : [],
    startedAt: toNumber(seed.startedAt, nowTs()),
    expiresAt: toNumber(seed.expiresAt, nowTs() + QUEST_TTL_MS),
    completedAt: toNumber(seed.completedAt, 0) || null
  };
}

function pickQuestForNeed(need = "") {
  if (need === "hungry") return QUEST_CATALOG.HUNGRY_GREET_WAVE;
  if (need === "sad") return QUEST_CATALOG.SAD_CARE_WAVE;
  if (need === "sick") return QUEST_CATALOG.SICK_HEAL_PUSH;
  if (need === "annoyed") return QUEST_CATALOG.ANNOYED_FEED_PUSH;
  return null;
}

function ensureCareQuest(kojnozoutState = {}, need = "") {
  const state = { ...kojnozoutState };
  let quest = createCareQuestState(state.careQuest);

  if (quest.active && quest.expiresAt > nowTs() && quest.need === need) {
    return { state, quest };
  }

  const def = pickQuestForNeed(need);
  if (!def) {
    state.careQuest = createCareQuestState();
    return { state, quest: state.careQuest };
  }

  quest = {
    active: true,
    type: def.id,
    need: def.need,
    label: def.label,
    hint: def.hint,
    progress: 0,
    target: def.target,
    contributors: [],
    startedAt: nowTs(),
    expiresAt: nowTs() + QUEST_TTL_MS,
    completedAt: null
  };
  state.careQuest = quest;
  return { state, quest };
}

function applyQuestReward(kojnozoutState = {}, reward = {}) {
  const next = { ...kojnozoutState };
  const vitals =
    next.vitals && typeof next.vitals === "object" ? { ...next.vitals } : {};

  next.hunger = Math.max(0, toNumber(next.hunger, 0) + toNumber(reward.hunger, 0));
  next.bowlPercent = Math.min(
    100,
    toNumber(next.bowlPercent, 0) + toNumber(reward.bowlPercent, 0)
  );
  next.socialState = Math.min(
    100,
    Math.max(-100, toNumber(next.socialState, 0) + toNumber(reward.socialState, 0))
  );
  vitals.wellbeing = Math.min(
    100,
    Math.max(-100, toNumber(vitals.wellbeing, 0) + toNumber(reward.wellbeing, 0))
  );

  if (reward.clearAffliction) {
    next.affliction = null;
    vitals.affliction = null;
  }

  next.vitals = vitals;
  next.behavior = "quest_complete";
  next.lastQuestCompleteAt = nowTs();
  next.careQuest = createCareQuestState();
  return next;
}

function registerContributor(quest, userLabel) {
  const key = normalizeUserKey(userLabel);
  if (!key || quest.contributors.includes(key)) return false;
  quest.contributors.push(key);
  return true;
}

function matchHungryGreet(event = {}, eventType = "") {
  if (eventType !== "COMMENT") return false;
  const text = normalizeText(event.message || event.text || event.content);
  if (!mentionsKoj(text)) return false;
  return (
    text.includes("ahoj") ||
    text.includes("cau") ||
    text.includes("nakrm") ||
    text.includes("papej") ||
    text.includes("dej najist")
  );
}

function matchSadCare(event = {}, eventType = "") {
  if (eventType !== "COMMENT") return false;
  const text = normalizeText(event.message || event.text || event.content);
  if (!mentionsKoj(text)) return false;
  return (
    text.includes("podrb") ||
    text.includes("pozornost") ||
    text.includes("uklidni") ||
    text.includes("pohladit") ||
    text.includes("pomazlit")
  );
}

function matchSickHeal(event = {}, eventType = "") {
  if (eventType === "GIFT") {
    const tier = safeString(event.support?.tier, "T1").toUpperCase();
    return tier === "T2" || tier === "T3" || tier === "T4";
  }
  if (eventType === "COMMENT") {
    const text = normalizeText(event.message || event.text || event.content);
    return mentionsKoj(text) && (text.includes("lec") || text.includes("vylec"));
  }
  return false;
}

function matchAnnoyedFeed(event = {}, eventType = "") {
  if (eventType === "GIFT") {
    return toNumber(event.support?.miaPoints, 0) > 0;
  }
  return false;
}

function progressCareQuest(kojnozoutState = {}, event = {}, eventType = "", userLabel = "") {
  const state = { ...kojnozoutState };
  let quest = createCareQuestState(state.careQuest);

  if (!quest.active || quest.expiresAt <= nowTs()) {
    if (quest.active) {
      state.careQuest = createCareQuestState();
    }
    return { state, quest: state.careQuest, completed: false };
  }

  const def = QUEST_CATALOG[quest.type];
  if (!def) {
    state.careQuest = createCareQuestState();
    return { state, quest: state.careQuest, completed: false };
  }

  let matched = false;

  switch (quest.type) {
    case "HUNGRY_GREET_WAVE":
      matched = matchHungryGreet(event, eventType);
      if (matched && registerContributor(quest, userLabel)) {
        quest.progress = Math.min(quest.target, quest.contributors.length);
      }
      break;
    case "SAD_CARE_WAVE":
      matched = matchSadCare(event, eventType);
      if (matched && registerContributor(quest, userLabel)) {
        quest.progress = Math.min(quest.target, quest.contributors.length);
      }
      break;
    case "SICK_HEAL_PUSH":
      matched = matchSickHeal(event, eventType);
      if (matched) quest.progress = quest.target;
      break;
    case "ANNOYED_FEED_PUSH":
      matched = matchAnnoyedFeed(event, eventType);
      if (matched) quest.progress = quest.target;
      break;
    default:
      break;
  }

  state.careQuest = quest;

  if (quest.progress >= quest.target) {
    quest.completedAt = nowTs();
    const rewarded = applyQuestReward(state, def.reward);
    return {
      state: rewarded,
      quest: rewarded.careQuest,
      completed: true,
      questDef: def,
      matched
    };
  }

  return { state, quest, completed: false, matched };
}

function noteQuestItemFeedComplete(kojnozoutState = {}, need = "") {
  const quest = createCareQuestState(kojnozoutState.careQuest);
  if (!quest.active || quest.need !== need) {
    return { state: kojnozoutState, completed: false };
  }

  if (quest.type === "SICK_HEAL_PUSH" || quest.type === "ANNOYED_FEED_PUSH") {
    const def = QUEST_CATALOG[quest.type];
    quest.progress = quest.target;
    const state = { ...kojnozoutState, careQuest: quest };
    return {
      state: applyQuestReward(state, def.reward),
      completed: true,
      questDef: def
    };
  }

  return { state: kojnozoutState, completed: false };
}

function getCareQuestSnapshot(kojnozoutState = {}) {
  const quest = createCareQuestState(kojnozoutState.careQuest);
  if (!quest.active) return null;

  return {
    active: true,
    type: quest.type,
    need: quest.need,
    label: quest.label,
    hint: quest.hint,
    progress: quest.progress,
    target: quest.target,
    percent: quest.target > 0 ? Math.round((quest.progress / quest.target) * 100) : 0,
    expiresInSec: Math.max(0, Math.floor((quest.expiresAt - nowTs()) / 1000)),
    contributors: quest.contributors.length
  };
}

module.exports = {
  QUEST_CATALOG,
  createCareQuestState,
  ensureCareQuest,
  progressCareQuest,
  noteQuestItemFeedComplete,
  getCareQuestSnapshot,
  pickQuestForNeed
};
