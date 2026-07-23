"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped ingest-http host bindings for createIngestHttpHandlers.
 */

function buildIngestHttpCtx(host = {}) {
  const { modules = {}, core = {}, state = {}, handlers = {} } = host;

  return {
    normalizer: modules.normalizer,
    runtimeConfig: core.runtimeConfig,
    languageModule: modules.languageModule,
    safeString: core.safeString,
    upper: core.upper,
    ingestGuardModule: modules.ingestGuardModule,
    writeLog: core.writeLog,
    recordIngestSummary: handlers.recordIngestSummary,
    streamAudienceModule: modules.streamAudienceModule,
    spamSessionEngine: resolveRuntimeGetter(
      modules.getSpamSessionEngine,
      modules.spamSessionEngine
    ),
    getStreamState: state.getStreamState,
    setStreamState: state.setStreamState,
    processEvent: handlers.processEvent
  };
}

module.exports = { buildIngestHttpCtx };
