"use strict";

/**
 * Assemble grouped overlay-queue host bindings from flat index bindings.
 */

function buildOverlayQueueHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog
    }
  };
}

module.exports = { buildOverlayQueueHost };
