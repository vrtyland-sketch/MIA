"use strict";

/**
 * Assemble grouped TTS engine host bindings from flat index bindings.
 */

function buildTtsEngineHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      writeLog: b.writeLog,
      cacheDir: b.cacheDir
    }
  };
}

module.exports = { buildTtsEngineHost };
