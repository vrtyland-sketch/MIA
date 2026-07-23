"use strict";

/**
 * Flatten grouped voice-control-layer host bindings for createVoiceControlLayer.
 */

function buildVoiceControlLayerCtx(host = {}) {
  const { core = {} } = host;

  return {
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildVoiceControlLayerCtx };
