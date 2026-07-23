"use strict";

async function phasePost(ctx, deps) {
  if (ctx.meta.halted) return ctx;

  const {
    schedulePostGiftMediaExperiences,
    capybaraFlowModule,
    giftMapModule,
    giftAnimationContextModule,
    scheduleDeferredMiaVoice,
    maybeDeliverMiaVoice,
    deliverEvolutionMoment,
    speakerRoutingModule,
    runtimeConfig,
    getUserLabel,
    safeString,
    writeLog
  } = deps;

  const { normalized, eventType } = ctx;
  const { outputState, ecosystemState, kojnozoutState } = ctx.refs;
  const { actionResult, executionResult, runtimeImpact } = ctx.scratch;

  if (eventType === "GIFT" || safeString(normalized?.kind).toLowerCase() === "gift") {
    schedulePostGiftMediaExperiences(normalized, actionResult).catch((err) => {
      writeLog("mia-errors", {
        source: "post_gift_media_async",
        error: err?.message || String(err)
      });
    });

    if (typeof capybaraFlowModule.isCapybaraLoopGift === "function") {
      try {
        const support = normalized?.support || {};
        const capyGiftProfile =
          typeof giftMapModule.resolveGiftProfile === "function"
            ? giftMapModule.resolveGiftProfile(support)
            : {};

        if (capybaraFlowModule.isCapybaraLoopGift(capyGiftProfile, normalized)) {
          const awayMode =
            typeof capybaraFlowModule.resolveAwayMode === "function"
              ? capybaraFlowModule.resolveAwayMode({ outputState, ecosystemState })
              : false;

          const shouldStart =
            typeof capybaraFlowModule.shouldStartGiftChatLoop === "function"
              ? capybaraFlowModule.shouldStartGiftChatLoop(
                  { outputState, ecosystemState, normalized },
                  capyGiftProfile
                )
              : awayMode;

          if (!shouldStart) {
            writeLog("mia-events", {
              ts: Date.now(),
              stage: "gift_chat_loop_skipped",
              reason: "away_only_live_mode",
              giftName: support.giftName || normalized.giftName,
              worldMode: outputState.worldMode || "default"
            });
          } else {
            const giftAnimation =
              typeof giftAnimationContextModule.buildGiftAnimationContext === "function"
                ? giftAnimationContextModule.buildGiftAnimationContext(
                    kojnozoutState || {},
                    ctx.runtime.streamState || {},
                    capyGiftProfile
                  )
                : {};

            capybaraFlowModule.startCapybaraFlow(outputState, {
              gifterLabel: getUserLabel(normalized),
              giftName: safeString(support.giftName || normalized.giftName, "dárek"),
              giftKey: safeString(capyGiftProfile.canonicalKey, "animal_small"),
              kojMood: safeString(giftAnimation.rawMood || kojnozoutState?.mood),
              primaryNeed: safeString(giftAnimation.primaryNeed),
              awayMode
            });

            writeLog("mia-events", {
              ts: Date.now(),
              stage: "gift_chat_loop_started",
              gifter: getUserLabel(normalized),
              giftName: support.giftName || normalized.giftName,
              awayMode
            });
          }
        }
      } catch (err) {
        writeLog("mia-errors", { source: "capybara_flow_start", error: err.message });
      }
    }
  }

  if (actionResult?.meta?.miaVoiceDeferredForVideo === true) {
    const videoEnqueued = executionResult?.metrics?.videoEnqueued === true;
    const deferredPlan = actionResult?.meta?.deferredVoicePlan || null;

    if (videoEnqueued) {
      const deferMs =
        typeof speakerRoutingModule.resolveGiftVideoVoiceDeferMs === "function"
          ? speakerRoutingModule.resolveGiftVideoVoiceDeferMs(actionResult, runtimeConfig)
          : 5200;
      scheduleDeferredMiaVoice(actionResult, deferMs);
    } else if (deferredPlan?.text) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "tts_deferred_fallback_immediate",
        reason: "video_not_enqueued",
        tier: actionResult?.tier || actionResult?.support?.tier || null
      });
      try {
        await maybeDeliverMiaVoice(actionResult, deferredPlan);
      } catch (err) {
        writeLog("mia-errors", { source: "mia_voice_deferred_fallback", error: err.message });
      }
    }
  }

  if (runtimeImpact?.evolutionLevelUp) {
    try {
      ctx.scratch.evolutionMoment = await deliverEvolutionMoment(
        runtimeImpact.evolutionLevelUp,
        normalized,
        eventType
      );
    } catch (err) {
      writeLog("mia-errors", { source: "evolution_moment", error: err.message });
    }
  }

  return ctx;
}

module.exports = { phasePost };
