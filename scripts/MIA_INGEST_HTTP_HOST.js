"use strict";

/**
 * Assemble grouped ingest-http host bindings from flat index bindings.
 */

function buildIngestHttpHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      normalizer: b.normalizer,
      languageModule: b.languageModule,
      ingestGuardModule: b.ingestGuardModule,
      streamAudienceModule: b.streamAudienceModule,
      getSpamSessionEngine: b.getSpamSessionEngine
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      safeString: b.safeString,
      upper: b.upper,
      writeLog: b.writeLog
    },
    state: {
      getStreamState: b.getStreamState,
      setStreamState: b.setStreamState
    },
    handlers: {
      recordIngestSummary: b.recordIngestSummary,
      processEvent: b.processEvent
    }
  };
}

module.exports = { buildIngestHttpHost };
