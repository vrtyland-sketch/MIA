"use strict";

/**
 * T5+ signature boss cinematic — fullscreen WOW vrstva nad combo kartou.
 * Kánon: T4 = combo flash only; T5+ = combo + boss cinematic + speech interrupt.
 */

const { BOSS_EVENT_BY_TIER } = require("./MIA_GIFT_ECONOMY");

const CINEMATIC_KINDS = new Set(["MEGA_BOSS", "LEGEND"]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function tierRank(tier = "T1") {
  return Number(safeString(tier, "T1").replace(/\D/g, "")) || 1;
}

function normalizeTier(value, fallback = "T5") {
  const tier = safeString(value, fallback).toUpperCase();
  return /^T\d+$/.test(tier) ? tier : fallback;
}

function shouldActivateBossCinematic(comboMoment = null, ctx = {}) {
  if (!comboMoment || typeof comboMoment !== "object") return false;

  const kind = safeString(comboMoment.kind).toUpperCase();
  if (CINEMATIC_KINDS.has(kind)) return true;

  const tier = normalizeTier(
    comboMoment.meta?.streamTier || ctx.streamTier || ctx.obsTier,
    ""
  );
  if (!tier) return false;

  return tierRank(tier) >= 5 && safeString(comboMoment.source) === "boss_event";
}

function resolveHeroImageUrl(tier = "T5", env = process.env) {
  const normalized = normalizeTier(tier);
  const byTier = safeString(env[`MIA_BOSS_CINEMATIC_HERO_${normalized}`]);
  if (byTier) return byTier;

  const generic = safeString(env.MIA_BOSS_CINEMATIC_HERO);
  if (generic) return generic;

  const assetPath = `/assets/boss-cinematic/hero-${normalized.toLowerCase()}.png`;
  return assetPath;
}

function buildBossCinematicPayload(comboMoment = {}, ctx = {}) {
  if (!shouldActivateBossCinematic(comboMoment, ctx)) return null;

  const tier = normalizeTier(
    comboMoment.meta?.streamTier || ctx.streamTier || ctx.obsTier,
    tierRank(comboMoment.kind === "LEGEND" ? "T6" : "T5") >= 6 ? "T6" : "T5"
  );
  const boss = BOSS_EVENT_BY_TIER[tier] || null;
  const rank = tierRank(tier);
  const kind =
    safeString(comboMoment.kind).toUpperCase() ||
    (rank >= 6 ? "LEGEND" : "MEGA_BOSS");

  const holdMs = Math.max(
    8500,
    toNumber(comboMoment.holdMs, rank >= 6 ? 11000 : 9500)
  );

  return {
    kind,
    title: safeString(comboMoment.title, boss?.banner || "MEGA BOSS"),
    subtext: safeString(comboMoment.subtext, ""),
    tier,
    accent:
      safeString(comboMoment.accent) ||
      (kind === "LEGEND" ? "#ffd060" : "#ff6040"),
    glow:
      safeString(comboMoment.glow) ||
      (kind === "LEGEND"
        ? "rgba(255,208,96,0.55)"
        : "rgba(255,96,64,0.5)"),
    userLabel: safeString(ctx.userLabel, ""),
    giftName: safeString(ctx.giftName, ""),
    miaPoints: Math.max(0, toNumber(ctx.miaPoints ?? ctx.totalMiaPoints, 0)),
    heroImageUrl: resolveHeroImageUrl(tier, ctx.env || process.env),
    holdMs,
    source: "boss_cinematic",
    priority: Math.max(toNumber(comboMoment.priority, 6), 6),
    meta: {
      bossEvent: safeString(
        comboMoment.meta?.bossEvent || boss?.key,
        "mega_boss"
      ),
      bossBanner: safeString(
        comboMoment.meta?.bossBanner || boss?.banner,
        comboMoment.title
      ),
      streamTier: tier,
      comboMomentId: safeString(comboMoment.momentId)
    }
  };
}

function buildBossCinematicFromContext(ctx = {}) {
  const comboOverlay = require("./MIA_COMBO_OVERLAY");
  if (typeof comboOverlay.buildBossComboMoment !== "function") return null;

  const comboMoment = comboOverlay.buildBossComboMoment(ctx);
  return buildBossCinematicPayload(comboMoment, ctx);
}

module.exports = {
  CINEMATIC_KINDS,
  shouldActivateBossCinematic,
  resolveHeroImageUrl,
  buildBossCinematicPayload,
  buildBossCinematicFromContext
};
