"use strict";

/**
 * Assemble grouped participant-runtime host bindings from flat index bindings.
 */

function buildParticipantHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      runtimeConfig: b.runtimeConfig
    },
    modules: {
      overlayStateModule: b.overlayStateModule
    },
    state: {
      getOverlayState: b.getOverlayState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      getAvatarUrl: b.getAvatarUrl
    }
  };
}

module.exports = { buildParticipantHost };
