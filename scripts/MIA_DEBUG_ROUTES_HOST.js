"use strict";

/**
 * Assemble grouped debug-routes host bindings from flat index bindings.
 */

function buildDebugRoutesHost(bindings = {}) {
  const b = bindings;

  return {
    handlers: {
      getProcessEvent: b.getProcessEvent
    }
  };
}

module.exports = { buildDebugRoutesHost };
