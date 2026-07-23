"use strict";

/**
 * Assemble grouped runtime state seed host bindings from flat index bindings.
 */

function buildRuntimeStateSeedHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig
    },
    modules: {
      outputStateModule: b.outputStateModule,
      overlayStateModule: b.overlayStateModule,
      hostTeamPointsModule: b.hostTeamPointsModule,
      kojnozoutModule: b.kojnozoutModule,
      kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
      kojnozoutWorldPersistenceModule: b.kojnozoutWorldPersistenceModule,
      kojnozoutBackpackModule: b.kojnozoutBackpackModule,
      platformArenaModule: b.platformArenaModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      ecosystemOrchestratorModule: b.ecosystemOrchestratorModule,
      kojnozoutItemCommandModule: b.kojnozoutItemCommandModule
    }
  };
}

module.exports = { buildRuntimeStateSeedHost };
