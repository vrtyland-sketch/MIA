"use strict";

const { runOverlayExecutor } = require("./overlay_executor");

/**
 * Runtime Execution Bridge (STABLE CONTRACT VERSION)
 */

async function runRuntimeExecutionBridge(params = {}) {
  const {
    actionResult,
    normalizedEvent,
    eventId,
    executeOverlay,
    executeVideo,
    animationTrace
  } = params;

  const debug = {
    reasonCodes: []
  };

  if (!actionResult || typeof actionResult !== "object") {
    return fail("EXECUTION_BRIDGE_INVALID_ACTION_RESULT");
  }

  const primaryOverlayPayload =
    actionResult.overlayPayload || actionResult.overlay || null;

  const companionOverlayPayload =
    actionResult.companionOverlayPayload || actionResult.companionOverlay || null;

  const shouldPlayVideo = Boolean(actionResult.shouldPlayVideo);

  let primaryOverlayResult = null;
  let companionOverlayResult = null;
  let videoResult = null;

  let overlayAttempted = false;
  let overlayEmitted = false;

  let videoAttempted = false;
  let videoEnqueued = false;

  // ---------------- PRIMARY OVERLAY ----------------

  if (primaryOverlayPayload) {
    primaryOverlayResult = await emitOverlayPayload({
      overlayPayload: primaryOverlayPayload,
      overlayControl: actionResult.overlayControl,
      executeOverlay,
      actionResult,
      normalizedEvent,
      eventId,
      debug,
      slot: "primary"
    });
    overlayAttempted = overlayAttempted || primaryOverlayResult.attempted;
    overlayEmitted = overlayEmitted || primaryOverlayResult.emitted;
  }

  // ---------------- COMPANION OVERLAY ----------------

  if (companionOverlayPayload) {
    companionOverlayResult = await emitOverlayPayload({
      overlayPayload: companionOverlayPayload,
      overlayControl: actionResult.companionOverlayControl,
      executeOverlay,
      actionResult,
      normalizedEvent,
      eventId,
      debug,
      slot: "companion"
    });
    overlayAttempted = overlayAttempted || companionOverlayResult.attempted;
    overlayEmitted = overlayEmitted || companionOverlayResult.emitted;
  }

  // ---------------- DEFERRED KOJ (overlay after MIA; TTS only if dual-voice) ----------------

  if (actionResult.deferredKojCompanion?.overlayPayload) {
    const delayMs = Math.max(
      500,
      Number(actionResult.deferredKojCompanion.delayMs || 3200)
    );
    const dualVoiceOn = String(process.env.MIA_DUAL_VOICE || "").trim() === "1";
    setTimeout(() => {
      void emitOverlayPayload({
        overlayPayload: actionResult.deferredKojCompanion.overlayPayload,
        overlayControl: {
          priority: 2,
          holdMs: actionResult.deferredKojCompanion.overlayPayload?.holdMs || 5200
        },
        executeOverlay,
        actionResult,
        normalizedEvent,
        eventId,
        debug,
        slot: "deferred_koj"
      });
    }, delayMs);
    debug.reasonCodes.push(
      dualVoiceOn
        ? "EXECUTION_BRIDGE_DEFERRED_KOJ_SCHEDULED"
        : "EXECUTION_BRIDGE_DEFERRED_KOJ_OVERLAY_ONLY"
    );
  }

  // ---------------- VIDEO ----------------

  if (shouldPlayVideo) {
    videoAttempted = true;

    if (typeof executeVideo === "function") {
      try {
        videoResult = await executeVideo(
          actionResult,
          normalizedEvent,
          eventId
        );

        videoEnqueued = Boolean(videoResult?.ok && !videoResult?.skipped);
      } catch (err) {
        videoResult = {
          ok: false,
          skipped: true,
          reason: "video_executor_error"
        };
        debug.reasonCodes.push("EXECUTION_BRIDGE_VIDEO_ERROR");
      }
    } else {
      videoResult = {
        ok: false,
        skipped: true,
        reason: "video_executor_missing_callback"
      };
      debug.reasonCodes.push("EXECUTION_BRIDGE_VIDEO_NO_CALLBACK");
    }
  }

  // ---------------- STATUS ----------------

  let status = "completed";

  if (!primaryOverlayPayload && !companionOverlayPayload && !shouldPlayVideo) {
    status = "skipped";
    debug.reasonCodes.push("EXECUTION_BRIDGE_NO_WORK");
  } else if (
    (primaryOverlayPayload || companionOverlayPayload) &&
    !overlayAttempted
  ) {
    status = "skipped";
    debug.reasonCodes.push("EXECUTION_BRIDGE_NO_OVERLAY_WORK");
  } else if (shouldPlayVideo && !videoEnqueued) {
    status = "partial";
  }

  return {
    accepted: true,
    ok: true,
    status,
    eventId,
    overlay: primaryOverlayResult?.result || null,
    companionOverlay: companionOverlayResult?.result || null,
    video: videoResult,
    animationTrace,
    metrics: {
      overlayAttempted,
      overlayEmitted,
      primaryOverlayEmitted: Boolean(primaryOverlayResult?.emitted),
      companionOverlayEmitted: Boolean(companionOverlayResult?.emitted),
      videoAttempted,
      videoEnqueued
    },
    debug
  };

  function fail(code) {
    return {
      accepted: false,
      ok: false,
      status: "failed",
      debug: {
        reasonCodes: [code]
      }
    };
  }
}

