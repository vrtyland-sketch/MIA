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

function bootPersistedWorld(worldSeed = {}, modules = {}) {
  const seed = worldSeed && typeof worldSeed === "object" ? worldSeed : {};
  if (seed.ok === false) {
    return {
      ok: false,
      degraded: true,
      worldEnabled: false,
      recovered: false,
      reason: seed.reason || "world_state_corrupt",
      error: seed.error || "world_state_malformed",
      backpack: null,
      duel: null
    };
  }

  const backpackModule = modules.kojnozoutBackpackModule || {};
  const duelModule = modules.kojnozoutDuelModule || {};
  const backpack = typeof backpackModule.createBackpackState === "function"
    ? backpackModule.createBackpackState(seed.backpack || {})
    : { users: {}, totalItems: 0 };
  const duel = typeof duelModule.createDuelState === "function"
    ? duelModule.createDuelState(seed.duel || {})
    : { active: false, phase: "idle" };

  return {
    ok: true,
    degraded: false,
    worldEnabled: true,
    recovered: Boolean(seed.recovered),
    reason: seed.reason || "loaded",
    error: undefined,
    backpack,
    duel
  };
}

module.exports = { buildRuntimeStateSeedCtx, bootPersistedWorld };
