"use strict";

/**
 * Phase 12z — production readiness gate for Animation Bank clips.
 * Blocks accidental live promotion of procedural / low-alpha sheets.
 */

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const DEFAULT_MIN_ALPHA = 0.25;

function isProceduralMeta(meta = {}, opts = {}) {
  const quality = safeString(meta.quality || opts.quality).toLowerCase();
  const source = safeString(meta.source || opts.source).toLowerCase();
  const provider = safeString(meta.provider || opts.provider).toLowerCase();
  return quality === "procedural" || source === "procedural" || provider === "procedural";
}

/**
 * @returns {{ ok: boolean, ready: boolean, blockers: string[], warnings: string[], checks: object }}
 */
function evaluateProductionReadiness(meta = {}, opts = {}) {
  const minAlpha = toNumber(opts.minAlphaRatio, DEFAULT_MIN_ALPHA);
  const quality = safeString(meta.quality || opts.quality).toLowerCase();
  const source = safeString(meta.source || opts.source).toLowerCase();
  const avgAlpha = toNumber(meta.avgAlphaRatio, toNumber(opts.avgAlphaRatio, null));
  const provider = safeString(meta.provider || opts.provider).toLowerCase();
  const forceProduction = opts.forceProduction === true;

  const checks = {
    minAlphaRatio: minAlpha,
    avgAlphaRatio: avgAlpha,
    quality: quality || null,
    source: source || null,
    trueAlpha: meta.trueAlpha === true || opts.trueAlpha === true,
    provider: provider || null,
    procedural: isProceduralMeta(meta, opts)
  };

  const blockers = [];
  const warnings = [];

  if (checks.procedural && !forceProduction) {
    blockers.push("procedural_not_allowed");
  } else if (checks.procedural && forceProduction) {
    warnings.push("procedural_forced_to_production");
  }

  if (avgAlpha == null) {
    warnings.push("avg_alpha_unknown");
  } else if (avgAlpha < minAlpha && !forceProduction) {
    blockers.push("alpha_too_low");
  } else if (avgAlpha < minAlpha && forceProduction) {
    warnings.push("alpha_below_min_forced");
  }

  if (meta.trueAlpha === false) {
    warnings.push("true_alpha_false");
  }

  const ready = blockers.length === 0;
  return {
    ok: true,
    ready,
    phase: "12z",
    blockers,
    warnings,
    checks,
    hint: !ready
      ? blockers.includes("procedural_not_allowed")
        ? "Procedural clip nelze dát na live — forceProduction+confirmForceProduction, nebo regeneruj s OpenAI"
        : blockers.includes("alpha_too_low")
          ? `avgAlphaRatio ${avgAlpha} < min ${minAlpha} — oprav matte nebo forceProduction+confirmForceProduction`
          : "Clip není ready pro production"
      : null
  };
}

module.exports = {
  DEFAULT_MIN_ALPHA,
  isProceduralMeta,
  evaluateProductionReadiness
};
