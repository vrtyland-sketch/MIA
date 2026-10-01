"use strict";

/**
 * Master Canon 0047 — NPC & Character Engine: central system for all intelligent beings in MIA.
 */

const crypto = require("crypto");
const { equipItem: inventoryEquipItem } = require("../mia-inventory-core/inventoryEngine");

const CE_COMPONENT = Object.freeze({
  CHARACTER_MANAGER: "character_manager",
  CHARACTER_REGISTRY: "character_registry",
  IDENTITY_MANAGER: "identity_manager",
  BEHAVIOUR_MANAGER: "behaviour_manager",
  ROUTINE_MANAGER: "routine_manager",
  RELATIONSHIP_MANAGER: "relationship_manager",
  CHARACTER_STATS: "character_stats",
  EQUIPMENT_MANAGER: "equipment_manager",
  CHARACTER_AI: "character_ai",
  CHARACTER_ANALYTICS: "character_analytics",
  CHARACTER_HISTORY: "character_history",
  CHARACTER_API: "character_api"
});

const CE_COMPONENT_ORDER = Object.freeze(Object.values(CE_COMPONENT));

const CE_CHARACTER_TIER = Object.freeze({
  A_MAIN: "A_main",
  B_BATTLE: "B_battle",
  C_NPC: "C_npc",
  D_HELPER: "D_helper"
});

const CE_CHARACTER_TYPE = Object.freeze({
  MIA: "mia",
  KOJNOZROUT: "kojnozout",
  NPC: "npc",
  BOSS: "boss",
  ANIMAL: "animal",
  HELPER: "helper"
});

const CE_BEHAVIOUR = Object.freeze({
  CALM: "calm",
  AGGRESSIVE: "aggressive",
  CURIOUS: "curious",
  FRIENDLY: "friendly",
  CAUTIOUS: "cautious",
  CHAOTIC: "chaotic"
});

const CE_ROUTINE_PHASE = Object.freeze([
  "sleep",
  "work",
  "leisure",
  "battle",
  "rest"
]);

const CE_CANON_CHARACTER = Object.freeze({
  MIA: "mia.main",
  KOJ_TANK: "kojnozout.tank",
  KOJ_FIGHTER: "kojnozout.fighter",
  KOJ_ASSASSIN: "kojnozout.assassin",
  KOJ_SUPPORT: "kojnozout.support",
  MERCHANT: "npc.merchant",
  BLACKSMITH: "npc.blacksmith",
  STORYTELLER: "npc.storyteller",
  BOSS: "npc.boss"
});

const CE_RELATIONSHIP_STRENGTH = Object.freeze({
  VERY_STRONG: "very_strong",
  STRONG: "strong",
  NEUTRAL: "neutral",
  WEAK: "weak",
  HOSTILE: "hostile"
});

const CE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_economy",
  "mutate_world_engine",
  "mutate_decision_engine",
  "bypass_personality_engine",
  "create_battle_rules"
]);

const CE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-character-core/characterEngine.js",
  "shared/mia-personality-core/personalityEngine.js",
  "shared/mia-emotion-core/emotionEngine.js",
  "shared/mia-decision-core/decisionEngine.js",
  "shared/mia-world-core/worldEngine.js",
  "shared/mia-story-core/storyEngine.js",
  "shared/mia-community-core/communityEngine.js",
  "shared/mia-inventory-core/inventoryEngine.js",
  "scripts/MIA_KOJNOZROUT_ENGINE.js",
  "data/kojnozout-world.json"
]);

