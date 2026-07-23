"use strict";

/**
 * Flatten grouped participant-runtime host bindings for createParticipantRuntime.
 */

function buildParticipantCtx(host = {}) {
  const { core = {}, modules = {}, state = {}, handlers = {} } = host;

  return {
    safeString: core.safeString,
    getUserLabel: handlers.getUserLabel,
    getAvatarUrl: handlers.getAvatarUrl,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    runtimeConfig: core.runtimeConfig
  };
}

module.exports = { buildParticipantCtx };
