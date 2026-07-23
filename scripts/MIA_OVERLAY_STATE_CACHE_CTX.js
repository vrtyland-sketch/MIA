"use strict";

/**
 * Flatten grouped overlay state cache host bindings for createOverlayStateCache.
 */

function buildOverlayStateCacheCtx(host = {}) {
  const { core = {} } = host;

  return {
    ttlMs: core.ttlMs
  };
}

module.exports = { buildOverlayStateCacheCtx };
