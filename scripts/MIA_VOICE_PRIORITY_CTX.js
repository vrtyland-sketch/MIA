"use strict";

/**
 * Flatten grouped voice-priority host bindings for createVoicePriorityLayer.
 */

function buildVoicePriorityCtx(host = {}) {
  const { core = {} } = host;

  return {
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildVoicePriorityCtx };
