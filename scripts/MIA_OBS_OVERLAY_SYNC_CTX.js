"use strict";

/**
 * Flatten grouped OBS overlay-sync host bindings for createObsOverlaySync.
 */

function buildObsOverlaySyncCtx(host = {}) {
  const { obs = {}, urls = {}, core = {}, modules = {}, handlers = {}, state = {} } = host;

  return {
    getObs: obs.getObs,
    getObsConnected: obs.getObsConnected,
    getSplitOverlays: urls.getSplitOverlays,
    getOverlayBase: urls.getOverlayBase,
    runtimeConfig: core.runtimeConfig,
    safeString: core.safeString,
    writeLog: core.writeLog,
    obsFixLayoutModule: modules.obsFixLayoutModule,
    buildVisionContext: handlers.buildVisionContext,
    getVoicePlaybackSnapshot: handlers.getVoicePlaybackSnapshot,
    obsHandsModule: modules.obsHandsModule,
    obsAwaySceneModule: modules.obsAwaySceneModule,
    obsStreamerCamerasModule: modules.obsStreamerCamerasModule,
    selfRestartModule: modules.selfRestartModule,
    getMiaEyes: state.getMiaEyes,
    setStartupSlideActiveUntil: state.setStartupSlideActiveUntil
  };
}

module.exports = { buildObsOverlaySyncCtx };
