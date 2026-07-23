"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped boss-mission host bindings for createBossMissionRuntime.
 */

function buildBossMissionCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, media = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    bossMissionModule: modules.bossMissionModule,
    getOverlayState: state.getOverlayState,
    safeString: core.safeString,
    getUserLabel: core.getUserLabel,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    writeLog: core.writeLog
  };
}

module.exports = { buildBossMissionCtx };
