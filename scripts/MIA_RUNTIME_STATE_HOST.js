"use strict";

/**
 * Assemble grouped runtime-state host bindings from flat index bindings.
 */

function buildRuntimeStateHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      upper: b.upper,
      extractSupportPayload: b.extractSupportPayload,
      extractCommunityImpact: b.extractCommunityImpact,
      runtimeConfig: b.runtimeConfig,
      gameConfig: b.gameConfig,
      writeLog: b.writeLog
    },
    modules: {
      streamStateModule: b.streamStateModule,
      kojnozoutModule: b.kojnozoutModule,
      kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
      kojnozoutWorldPersistenceModule: b.kojnozoutWorldPersistenceModule
    },
    state: {
      getStreamState: b.getStreamState,
      setStreamState: b.setStreamState,
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState,
      getKojnozoutBackpackState: b.getKojnozoutBackpackState,
      getDuelState: b.getDuelState
    }
  };
}

module.exports = { buildRuntimeStateHost };
