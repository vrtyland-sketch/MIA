"use strict";

/**
 * Flatten grouped action-builder host bindings for createActionBuilderRuntime.
 */

function buildActionBuilderCtx(host = {}) {
  const { core = {}, modules = {}, state = {} } = host;

  return {
    safeString: core.safeString,
    getUserLabel: core.getUserLabel,
    chatBrain: modules.chatBrain,
    runtimeConfig: core.runtimeConfig,
    getKojnozoutState: state.getKojnozoutState,
    getOutputState: state.getOutputState,
    responseEngine: modules.responseEngine
  };
}

module.exports = { buildActionBuilderCtx };
