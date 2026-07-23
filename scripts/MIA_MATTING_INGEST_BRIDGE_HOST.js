"use strict";

/**
 * Assemble grouped matting ingest bridge host bindings from flat index bindings.
 */

function buildMattingIngestBridgeHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    obs: {
      safeObsCall: b.safeObsCall
    },
    modules: {
      streamerMattingModule: b.streamerMattingModule
    },
    state: {
      getImmersiveSceneSnapshot: b.getImmersiveSceneSnapshot
    }
  };
}

module.exports = { buildMattingIngestBridgeHost };
