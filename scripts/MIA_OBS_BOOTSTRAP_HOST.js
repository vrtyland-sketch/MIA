"use strict";

/**
 * Assemble grouped OBS bootstrap host bindings from flat index bindings.
 */

function buildObsBootstrapHost(bindings = {}) {
  const b = bindings;

  return {
    state: {
      obsSharedState: b.obsSharedState
    },
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog,
      getPort: b.getPort,
      reconnectMs: b.reconnectMs
    },
    modules: {
      OBSWebSocket: b.OBSWebSocket,
      obsSceneGuardModule: b.obsSceneGuardModule
    },
    handlers: {
      getObsWatchdog: b.getObsWatchdog,
      onAfterConnect: b.onAfterConnect,
      onConnectionClosed: b.onConnectionClosed,
      onMediaPlaybackEnded: b.onMediaPlaybackEnded,
      maybeAutoLaunchObs: b.maybeAutoLaunchObs
    }
  };
}

module.exports = { buildObsBootstrapHost };
