"use strict";

/**
 * Master Canon 0048 — Creature Evolution Engine: long-term Kojnožrout evolution and modular game ecosystem.
 */

const crypto = require("crypto");

const CVE_COMPONENT = Object.freeze({
  CREATURE_MANAGER: "creature_manager",
  PLATFORM_REGISTRY: "platform_registry",
  EVOLUTION_MANAGER: "evolution_manager",
  GENETICS_MANAGER: "genetics_manager",
  GAME_MODULE_REGISTRY: "game_module_registry",
  MODULE_MANAGER: "module_manager",
  PLATFORM_BATTLE_COORDINATOR: "platform_battle_coordinator",
  CREATURE_PROGRESS: "creature_progress",
  CREATURE_HISTORY: "creature_history",
  COMMUNITY_ADAPTER: "community_adapter",
  WORLD_ADAPTER: "world_adapter",
  CREATURE_API: "creature_api"
});

const CVE_COMPONENT_ORDER = Object.freeze(Object.values(CVE_COMPONENT));

const CVE_PLATFORM = Object.freeze({
  TIKTOK: "tiktok",
  KICK: "kick",
  TWITCH: "twitch",
  YOUTUBE: "youtube",
  FACEBOOK: "facebook"
});

const CVE_PLATFORM_ORDER = Object.freeze(Object.values(CVE_PLATFORM));

const CVE_GENE = Object.freeze({
  STRENGTH: "strength",
  SPEED: "speed",
  INTELLIGENCE: "intelligence",
  CHARISMA: "charisma",
  DEFENSE: "defense",
  LUCK: "luck",
  RARITY: "rarity"
});

const CVE_GENE_ORDER = Object.freeze(Object.values(CVE_GENE));

const CVE_MODULE_STATE = Object.freeze({
  REGISTERED: "registered",
  ACTIVE: "active",
  DISABLED: "disabled",
  UPDATED: "updated"
});

const CVE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_battle_rules",
  "mutate_economy",
  "mutate_core_architecture",
  "bypass_module_api",
  "hardcode_game_into_core"
]);

const CVE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-creature-core/creatureEvolutionEngine.js",
  "shared/mia-character-core/characterEngine.js",
  "shared/mia-battle-core/battleEngine.js",
  "shared/mia-progression-core/progressionEngine.js",
  "shared/mia-community-core/communityEngine.js",
  "shared/mia-world-core/worldEngine.js",
  "scripts/MIA_KOJNOZROUT_ENGINE.js",
  "scripts/MIA_KOJNOZROUT_EVOLUTION.js",
  "data/kojnozout-world.json"
]);

const DEFAULT_PLATFORM_CREATURES = Object.freeze(
  CVE_PLATFORM_ORDER.map((platformId) => ({
    platformId,
    creatureId: `kojnozout.${platformId}`,
    name: `${platformId.charAt(0).toUpperCase()}${platformId.slice(1)} Kojnožrout`
  }))
);

