"use strict";

/**
 * Assemble grouped ingest deduper host bindings from flat index bindings.
 */

function buildIngestDeduperHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      windowMs: b.windowMs,
      writeLog: b.writeLog
    }
  };
}

module.exports = { buildIngestDeduperHost };
