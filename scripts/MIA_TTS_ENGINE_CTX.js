"use strict";

/**
 * Flatten grouped TTS engine host bindings for createTtsEngine.
 */

function buildTtsEngineCtx(host = {}) {
  const { core = {} } = host;

  return {
    appendJsonLog: core.writeLog,
    cacheDir: core.cacheDir
  };
}

module.exports = { buildTtsEngineCtx };
