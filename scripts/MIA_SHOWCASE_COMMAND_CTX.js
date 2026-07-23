"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped showcase-command host bindings for createShowcaseCommandRuntime.
 */

function buildShowcaseCommandCtx(host = {}) {
  const {
    modules = {},
    core = {},
    state = {},
    handlers = {},
    media = {},
    koj = {}
  } = host;

  return {
    streamerShowcaseModule: modules.streamerShowcaseModule,
    streamerIdentityModule: modules.streamerIdentityModule,
    runtimeConfig: core.runtimeConfig,
    safeString: core.safeString,
    getUserLabel: core.getUserLabel,
    writeLog: core.writeLog,
    executeOverlay: handlers.executeOverlay,
    speakMiaShowcaseLine: handlers.speakMiaShowcaseLine,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    kojTestModeModule: modules.kojTestModeModule,
    kojnozoutVitalsModule: modules.kojnozoutVitalsModule,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    getKojnozoutState: state.getKojnozoutState,
    setKojnozoutState: state.setKojnozoutState,
    getDuelState: state.getDuelState,
    setDuelState: state.setDuelState,
    scheduleWorldSave: koj.scheduleWorldSave,
    getEnv: core.getEnv
  };
}

module.exports = { buildShowcaseCommandCtx };
