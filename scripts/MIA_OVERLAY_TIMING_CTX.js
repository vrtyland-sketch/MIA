"use strict";

/**
 * Flatten grouped overlay-timing host bindings for createOverlayTiming.
 */

function buildOverlayTimingCtx(host = {}) {
  const { core = {} } = host;

  return {
    baseDelayMs: core.baseDelayMs
  };
}

module.exports = { buildOverlayTimingCtx };
