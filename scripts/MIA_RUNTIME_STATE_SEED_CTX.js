"use strict";

/**
 * Flatten grouped runtime state seed host bindings for initial world/state factories.
 */

const runtimeState = require("../core/runtime-state");

function buildRuntimeStateSeedCtx(host = {}) {
  const { core = {}, modules = {} } = host;

  const worldPersistence = modules.kojnozoutWorldPersistenceModule || {};
  const kojPersistence = modules.kojnozoutPersistenceModule || {};

  const worldSeed =
    typeof worldPersistence.loadWorldSeed === "function"
      ? worldPersistence.loadWorldSeed()
      : { backpack: null, duel: null };

  let kojnozoutPersistedSeed =
    typeof kojPersistence.loadPersistedSeed === "function"
      ? kojPersistence.loadPersistedSeed()
      : {};

  // Phase 1: compose runtime-state.json over koj seed without wiping kojnozout-state.json.
  // Tests may pass host.phase1RuntimeState (incl. null) to isolate from live data/runtime-state.json.
  try {
    const phase1State = Object.prototype.hasOwnProperty.call(host, "phase1RuntimeState")
      ? host.phase1RuntimeState
      : runtimeState.loadRuntimeState();
    if (phase1State) {
      kojnozoutPersistedSeed = runtimeState.composeKojSeed(
        kojnozoutPersistedSeed,
        phase1State
      );
    }
  } catch (_err) {
    /* keep koj seed as-is */
  }

  return {
    runtimeConfig: core.runtimeConfig,
    worldSeed,
    kojnozoutPersistedSeed,
    outputStateModule: modules.outputStateModule,
    overlayStateModule: modules.overlayStateModule,
    hostTeamPointsModule: modules.hostTeamPointsModule,
    kojnozoutModule: modules.kojnozoutModule,
    kojnozoutBackpackModule: modules.kojnozoutBackpackModule,
    platformArenaModule: modules.platformArenaModule,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    ecosystemOrchestratorModule: modules.ecosystemOrchestratorModule,
    kojnozoutItemCommandModule: modules.kojnozoutItemCommandModule
  };
}

module.exports = { buildRuntimeStateSeedCtx };
