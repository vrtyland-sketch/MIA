"use strict";

async function phaseDecide(ctx, deps) {
  if (ctx.meta.halted) return ctx;

  const {
    shadowRuntime,
    recordShadowPipelineSummary,
    prepareGiftEconomyPresentation,
    writeLog
  } = deps;

  const { normalized, eventType } = ctx;
  const { outputState, kojnozoutState, ecosystemState } = ctx.refs;

  let shadowResult = null;

  try {
    if (typeof shadowRuntime.runShadowPipeline === "function") {
      shadowResult = shadowRuntime.runShadowPipeline({
        rawEvent: normalized,
        normalizedEvent: normalized,
        streamState: ctx.runtime.streamState,
        outputState,
        kojnozoutState,
        runtimeConfig: deps.runtimeConfig,
        ecosystemState
      });
    }
  } catch (err) {
    shadowResult = { ok: false, error: err.message };
    writeLog("mia-errors", { source: "shadow_runtime", error: err.message });
  }

  ctx.scratch.shadowResult = shadowResult;
  recordShadowPipelineSummary(shadowResult);

  const resolved =
    typeof shadowRuntime.resolvePipelineAction === "function"
      ? await shadowRuntime.resolvePipelineAction({
          shadowResult,
          eventType,
          normalized,
          buildSupportAction: deps.buildSupportAction,
          buildDirectChatAction: deps.buildDirectChatAction,
          normalizeActionResult: deps.normalizeActionResult
        })
      : {
          actionResult: deps.normalizeActionResult(shadowResult, null),
          fallbackUsed: false
        };

  if (resolved.fallbackUsed) {
    ctx.meta.warnings.push("shadow_fallback_used");
  }

  let actionResult = resolved.actionResult;

  if (eventType === "GIFT") {
    const prepared = prepareGiftEconomyPresentation(normalized, actionResult, shadowResult);
    actionResult = prepared.actionResult;
    actionResult.meta = {
      ...(actionResult.meta || {}),
      giftPresentationPlan: prepared.plan
    };
  }

  ctx.scratch.actionResult = actionResult;
  return ctx;
}

module.exports = { phaseDecide };
