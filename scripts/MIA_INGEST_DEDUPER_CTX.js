"use strict";

/**
 * Flatten grouped ingest deduper host bindings for createIngestDeduper.
 */

function buildIngestDeduperCtx(host = {}) {
  const { core = {} } = host;

  return {
    windowMs: core.windowMs,
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildIngestDeduperCtx };
