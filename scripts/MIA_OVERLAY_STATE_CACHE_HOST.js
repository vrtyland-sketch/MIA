"use strict";

/**
 * Assemble grouped overlay state cache host bindings from flat index bindings.
 */

function buildOverlayStateCacheHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      ttlMs: b.ttlMs
    }
  };
}

module.exports = { buildOverlayStateCacheHost };
