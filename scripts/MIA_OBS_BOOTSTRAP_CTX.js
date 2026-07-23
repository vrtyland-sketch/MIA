"use strict";

/**
 * Flatten grouped OBS bootstrap host bindings for createObsBootstrap.
 */

function buildObsBootstrapCtx(host = {}) {
  const { state = {}, core = {}, modules = {}, handlers = {}, media = {} } = host;

  return {
    state: state.obsSharedState,
    OBSWebSocket: modules.OBSWebSocket,
    runtimeConfig: core.runtimeConfig,
    writeLog: core.writeLog,
    port: typeof core.getPort === "function" ? core.getPort() : core.port,
    getObsWatchdog: handlers.getObsWatchdog,
    obsSceneGuardModule: modules.obsSceneGuardModule,
    reconnectMs: core.reconnectMs,
    onAfterConnect: handlers.onAfterConnect,
    onConnectionClosed: handlers.onConnectionClosed,
    onMediaPlaybackEnded: handlers.onMediaPlaybackEnded,
    maybeAutoLaunchObs: handlers.maybeAutoLaunchObs
  };
}

module.exports = { buildObsBootstrapCtx };
