"use strict";

/**
 * Assemble grouped world-layer host bindings from flat index bindings.
 */

function buildWorldLayerHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      upper: b.upper,
      safeString: b.safeString,
      writeLog: b.writeLog
    },
    modules: {
      kojnozoutModule: b.kojnozoutModule,
      kojnozoutBackpackModule: b.kojnozoutBackpackModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      platformArenaModule: b.platformArenaModule,
      chatRewardModule: b.chatRewardModule,
      kojRosterModule: b.kojRosterModule
    },
    state: {
      getKojnozoutBackpackState: b.getKojnozoutBackpackState,
      setKojnozoutBackpackState: b.setKojnozoutBackpackState,
      getDuelState: b.getDuelState,
      setDuelState: b.setDuelState,
      getArenaState: b.getArenaState,
      setArenaState: b.setArenaState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      extractSupportPayload: b.extractSupportPayload,
      setOverlay: b.setOverlay,
      invalidateOverlayStateCache: b.invalidateOverlayStateCache,
      scheduleWorldSave: b.scheduleWorldSave
    }
  };
}

module.exports = { buildWorldLayerHost };
