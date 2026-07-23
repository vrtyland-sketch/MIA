"use strict";

/**
 * Flatten grouped arena battle demo host bindings for createArenaBattleDemo.
 */

function buildArenaBattleDemoCtx(host = {}) {
  const { modules = {} } = host;

  return {
    platformArenaModule: modules.platformArenaModule
  };
}

module.exports = { buildArenaBattleDemoCtx };