const DEFAULT_CHARACTER_REGISTRY = Object.freeze([
  {
    characterId: CE_CANON_CHARACTER.MIA,
    name: "MIA",
    type: CE_CHARACTER_TYPE.MIA,
    tier: CE_CHARACTER_TIER.A_MAIN,
    behaviour: CE_BEHAVIOUR.FRIENDLY
  },
  {
    characterId: CE_CANON_CHARACTER.KOJ_TANK,
    name: "Kojnožrout Tank",
    type: CE_CHARACTER_TYPE.KOJNOZROUT,
    tier: CE_CHARACTER_TIER.B_BATTLE,
    behaviour: CE_BEHAVIOUR.CAUTIOUS
  },
  {
    characterId: CE_CANON_CHARACTER.KOJ_FIGHTER,
    name: "Kojnožrout Fighter",
    type: CE_CHARACTER_TYPE.KOJNOZROUT,
    tier: CE_CHARACTER_TIER.B_BATTLE,
    behaviour: CE_BEHAVIOUR.AGGRESSIVE
  },
  {
    characterId: CE_CANON_CHARACTER.KOJ_ASSASSIN,
    name: "Kojnožrout Assassin",
    type: CE_CHARACTER_TYPE.KOJNOZROUT,
    tier: CE_CHARACTER_TIER.B_BATTLE,
    behaviour: CE_BEHAVIOUR.CURIOUS
  },
  {
    characterId: CE_CANON_CHARACTER.KOJ_SUPPORT,
    name: "Kojnožrout Support",
    type: CE_CHARACTER_TYPE.KOJNOZROUT,
    tier: CE_CHARACTER_TIER.B_BATTLE,
    behaviour: CE_BEHAVIOUR.CALM
  },
  {
    characterId: CE_CANON_CHARACTER.MERCHANT,
    name: "Obchodník",
    type: CE_CHARACTER_TYPE.NPC,
    tier: CE_CHARACTER_TIER.C_NPC,
    behaviour: CE_BEHAVIOUR.FRIENDLY
  },
  {
    characterId: CE_CANON_CHARACTER.BLACKSMITH,
    name: "Kovář",
    type: CE_CHARACTER_TYPE.NPC,
    tier: CE_CHARACTER_TIER.C_NPC,
    behaviour: CE_BEHAVIOUR.CALM
  },
  {
    characterId: CE_CANON_CHARACTER.STORYTELLER,
    name: "Vypravěč",
    type: CE_CHARACTER_TYPE.NPC,
    tier: CE_CHARACTER_TIER.C_NPC,
    behaviour: CE_BEHAVIOUR.CURIOUS
  },
  {
    characterId: CE_CANON_CHARACTER.BOSS,
    name: "Boss",
    type: CE_CHARACTER_TYPE.BOSS,
    tier: CE_CHARACTER_TIER.C_NPC,
    behaviour: CE_BEHAVIOUR.AGGRESSIVE
  }
]);

function manageCharacter(input = {}) {
  return Object.freeze({
    ok: true,
    characterId: input.characterId || `char-${crypto.randomUUID()}`,
    type: input.type || CE_CHARACTER_TYPE.NPC,
    tier: input.tier || CE_CHARACTER_TIER.C_NPC,
    locationId: input.locationId || null,
    state: input.state || "active",
    aiProfile: input.aiProfile || "default",
    component: CE_COMPONENT.CHARACTER_MANAGER
  });
}

function registerCharacterDefinition(input = {}) {
  if (!input.characterId || !input.name) {
    return Object.freeze({
      ok: false,
      error: "character_definition_incomplete",
      component: CE_COMPONENT.CHARACTER_REGISTRY
    });
  }
  return Object.freeze({
    ok: true,
    characterId: input.characterId,
    name: input.name,
    type: input.type || CE_CHARACTER_TYPE.NPC,
    tier: input.tier || CE_CHARACTER_TIER.C_NPC,
    behaviour: input.behaviour || CE_BEHAVIOUR.FRIENDLY,
    component: CE_COMPONENT.CHARACTER_REGISTRY
  });
}

function getCharacterDefinition(registry, characterId) {
  const found = registry.find((entry) => entry.characterId === characterId);
  if (!found) {
    return Object.freeze({
      ok: false,
      error: "character_not_found",
      component: CE_COMPONENT.CHARACTER_REGISTRY
    });
  }
  return Object.freeze({ ok: true, ...found, component: CE_COMPONENT.CHARACTER_REGISTRY });
}

