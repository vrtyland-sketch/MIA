"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped showcase-runtime host bindings for createShowcaseRuntime.
 */

function buildShowcaseCtx(host = {}) {
  const { core = {}, modules = {}, delivery = {}, handlers = {} } = host;

  return {
    safeString: core.safeString,
    ttsEngine: resolveRuntimeGetter(modules.getTtsEngine, modules.ttsEngine),
    runtimeConfig: core.runtimeConfig,
    voiceHoldUntilTs: core.voiceHoldUntilTs,
    deliveryRuntime: delivery.deliveryRuntime,
    mirrorSpeechOverlayFromVoice: handlers.mirrorSpeechOverlayFromVoice,
    invalidateOverlayStateCache: handlers.invalidateOverlayStateCache
  };
}

module.exports = { buildShowcaseCtx };
