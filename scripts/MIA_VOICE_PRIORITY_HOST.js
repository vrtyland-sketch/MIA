"use strict";

/**
 * Assemble grouped voice-priority host bindings from flat index bindings.
 */

function buildVoicePriorityHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog
    }
  };
}

module.exports = { buildVoicePriorityHost };
