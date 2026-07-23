"use strict";

/**
 * Overlay Executor (STABLE CONTRACT)
 *
 * - jediný vstup: overlayPayload
 * - renderer nic neví o actionResult
 * - vždy vrací jednotný kontrakt
 */

async function runOverlayExecutor(params = {}) {
  const {
    overlayPayload,
    context,
    renderer
  } = params;

  // ---------- VALIDACE ----------

  if (!overlayPayload || typeof overlayPayload !== "object") {
    return {
      ok: false,
      emitted: false,
      reason: "overlay_payload_invalid",
      rendererResult: null
    };
  }

  if (typeof renderer !== "function") {
    return {
      ok: false,
      emitted: false,
      reason: "overlay_renderer_missing",
      rendererResult: null
    };
  }

  // ---------- EXECUTION ----------

  try {
    const result = await renderer(overlayPayload, context);

    // NORMALIZACE RESULTU
    if (!result || typeof result !== "object") {
      return {
        ok: true,
        emitted: false,
        reason: "renderer_return_invalid",
        rendererResult: null
      };
    }

    return {
      ok: true,
      emitted: Boolean(result.emitted),
      reason: result.reason || null,
      rendererResult: result
    };

  } catch (err) {
    return {
      ok: false,
      emitted: false,
      reason: "overlay_renderer_error",
      rendererResult: null
    };
  }
}

module.exports = {
  runOverlayExecutor
};