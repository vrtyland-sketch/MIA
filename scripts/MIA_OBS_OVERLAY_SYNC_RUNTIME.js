"use strict";

/**
 * Thin delegating wrappers around createObsOverlaySync API instance.
 */

function createObsOverlaySyncWrappers(getApi) {
  const api = () => (typeof getApi === "function" ? getApi() : getApi);

  return {
    resolveObsOverlayMode: () => api().resolveObsOverlayMode(),
    auditObsMiaBrowserSources: (...args) => api().auditObsMiaBrowserSources(...args),
    applyObsBrowserSourceProfile: (...args) => api().applyObsBrowserSourceProfile(...args),
    ensureObsVoiceBrowserReady: (...args) => api().ensureObsVoiceBrowserReady(...args),
    fixObsOverlayBrowserLayouts: (...args) => api().fixObsOverlayBrowserLayouts(...args),
    fixObsOverlaySceneTransforms: (...args) => api().fixObsOverlaySceneTransforms(...args),
    ensureObsHands: (...args) => api().ensureObsHands(...args),
    ensureObsStreamerCameras: (...args) => api().ensureObsStreamerCameras(...args),
    flashStartupCheckBrowserSource: (...args) => api().flashStartupCheckBrowserSource(...args),
    configureObsMiaLiveHub: (...args) => api().configureObsMiaLiveHub(...args),
    ensureObsMiaSourceVisibleInProgramScene: (...args) =>
      api().ensureObsMiaSourceVisibleInProgramScene(...args),
    refreshObsMiaBrowserSources: (...args) => api().refreshObsMiaBrowserSources(...args),
    scheduleObsBrowserRefresh: (...args) => api().scheduleObsBrowserRefresh(...args),
    obsBrowserRefreshOnOverlayEnabled: () => api().obsBrowserRefreshOnOverlayEnabled(),
    obsBrowserRefreshOnConnectEnabled: () => api().obsBrowserRefreshOnConnectEnabled()
  };
}

module.exports = { createObsOverlaySyncWrappers };
