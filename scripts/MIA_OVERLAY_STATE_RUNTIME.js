"use strict";

/**
 * Overlay state mutation — setOverlay and cache invalidation.
 */

function createOverlayStateRuntime(deps = {}) {
  const { safeString, overlayStateModule, getOverlayState, outputStateModule, getOutputState, overlayStateCache } =
    deps;

  function invalidateOverlayStateCache() {
    if (overlayStateCache && typeof overlayStateCache.invalidate === "function") {
      overlayStateCache.invalidate();
    }
  }

  function setOverlay(payload, options = {}) {
    if (!payload || typeof payload !== "object") return null;

    const overlayState = typeof getOverlayState === "function" ? getOverlayState() : {};
    const outputState = typeof getOutputState === "function" ? getOutputState() : {};
    let acceptedOverlay = payload;

    if (typeof overlayStateModule?.setOverlay === "function") {
      acceptedOverlay = overlayStateModule.setOverlay(overlayState, payload, options);
    } else {
      const owner = safeString(payload.owner || payload.speaker, "mia").toLowerCase();
      const normalized = {
        ...payload,
        owner,
        accepted: true,
        reason: "ok",
        updatedAt: Date.now()
      };

      if (owner === "kojnozout" || owner === "kojnozrout") {
        overlayState.kojnozoutOverlay = normalized;
      } else {
        overlayState.miaOverlay = normalized;
      }

      acceptedOverlay = normalized;
    }

    if (typeof outputStateModule?.setLastOverlay === "function") {
      outputStateModule.setLastOverlay(outputState, acceptedOverlay);
    }

    if (acceptedOverlay?.accepted) {
      invalidateOverlayStateCache();
    }

    return acceptedOverlay;
  }

  return {
    setOverlay,
    invalidateOverlayStateCache
  };
}

module.exports = { createOverlayStateRuntime };
