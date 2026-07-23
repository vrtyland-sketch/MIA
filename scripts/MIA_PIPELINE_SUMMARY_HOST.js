"use strict";

/**
 * Assemble grouped pipeline-summary host bindings from flat index bindings.
 */

function buildPipelineSummaryHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      nowIso: b.nowIso
    },
    modules: {
      statusSnapshotModule: b.statusSnapshotModule
    },
    state: {
      setLastShadowPipelineSummary: b.setLastShadowPipelineSummary,
      setLastIngestSummary: b.setLastIngestSummary
    }
  };
}

module.exports = { buildPipelineSummaryHost };