function createIdentity(input = {}) {
  return Object.freeze({
    ok: true,
    characterId: input.characterId,
    name: input.name || "Unknown",
    age: input.age != null ? Number(input.age) : null,
    species: input.species || "unknown",
    origin: input.origin || "mia_world",
    occupation: input.occupation || null,
    faction: input.faction || null,
    home: input.home || null,
    mutable: false,
    component: CE_COMPONENT.IDENTITY_MANAGER
  });
}

function resolveBehaviour(input = {}, adapters = {}) {
  const behaviour = input.behaviour || CE_BEHAVIOUR.FRIENDLY;
  if (input.bypassPersonalityEngine === true) {
    return Object.freeze({
      ok: false,
      error: "personality_engine_required",
      component: CE_COMPONENT.BEHAVIOUR_MANAGER
    });
  }
  let personalityContext = null;
  if (adapters.personalityEngine) {
    if (typeof adapters.personalityEngine.getPersonalityContext === "function") {
      personalityContext = adapters.personalityEngine.getPersonalityContext({
        entityId: input.characterId
      });
    } else if (typeof adapters.personalityEngine.resolve === "function") {
      personalityContext = adapters.personalityEngine.resolve(input.characterId, {});
    }
  }
  return Object.freeze({
    ok: true,
    behaviour,
    fromPersonalityEngine: Boolean(personalityContext),
    personalityContext,
    component: CE_COMPONENT.BEHAVIOUR_MANAGER
  });
}

function advanceRoutine(currentPhase = "sleep") {
  const idx = CE_ROUTINE_PHASE.indexOf(currentPhase);
  const next = idx >= 0 && idx < CE_ROUTINE_PHASE.length - 1
    ? CE_ROUTINE_PHASE[idx + 1]
    : CE_ROUTINE_PHASE[0];
  return Object.freeze({
    ok: true,
    current: currentPhase,
    next,
    phases: CE_ROUTINE_PHASE,
    component: CE_COMPONENT.ROUTINE_MANAGER
  });
}

function manageRelationship(input = {}) {
  const strength = input.strength || CE_RELATIONSHIP_STRENGTH.NEUTRAL;
  return Object.freeze({
    ok: true,
    fromCharacterId: input.fromCharacterId,
    toCharacterId: input.toCharacterId,
    strength,
    usesEmotionalMemory: input.usesEmotionalMemory !== false,
    component: CE_COMPONENT.RELATIONSHIP_MANAGER
  });
}

function createStats(input = {}) {
  return Object.freeze({
    ok: true,
    characterId: input.characterId,
    health: input.health != null ? Number(input.health) : 100,
    energy: input.energy != null ? Number(input.energy) : 100,
    hunger: input.hunger != null ? Number(input.hunger) : 0,
    experience: input.experience != null ? Number(input.experience) : 0,
    level: input.level != null ? Number(input.level) : 1,
    strength: input.strength != null ? Number(input.strength) : 10,
    defense: input.defense != null ? Number(input.defense) : 10,
    charisma: input.charisma != null ? Number(input.charisma) : 10,
    intelligence: input.intelligence != null ? Number(input.intelligence) : 10,
    battleReady: input.battleReady === true,
    component: CE_COMPONENT.CHARACTER_STATS
  });
}

function equipViaInventory(input = {}, adapters = {}) {
  if (!adapters.inventoryEngine) {
    return Object.freeze({
      ok: false,
      error: "inventory_engine_required",
      component: CE_COMPONENT.EQUIPMENT_MANAGER
    });
  }
  const equipFn = typeof adapters.inventoryEngine.equipItem === "function"
    ? adapters.inventoryEngine.equipItem.bind(adapters.inventoryEngine)
    : inventoryEquipItem;
  const result = equipFn(
    input.inventory || {},
    input.item || {},
    input.slot || "hands"
  );
  return Object.freeze({
    ok: result?.ok !== false,
    characterId: input.characterId,
    slot: input.slot || "hands",
    viaInventoryEngine: true,
    result,
    component: CE_COMPONENT.EQUIPMENT_MANAGER
  });
}

