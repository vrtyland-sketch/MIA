"use strict";

/**
 * Flatten grouped matting ingest bridge host bindings for createMattingIngestBridge.
 */

function buildMattingIngestBridgeCtx(host = {}) {
  const { core = {}, obs = {}, modules = {}, state = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    safeObsCall: obs.safeObsCall,
    streamerMatting: modules.streamerMattingModule,
    getImmersiveSceneSnapshot: state.getImmersiveSceneSnapshot,
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildMattingIngestBridgeCtx };
