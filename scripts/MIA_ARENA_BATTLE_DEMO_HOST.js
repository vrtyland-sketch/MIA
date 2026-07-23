"use strict";

/**
 * Assemble grouped arena battle demo host bindings from flat index bindings.
 */

function buildArenaBattleDemoHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      platformArenaModule: b.platformArenaModule
    }
  };
}

module.exports = { buildArenaBattleDemoHost };
