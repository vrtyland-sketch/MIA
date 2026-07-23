"use strict";

const textBankModule = require("./MIA_TEXT_BANK");
const { formatEvolutionSubtext } = require("./MIA_KOJNOZROUT_ENGINE");

const TEXT_BANK = textBankModule.TEXT_BANK || {};
const MOMENT_TTL_MS = 12000;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstName(userLabel = "") {
  return safeString(userLabel).split(/\s+/).filter(Boolean)[0] || "někdo";
}

function getBankVariants(key) {
  return Array.isArray(TEXT_BANK[key]) ? TEXT_BANK[key] : [];
}

function applyTemplate(template, vars = {}) {
  let text = safeString(template);
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, "g"), safeString(value));
  }
  return text.replace(/\s+/g, " ").trim();
}

function pickEvolutionLine(bankKey, vars, fallback) {
  const variants = getBankVariants(bankKey);
  if (variants.length === 0) {
    return applyTemplate(fallback, vars);
  }
  const template = variants[Math.floor(Math.random() * variants.length)];
  return applyTemplate(template, vars);
}

function buildEvolutionMoment(levelUp = {}, ctx = {}) {
  const toTier = safeString(levelUp.toTier);
  const label = safeString(levelUp.label, toTier);
  const actor = firstName(ctx.userLabel);
  const now = Date.now();

  return {
    tier: toTier,
    label,
    fromTier: safeString(levelUp.fromTier),
    actor,
    feedPoints: Number(levelUp.feedPoints || 0),
    pointsToNext: Number(levelUp.pointsToNext || 0),
    nextTierLabel: safeString(levelUp.nextTierLabel),
    subtext: formatEvolutionSubtext(levelUp),
    at: now,
    until: now + MOMENT_TTL_MS
  };
}

function buildKojEvolutionOverlay(levelUp = {}, ctx = {}) {
  const tier = safeString(levelUp.toTier);
  const label = safeString(levelUp.label, tier);
  const actor = firstName(ctx.userLabel);
  const bankKey = `koj_evolution_${tier}`;
  const text = pickEvolutionLine(
    bankKey,
    { name: actor, tier: label },
    "{name}, právě jsem vyrostl na {tier}!"
  );

  return {
    owner: "kojnozout",
    route: "community",
    title: "Kojnožrout",
    text,
    subtext: formatEvolutionSubtext(levelUp),
    action: "evolution_level_up",
    mood: "excited",
    stage: tier,
    evolutionTier: tier,
    priority: 7,
    holdMs: 6500
  };
}

function buildMiaEvolutionCompanion(levelUp = {}, ctx = {}) {
  const tier = safeString(levelUp.toTier);
  const label = safeString(levelUp.label, tier);
  const actor = firstName(ctx.userLabel);
  const bankKey = `mia_evolution_${tier}`;
  const text = pickEvolutionLine(
    bankKey,
    { name: actor, tier: label },
    "{name} právě posunul Kojnožrouta na {tier}. To je milník."
  );

  return {
    owner: "mia",
    route: "community",
    title: "MIA",
    text,
    subtext: formatEvolutionSubtext(levelUp),
    action: "evolution_companion",
    priority: 5,
    holdMs: 5200
  };
}

function buildEvolutionDelivery(levelUp = {}, ctx = {}) {
  const moment = buildEvolutionMoment(levelUp, ctx);
  const eventType = safeString(ctx.eventType).toUpperCase();
  const kojPrimary =
    eventType !== "GIFT" ? buildKojEvolutionOverlay(levelUp, ctx) : null;
  const miaCompanion =
    eventType === "GIFT" ? buildMiaEvolutionCompanion(levelUp, ctx) : null;

  return {
    moment,
    kojPrimary,
    miaCompanion
  };
}

module.exports = {
  MOMENT_TTL_MS,
  buildEvolutionMoment,
  buildEvolutionDelivery,
  buildKojEvolutionOverlay,
  buildMiaEvolutionCompanion
};
