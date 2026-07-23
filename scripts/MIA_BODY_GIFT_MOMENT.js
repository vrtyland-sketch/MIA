"use strict";

const { tierRank, normalizeStreamTier } = require("./MIA_GIFT_TIERS");

let activeTimer = null;
let activeGeneration = 0;

function isGiftBodyMomentEnabled(env = process.env) {
  const raw = String(env.MIA_BODY_GIFT_MOMENT ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function resolveMinTier(env = process.env) {
  return normalizeStreamTier(env.MIA_BODY_GIFT_MOMENT_MIN_TIER || "T3", "T3");
}

function resolveHoldMsForTier(tier, options = {}) {
  const custom = Number(options.holdMs);
  if (Number.isFinite(custom) && custom > 0) return custom;

  const rank = tierRank(tier);
  if (rank >= 6) return 9000;
  if (rank >= 5) return 7000;
  if (rank >= 4) return 5500;
  if (rank >= 3) return 4500;
  return 0;
}

function resolveMoodForTier(tier) {
  const rank = tierRank(tier);
  if (rank >= 5) return "gift";
  if (rank >= 4) return "duel";
  return "gift";
}

function shouldRunGiftBodyMoment(tier, env = process.env) {
  if (!isGiftBodyMomentEnabled(env)) return false;
  return tierRank(tier) >= tierRank(resolveMinTier(env));
}

async function hideGiftBodyMoment(options = {}) {
  if (options.generation != null && options.generation !== activeGeneration) {
    return { ok: true, skipped: true, reason: "stale_generation" };
  }

  const graphicsStudio = require("../shared/mia-graphics-studio");
  const obsBodyPreview = require("./MIA_OBS_BODY_PREVIEW");
  const reset = graphicsStudio.resetBodyPreview();

  let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
  if (options.syncObs !== false) {
    obsSync = await obsBodyPreview.hideAllObsBodyParts({
      sceneName: options.sceneName,
      port: Number(options.port || process.env.PORT || 3000),
      obsCall: options.obsCall
    });
  }

  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }

  return { ok: true, phase: "12o", reset, obsSync };
}

async function showGiftBodyMoment(options = {}) {
  const env = options.env || process.env;
  const tier = normalizeStreamTier(options.tier, "T1");

  if (!shouldRunGiftBodyMoment(tier, env)) {
    return {
      ok: true,
      skipped: true,
      reason: "tier_or_feature_disabled",
      tier
    };
  }

  const holdMs = resolveHoldMsForTier(tier, options);
  if (holdMs <= 0) {
    return { ok: true, skipped: true, reason: "hold_ms_zero", tier };
  }

  const generation = ++activeGeneration;
  const graphicsStudio = require("../shared/mia-graphics-studio");
  const obsBodyPreview = require("./MIA_OBS_BODY_PREVIEW");

  const published = graphicsStudio.publishBodyPreview({
    mood: options.mood || resolveMoodForTier(tier),
    speaking: options.speaking === true,
    layout: options.layout || "hero",
    lockStudioMs: holdMs + 2500
  });

  let obsSync = { ok: false, skipped: true, reason: "sync_obs_disabled" };
  if (options.syncObs !== false && env.MIA_OBS_BODY_GIFT_SYNC !== "0") {
    obsSync = await obsBodyPreview.syncObsBodyPreviewVisibility({
      parts: published.parts,
      layout: published.layout || "hero",
      sceneName: options.sceneName,
      port: Number(options.port || env.PORT || 3000),
      bodySync: options.bodySync || "hybrid",
      obsCall: options.obsCall
    });
  }

  if (activeTimer) {
    clearTimeout(activeTimer);
  }

  activeTimer = setTimeout(() => {
    void hideGiftBodyMoment({
      generation,
      sceneName: options.sceneName,
      port: options.port,
      syncObs: options.syncObs,
      obsCall: options.obsCall
    });
  }, holdMs);
  if (typeof activeTimer.unref === "function") {
    activeTimer.unref();
  }

  return {
    ok: true,
    phase: "12o",
    tier,
    holdMs,
    generation,
    published,
    obsSync
  };
}

function scheduleGiftBodyMomentShow(options = {}) {
  return showGiftBodyMoment(options);
}

function resetGiftBodyMomentStateForTests() {
  activeGeneration = 0;
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
}

module.exports = {
  isGiftBodyMomentEnabled,
  resolveMinTier,
  resolveHoldMsForTier,
  resolveMoodForTier,
  shouldRunGiftBodyMoment,
  showGiftBodyMoment,
  hideGiftBodyMoment,
  scheduleGiftBodyMomentShow,
  resetGiftBodyMomentStateForTests
};
