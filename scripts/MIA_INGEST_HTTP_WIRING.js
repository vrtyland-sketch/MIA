"use strict";

/**
 * Ingest HTTP handler factory — /ingest and audience ingest routes.
 */

function buildIngestHttpDeps(ctx) {
  return {
    normalizer: ctx.normalizer,
    runtimeConfig: ctx.runtimeConfig,
    languageModule: ctx.languageModule,
    safeString: ctx.safeString,
    upper: ctx.upper,
    ingestGuardModule: ctx.ingestGuardModule,
    writeLog: ctx.writeLog,
    recordIngestSummary: ctx.recordIngestSummary,
    streamAudienceModule: ctx.streamAudienceModule,
    spamSessionEngine: ctx.spamSessionEngine,
    getStreamState: ctx.getStreamState,
    setStreamState: ctx.setStreamState,
    processEvent: ctx.processEvent
  };
}

function createIngestHttpApi(ingestHttpModule, ctx) {
  if (typeof ingestHttpModule?.createIngestHttpHandlers !== "function") {
    return null;
  }

  return ingestHttpModule.createIngestHttpHandlers(buildIngestHttpDeps(ctx));
}

function createIngestHttpFallback() {
  const missing = async (_req, res) => {
    res.status(503).json({ ok: false, error: "ingest_http_missing" });
  };

  return {
    handleIngest: missing,
    handleAudienceIngest: missing
  };
}

function createIngestHttpRuntime(ingestHttpModule, ctx) {
  return createIngestHttpApi(ingestHttpModule, ctx) || createIngestHttpFallback();
}

module.exports = {
  buildIngestHttpDeps,
  createIngestHttpApi,
  createIngestHttpFallback,
  createIngestHttpRuntime
};
