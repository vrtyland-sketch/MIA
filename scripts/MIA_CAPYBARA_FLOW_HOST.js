"use strict";

/**
 * Assemble grouped capybara-flow host bindings from flat index bindings.
 */

function buildCapybaraFlowHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      capybaraFlowModule: b.capybaraFlowModule,
      responseEngine: b.responseEngine
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      safeString: b.safeString
    },
    state: {
      getOutputState: b.getOutputState,
      getKojnozoutState: b.getKojnozoutState,
      getEcosystemState: b.getEcosystemState
    },
    handlers: {
      deliverActionVoice: b.deliverActionVoice,
      executeOverlay: b.executeOverlay,
      getUserLabel: b.getUserLabel,
      maybeDeliverMiaVoice: b.maybeDeliverMiaVoice
    }
  };
}

module.exports = { buildCapybaraFlowHost };
