"use strict";

/**
 * Flatten grouped OBS overlay sync wrappers host bindings for createObsOverlaySyncWrappers.
 */

function buildObsOverlaySyncWrappersCtx(host = {}) {
  const { sync = {} } = host;

  return {
    getApi: sync.getApi
  };
}

module.exports = { buildObsOverlaySyncWrappersCtx };