async function emitOverlayPayload({
  overlayPayload,
  overlayControl,
  executeOverlay,
  actionResult,
  normalizedEvent,
  eventId,
  debug,
  slot
}) {
  if (typeof executeOverlay !== "function") {
    debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_NO_CALLBACK");
    return {
      attempted: false,
      emitted: false,
      result: {
        emitted: false,
        reason: "overlay_executor_missing_callback",
        slot
      }
    };
  }

  try {
    const overlayContext = {
      actionResult,
      normalizedEvent,
      eventId,
      overlaySlot: slot,
      priority: overlayControl?.priority,
      holdMs: overlayControl?.holdMs,
      force: overlayControl?.force
    };

    const overlayRenderer = async function renderOverlayPayload(payload, context) {
      return executeOverlay(payload, context);
    };

    const execResult = await runOverlayExecutor({
      overlayPayload,
      context: overlayContext,
      renderer: overlayRenderer
    });

    if (!execResult?.ok) {
      pushOverlayErrorReason(execResult?.reason, debug);
    }

    return {
      attempted: true,
      emitted: Boolean(execResult?.emitted),
      result: {
        ...normalizeOverlayResult(execResult),
        slot
      }
    };
  } catch (err) {
    debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_ERROR");
    return {
      attempted: true,
      emitted: false,
      result: {
        emitted: false,
        reason: "overlay_executor_unhandled_error",
        slot,
        error: err.message
      }
    };
  }
}

function normalizeOverlayResult(execResult) {
  if (!execResult || typeof execResult !== "object") {
    return {
      emitted: false,
      reason: "overlay_executor_invalid_result"
    };
  }

  return {
    emitted: Boolean(execResult.emitted),
    reason: execResult.reason || null,
    meta: execResult.rendererResult || null
  };
}

function pushOverlayErrorReason(reason, debug) {
  if (!reason) {
    debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_ERROR");
    return;
  }

  switch (reason) {
    case "overlay_renderer_missing":
      debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_NO_CALLBACK");
      break;
    case "overlay_payload_invalid":
      debug.reasonCodes.push("EXECUTION_BRIDGE_INVALID_OVERLAY_PAYLOAD");
      break;
    case "overlay_renderer_error":
      debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_ERROR");
      break;
    default:
      debug.reasonCodes.push("EXECUTION_BRIDGE_OVERLAY_ERROR");
  }
}

module.exports = {
  runRuntimeExecutionBridge
};
