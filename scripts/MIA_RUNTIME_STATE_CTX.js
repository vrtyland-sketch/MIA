"use strict";

/**
 * Flatten grouped runtime-state host bindings for createRuntimeStateRuntime.
 */

function buildRuntimeStateCtx(host = {}) {
  const { core = {}, modules = {}, state = {} } = host;

  return {
    upper: core.upper,
    extractSupportPayload: core.extractSupportPayload,
    extractCommunityImpact: core.extractCommunityImpact,
    streamStateModule: modules.streamStateModule,
    getStreamState: state.getStreamState,
    setStreamState: state.setStreamState,
    kojnozoutModule: modules.kojnozoutModule,
    getKojnozoutState: state.getKojnozoutState,
    setKojnozoutState: state.setKojnozoutState,
    runtimeConfig: core.runtimeConfig,
    gameConfig: core.gameConfig,
    kojnozoutPersistenceModule: modules.kojnozoutPersistenceModule,
    kojnozoutWorldPersistenceModule: modules.kojnozoutWorldPersistenceModule,
    getKojnozoutBackpackState: state.getKojnozoutBackpackState,
    getDuelState: state.getDuelState,
    writeLog: core.writeLog
  };
}

module.exports = { buildRuntimeStateCtx };
