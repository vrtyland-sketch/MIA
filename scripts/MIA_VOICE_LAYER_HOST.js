"use strict";

/**
 * Assemble grouped voice-layer host bindings from flat index bindings.
 */

function buildVoiceLayerHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog
    }
  };
}

module.exports = { buildVoiceLayerHost };
