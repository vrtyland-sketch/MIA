"use strict";

/**
 * Assemble grouped showcase-command host bindings from flat index bindings.
 */

function buildShowcaseCommandHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      streamerShowcaseModule: b.streamerShowcaseModule,
      streamerIdentityModule: b.streamerIdentityModule,
      overlayStateModule: b.overlayStateModule,
      kojTestModeModule: b.kojTestModeModule,
      kojnozoutVitalsModule: b.kojnozoutVitalsModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      safeString: b.safeString,
      getUserLabel: b.getUserLabel,
      writeLog: b.writeLog,
      getEnv: b.getEnv
    },
    state: {
      getOverlayState: b.getOverlayState,
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState,
      getDuelState: b.getDuelState,
      setDuelState: b.setDuelState
    },
    handlers: {
      executeOverlay: b.executeOverlay,
      speakMiaShowcaseLine: b.speakMiaShowcaseLine
    },
    media: {
      getVideoEngine: b.getVideoEngine
    },
    koj: {
      scheduleWorldSave: b.scheduleWorldSave
    }
  };
}

module.exports = { buildShowcaseCommandHost };
