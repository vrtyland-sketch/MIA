"use strict";

/**
 * Flatten grouped ingest-utils host bindings for createIngestUtilsRuntime.
 */

function buildIngestUtilsCtx(host = {}) {
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

module.exports = { buildIngestUtilsCtx };
