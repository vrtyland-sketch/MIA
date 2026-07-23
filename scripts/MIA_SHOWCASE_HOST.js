"use strict";

/**
 * Assemble grouped showcase-runtime host bindings from flat index bindings.
 */

function buildShowcaseHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig,
      voiceHoldUntilTs: b.voiceHoldUntilTs
    },
    modules: {
      getTtsEngine: b.getTtsEngine
    },
    delivery: {
      deliveryRuntime: b.deliveryRuntime
    },
    handlers: {
      mirrorSpeechOverlayFromVoice: b.mirrorSpeechOverlayFromVoice,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache
    }
  };
}

module.exports = { buildShowcaseHost };
