"use strict";

async function runOverlayExecutor(ctx = {}) {
  const executeOverlay = ctx?.executeOverlay;
  const actionResult = ctx?.actionResult || null;

  if (typeof executeOverlay !== "function") {
    return {
      ok: false,
      skipped: true,
      reason: "overlay_executor_missing_callback"
    };
  }

  return await executeOverlay(actionResult);
}

module.exports = {
  runOverlayExecutor
};