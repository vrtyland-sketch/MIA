"use strict";

const MIN_BOWL_TEST_PCT = 35;

let runtimeOverride = null;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isTruthyEnv(value) {
  const v = safeString(value).toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isKojTestModeEnabled(env = process.env, runtimeConfig = null) {
  if (runtimeOverride === true) return true;
  if (runtimeOverride === false) return false;
  if (isTruthyEnv(env?.MIA_KOJ_TEST_MODE)) return true;
  if (runtimeConfig?.gameplay?.kojTestMode === true) return true;
  return false;
}

function setKojTestModeOverride(enabled) {
  if (enabled === null || enabled === undefined) {
    runtimeOverride = null;
  } else {
    runtimeOverride = Boolean(enabled);
  }
  return runtimeOverride;
}

function getKojTestModeSnapshot(env = process.env, runtimeConfig = null) {
  return {
    enabled: isKojTestModeEnabled(env, runtimeConfig),
    minBowlPercent: MIN_BOWL_TEST_PCT,
    override: runtimeOverride
  };
}

function applyKojTestModeToState(state = {}) {
  const next = { ...state, vitals: { ...(state.vitals || {}) } };
  const vitals = next.vitals;

  vitals.sleepDepth = Math.min(toNumber(vitals.sleepDepth, 0), 5);
  vitals.groggyUntil = 0;
  next.vitals = vitals;
  next.isSleeping = false;
  next.behavior = "wake_react";

  if (toNumber(next.bowlPercent, 0) < MIN_BOWL_TEST_PCT) {
    next.bowlPercent = MIN_BOWL_TEST_PCT;
  }
  if (toNumber(next.hunger, 0) > 70) {
    next.hunger = 35;
  }

  return next;
}

function parseKojStreamerCommand(message = "") {
  const raw = safeString(message).toLowerCase();
  const trimmed = raw.replace(/^[!@]+/, "").trim();

  if (
    /^(probud|wake)(\s+(koj|kojnoz|kojnožrout))?$/.test(trimmed) ||
    trimmed === "probud koj" ||
    trimmed === "probud kojnozout"
  ) {
    return { type: "probud" };
  }

  if (
    /^(zacni|start)\s+duel/.test(trimmed) ||
    /^duel\s+start/.test(trimmed) ||
    trimmed === "duel" ||
    trimmed === "zacni duel"
  ) {
    return { type: "duel_start" };
  }

  return null;
}

function wakeKojState(state = {}, vitalsModule = {}) {
  const next = { ...state, vitals: { ...(state.vitals || {}) } };

  if (typeof vitalsModule.applyActivityWake === "function") {
    vitalsModule.applyActivityWake(next, 2.5);
  } else {
    applyKojTestModeToState(next);
    return next;
  }

  next.isSleeping = false;
  if (toNumber(next.bowlPercent, 0) < MIN_BOWL_TEST_PCT) {
    next.bowlPercent = MIN_BOWL_TEST_PCT;
  }
  if (toNumber(next.hunger, 0) > 70) {
    next.hunger = 35;
  }

  return next;
}

module.exports = {
  MIN_BOWL_TEST_PCT,
  isKojTestModeEnabled,
  setKojTestModeOverride,
  getKojTestModeSnapshot,
  applyKojTestModeToState,
  parseKojStreamerCommand,
  wakeKojState
};
