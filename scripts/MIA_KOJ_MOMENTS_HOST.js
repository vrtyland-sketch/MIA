"use strict";

/**
 * Assemble grouped koj-moments host bindings from flat index bindings.
 */

function buildKojMomentsHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      upper: b.upper,
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    modules: {
      careQuestModule: b.careQuestModule,
      careOpportunitiesModule: b.careOpportunitiesModule,
      kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
      kojnozoutDuelBridgeModule: b.kojnozoutDuelBridgeModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      kojnozoutEvolutionModule: b.kojnozoutEvolutionModule
    },
    state: {
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState,
      getDuelState: b.getDuelState,
      setDuelState: b.setDuelState,
      setLastDuelSyncSummary: b.setLastDuelSyncSummary,
      getOutputState: b.getOutputState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      executeOverlay: b.executeOverlay,
      scheduleWorldSave: b.scheduleWorldSave
    }
  };
}

module.exports = { buildKojMomentsHost };
