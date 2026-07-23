"use strict";

const { buildPresentationPlan } = require("../MIA_PRESENTATION_PLAN");

async function phasePresent(ctx, deps) {
  if (ctx.meta.halted) return ctx;

  const {
    kojnozoutVitalsModule,
    kojnozoutPersistenceModule,
    deliverChatTranslation,
    responseEngine,
    llmAdapterModule,
    attachGiftVideoPlan,
    speakerRoutingModule,
    videoEngine,
    getObsSourceAudioMap,
    executeGiftPresentationOverlays,
    deliverActionVoice,
    runtimeConfig,
    getUserLabel,
    safeString,
    writeLog
  } = deps;

  const { normalized, eventType } = ctx;
  const { kojnozoutState } = ctx.refs;
  const { outputState } = ctx.refs;
  let { actionResult, shadowResult } = ctx.scratch;

  if (
    eventType === "COMMENT" &&
    safeString(actionResult?.reason || shadowResult?.decisionResult?.reason).toUpperCase() ===
      "COMMUNITY_ILLNESS_DUAL" &&
    typeof kojnozoutVitalsModule.applyIllnessContagion === "function"
  ) {
    try {
      kojnozoutVitalsModule.applyIllnessContagion(kojnozoutState, { chance: 0.65 });
      if (typeof kojnozoutVitalsModule.syncVitals === "function") {
        kojnozoutVitalsModule.syncVitals(kojnozoutState, ctx.runtime.streamState, {
          minutesElapsed: 0
        });
      }
      if (typeof kojnozoutPersistenceModule.scheduleSaveKojnozoutState === "function") {
        kojnozoutPersistenceModule.scheduleSaveKojnozoutState(kojnozoutState);
      }
    } catch (err) {
      writeLog("mia-errors", { source: "illness_contagion", error: err.message });
    }
  }

  if (eventType === "COMMENT") {
    try {
      const chatTranslation = await deliverChatTranslation(normalized);
      if (chatTranslation?.ok) {
        actionResult = {
          ...actionResult,
          meta: {
            ...(actionResult?.meta || {}),
            chatTranslation: {
              from: chatTranslation.from,
              to: chatTranslation.to,
              translated: chatTranslation.translated
            },
            language: normalized.language || chatTranslation.from
          }
        };
      }
    } catch (err) {
      writeLog("mia-errors", { source: "chat_translation", error: err.message });
    }
  }

  if (
    eventType === "COMMENT" &&
    typeof responseEngine.enhanceDirectChatWithLlm === "function" &&
    llmAdapterModule &&
    typeof llmAdapterModule.isEnabled === "function" &&
    llmAdapterModule.isEnabled(runtimeConfig)
  ) {
    try {
      actionResult = await responseEngine.enhanceDirectChatWithLlm(actionResult, {
        message: safeString(normalized.message),
        userLabel: getUserLabel(normalized),
        outputState,
        runtimeConfig,
        language: normalized.language,
        normalizedEvent: normalized
      });
    } catch (err) {
      writeLog("mia-errors", { source: "llm_enhance", error: err.message });
    }
  }

  if (eventType === "GIFT" && actionResult?.shouldPlayVideo === true) {
    actionResult = await attachGiftVideoPlan(actionResult);
    if (typeof speakerRoutingModule.applyGiftVideoPresentationPolicy === "function") {
      actionResult = speakerRoutingModule.applyGiftVideoPresentationPolicy(actionResult, {
        videoEngine,
        obsSourceAudioMap: getObsSourceAudioMap(),
        giftVideoPick: actionResult?.meta?.giftVideoPick || null
      });
    }
  }

  if (eventType === "GIFT") {
    try {
      const plan =
        actionResult?.meta?.giftPresentationPlan ||
        actionResult?.meta?.presentationPlan ||
        null;
      await executeGiftPresentationOverlays(normalized, plan);
    } catch (err) {
      writeLog("mia-errors", { source: "gift_presentation_overlays", error: err.message });
    }
  }

  try {
    actionResult = await deliverActionVoice(actionResult);
  } catch (err) {
    writeLog("mia-errors", { source: "mia_voice", error: err.message });
  }

  ctx.scratch.actionResult = actionResult;
  ctx.scratch.presentationPlan = buildPresentationPlan(ctx, deps);
  return ctx;
}

module.exports = { phasePresent };
