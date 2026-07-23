"use strict";

/**
 * MIA_ANIMATION_TRACE.js
 *
 * Bezpečná helper vrstva pro čtení animačního stavu z:
 * - actionResult.meta.animationHint
 * - overlayPayload.meta.animationHint
 * - companionOverlayPayload.meta.animationHint
 *
 * Cíl:
 * - NIC nepřepočítávat
 * - NIC nerozbíjet
 * - sjednotit pozorovatelnost pro budoucí animační runtime
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function normalizeOwner(value, fallback = "both") {
  const owner = safeString(value, fallback).toLowerCase();
  if (owner === "mia" || owner === "kojnozout" || owner === "both") {
    return owner;
  }
  return fallback;
}

function normalizeArray(values) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = safeString(value).trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(normalized);
  }

  return out;
}

function readAnimationHintFromObject(value) {
  if (!value || typeof value !== "object") return null;

  const direct = value.animationHint;
  if (direct && typeof direct === "object") {
    return direct;
  }

  const meta = value.meta;
  if (meta && typeof meta === "object" && meta.animationHint && typeof meta.animationHint === "object") {
    return meta.animationHint;
  }

  return null;
}

function normalizeAnimationHint(rawHint, fallback = {}) {
  return {
    owner: normalizeOwner(rawHint?.owner, safeString(fallback.owner, "both")),
    visualFamily: safeString(rawHint?.visualFamily, safeString(fallback.visualFamily, "generic")).toLowerCase(),
    effectProgram: safeString(rawHint?.effectProgram, safeString(fallback.effectProgram, "generic_support")).toLowerCase(),
    moodHint: safeString(rawHint?.moodHint, safeString(fallback.moodHint, "warm")).toLowerCase(),
    label: safeString(rawHint?.label, safeString(fallback.label, "")),
    giftName: safeString(rawHint?.giftName, safeString(fallback.giftName, "")),
    coinsBucket: safeString(rawHint?.coinsBucket, safeString(fallback.coinsBucket, "unknown")).toLowerCase(),
    recommendedSceneModes: normalizeArray(
      rawHint?.recommendedSceneModes || fallback.recommendedSceneModes || []
    ),
    tags: normalizeArray(rawHint?.tags || fallback.tags || []),
    supportTier: safeString(rawHint?.supportTier, safeString(fallback.supportTier, "")),
    totalCoins: Math.max(0, safeNumber(rawHint?.totalCoins, safeNumber(fallback.totalCoins, 0))),
    burstCount: Math.max(1, safeNumber(rawHint?.burstCount, safeNumber(fallback.burstCount, 1))),
    bowlPercent: Math.max(0, safeNumber(rawHint?.bowlPercent, safeNumber(fallback.bowlPercent, 0))),
    dual: Boolean(rawHint?.dual ?? fallback.dual),
    rawGiftProfile: cloneJson(rawHint?.rawGiftProfile, cloneJson(fallback.rawGiftProfile, null))
  };
}

function fallbackHintFromMeta(meta = {}) {
  return {
    owner: normalizeOwner(meta?.giftAnimationOwner, "both"),
    visualFamily: safeString(meta?.giftVisualFamily, "generic"),
    effectProgram: safeString(meta?.giftEffectProgram, "generic_support"),
    moodHint: safeString(meta?.giftMoodHint, "warm"),
    dual: Boolean(meta?.animationDual)
  };
}

function buildTraceNode(sourceName, payload = null) {
  if (!payload || typeof payload !== "object") {
    return {
      source: sourceName,
      exists: false,
      owner: "both",
      visualFamily: "generic",
      effectProgram: "generic_support",
      moodHint: "warm",
      label: "",
      giftName: "",
      coinsBucket: "unknown",
      recommendedSceneModes: [],
      tags: [],
      supportTier: "",
      totalCoins: 0,
      burstCount: 1,
      bowlPercent: 0,
      dual: false,
      rawGiftProfile: null
    };
  }

  const rawHint = readAnimationHintFromObject(payload);
  const fallback = fallbackHintFromMeta(payload?.meta || {});
  const normalized = normalizeAnimationHint(rawHint, fallback);

  return {
    source: sourceName,
    exists: Boolean(rawHint || payload?.meta?.giftAnimationOwner || payload?.meta?.giftVisualFamily),
    ...normalized
  };
}

function buildAnimationTrace(input = {}) {
  const actionResult = input?.actionResult && typeof input.actionResult === "object"
    ? input.actionResult
    : {};

  const primary = buildTraceNode("primary", actionResult?.overlayPayload || null);
  const companion = buildTraceNode("companion", actionResult?.companionOverlayPayload || null);
  const actionMeta = buildTraceNode("action_meta", actionResult?.meta || null);

  const effective = primary.exists
    ? primary
    : companion.exists
      ? companion
      : actionMeta;

  return {
    ok: true,
    ts: Date.now(),
    effective,
    primary,
    companion,
    actionMeta,
    dualActive: Boolean(
      (primary.exists && companion.exists) ||
      effective.dual
    ),
    ownersActive: normalizeArray([
      primary.exists ? primary.owner : "",
      companion.exists ? companion.owner : "",
      actionMeta.exists ? actionMeta.owner : ""
    ]),
    familiesSeen: normalizeArray([
      primary.exists ? primary.visualFamily : "",
      companion.exists ? companion.visualFamily : "",
      actionMeta.exists ? actionMeta.visualFamily : ""
    ]),
    effectProgramsSeen: normalizeArray([
      primary.exists ? primary.effectProgram : "",
      companion.exists ? companion.effectProgram : "",
      actionMeta.exists ? actionMeta.effectProgram : ""
    ])
  };
}

module.exports = {
  buildAnimationTrace
};