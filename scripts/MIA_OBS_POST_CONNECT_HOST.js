"use strict";

/**
 * Assemble grouped OBS post-connect host bindings from flat index bindings.
 */

function buildObsPostConnectHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig
    },
    obs: {
      ensureObsHands: b.ensureObsHands,
      configureObsMiaLiveHub: b.configureObsMiaLiveHub,
      fixObsOverlayBrowserLayouts: b.fixObsOverlayBrowserLayouts,
      fixObsOverlaySceneTransforms: b.fixObsOverlaySceneTransforms,
      ensureObsMiaSourceVisibleInProgramScene: b.ensureObsMiaSourceVisibleInProgramScene,
      ensureObsVoiceBrowserReady: b.ensureObsVoiceBrowserReady,
      obsBrowserRefreshOnConnectEnabled: b.obsBrowserRefreshOnConnectEnabled,
      refreshObsMiaBrowserSources: b.refreshObsMiaBrowserSources
    },
    media: {
      getVideoEngine: b.getVideoEngine,
      getObsVision: b.getObsVision,
      getMiaEyes: b.getMiaEyes
    }
  };
}

module.exports = { buildObsPostConnectHost };
