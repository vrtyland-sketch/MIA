"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped platform-bridges host bindings for createPlatformBridges.
 */

function buildPlatformBridgesCtx(host = {}) {
  const { core = {}, modules = {}, state = {} } = host;

  return {
    app: core.app,
    runtimeConfig: core.runtimeConfig,
    writeLog: core.writeLog,
    cloneJson: core.cloneJson,
    safeString: core.safeString,
    processEvent: resolveRuntimeGetter(core.getProcessEvent, core.processEvent),
    kickBridgeModule: modules.kickBridgeModule,
    twitchBridgeModule: modules.twitchBridgeModule,
    telegramBridgeModule: modules.telegramBridgeModule,
    responseEngine: modules.responseEngine,
    getOutputState: state.getOutputState,
    getKojnozoutState: state.getKojnozoutState
  };
}

module.exports = { buildPlatformBridgesCtx };
