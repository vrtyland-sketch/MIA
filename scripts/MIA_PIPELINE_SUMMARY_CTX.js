"use strict";

/**
 * Flatten grouped pipeline-summary host bindings for createPipelineSummaryRuntime.
 */

function buildPipelineSummaryCtx(host = {}) {
  const { core = {}, modules = {}, state = {} } = host;

  return {
    statusSnapshotModule: modules.statusSnapshotModule,
    setLastShadowPipelineSummary: state.setLastShadowPipelineSummary,
    setLastIngestSummary: state.setLastIngestSummary,
    nowIso: core.nowIso
  };
}

module.exports = { buildPipelineSummaryCtx };
