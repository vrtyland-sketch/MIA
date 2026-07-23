"use strict";

/**
 * Assemble grouped platform-bridges host bindings from flat index bindings.
 */

function buildPlatformBridgesHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      app: b.app,
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      cloneJson: b.cloneJson,
      safeString: b.safeString,
      getProcessEvent: b.getProcessEvent
    },
    modules: {
      kickBridgeModule: b.kickBridgeModule,
      twitchBridgeModule: b.twitchBridgeModule,
      telegramBridgeModule: b.telegramBridgeModule,
      responseEngine: b.responseEngine
    },
    state: {
      getOutputState: b.getOutputState,
      getKojnozoutState: b.getKojnozoutState
    }
  };
}

module.exports = { buildPlatformBridgesHost };
