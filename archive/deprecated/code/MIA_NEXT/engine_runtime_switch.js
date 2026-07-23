"use strict";

/**
 * MIA_NEXT / engine_runtime_switch.js
 *
 * Už žádný dual runtime switch.
 * Už žádná parity logika.
 * Už žádný fallback mozek.
 *
 * Tenhle soubor zůstává jen jako kompatibilní single-runtime resolver,
 * kdyby ho něco starého ještě někde omylem importovalo.
 */

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return fallback;
  }
}

function resolveRuntimeAction(inputs = {}, runtimeConfig = {}) {
  const nextActionResult =
    inputs && typeof inputs.nextActionResult === "object"
      ? inputs.nextActionResult
      : null;

  const selectedAction =
    nextActionResult && nextActionResult.ok !== false
      ? nextActionResult
      : {
          ok: false,
          route: "system",
          decisionType: "system",
          shouldPlayVideo: false,
          tier: "",
          overlayPayload: null,
          overlay: null,
          overlayControl: null,
          response: {
            speaker: "mia",
            text: "",
            reason: "NEXT_ACTION_MISSING",
            route: "system",
            decisionType: "system"
          },
          statePatch: {
            route: "system",
            lastReason: "NEXT_ACTION_MISSING",
            lastSpeaker: "mia",
            lastTier: "",
            lastUser: "",
            bowlPercent: 0,
            mood: "neutral",
            stage: "idle"
          },
          legacyDecision: null,
          legacyNormalizedEvent: null,
          meta: {
            sourceOfTruth: "MIA_NEXT",
            reason: "NEXT_ACTION_MISSING"
          }
        };

  return {
    selectedAction: cloneJson(selectedAction, selectedAction),
    selectedRuntime: "MIA_NEXT",
    sourceOfTruth: "MIA_NEXT",
    parity: null,
    meta: {
      fallbackUsed: false,
      fallbackReason: null,
      parityOk: null,
      mode: "single_runtime_only"
    }
  };
}

module.exports = {
  resolveRuntimeAction
};