"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped OBS post-connect host bindings for createObsPostConnectRuntime.
 */

function buildObsPostConnectCtx(host = {}) {
  const { core = {}, obs = {}, media = {} } = host;

  return {
    writeLog: core.writeLog,
    safeString: core.safeString,
    runtimeConfig: core.runtimeConfig,
    ensureObsHands: obs.ensureObsHands,
    configureObsMiaLiveHub: obs.configureObsMiaLiveHub,
    fixObsOverlayBrowserLayouts: obs.fixObsOverlayBrowserLayouts,
    fixObsOverlaySceneTransforms: obs.fixObsOverlaySceneTransforms,
    ensureObsMiaSourceVisibleInProgramScene: obs.ensureObsMiaSourceVisibleInProgramScene,
    videoEngine: resolveRuntimeGetter(media.getVideoEngine, media.videoEngine),
    ensureObsVoiceBrowserReady: obs.ensureObsVoiceBrowserReady,
    obsVision: resolveRuntimeGetter(media.getObsVision, media.obsVision),
    obsBrowserRefreshOnConnectEnabled: obs.obsBrowserRefreshOnConnectEnabled,
    refreshObsMiaBrowserSources: obs.refreshObsMiaBrowserSources,
    miaEyes: resolveRuntimeGetter(media.getMiaEyes, media.miaEyes)
  };
}

module.exports = { buildObsPostConnectCtx };
