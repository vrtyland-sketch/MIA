"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped OBS vision host bindings for createObsVision.
 */

function buildObsVisionCtx(host = {}) {
  const { core = {}, obs = {}, media = {}, handlers = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    safeObsCall: obs.safeObsCall,
    miaEyes: resolveRuntimeGetter(media.getMiaEyes, media.miaEyes),
    getContext: handlers.buildVisionContext,
    appendJsonLog: core.writeLog
  };
}

module.exports = { buildObsVisionCtx };
