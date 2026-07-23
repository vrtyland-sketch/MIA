"use strict";

/**
 * MIA companion k vitals stavu Kojnožrouta.
 * Typicky: Koj děkuje za gift, MIA doplní kontext („spí, ale slyší Rose od…“).
 */

const textBankModule = require("./MIA_TEXT_BANK");

const TEXT_BANK = textBankModule.TEXT_BANK || {};
const DEFAULT_COOLDOWN_MS = 42000;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "někdo";
}

function getCooldownMs() {
  const env = toNumber(process.env.MIA_VITALS_COMPANION_COOLDOWN_MS, 0);
  return env > 0 ? env : DEFAULT_COOLDOWN_MS;
}

function isCompanionEnabled() {
  const flag = safeString(process.env.MIA_VITALS_COMPANION_ENABLED, "true").toLowerCase();
  return !["0", "false", "off", "no"].includes(flag);
}

function resolveVitalsSignal(kojnozoutState = {}) {
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const affliction = safeString(kojnozoutState.affliction).toLowerCase();
  const hunger = toNumber(kojnozoutState.hunger, 0);
  const sleepDepth = toNumber(kojnozoutState?.vitals?.sleepDepth, 0);
  const isSleeping = Boolean(kojnozoutState.isSleeping) || sleepDepth >= 55;

  if (isSleeping || mood === "sleepy") {
    return {
      key: "sleepy",
      bankKey: "mia_vitals_sleepy_gift",
      statusBankKey: "mia_vitals_sleepy_status",
      reason: "MIA_VITALS_SLEEPY_COMPANION",
      vitalsLine: "spí, ale slyší stream",
      priority: 80
    };
  }

  if (affliction === "sick" || mood === "sick") {
    return {
      key: "sick",
      bankKey: "mia_vitals_sick_gift",
      statusBankKey: "mia_vitals_sick_status",
      reason: "MIA_VITALS_SICK_COMPANION",
      vitalsLine: "je nemocný a potřebuje péči",
      priority: 90
    };
  }

  if (affliction === "sad" || mood === "sad") {
    return {
      key: "sad",
      bankKey: "mia_vitals_sad_gift",
      statusBankKey: "mia_vitals_sad_status",
      reason: "MIA_VITALS_SAD_COMPANION",
      vitalsLine: "je smutný z nálady chatu",
      priority: 70
    };
  }

  if (affliction === "annoyed" || mood === "annoyed") {
    return {
      key: "annoyed",
      bankKey: "mia_vitals_annoyed_gift",
      statusBankKey: "mia_vitals_annoyed_status",
      reason: "MIA_VITALS_ANNOYED_COMPANION",
      vitalsLine: "je naštvaný z hladu",
      priority: 75
    };
  }

  if (mood === "hungry" || hunger >= 58) {
    return {
      key: "hungry",
      bankKey: "mia_vitals_hungry_gift",
      statusBankKey: "mia_vitals_hungry_status",
      reason: "MIA_VITALS_HUNGRY_COMPANION",
      vitalsLine: "má hlad",
      priority: 60
    };
  }

  return null;
}

function getCooldownMap(outputState = {}) {
  if (!outputState.vitalsCompanionCooldown || typeof outputState.vitalsCompanionCooldown !== "object") {
    outputState.vitalsCompanionCooldown = {};
  }
  return outputState.vitalsCompanionCooldown;
}

function isOnCooldown(outputState = {}, signalKey = "") {
  if (!signalKey) return false;
  const map = getCooldownMap(outputState);
  const lastAt = toNumber(map[signalKey], 0);
  return Date.now() - lastAt < getCooldownMs();
}

function noteVitalsCompanionSpoken(outputState = {}, signalKey = "") {
  if (!outputState || !signalKey) return;
  const map = getCooldownMap(outputState);
  map[signalKey] = Date.now();
}

function applyTemplate(template, vars = {}) {
  let text = safeString(template);
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "gi"), safeString(value));
  }
  return text.replace(/\s+/g, " ").trim();
}

function pickBankLine(bankKey, vars = {}, fallback = "") {
  const variants = Array.isArray(TEXT_BANK[bankKey]) ? TEXT_BANK[bankKey] : [];
  if (variants.length === 0) return applyTemplate(fallback, vars);
  const template = variants[Math.floor(Math.random() * variants.length)];
  return applyTemplate(template, vars);
}

function pickGiftLabel(event = {}, ctx = {}) {
  const support = event.support || {};
  return (
    safeString(support.giftName) ||
    safeString(support.giftLabel) ||
    safeString(ctx.giftName) ||
    "gift"
  );
}

function shouldMiaVitalsCompanion(kojnozoutState = {}, outputState = {}, options = {}) {
  if (!isCompanionEnabled()) return false;
  if (options.ackMode === "silent") return false;

  const signal = resolveVitalsSignal(kojnozoutState);
  if (!signal) return false;
  if (isOnCooldown(outputState, signal.key)) return false;

  return true;
}

function resolveVitalsCompanionPlan(
  kojnozoutState = {},
  outputState = {},
  event = {},
  options = {}
) {
  const signal = resolveVitalsSignal(kojnozoutState);
  if (!signal) {
    return { enabled: false, reason: "no_vitals_signal" };
  }

  if (!shouldMiaVitalsCompanion(kojnozoutState, outputState, options)) {
    return {
      enabled: false,
      reason: isOnCooldown(outputState, signal.key) ? "cooldown" : "disabled",
      signal
    };
  }

  return {
    enabled: true,
    ...signal,
    giftName: pickGiftLabel(event, options)
  };
}

function buildMiaVitalsCompanionText(ctx = {}) {
  const plan = ctx.vitalsCompanion || ctx.plan || {};
  if (!plan.enabled && !plan.bankKey) return "";

  const event = ctx.event || {};
  const userLabel =
    safeString(ctx.userLabel) ||
    safeString(event?.user?.nickname) ||
    safeString(event?.user?.username) ||
    "někdo";
  const name = firstName(userLabel);
  const gift = safeString(plan.giftName, pickGiftLabel(event, ctx));
  const vars = {
    name,
    gift,
    vitalsLine: safeString(plan.vitalsLine, "má specifickou náladu")
  };

  const fallback = `${name}, Kojnožrout ${vars.vitalsLine} — ${gift} je od tebe fajn.`;

  return pickBankLine(plan.bankKey, vars, fallback);
}

function buildMiaVitalsStatusLine(kojnozoutState = {}, outputState = {}) {
  const signal = resolveVitalsSignal(kojnozoutState);
  if (!signal?.statusBankKey) return "";

  return pickBankLine(
    signal.statusBankKey,
    { vitalsLine: signal.vitalsLine },
    `Kojnožrout ${signal.vitalsLine}.`
  );
}

module.exports = {
  DEFAULT_COOLDOWN_MS,
  resolveVitalsSignal,
  shouldMiaVitalsCompanion,
  resolveVitalsCompanionPlan,
  buildMiaVitalsCompanionText,
  buildMiaVitalsStatusLine,
  noteVitalsCompanionSpoken,
  isCompanionEnabled
};
