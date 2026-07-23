"use strict";

/**
 * Flatten grouped koj-moments host bindings for createKojMomentsRuntime.
 */

function buildKojMomentsCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {} } = host;

  return {
    upper: core.upper,
    safeString: core.safeString,
    getUserLabel: handlers.getUserLabel,
    careQuestModule: modules.careQuestModule,
    careOpportunitiesModule: modules.careOpportunitiesModule,
    getKojnozoutState: state.getKojnozoutState,
    setKojnozoutState: state.setKojnozoutState,
    kojnozoutPersistenceModule: modules.kojnozoutPersistenceModule,
    executeOverlay: handlers.executeOverlay,
    runtimeConfig: core.runtimeConfig,
    kojnozoutDuelBridgeModule: modules.kojnozoutDuelBridgeModule,
    getDuelState: state.getDuelState,
    setDuelState: state.setDuelState,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    scheduleWorldSave: handlers.scheduleWorldSave,
    setLastDuelSyncSummary: state.setLastDuelSyncSummary,
    kojnozoutEvolutionModule: modules.kojnozoutEvolutionModule,
    getOutputState: state.getOutputState,
    writeLog: core.writeLog
  };
}

module.exports = { buildKojMomentsCtx };
