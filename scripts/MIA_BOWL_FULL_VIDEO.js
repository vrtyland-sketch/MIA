"use strict";

const DEFAULT_COOLDOWN_MS = 90000;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTier(value, fallback = "T4") {
  const tier = safeString(value, fallback).toUpperCase();
  return tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4" ? tier : fallback;
}

function getBowlFullConfig(runtimeConfig = {}) {
  const cfg = runtimeConfig?.gameplay?.bowlFull || {};
  const specialSources = Array.isArray(cfg.specialSources)
    ? cfg.specialSources.map((s) => safeString(s)).filter(Boolean)
    : [];

  return {
    preferredTier: normalizeTier(cfg.preferredTier, "T4"),
    fallbackTier: normalizeTier(cfg.fallbackTier, "T1"),
    specialSources,
    cooldownMs: Math.max(
      15000,
      toNumber(cfg.cooldownMs, toNumber(process.env.MIA_BOWL_FULL_VIDEO_COOLDOWN_MS, DEFAULT_COOLDOWN_MS))
    )
  };
}

function getBowlFullVideoState(outputState = {}) {
  if (!outputState || typeof outputState !== "object") {
    return { lastSpecialAt: 0, rotationIndex: 0 };
  }
  if (!outputState.bowlFullVideoState || typeof outputState.bowlFullVideoState !== "object") {
    outputState.bowlFullVideoState = { lastSpecialAt: 0, rotationIndex: 0 };
  }
  return outputState.bowlFullVideoState;
}

function pickSpecialSource(config, outputState = {}) {
  const sources = config.specialSources || [];
  if (!sources.length) {
    return "";
  }
  const state = getBowlFullVideoState(outputState);
  const index = toNumber(state.rotationIndex, 0) % sources.length;
  state.rotationIndex = index + 1;
  return sources[index];
}

function isFullBowl(bowlPercent = 0) {
  return toNumber(bowlPercent, 0) >= 95;
}

function crossedIntoFullBowl(bowlBefore = 0, bowlAfter = 0) {
  return !isFullBowl(bowlBefore) && isFullBowl(bowlAfter);
}

function isBowlFullReason(actionResult = {}) {
  const reason = safeString(actionResult?.meta?.reason || actionResult?.reason).toUpperCase();
  return (
    reason === "SUPPORT_FULL_BOWL" ||
    safeString(actionResult?.meta?.supportMomentType).toLowerCase() === "full_bowl"
  );
}

function resolveBowlFullSpecialPlayback(actionResult = {}, ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const outputState = ctx.outputState || {};
  const config = getBowlFullConfig(runtimeConfig);
  const bowlBefore = toNumber(ctx.bowlBeforeImpact, toNumber(ctx.bowlBefore, -1));
  const bowlAfter = toNumber(
    ctx.bowlAfterImpact,
    toNumber(ctx.kojnozoutState?.bowlPercent, toNumber(actionResult?.meta?.kojnozoutSeen?.bowlPercent, 0))
  );

  const transitioned = crossedIntoFullBowl(bowlBefore, bowlAfter);

  if (!isFullBowl(bowlAfter) && !isBowlFullReason(actionResult)) {
    return { play: false, reason: "bowl_not_full" };
  }

  const videoState = getBowlFullVideoState(outputState);
  const now = toNumber(ctx.now, Date.now());
  const cooledDown = now - toNumber(videoState.lastSpecialAt, 0) >= config.cooldownMs;

  if (!transitioned) {
    return {
      play: false,
      reason: "bowl_full_no_transition",
      bowlBefore,
      bowlAfter,
      cooldownMs: config.cooldownMs
    };
  }

  if (!cooledDown) {
    return {
      play: false,
      reason: "bowl_full_cooldown",
      bowlBefore,
      bowlAfter,
      cooldownMs: config.cooldownMs
    };
  }

  const sourceName = pickSpecialSource(config, outputState);
  const tier = config.preferredTier;

  return {
    play: true,
    mode: "special",
    tier,
    sourceName: sourceName || "",
    reason: transitioned ? "bowl_full_transition" : "bowl_full_milestone",
    bowlBefore,
    bowlAfter,
    cooldownMs: config.cooldownMs
  };
}

function noteBowlFullSpecialPlayed(outputState = {}, meta = {}) {
  const state = getBowlFullVideoState(outputState);
  state.lastSpecialAt = toNumber(meta.at, Date.now());
  state.lastReason = safeString(meta.reason, "bowl_full_special");
  state.lastTier = safeString(meta.tier, "T4");
  state.lastSource = safeString(meta.sourceName);
  return state;
}

function resolveBowlCycleSpecialPlayback(ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const outputState = ctx.outputState || {};
  const config = getBowlFullConfig(runtimeConfig);
  const videoState = getBowlFullVideoState(outputState);
  const now = toNumber(ctx.now, Date.now());
  const bowlAfter = toNumber(ctx.kojnozoutState?.bowlPercent, 100);

  if (!isFullBowl(bowlAfter)) {
    return { play: false, reason: "bowl_cycle_not_full", bowlAfter };
  }

  if (now - toNumber(videoState.lastSpecialAt, 0) < config.cooldownMs) {
    return {
      play: false,
      reason: "bowl_full_cooldown",
      bowlAfter,
      cooldownMs: config.cooldownMs
    };
  }

  return {
    play: true,
    mode: "special",
    tier: config.preferredTier,
    sourceName: pickSpecialSource(config, outputState) || "",
    reason: "bowl_cycle_full_trigger",
    bowlAfter,
    cooldownMs: config.cooldownMs
  };
}

module.exports = {
  DEFAULT_COOLDOWN_MS,
  getBowlFullConfig,
  isFullBowl,
  crossedIntoFullBowl,
  isBowlFullReason,
  resolveBowlFullSpecialPlayback,
  resolveBowlCycleSpecialPlayback,
  noteBowlFullSpecialPlayed
};
