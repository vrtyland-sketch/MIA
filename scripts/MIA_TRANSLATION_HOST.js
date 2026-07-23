"use strict";

/**
 * Assemble grouped translation-delivery host bindings from flat index bindings.
 */

function buildTranslationHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig,
      voiceHoldUntilTs: b.voiceHoldUntilTs
    },
    modules: {
      getTtsEngine: b.getTtsEngine,
      getInterpreterRuntime: b.getInterpreterRuntime,
      translateModule: b.translateModule,
      languageModule: b.languageModule
    },
    handlers: {
      setOverlay: b.setOverlay,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache,
      getUserLabel: b.getUserLabel
    },
    delivery: {
      deliveryRuntime: b.deliveryRuntime
    }
  };
}

module.exports = { buildTranslationHost };
