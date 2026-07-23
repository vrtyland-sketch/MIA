"use strict";

/**
 * Assemble grouped overlay-timing host bindings from flat index bindings.
 */

function buildOverlayTimingHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      baseDelayMs: b.baseDelayMs
    }
  };
}

module.exports = { buildOverlayTimingHost };
