"use strict";

/**
 * OBS CONTROL RENDERER — VARIANTA A (NO AUTO SCENE SWITCH)
 *
 * - NEpřepíná OBS scény
 * - pouze:
 *   - vyhodnotí intent
 *   - vrátí debug info
 * - připraveno na budoucí voice control vrstvu
 */

function createObsOverlayRenderer(deps = {}) {
  const { runtimeConfig } = deps;

  function render(overlayPayload, context = {}) {
    if (!overlayPayload || typeof overlayPayload !== "object") {
      return {
        emitted: false,
        reason: "invalid_overlay_payload"
      };
    }

    const meta = getMeta(overlayPayload, context);

    const intent = normalize(meta.intent);
    const sceneMode = normalize(meta.sceneMode);

    const owner = normalizeOwner(overlayPayload.owner);
    const route = normalizeRoute(
      overlayPayload.route ||
      context?.actionResult?.route ||
      context?.normalizedEvent?.route
    );

    /**
     * ❗ KLÍČOVÉ:
     * NIC nepřepínáme
     * jen vracíme info
     */

    return {
      emitted: false,
      reason: "scene_switch_disabled_variant_A",

      // debug / observability
      intent,
      sceneMode,
      owner,
      route,

      // budoucí hook
      suggestedSceneMode: sceneMode || deriveFallbackMode(route),

      // explicitně říkáme:
      obsAction: null
    };
  }

  return { render };
}

/* ================== MODE LOGIC ================== */

function deriveFallbackMode(route) {
  if (route === "support") return "support";
  if (route === "share") return "share";
  return "community";
}

/* ================== HELPERS ================== */

function getMeta(payload, context) {
  if (payload?.meta && typeof payload.meta === "object") {
    return payload.meta;
  }

  if (context?.actionResult?.meta && typeof context.actionResult.meta === "object") {
    return context.actionResult.meta;
  }

  return {};
}

function normalizeOwner(v) {
  const val = normalize(v, "mia").toLowerCase();
  return val === "kojnozout" ? "kojnozout" : "mia";
}

function normalizeRoute(v) {
  const val = normalize(v, "community").toLowerCase();
  if (val === "support") return "support";
  if (val === "share") return "share";
  return "community";
}

function normalize(v, fallback = "") {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

module.exports = {
  createObsOverlayRenderer
};