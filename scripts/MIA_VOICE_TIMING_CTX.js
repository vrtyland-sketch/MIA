"use strict";

/**
 * Flatten grouped voice-timing host bindings for createVoiceTiming.
 */

function buildVoiceTimingCtx(host = {}) {
  const { core = {}, modules = {} } = host;

  return {
    runtimePerfModule: modules.runtimePerfModule,
    getEnv: core.getEnv
  };
}

module.exports = { buildVoiceTimingCtx };
