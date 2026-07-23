"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped debug-routes host bindings for createDebugRoutesRuntime.
 */

function buildDebugRoutesCtx(host = {}) {
  const { handlers = {} } = host;

  return {
    processEvent: resolveRuntimeGetter(handlers.getProcessEvent, handlers.processEvent)
  };
}

module.exports = { buildDebugRoutesCtx };