function planCharacterAction(input = {}, adapters = {}) {
  if (input.bypassPersonalityEngine === true) {
    return Object.freeze({
      ok: false,
      error: "personality_engine_required",
      component: CE_COMPONENT.CHARACTER_AI
    });
  }
  if (input.fromDecisionEngine !== true) {
    return Object.freeze({
      ok: false,
      error: "decision_engine_required",
      component: CE_COMPONENT.CHARACTER_AI
    });
  }
  let emotionContext = null;
  if (adapters.emotionEngine) {
    if (typeof adapters.emotionEngine.evaluateEmotion === "function") {
      emotionContext = adapters.emotionEngine.evaluateEmotion({
        entityId: input.characterId,
        trigger: input.trigger || "interaction"
      });
    } else if (typeof adapters.emotionEngine.evaluate === "function") {
      emotionContext = adapters.emotionEngine.evaluate({
        entityId: input.characterId,
        eventType: input.trigger || "interaction"
      });
    }
  }
  return Object.freeze({
    ok: true,
    characterId: input.characterId,
    action: input.action || "observe",
    emotionContext,
    fromDecisionEngine: true,
    fromPersonalityEngine: input.fromPersonalityEngine !== false,
    component: CE_COMPONENT.CHARACTER_AI
  });
}

function collectCharacterAnalytics(input = {}) {
  return Object.freeze({
    ok: true,
    activity: input.activity != null ? Number(input.activity) : 0,
    battles: input.battles != null ? Number(input.battles) : 0,
    dialogues: input.dialogues != null ? Number(input.dialogues) : 0,
    relationships: input.relationships != null ? Number(input.relationships) : 0,
    popularity: input.popularity != null ? Number(input.popularity) : 0,
    usage: input.usage != null ? Number(input.usage) : 0,
    component: CE_COMPONENT.CHARACTER_ANALYTICS
  });
}

function recordCharacterHistory(input = {}) {
  return Object.freeze({
    ok: true,
    historyId: input.historyId || `hist-${crypto.randomUUID()}`,
    characterId: input.characterId,
    eventType: input.eventType || "interaction",
    detail: input.detail || null,
    at: input.at || Date.now(),
    component: CE_COMPONENT.CHARACTER_HISTORY
  });
}

function buildCharacterPipeline(steps = {}) {
  const pipeline = [
    { step: "identity", done: steps.identity === true },
    { step: "personality", done: steps.personality === true },
    { step: "emotion", done: steps.emotion === true },
    { step: "decision", done: steps.decision === true },
    { step: "action", done: steps.action === true },
    { step: "memory", done: steps.memory === true }
  ];
  return Object.freeze({
    ok: pipeline.every((s) => s.done),
    pipeline: Object.freeze(pipeline),
    component: CE_COMPONENT.CHARACTER_API
  });
}

function buildCharacterLifecycle(steps = {}) {
  const lifecycle = [
    { step: "creation", done: steps.creation === true },
    { step: "registration", done: steps.registration === true },
    { step: "placement", done: steps.placement === true },
    { step: "routine", done: steps.routine === true },
    { step: "interaction", done: steps.interaction === true },
    { step: "evolution", done: steps.evolution === true },
    { step: "history", done: steps.history === true }
  ];
  return Object.freeze({
    ok: lifecycle.every((s) => s.done),
    lifecycle: Object.freeze(lifecycle),
    component: CE_COMPONENT.CHARACTER_API
  });
}

function placeInWorld(input = {}, adapters = {}) {
  if (input.mutateWorldEngine === true) {
    return Object.freeze({
      ok: false,
      error: "world_engine_mutation_forbidden",
      component: CE_COMPONENT.CHARACTER_API
    });
  }
  let locationContext = null;
  if (adapters.worldEngine && typeof adapters.worldEngine.getLocationContext === "function") {
    locationContext = adapters.worldEngine.getLocationContext({
      locationId: input.locationId
    });
  }
  return Object.freeze({
    ok: true,
    characterId: input.characterId,
    regionId: input.regionId || locationContext?.regionId || null,
    locationId: input.locationId,
    locationContext,
    mutatesWorldEngine: false,
    component: CE_COMPONENT.CHARACTER_API
  });
}

