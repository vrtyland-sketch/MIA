"use strict";

/**
 * Flatten grouped world-layer host bindings for createWorldLayerRuntime.
 */

function buildWorldLayerCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {} } = host;

  return {
    upper: core.upper,
    getUserLabel: handlers.getUserLabel,
    extractSupportPayload: handlers.extractSupportPayload,
    safeString: core.safeString,
    kojnozoutModule: modules.kojnozoutModule,
    kojnozoutBackpackModule: modules.kojnozoutBackpackModule,
    getKojnozoutBackpackState: state.getKojnozoutBackpackState,
    setKojnozoutBackpackState: state.setKojnozoutBackpackState,
    getDuelState: state.getDuelState,
    setDuelState: state.setDuelState,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    platformArenaModule: modules.platformArenaModule,
    getArenaState: state.getArenaState,
    setArenaState: state.setArenaState,
    chatRewardModule: modules.chatRewardModule,
    kojRosterModule: modules.kojRosterModule,
    setOverlay: handlers.setOverlay,
    invalidateOverlayStateCache: handlers.invalidateOverlayStateCache,
    writeLog: core.writeLog,
    scheduleWorldSave: handlers.scheduleWorldSave
  };
}

module.exports = { buildWorldLayerCtx };
