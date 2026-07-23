"use strict";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function finalizeOverlayEmitResult(acceptedOverlay, baseResult = {}, rendererResult = null) {
  const accepted = Boolean(acceptedOverlay?.accepted);

  if (!rendererResult || typeof rendererResult !== "object") {
    return {
      ...baseResult,
      emitted: accepted || Boolean(baseResult.emitted),
      reason: accepted ? safeString(baseResult.reason, "ok") : safeString(baseResult.reason, "overlay_rejected"),
      meta: {
        ...(baseResult.meta || {}),
        acceptedOverlay
      }
    };
  }

  const rendererReason = safeString(rendererResult.reason);
  const reason =
    accepted && rendererReason === "scene_switch_disabled_variant_A"
      ? "overlay_state_updated"
      : accepted
        ? rendererReason || "ok"
        : rendererReason || safeString(baseResult.reason, "overlay_rejected");

  return {
    ...baseResult,
    ...rendererResult,
    emitted: accepted || Boolean(rendererResult.emitted),
    reason,
    meta: {
      ...(baseResult.meta || {}),
      ...(rendererResult.meta || {}),
      acceptedOverlay
    }
  };
}

module.exports = {
  finalizeOverlayEmitResult
};
