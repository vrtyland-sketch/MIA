"use strict";

/**
 * Assemble grouped server-bootstrap host bindings from flat index bindings.
 */

function buildServerBootstrapHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      app: b.app,
      PORT: b.PORT,
      BIND_HOST: b.BIND_HOST,
      overlayStaticDir: b.overlayStaticDir,
      MIA_SPLIT_OVERLAYS: b.MIA_SPLIT_OVERLAYS
    },
    modules: {
      portGuardModule: b.portGuardModule,
      runtimeSecurityModule: b.runtimeSecurityModule,
      selfRestartModule: b.selfRestartModule,
      miaPaintWs: b.miaPaintWs,
      miaPaintBridge: b.miaPaintBridge
    },
    handlers: {
      emitStartupOverlay: b.emitStartupOverlay,
      markStreamSessionEnded: b.markStreamSessionEnded
    },
    obs: {
      warnOnDeadObsSceneFiles: b.warnOnDeadObsSceneFiles,
      connectObs: b.connectObs
    }
  };
}

module.exports = { buildServerBootstrapHost };
