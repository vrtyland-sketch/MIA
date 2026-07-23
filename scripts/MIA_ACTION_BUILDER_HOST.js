"use strict";

/**
 * Assemble grouped action-builder host bindings from flat index bindings.
 */

function buildActionBuilderHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      getUserLabel: b.getUserLabel,
      runtimeConfig: b.runtimeConfig
    },
    modules: {
      chatBrain: b.chatBrain,
      responseEngine: b.responseEngine
    },
    state: {
      getKojnozoutState: b.getKojnozoutState,
      getOutputState: b.getOutputState
    }
  };
}

module.exports = { buildActionBuilderHost };
