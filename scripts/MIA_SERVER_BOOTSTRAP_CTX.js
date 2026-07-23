"use strict";

/**
 * Flatten grouped server-bootstrap host bindings for createMiaServerStarter.
 */

function buildServerBootstrapCtx(host = {}) {
  const { core = {}, modules = {}, handlers = {}, obs = {} } = host;

  return {
    app: core.app,
    PORT: core.PORT,
    BIND_HOST: core.BIND_HOST,
    portGuardModule: modules.portGuardModule,
    runtimeSecurityModule: modules.runtimeSecurityModule,
    overlayStaticDir: core.overlayStaticDir,
    MIA_SPLIT_OVERLAYS: core.MIA_SPLIT_OVERLAYS,
    warnOnDeadObsSceneFiles: obs.warnOnDeadObsSceneFiles,
    connectObs: obs.connectObs,
    selfRestartModule: modules.selfRestartModule,
    emitStartupOverlay: handlers.emitStartupOverlay,
    miaPaintWs: modules.miaPaintWs,
    miaPaintBridge: modules.miaPaintBridge,
    markStreamSessionEnded: handlers.markStreamSessionEnded
  };
}

module.exports = { buildServerBootstrapCtx };
