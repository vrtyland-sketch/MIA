"use strict";

/**
 * MIA NEXT — action_result contract
 *
 * Source of truth pro výstup decision + action vrstvy.
 *
 * Pravidlo:
 * - každá akce MUSÍ jít přes tento kontrakt
 * - žádné random objekty do runtime vrstev
 * - kontrakt musí umět nést i legacy decision objekt,
 *   aby MIA_NEXT mohla bezpečně obalit MIA41 bez ztráty logiky
 * - kontrakt nově nese i legacyNormalizedEvent,
 *   aby compatibility provider v action wrapperu dostal
 *   stejný významový vstup jako MIA41 runtime
 *
 * NOVĚ OFICIÁLNĚ:
 * - route
 * - decisionType
 *
 * Tím pádem už wrappery nepoužívají tyto fieldy bokem mimo kontrakt,
 * ale uvnitř oficiálního schema action_result.
 */

const CONTRACT_VERSION = "v4";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLegacyDecision(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return clone(value);
}

function normalizeLegacyNormalizedEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return clone(value);
}

function normalizeRoute(value) {
  const route = safeString(value).toLowerCase();

  if (
    route === "support" ||
    route === "community" ||
    route === "system" ||
    route === "ignore" ||
    route === "wake" ||
    route === "milestone"
  ) {
    return route;
  }

  return "";
}

function normalizeDecisionType(value) {
  const type = safeString(value).toLowerCase();

  if (
    type === "support" ||
    type === "community" ||
    type === "system" ||
    type === "ignore" ||
    type === "act" ||
    type === "observe" ||
    type === "none"
  ) {
    return type;
  }

  return "";
}

function createActionResult(input = {}) {
  return {
    contractVersion: CONTRACT_VERSION,

    // ROUTING / DECISION
    route: normalizeRoute(input.route),
    decisionType: normalizeDecisionType(input.decisionType),

    // VIDEO
    shouldPlayVideo: Boolean(input.shouldPlayVideo),
    tier: safeString(input.tier).toUpperCase(),

    // OVERLAY
    overlayPayload:
      input.overlayPayload && typeof input.overlayPayload === "object" && !Array.isArray(input.overlayPayload)
        ? clone(input.overlayPayload)
        : null,

    // STATE
    statePatch:
      input.statePatch && typeof input.statePatch === "object" && !Array.isArray(input.statePatch)
        ? clone(input.statePatch)
        : null,

    // LEGACY BRIDGE
    legacyDecision: normalizeLegacyDecision(input.legacyDecision),

    // explicitní legacy-normalized event pro action compatibility provider
    legacyNormalizedEvent: normalizeLegacyNormalizedEvent(input.legacyNormalizedEvent),

    // DEBUG / TRACE
    reason: safeString(input.reason),
    source: safeString(input.source),

    // OPTIONAL META
    meta:
      input.meta && typeof input.meta === "object" && !Array.isArray(input.meta)
        ? clone(input.meta)
        : null
  };
}

function isActionResult(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.contractVersion === CONTRACT_VERSION
  );
}

function validateActionResult(value) {
  const errors = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      errors: ["action_result must be an object"]
    };
  }

  if (value.contractVersion !== CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${CONTRACT_VERSION}`);
  }

  if (value.route !== "" && normalizeRoute(value.route) !== value.route) {
    errors.push("route has invalid value");
  }

  if (
    value.decisionType !== "" &&
    normalizeDecisionType(value.decisionType) !== value.decisionType
  ) {
    errors.push("decisionType has invalid value");
  }

  if (typeof value.shouldPlayVideo !== "boolean") {
    errors.push("shouldPlayVideo must be boolean");
  }

  if (typeof value.tier !== "string") {
    errors.push("tier must be string");
  }

  if (
    value.overlayPayload !== null &&
    (typeof value.overlayPayload !== "object" || Array.isArray(value.overlayPayload))
  ) {
    errors.push("overlayPayload must be object or null");
  }

  if (
    value.statePatch !== null &&
    (typeof value.statePatch !== "object" || Array.isArray(value.statePatch))
  ) {
    errors.push("statePatch must be object or null");
  }

  if (
    value.legacyDecision !== null &&
    (typeof value.legacyDecision !== "object" || Array.isArray(value.legacyDecision))
  ) {
    errors.push("legacyDecision must be object or null");
  }

  if (
    value.legacyNormalizedEvent !== null &&
    (typeof value.legacyNormalizedEvent !== "object" || Array.isArray(value.legacyNormalizedEvent))
  ) {
    errors.push("legacyNormalizedEvent must be object or null");
  }

  if (
    value.meta !== null &&
    (typeof value.meta !== "object" || Array.isArray(value.meta))
  ) {
    errors.push("meta must be object or null");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  CONTRACT_VERSION,
  createActionResult,
  isActionResult,
  validateActionResult
};