"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped capybara-flow host bindings for createCapybaraFlowRuntime.
 */

function buildCapybaraFlowCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, handlers = {} } = host;

  return {
    capybaraFlowModule: modules.capybaraFlowModule,
    getOutputState: state.getOutputState,
    responseEngine: modules.responseEngine,
    runtimeConfig: core.runtimeConfig,
    getKojnozoutState: state.getKojnozoutState,
    getEcosystemState: state.getEcosystemState,
    ecosystemState: state.ecosystemState,
    deliverActionVoice: handlers.deliverActionVoice,
    executeOverlay: handlers.executeOverlay,
    writeLog: core.writeLog,
    safeString: core.safeString,
    getUserLabel: handlers.getUserLabel,
    maybeDeliverMiaVoice: handlers.maybeDeliverMiaVoice
  };
}

module.exports = { buildCapybaraFlowCtx };
