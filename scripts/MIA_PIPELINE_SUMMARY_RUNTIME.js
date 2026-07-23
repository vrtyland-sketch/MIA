"use strict";

/**
 * Ingest / shadow pipeline summary recorders for /status diagnostics.
 */

function createPipelineSummaryRuntime(deps = {}) {
  const {
    statusSnapshotModule,
    setLastShadowPipelineSummary,
    setLastIngestSummary,
    nowIso
  } = deps;

  function recordShadowPipelineSummary(shadowResult = null) {
    if (
      !shadowResult ||
      typeof statusSnapshotModule?.summarizeShadowPipelineResult !== "function"
    ) {
      return;
    }

    const summary = statusSnapshotModule.summarizeShadowPipelineResult(shadowResult);
    summary.atIso = typeof nowIso === "function" ? nowIso() : new Date().toISOString();
    if (typeof setLastShadowPipelineSummary === "function") {
      setLastShadowPipelineSummary(summary);
    }
  }

  function recordIngestSummary(summary = {}) {
    const next = {
      ...summary,
      at: Date.now(),
      atIso: typeof nowIso === "function" ? nowIso() : new Date().toISOString()
    };
    if (typeof setLastIngestSummary === "function") {
      setLastIngestSummary(next);
    }
  }

  return { recordShadowPipelineSummary, recordIngestSummary };
}

module.exports = { createPipelineSummaryRuntime };