const DEFAULT_GAME_MODULES = Object.freeze([
  { moduleId: "battle", name: "Battle Engine", version: "1.0.0", api: "battleEngine" },
  { moduleId: "quest", name: "Quest Engine", version: "1.0.0", api: "progressionEngine" },
  { moduleId: "fishing", name: "Fishing Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "farm", name: "Farm Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "arena", name: "Arena Module", version: "1.0.0", api: "battleEngine" },
  { moduleId: "tower_defense", name: "Tower Defense Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "dungeon", name: "Dungeon Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "trivia", name: "Trivia Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "music", name: "Music Module", version: "0.1.0", api: "gameModule" },
  { moduleId: "puzzle", name: "Puzzle Module", version: "0.1.0", api: "gameModule" }
]);

function manageCreature(input = {}) {
  return Object.freeze({
    ok: true,
    creatureId: input.creatureId || `creature-${crypto.randomUUID()}`,
    platformId: input.platformId || null,
    name: input.name || "Kojnožrout",
    level: input.level != null ? Number(input.level) : 1,
    experience: input.experience != null ? Number(input.experience) : 0,
    state: input.state || "active",
    attachedModules: Object.freeze(input.attachedModules || []),
    component: CVE_COMPONENT.CREATURE_MANAGER
  });
}

function registerPlatformCreature(input = {}) {
  if (!input.platformId || !CVE_PLATFORM_ORDER.includes(input.platformId)) {
    return Object.freeze({
      ok: false,
      error: "unknown_platform",
      component: CVE_COMPONENT.PLATFORM_REGISTRY
    });
  }
  return Object.freeze({
    ok: true,
    platformId: input.platformId,
    creatureId: input.creatureId || `kojnozout.${input.platformId}`,
    name: input.name || `${input.platformId} Kojnožrout`,
    isolatedHistory: true,
    isolatedInventory: true,
    isolatedProgress: true,
    component: CVE_COMPONENT.PLATFORM_REGISTRY
  });
}

function createGeneticProfile(input = {}) {
  const profile = {};
  for (const gene of CVE_GENE_ORDER) {
    profile[gene] = input[gene] != null ? Number(input[gene]) : 10;
  }
  return Object.freeze({
    ok: true,
    creatureId: input.creatureId,
    profile: Object.freeze(profile),
    component: CVE_COMPONENT.GENETICS_MANAGER
  });
}

function registerGameModule(input = {}) {
  if (!input.moduleId || !input.name) {
    return Object.freeze({
      ok: false,
      error: "module_definition_incomplete",
      component: CVE_COMPONENT.GAME_MODULE_REGISTRY
    });
  }
  return Object.freeze({
    ok: true,
    moduleId: input.moduleId,
    name: input.name,
    version: input.version || "1.0.0",
    api: input.api || "gameModule",
    dependencies: Object.freeze(input.dependencies || []),
    platforms: Object.freeze(input.platforms || CVE_PLATFORM_ORDER),
    compatibility: input.compatibility || "1.0",
    state: CVE_MODULE_STATE.REGISTERED,
    component: CVE_COMPONENT.GAME_MODULE_REGISTRY
  });
}

function manageModuleLifecycle(module = {}, action = "activate") {
  const allowed = ["activate", "disable", "update"];
  if (!allowed.includes(action)) {
    return Object.freeze({ ok: false, error: "invalid_module_action", component: CVE_COMPONENT.MODULE_MANAGER });
  }
  const nextState = action === "disable"
    ? CVE_MODULE_STATE.DISABLED
    : action === "update"
      ? CVE_MODULE_STATE.UPDATED
      : CVE_MODULE_STATE.ACTIVE;
  return Object.freeze({
    ok: true,
    moduleId: module.moduleId,
    action,
    state: nextState,
    requiresCoreRestart: false,
    component: CVE_COMPONENT.MODULE_MANAGER
  });
}

function evolveCreature(creature = {}, input = {}) {
  if (input.mutateBattleRules === true) {
    return Object.freeze({
      ok: false,
      error: "battle_rules_mutation_forbidden",
      component: CVE_COMPONENT.EVOLUTION_MANAGER
    });
  }
  const xpGain = Number(input.xpGain || 0);
  const experience = (creature.experience || 0) + xpGain;
  const level = Math.max(creature.level || 1, Math.floor(experience / 100) + 1);
  const unlocked = [];
  if (level > (creature.level || 1)) {
    unlocked.push("new_level");
    if (input.unlockAttack) unlocked.push("new_attack");
    if (input.unlockAnimation) unlocked.push("new_animation");
    if (input.unlockVoice) unlocked.push("new_voice");
    if (input.unlockEmotion) unlocked.push("new_emotion");
    if (input.unlockGene) unlocked.push("new_gene");
  }
  return Object.freeze({
    ok: true,
    creatureId: creature.creatureId,
    fromLevel: creature.level || 1,
    toLevel: level,
    experience,
    unlocked: Object.freeze(unlocked),
    mutatesBattleRules: false,
    component: CVE_COMPONENT.EVOLUTION_MANAGER
  });
}

function createCreatureProgress(input = {}) {
  return Object.freeze({
    ok: true,
    platformId: input.platformId,
    creatureId: input.creatureId,
    level: input.level != null ? Number(input.level) : 1,
    experience: input.experience != null ? Number(input.experience) : 0,
    battleStats: Object.freeze(input.battleStats || {}),
    communityId: input.communityId || input.platformId,
    isolated: true,
    component: CVE_COMPONENT.CREATURE_PROGRESS
  });
}

function recordCreatureHistory(input = {}) {
  return Object.freeze({
    ok: true,
    historyId: input.historyId || `hist-${crypto.randomUUID()}`,
    platformId: input.platformId,
    creatureId: input.creatureId,
    eventType: input.eventType || "evolution",
    detail: input.detail || null,
    at: input.at || Date.now(),
    component: CVE_COMPONENT.CREATURE_HISTORY
  });
}

function coordinatePlatformBattle(input = {}, adapters = {}) {
  const platforms = Object.freeze((input.platforms || []).filter((p) => CVE_PLATFORM_ORDER.includes(p)));
  if (platforms.length < 2) {
    return Object.freeze({
      ok: false,
      error: "platform_battle_requires_two_platforms",
      component: CVE_COMPONENT.PLATFORM_BATTLE_COORDINATOR
    });
  }
  if (input.mutateBattleRules === true) {
    return Object.freeze({
      ok: false,
      error: "battle_rules_mutation_forbidden",
      component: CVE_COMPONENT.PLATFORM_BATTLE_COORDINATOR
    });
  }
  let battleResult = null;
  if (adapters.battleEngine && typeof adapters.battleEngine.start === "function") {
    battleResult = adapters.battleEngine.start({
      fromDecision: input.fromDecisionEngine === true,
      participants: platforms,
      platformBattle: true
    });
  }
  const winner = input.winner || platforms[0];
  return Object.freeze({
    ok: battleResult?.ok !== false,
    platforms,
    winner,
    battleManagedByBattleEngine: Boolean(battleResult),
    battleResult,
    mutatesBattleRules: false,
    component: CVE_COMPONENT.PLATFORM_BATTLE_COORDINATOR
  });
}

function adaptCommunityProgress(input = {}, adapters = {}) {
  let communityContext = null;
  if (adapters.communityEngine && typeof adapters.communityEngine.getCommunityContext === "function") {
    communityContext = adapters.communityEngine.getCommunityContext({ platformId: input.platformId });
  } else if (adapters.communityEngine && typeof adapters.communityEngine.createCommunityEngine === "function") {
    communityContext = { platformId: input.platformId };
  }
  return Object.freeze({
    ok: true,
    platformId: input.platformId,
    creatureId: input.creatureId,
    communityContext,
    pipeline: Object.freeze(["community", "creature", "evolution", "battle", "history"]),
    component: CVE_COMPONENT.COMMUNITY_ADAPTER
  });
}

function placeCreatureHome(input = {}, adapters = {}) {
  if (input.mutateWorldEngine === true) {
    return Object.freeze({
      ok: false,
      error: "world_engine_mutation_forbidden",
      component: CVE_COMPONENT.WORLD_ADAPTER
    });
  }
  let locationContext = null;
  if (adapters.worldEngine && typeof adapters.worldEngine.getLocationContext === "function") {
    locationContext = adapters.worldEngine.getLocationContext({ locationId: input.homeId });
  }
  return Object.freeze({
    ok: true,
    platformId: input.platformId,
    creatureId: input.creatureId,
    homeId: input.homeId || `${input.platformId}_home`,
    arenaId: input.arenaId || `${input.platformId}_arena`,
    storyRegionId: input.storyRegionId || null,
    locationContext,
    mutatesWorldEngine: false,
    component: CVE_COMPONENT.WORLD_ADAPTER
  });
}

function attachModuleToCreature(creature = {}, module = {}) {
  if (module.state === CVE_MODULE_STATE.DISABLED) {
    return Object.freeze({
      ok: false,
      error: "module_disabled",
      component: CVE_COMPONENT.MODULE_MANAGER
    });
  }
  const attached = [...(creature.attachedModules || [])];
  if (!attached.includes(module.moduleId)) attached.push(module.moduleId);
  return Object.freeze({
    ok: true,
    creatureId: creature.creatureId,
    moduleId: module.moduleId,
    attachedModules: Object.freeze(attached),
    viaModuleApi: true,
    component: CVE_COMPONENT.MODULE_MANAGER
  });
}

function assertCreatureForbiddenActivity(activity) {
  const forbidden = CVE_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function createCreatureEvolutionEngine(options = {}) {
  const platformCreatures = new Map();
  const modules = new Map();
  const genetics = new Map();
  const progress = new Map();
  const history = [];

  for (const def of DEFAULT_PLATFORM_CREATURES) {
    const reg = registerPlatformCreature(def);
    if (reg.ok) {
      platformCreatures.set(def.platformId, {
        ...manageCreature({
          creatureId: reg.creatureId,
          platformId: reg.platformId,
          name: reg.name
        }),
        genetics: createGeneticProfile({ creatureId: reg.creatureId }).profile,
        attachedModules: ["battle"]
      });
      progress.set(def.platformId, createCreatureProgress({
        platformId: def.platformId,
        creatureId: reg.creatureId
      }));
      history.push(recordCreatureHistory({
        platformId: def.platformId,
        creatureId: reg.creatureId,
        eventType: "registration"
      }));
    }
  }

  for (const mod of DEFAULT_GAME_MODULES) {
    const registered = registerGameModule(mod);
    if (registered.ok) modules.set(mod.moduleId, registered);
  }

  for (const extra of options.extraModules || []) {
    const registered = registerGameModule(extra);
    if (registered.ok) modules.set(extra.moduleId, registered);
  }

  return {
    getPlatformCreature(platformId) {
      return platformCreatures.get(platformId) || null;
    },
    listPlatformCreatures() {
      return Object.freeze([...platformCreatures.values()].map((c) => manageCreature(c)));
    },
    registerGameModule(input = {}) {
      const registered = registerGameModule(input);
      if (registered.ok) modules.set(registered.moduleId, registered);
      return registered;
    },
    attachModule(platformId, moduleId) {
      const creature = platformCreatures.get(platformId);
      const module = modules.get(moduleId);
      if (!creature || !module) {
        return Object.freeze({ ok: false, error: "creature_or_module_missing", component: CVE_COMPONENT.CREATURE_API });
      }
      const attached = attachModuleToCreature(creature, module);
      if (attached.ok) {
        creature.attachedModules = attached.attachedModules;
        platformCreatures.set(platformId, creature);
      }
      return attached;
    },
    evolve(platformId, input = {}) {
      const creature = platformCreatures.get(platformId);
      if (!creature) {
        return Object.freeze({ ok: false, error: "creature_not_found", component: CVE_COMPONENT.CREATURE_API });
      }
      const result = evolveCreature(creature, input);
      if (result.ok) {
        creature.level = result.toLevel;
        creature.experience = result.experience;
        platformCreatures.set(platformId, creature);
        const prog = progress.get(platformId);
        if (prog) {
          progress.set(platformId, createCreatureProgress({
            ...prog,
            level: result.toLevel,
            experience: result.experience
          }));
        }
        genetics.set(creature.creatureId, createGeneticProfile({
          creatureId: creature.creatureId,
          ...(creature.genetics || {}),
          ...(input.geneBoost || {})
        }));
        history.push(recordCreatureHistory({
          platformId,
          creatureId: creature.creatureId,
          eventType: "evolution",
          detail: `level_${result.toLevel}`
        }));
      }
      return result;
    },
    runPlatformBattle(input = {}, adapters = {}) {
      const battle = coordinatePlatformBattle(input, adapters);
      if (battle.ok) {
        history.push(recordCreatureHistory({
          platformId: battle.winner,
          creatureId: platformCreatures.get(battle.winner)?.creatureId,
          eventType: "platform_battle",
          detail: `winner_${battle.winner}`
        }));
      }
      return battle;
    },
    developFromCommunity(platformId, input = {}, adapters = {}) {
      const creature = platformCreatures.get(platformId);
      if (!creature) {
        return Object.freeze({ ok: false, error: "creature_not_found", component: CVE_COMPONENT.CREATURE_API });
      }
      const community = adaptCommunityProgress(
        { platformId, creatureId: creature.creatureId },
        adapters
      );
      const evolution = this.evolve(platformId, {
        xpGain: input.xpGain || 5,
        unlockAnimation: input.activity === true,
        fromDecisionEngine: input.fromDecisionEngine
      });
      return Object.freeze({
        ok: community.ok && evolution.ok,
        community,
        evolution,
        mutatesBattleRules: false,
        component: CVE_COMPONENT.CREATURE_API
      });
    },
    placeHome(platformId, input = {}, adapters = {}) {
      const creature = platformCreatures.get(platformId);
      if (!creature) {
        return Object.freeze({ ok: false, error: "creature_not_found", component: CVE_COMPONENT.CREATURE_API });
      }
      return placeCreatureHome(
        { platformId, creatureId: creature.creatureId, ...input },
        adapters
      );
    },
    getGenetics(creatureId) {
      return genetics.get(creatureId) || createGeneticProfile({ creatureId });
    },
    listModules() {
      return Object.freeze([...modules.values()]);
    },
    manageModule(moduleId, action = "activate") {
      const module = modules.get(moduleId);
      if (!module) return Object.freeze({ ok: false, error: "module_not_found" });
      const lifecycle = manageModuleLifecycle(module, action);
      if (lifecycle.ok) {
        modules.set(moduleId, { ...module, state: lifecycle.state });
      }
      return lifecycle;
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        platformCount: platformCreatures.size,
        moduleCount: modules.size,
        historyCount: history.length,
        component: CVE_COMPONENT.CREATURE_API
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createCreatureApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: options.decides === true,
    executes: options.executes === true,
    data,
    component: CVE_COMPONENT.CREATURE_API
  });
}

module.exports = {
  CVE_COMPONENT,
  CVE_COMPONENT_ORDER,
  CVE_PLATFORM,
  CVE_PLATFORM_ORDER,
  CVE_GENE,
  CVE_GENE_ORDER,
  CVE_MODULE_STATE,
  CVE_FORBIDDEN_ACTIVITIES,
  CVE_RUNTIME_ANCHORS,
  DEFAULT_PLATFORM_CREATURES,
  DEFAULT_GAME_MODULES,
  manageCreature,
  registerPlatformCreature,
  createGeneticProfile,
  registerGameModule,
  manageModuleLifecycle,
  evolveCreature,
  createCreatureProgress,
  recordCreatureHistory,
  coordinatePlatformBattle,
  adaptCommunityProgress,
  placeCreatureHome,
  attachModuleToCreature,
  createCreatureEvolutionEngine,
  createCreatureApiResponse,
  assertCreatureForbiddenActivity
};
