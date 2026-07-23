"use strict";

/**
 * Flatten grouped overlay-queue host bindings for createOverlayQueue.
 */

function buildOverlayQueueCtx(host = {}) {
  const { core = {} } = host;

  return {
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildOverlayQueueCtx };
