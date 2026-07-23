"use strict";

/**
 * Assemble grouped OBS overlay sync wrappers host bindings from flat index bindings.
 */

function buildObsOverlaySyncWrappersHost(bindings = {}) {
  const b = bindings;

  return {
    sync: {
      getApi: b.getApi
    }
  };
}

module.exports = { buildObsOverlaySyncWrappersHost };
