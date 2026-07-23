"use strict";

/**
 * Assemble grouped boss-mission host bindings from flat index bindings.
 */

function buildBossMissionHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      safeString: b.safeString,
      getUserLabel: b.getUserLabel,
      writeLog: b.writeLog
    },
    modules: {
      bossMissionModule: b.bossMissionModule
    },
    state: {
      getOverlayState: b.getOverlayState
    },
    media: {
      getVideoEngine: b.getVideoEngine
    }
  };
}

module.exports = { buildBossMissionHost };
