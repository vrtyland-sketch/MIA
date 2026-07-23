"use strict";

/**
 * Assemble grouped OBS overlay-sync host bindings from flat index bindings.
 */

function buildObsOverlaySyncHost(bindings = {}) {
  const b = bindings;

  return {
    obs: {
      getObs: b.getObs,
      getObsConnected: b.getObsConnected
    },
    urls: {
      getSplitOverlays: b.getSplitOverlays,
      getOverlayBase: b.getOverlayBase
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      safeString: b.safeString,
      writeLog: b.writeLog
    },
    modules: {
      obsFixLayoutModule: b.obsFixLayoutModule,
      obsHandsModule: b.obsHandsModule,
      obsAwaySceneModule: b.obsAwaySceneModule,
      obsStreamerCamerasModule: b.obsStreamerCamerasModule,
      selfRestartModule: b.selfRestartModule
    },
    handlers: {
      buildVisionContext: b.buildVisionContext,
      getVoicePlaybackSnapshot: b.getVoicePlaybackSnapshot
    },
    state: {
      getMiaEyes: b.getMiaEyes,
      setStartupSlideActiveUntil: b.setStartupSlideActiveUntil
    }
  };
}

module.exports = { buildObsOverlaySyncHost };
