"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped translation-delivery host bindings for createTranslationRuntime.
 */

function buildTranslationCtx(host = {}) {
  const { core = {}, modules = {}, handlers = {}, delivery = {} } = host;

  return {
    writeLog: core.writeLog,
    safeString: core.safeString,
    ttsEngine: resolveRuntimeGetter(modules.getTtsEngine, modules.ttsEngine),
    runtimeConfig: core.runtimeConfig,
    voiceHoldUntilTs: core.voiceHoldUntilTs,
    deliveryRuntime: delivery.deliveryRuntime,
    translationRuntime: resolveRuntimeGetter(
      modules.getInterpreterRuntime,
      modules.translationRuntime
    ),
    setOverlay: handlers.setOverlay,
    invalidateOverlayStateCache: handlers.invalidateOverlayStateCache,
    translateModule: modules.translateModule,
    languageModule: modules.languageModule,
    getUserLabel: handlers.getUserLabel
  };
}

module.exports = { buildTranslationCtx };