function getCharacterForStory(character = {}) {
  return Object.freeze({
    ok: true,
    characterId: character.characterId,
    name: character.name,
    type: character.type,
    locationId: character.locationId,
    identity: character.identity || null,
    stats: character.stats || null,
    forStoryEngine: true,
    component: CE_COMPONENT.CHARACTER_API
  });
}

function assertCharacterForbiddenActivity(activity) {
  const forbidden = CE_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({
    ok: !forbidden,
    activity,
    forbidden
  });
}

function createCharacterEngine(options = {}) {
  const registry = [...DEFAULT_CHARACTER_REGISTRY];
  const active = new Map();
  const relationships = [];
  const history = [];
  const statsById = new Map();

  for (const def of options.extraDefinitions || []) {
    const reg = registerCharacterDefinition(def);
    if (reg.ok) registry.push(reg);
  }

  return {
    registerCharacter(input = {}) {
      const def = getCharacterDefinition(registry, input.characterId);
      if (!def.ok && !input.characterId) {
        return Object.freeze({ ok: false, error: "character_id_required", component: CE_COMPONENT.CHARACTER_API });
      }
      const characterId = input.characterId || def.characterId;
      const identity = createIdentity({
        characterId,
        name: input.name || def.name || characterId,
        species: input.species || (def.type === CE_CHARACTER_TYPE.MIA ? "ai_host" : "kojnozout"),
        occupation: input.occupation || def.name,
        home: input.home || null
      });
      const character = {
        ...manageCharacter({
          characterId,
          type: input.type || def.type || CE_CHARACTER_TYPE.NPC,
          tier: input.tier || def.tier || CE_CHARACTER_TIER.C_NPC,
          locationId: input.locationId || null,
          aiProfile: input.aiProfile || def.behaviour || CE_BEHAVIOUR.FRIENDLY
        }),
        name: identity.name,
        identity,
        routinePhase: "sleep"
      };
      const stats = createStats({ characterId, ...input.stats });
      statsById.set(characterId, { ...stats });
      active.set(characterId, character);
      history.push(recordCharacterHistory({
        characterId,
        eventType: "registration",
        detail: "character_registered"
      }));
      return Object.freeze({
        ok: true,
        character: manageCharacter(character),
        identity,
        stats,
        component: CE_COMPONENT.CHARACTER_API
      });
    },
    placeCharacter(input = {}, adapters = {}) {
      const character = active.get(input.characterId);
      if (!character) {
        return Object.freeze({ ok: false, error: "character_not_active", component: CE_COMPONENT.CHARACTER_API });
      }
      const placement = placeInWorld(input, adapters);
      if (placement.ok) {
        character.locationId = placement.locationId;
        character.regionId = placement.regionId;
      }
      return placement;
    },
    processInteraction(input = {}, adapters = {}) {
      const character = active.get(input.characterId);
      if (!character) {
        return Object.freeze({ ok: false, error: "character_not_active", component: CE_COMPONENT.CHARACTER_API });
      }

      const behaviour = resolveBehaviour(
        {
          characterId: input.characterId,
          behaviour: character.aiProfile,
          bypassPersonalityEngine: input.bypassPersonalityEngine
        },
        adapters
      );
      if (!behaviour.ok) return behaviour;

      const routine = advanceRoutine(character.routinePhase);
      character.routinePhase = routine.next;

      const action = planCharacterAction(
        {
          characterId: input.characterId,
          action: input.action,
          trigger: input.trigger || "dialogue",
          fromDecisionEngine: input.fromDecisionEngine,
          fromPersonalityEngine: input.fromPersonalityEngine !== false,
          bypassPersonalityEngine: input.bypassPersonalityEngine
        },
        adapters
      );
      if (!action.ok) return action;

      let relationshipResult = null;
      if (input.targetCharacterId) {
        relationshipResult = manageRelationship({
          fromCharacterId: input.characterId,
          toCharacterId: input.targetCharacterId,
          strength: input.relationshipStrength || CE_RELATIONSHIP_STRENGTH.NEUTRAL,
          usesEmotionalMemory: true
        });
        relationships.push(relationshipResult);
      }

      const stats = statsById.get(input.characterId) || createStats({ characterId: input.characterId });
      if (input.dialogue) {
        stats.dialogues = (stats.dialogues || 0) + 1;
      }
      statsById.set(input.characterId, stats);

      const hist = recordCharacterHistory({
        characterId: input.characterId,
        eventType: input.eventType || "interaction",
        detail: input.detail || action.action
      });
      history.push(hist);

      const analytics = collectCharacterAnalytics({
        activity: 1,
        dialogues: input.dialogue ? 1 : 0,
        relationships: relationshipResult ? 1 : 0,
        usage: 1
      });

      const pipeline = buildCharacterPipeline({
        identity: true,
        personality: behaviour.fromPersonalityEngine || input.skipPersonalityCheck === true,
        emotion: Boolean(action.emotionContext) || input.skipEmotionCheck === true,
        decision: true,
        action: true,
        memory: true
      });

      const lifecycle = buildCharacterLifecycle({
        creation: true,
        registration: true,
        placement: Boolean(character.locationId),
        routine: true,
        interaction: true,
        evolution: false,
        history: true
      });

      return Object.freeze({
        ok: pipeline.ok,
        character: manageCharacter(character),
        behaviour,
        routine,
        action,
        relationship: relationshipResult,
        analytics,
        pipeline,
        lifecycle,
        mutatesEconomy: false,
        mutatesWorldEngine: false,
        createsBattleRules: false,
        component: CE_COMPONENT.CHARACTER_API
      });
    },
    reportBattleActivity(input = {}) {
      const character = active.get(input.characterId);
      if (!character) {
        return Object.freeze({ ok: false, error: "character_not_active", component: CE_COMPONENT.CHARACTER_API });
      }
      const stats = statsById.get(input.characterId) || createStats({ characterId: input.characterId });
      stats.battles = (stats.battles || 0) + 1;
      if (input.victory === true) {
        stats.experience = (stats.experience || 0) + (input.xpGain || 10);
      }
      stats.battleReady = input.battleReady === true;
      statsById.set(input.characterId, stats);
      history.push(recordCharacterHistory({
        characterId: input.characterId,
        eventType: "battle",
        detail: input.victory ? "victory" : "defeat"
      }));
      return Object.freeze({
        ok: true,
        stats: createStats(stats),
        createsBattleRules: false,
        component: CE_COMPONENT.CHARACTER_STATS
      });
    },
    getCharacterForStory(characterId) {
      const character = active.get(characterId);
      if (!character) {
        const def = getCharacterDefinition(registry, characterId);
        if (!def.ok) return def;
        return getCharacterForStory({
          characterId: def.characterId,
          name: def.name,
          type: def.type
        });
      }
      return getCharacterForStory({
        ...character,
        stats: statsById.get(characterId) || null
      });
    },
    getRegistry() {
      return Object.freeze([...registry]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        activeCount: active.size,
        relationshipCount: relationships.length,
        historyCount: history.length,
        component: CE_COMPONENT.CHARACTER_API
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createCharacterApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: options.decides === true,
    executes: options.executes === true,
    data,
    component: CE_COMPONENT.CHARACTER_API
  });
}

module.exports = {
  CE_COMPONENT,
  CE_COMPONENT_ORDER,
  CE_CHARACTER_TIER,
  CE_CHARACTER_TYPE,
  CE_BEHAVIOUR,
  CE_ROUTINE_PHASE,
  CE_CANON_CHARACTER,
  CE_RELATIONSHIP_STRENGTH,
  CE_FORBIDDEN_ACTIVITIES,
  CE_RUNTIME_ANCHORS,
  DEFAULT_CHARACTER_REGISTRY,
  manageCharacter,
  registerCharacterDefinition,
  getCharacterDefinition,
  createIdentity,
  resolveBehaviour,
  advanceRoutine,
  manageRelationship,
  createStats,
  equipViaInventory,
  planCharacterAction,
  collectCharacterAnalytics,
  recordCharacterHistory,
  buildCharacterPipeline,
  buildCharacterLifecycle,
  placeInWorld,
  getCharacterForStory,
  createCharacterEngine,
  createCharacterApiResponse,
  assertCharacterForbiddenActivity
};
