"use strict";

async function phaseExecute(ctx, deps) {
  if (ctx.meta.halted) return ctx;

  const {
    animationTraceModule,
    runtimeExecution,
    executeOverlay,
    executeVideo,
    runtimeConfig,
    writeLog
  } = deps;

  const { normalized, eventType } = ctx;
  const { kojnozoutState } = ctx.refs;
  const { actionResult, bowlBeforeImpact } = ctx.scratch;

  let animationTrace = null;

  try {
    animationTrace =
      typeof animationTraceModule.buildAnimationTrace === "function"
        ? animationTraceModule.buildAnimationTrace({
            normalizedEvent: normalized,
            actionResult,
            runtimeConfig,
            streamState: ctx.runtime.streamState,
            kojnozoutState
          })
        : {
            ok: true,
            effective: { owner: actionResult?.overlayPayload?.owner || "mia" }
          };
  } catch (err) {
    animationTrace = { ok: false, error: err.message };
  }

  let executionResult = null;

  if (typeof runtimeExecution.runRuntimeExecutionBridge === "function") {
    executionResult = await runtimeExecution.runRuntimeExecutionBridge({
      actionResult,
      normalizedEvent: normalized,
      eventId: normalized.eventId || Date.now(),
      executeOverlay,
      executeVideo: (ar, ne, eid) => executeVideo(ar, ne, eid, { bowlBeforeImpact }),
      animationTrace
    });
  } else {
    if (actionResult?.overlayPayload) {
      await executeOverlay(actionResult.overlayPayload, {
        actionResult,
        normalizedEvent: normalized
      });
    }

    let videoResult = { ok: true, skipped: true, reason: "no_video" };

    if (eventType === "GIFT" && actionResult?.shouldPlayVideo !== false) {
      videoResult = await executeVideo(
        actionResult,
        normalized,
        normalized.eventId || Date.now(),
        { bowlBeforeImpact }
      );
    }

    executionResult = {
      accepted: true,
      ok: true,
      status: "completed",
      overlay: {
        emitted: Boolean(actionResult?.overlayPayload),
        reason: "ok"
      },
      video: videoResult,
      metrics: {
        overlayAttempted: Boolean(actionResult?.overlayPayload),
        overlayEmitted: Boolean(actionResult?.overlayPayload),
        videoAttempted: eventType === "GIFT" && actionResult?.shouldPlayVideo !== false,
        videoEnqueued: videoResult?.ok === true && videoResult?.skipped !== true
      },
      debug: { reasonCodes: [] }
    };
  }

  ctx.scratch.animationTrace = animationTrace;
  ctx.scratch.executionResult = executionResult;
  return ctx;
}

module.exports = { phaseExecute };
