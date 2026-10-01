"use strict";

/**
 * Master Canon 0043 — Achievement Engine: long-term milestones, titles and awards for MIA.
 */

const crypto = require("crypto");

const AE_COMPONENT = Object.freeze({
  ACHIEVEMENT_MANAGER: "achievement_manager",
  ACHIEVEMENT_REGISTRY: "achievement_registry",
  UNLOCK_MANAGER: "unlock_manager",
  TITLE_MANAGER: "title_manager",
  BADGE_MANAGER: "badge_manager",
  TROPHY_MANAGER: "trophy_manager",
  DISPLAY_MANAGER: "display_manager",
  ACHIEVEMENT_ANALYTICS: "achievement_analytics",
  ACHIEVEMENT_HISTORY: "achievement_history",
  ACHIEVEMENT_VALIDATOR: "achievement_validator",
  PERSISTENCE: "persistence",
  ACHIEVEMENT_API: "achievement_api"
});

const AE_COMPONENT_ORDER = Object.freeze(Object.values(AE_COMPONENT));

const AE_CATEGORY = Object.freeze({
  COMMUNITY: "community",
  BATTLE: "battle",
  GIFT: "gift",
  CHAT: "chat",
  STREAM: "stream",
  EVENT: "event",
  COLLECTION: "collection",
  SECRET: "secret",
  LEGENDARY: "legendary"
});

const AE_CATEGORY_ORDER = Object.freeze(Object.values(AE_CATEGORY));

const AE_BADGE = Object.freeze({
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  STAR: "star",
  CROWN: "crown",
  FIRE: "fire"
});

const AE_DIFFICULTY = Object.freeze({
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary"
});

const AE_CANON_ACHIEVEMENT = Object.freeze({
  FIRST_GIFT: "first_gift",
  FIRST_BOWL: "first_bowl_fill",
  FIRST_BATTLE: "first_battle",
  COMMENTS_100: "comments_100",
  FIRST_T4: "first_t4",
  FIRST_PLAYLIST: "first_playlist",
  FIRST_ITEM: "first_item",
  FIRST_KOJ_EVOLUTION: "first_koj_evolution",
  FIRST_VICTORY: "first_victory",
  BATTLES_100: "battles_100"
});

const AE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_battle_logic",
  "mutate_economy_calculations",
  "mutate_personality",
  "mutate_memory",
  "create_items_outside_economy"
]);

const AE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-achievement-core/achievementEngine.js",
  "scripts/MIA_GIFT_SUPPORTER_PROFILE.js",
  "scripts/MIA_DELIVERY_RUNTIME.js",
  "shared/mia-economy-core/economyEngine.js",
  "shared/mia-inventory-core/inventoryEngine.js",
  "shared/mia-progression-core/progressionEngine.js"
]);

const DEFAULT_ACHIEVEMENT_DEFINITIONS = Object.freeze([
  {
    achievementId: AE_CANON_ACHIEVEMENT.FIRST_GIFT,
    name: "První Gift",
    category: AE_CATEGORY.GIFT,
    difficulty: AE_DIFFICULTY.COMMON,
    condition: { firstGift: true },
    reward: { title: "Nováček", badge: AE_BADGE.BRONZE }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.FIRST_BATTLE,
    name: "První Battle",
    category: AE_CATEGORY.BATTLE,
    difficulty: AE_DIFFICULTY.COMMON,
    condition: { firstBattle: true },
    reward: { title: "Přítel Kojnožrouta", badge: AE_BADGE.BRONZE }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.FIRST_VICTORY,
    name: "První výhra",
    category: AE_CATEGORY.BATTLE,
    difficulty: AE_DIFFICULTY.UNCOMMON,
    condition: { firstVictory: true },
    reward: { title: "Battle Master", badge: AE_BADGE.SILVER }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.COMMENTS_100,
    name: "100 komentářů",
    category: AE_CATEGORY.CHAT,
    difficulty: AE_DIFFICULTY.UNCOMMON,
    condition: { commentCount: 100 },
    reward: { title: "Krmič", badge: AE_BADGE.GOLD }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.BATTLES_100,
    name: "100 Battle",
    category: AE_CATEGORY.BATTLE,
    difficulty: AE_DIFFICULTY.EPIC,
    condition: { battleCount: 100 },
    reward: { title: "Legenda Komunity", trophy: "battle_centurion", badge: AE_BADGE.CROWN }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.FIRST_T4,
    name: "První T4",
    category: AE_CATEGORY.STREAM,
    difficulty: AE_DIFFICULTY.RARE,
    condition: { firstT4: true },
    reward: { badge: AE_BADGE.STAR }
  },
  {
    achievementId: AE_CANON_ACHIEVEMENT.FIRST_ITEM,
    name: "První item",
    category: AE_CATEGORY.COLLECTION,
    difficulty: AE_DIFFICULTY.COMMON,
    condition: { firstItem: true },
    reward: {
      economyEvent: { event: { type: "battle_reward", points: 10 } },
      itemId: "achievement_item"
    }
  }
]);

function manageAchievements(input = {}) {
  return Object.freeze({
    ok: true,
    managerId: input.managerId || `ach-mgr-${crypto.randomUUID()}`,
    unlockedCount: input.unlockedCount || 0,
    component: AE_COMPONENT.ACHIEVEMENT_MANAGER
  });
}

function registerAchievementDefinition(input = {}) {
  const achievementId = input.achievementId || `ach-${crypto.randomUUID()}`;
  return Object.freeze({
    ok: true,
    achievementId,
    name: input.name || "Achievement",
    description: input.description || "",
    category: input.category || AE_CATEGORY.COMMUNITY,
    difficulty: input.difficulty || AE_DIFFICULTY.COMMON,
    icon: input.icon || "badge",
    visibility: input.visibility || "public",
    sortOrder: input.sortOrder != null ? Number(input.sortOrder) : 0,
    condition: Object.freeze(input.condition || {}),
    reward: Object.freeze(input.reward || {}),
    repeatable: input.repeatable === true,
    component: AE_COMPONENT.ACHIEVEMENT_REGISTRY
  });
}

function resolveAchievementFromRegistry(registry = new Map(), achievementId) {
  const def = registry.get(achievementId);
  return Object.freeze({
    ok: Boolean(def),
    achievementId,
    definition: def || null,
    singleSourceOfTruth: true,
    component: AE_COMPONENT.ACHIEVEMENT_REGISTRY
  });
}

function checkUnlockConditions(definition = {}, stats = {}) {
  const condition = definition.condition || {};
  const checks = [];

  if (condition.firstGift === true) checks.push(stats.firstGift === true);
  if (condition.firstBattle === true) checks.push(stats.firstBattle === true);
  if (condition.firstVictory === true) checks.push(stats.firstVictory === true);
  if (condition.firstBowlFill === true) checks.push(stats.firstBowlFill === true);
  if (condition.firstT4 === true) checks.push(stats.firstT4 === true);
  if (condition.firstPlaylist === true) checks.push(stats.firstPlaylist === true);
  if (condition.firstItem === true) checks.push(stats.firstItem === true);
  if (condition.firstKojEvolution === true) checks.push(stats.firstKojEvolution === true);
  if (condition.commentCount != null) checks.push((stats.commentCount || 0) >= condition.commentCount);
  if (condition.battleCount != null) checks.push((stats.battleCount || 0) >= condition.battleCount);
  if (condition.giftCount != null) checks.push((stats.giftCount || 0) >= condition.giftCount);

  const met = checks.length > 0 && checks.every(Boolean);
  return Object.freeze({
    ok: met,
    met,
    checks: Object.freeze(checks),
    component: AE_COMPONENT.UNLOCK_MANAGER
  });
}

function grantTitle(input = {}) {
  return Object.freeze({
    ok: true,
    titleId: input.titleId || `title-${crypto.randomUUID()}`,
    title: input.title || "Nováček",
    displayInOverlay: true,
    displayInChat: true,
    component: AE_COMPONENT.TITLE_MANAGER
  });
}

function assignBadge(badge = AE_BADGE.BRONZE) {
  return Object.freeze({
    ok: true,
    badge,
    emoji:
      badge === AE_BADGE.SILVER
        ? "🥈"
        : badge === AE_BADGE.GOLD
          ? "🥇"
          : badge === AE_BADGE.STAR
            ? "⭐"
            : badge === AE_BADGE.CROWN
              ? "👑"
              : badge === AE_BADGE.FIRE
                ? "🔥"
                : "🥉",
    component: AE_COMPONENT.BADGE_MANAGER
  });
}

function assignTrophy(trophyId = "community_founder") {
  return Object.freeze({
    ok: true,
    trophyId,
    rarity: AE_DIFFICULTY.LEGENDARY,
    component: AE_COMPONENT.TROPHY_MANAGER
  });
}

function buildDisplayPlan(achievement = {}, unlock = {}) {
  return Object.freeze({
    ok: true,
    achievementId: achievement.achievementId,
    overlay: Object.freeze({
      enabled: true,
      holdMs: 6200,
      meta: {
        achievementId: achievement.achievementId,
        achievementLabel: achievement.name
      }
    }),
    speech: Object.freeze({
      shouldSpeak: true,
      achievementVoice: true
    }),
    animation: Object.freeze({
      cue: "celebrate",
      source: "achievement"
    }),
    respectsStreamRules: true,
    component: AE_COMPONENT.DISPLAY_MANAGER
  });
}

function validateAchievementUnlock(input = {}, state = {}) {
  const errors = [];
  if (input.duplicate === true) errors.push("duplicate_unlock");
  if (input.conditionsMet !== true) errors.push("conditions_not_met");
  if (input.invalidIntegrity === true) errors.push("integrity_failed");
  if (input.insecure === true) errors.push("security_blocked");
  if (state.alreadyUnlocked && !input.repeatable) errors.push("already_unlocked");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: AE_COMPONENT.ACHIEVEMENT_VALIDATOR
  });
}

function recordAchievementHistory(entry = {}) {
  return Object.freeze({
    ok: true,
    historyId: `ach-hist-${crypto.randomUUID()}`,
    achievementId: entry.achievementId,
    userId: entry.userId,
    unlockedAt: entry.unlockedAt || Date.now(),
    conditions: Object.freeze(entry.conditions || {}),
    reward: Object.freeze(entry.reward || {}),
    immutable: true,
    component: AE_COMPONENT.ACHIEVEMENT_HISTORY
  });
}

function collectAchievementAnalytics(run = {}) {
  return Object.freeze({
    unlockedTotal: run.unlockedTotal || 0,
    rarestAchievementId: run.rarestAchievementId || null,
    topPlayers: Object.freeze(run.topPlayers || []),
    popularUnlocks: Object.freeze(run.popularUnlocks || []),
    completedCollections: run.completedCollections || 0,
    component: AE_COMPONENT.ACHIEVEMENT_ANALYTICS
  });
}

function persistAchievements(snapshot = {}) {
  return Object.freeze({
    ok: true,
    snapshotId: `ach-snap-${crypto.randomUUID()}`,
    snapshot: Object.freeze(snapshot),
    persistedAt: Date.now(),
    component: AE_COMPONENT.PERSISTENCE
  });
}

function buildAchievementPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "event", done: Boolean(stages.event) },
      { step: "condition_check", done: Boolean(stages.conditionCheck) },
      { step: "unlock", done: Boolean(stages.unlock) },
      { step: "reward", done: Boolean(stages.reward) },
      { step: "history", done: Boolean(stages.history) },
      { step: "display", done: Boolean(stages.display) }
    ]),
    component: AE_COMPONENT.ACHIEVEMENT_MANAGER
  });
}

function buildAchievementLifecycle(stages = {}) {
  return Object.freeze({
    ok: true,
    lifecycle: Object.freeze([
      { step: "registration", done: Boolean(stages.registration) },
      { step: "tracking", done: Boolean(stages.tracking) },
      { step: "fulfillment", done: Boolean(stages.fulfillment) },
      { step: "verification", done: Boolean(stages.verification) },
      { step: "reward", done: Boolean(stages.reward) },
      { step: "history", done: Boolean(stages.history) },
      { step: "display", done: Boolean(stages.display) }
    ]),
    component: AE_COMPONENT.ACHIEVEMENT_MANAGER
  });
}

function validateAchievementInput(input = {}) {
  const errors = [];
  if (input.mutatesBattleLogic === true) errors.push("battle_logic_forbidden");
  if (input.mutatesEconomyCalculations === true) errors.push("economy_calculation_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesMemory === true) errors.push("memory_mutation_forbidden");
  if (input.createsItemDirectly === true) errors.push("economy_item_creation_required");
  if (input.bypassValidation === true) errors.push("validation_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: AE_COMPONENT.ACHIEVEMENT_API
  });
}

function distributeAchievementReward(reward = {}, adapters = {}) {
  if (reward.createsItemDirectly === true) {
    return Object.freeze({
      ok: false,
      error: "items_must_flow_through_economy",
      component: AE_COMPONENT.ACHIEVEMENT_MANAGER
    });
  }

  let economyResult = null;
  let inventoryResult = null;

  if (reward.economyEvent && adapters.economyEngine) {
    economyResult = adapters.economyEngine.processEvent(reward.economyEvent, adapters);
  }

  if (
    reward.itemId &&
    economyResult?.ok &&
    adapters.inventoryEngine &&
    typeof adapters.inventoryEngine.grantLoot === "function"
  ) {
    inventoryResult = adapters.inventoryEngine.grantLoot({
      ownerId: reward.userId || "community",
      inventoryId: `inv-${reward.userId || "community"}`,
      source: "achievement",
      table: { entries: [{ itemId: reward.itemId, weight: 1 }] },
      rng: () => 0.5
    });
  }

  const title = reward.title ? grantTitle({ title: reward.title }) : null;
  const badge = reward.badge ? assignBadge(reward.badge) : null;
  const trophy = reward.trophy ? assignTrophy(reward.trophy) : null;

  return Object.freeze({
    ok: economyResult ? economyResult.ok !== false : true,
    viaEconomy: Boolean(economyResult),
    economyResult,
    inventoryResult,
    title,
    badge,
    trophy,
    component: AE_COMPONENT.ACHIEVEMENT_MANAGER
  });
}

function assertAchievementForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !AE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createAchievementEngine(options = {}) {
  const registry = new Map();
  const unlockedByUser = new Map();
  const history = [];
  const unlockCounts = new Map();

  for (const def of DEFAULT_ACHIEVEMENT_DEFINITIONS) {
    const registered = registerAchievementDefinition(def);
    registry.set(registered.achievementId, registered);
  }
  if (Array.isArray(options.extraDefinitions)) {
    for (const def of options.extraDefinitions) {
      const registered = registerAchievementDefinition(def);
      registry.set(registered.achievementId, registered);
    }
  }

  function getUserUnlocks(userId) {
    if (!unlockedByUser.has(userId)) unlockedByUser.set(userId, new Set());
    return unlockedByUser.get(userId);
  }

  function unlockAchievement(definition, userId, stats, adapters = {}) {
    const userUnlocks = getUserUnlocks(userId);
    const alreadyUnlocked = userUnlocks.has(definition.achievementId);
    const conditions = checkUnlockConditions(definition, stats);

    const validation = validateAchievementUnlock(
      {
        duplicate: alreadyUnlocked && !definition.repeatable,
        conditionsMet: conditions.met,
        repeatable: definition.repeatable
      },
      { alreadyUnlocked }
    );
    if (!validation.ok) {
      return Object.freeze({
        ok: false,
        error: "achievement_validation_failed",
        achievementId: definition.achievementId,
        validation,
        component: AE_COMPONENT.ACHIEVEMENT_API
      });
    }

    userUnlocks.add(definition.achievementId);
    unlockCounts.set(definition.achievementId, (unlockCounts.get(definition.achievementId) || 0) + 1);

    const rewardPayload = {
      ...definition.reward,
      userId
    };
    const reward = distributeAchievementReward(rewardPayload, adapters);
    const display = buildDisplayPlan(definition, { userId });

    const hist = recordAchievementHistory({
      achievementId: definition.achievementId,
      userId,
      conditions: definition.condition,
      reward: definition.reward
    });
    history.push(hist);

    const lifecycle = buildAchievementLifecycle({
      registration: true,
      tracking: true,
      fulfillment: true,
      verification: validation.ok,
      reward: reward.ok,
      history: true,
      display: display.ok
    });

    const pipeline = buildAchievementPipeline({
      event: true,
      conditionCheck: conditions.met,
      unlock: true,
      reward: reward.ok,
      history: true,
      display: display.ok
    });

    return Object.freeze({
      ok: pipeline.pipeline.every((s) => s.done),
      achievementId: definition.achievementId,
      name: definition.name,
      category: definition.category,
      reward,
      display,
      history: hist,
      lifecycle,
      pipeline,
      oneTime: !definition.repeatable,
      component: AE_COMPONENT.ACHIEVEMENT_API
    });
  }

  return {
    registerAchievement(definition = {}) {
      const registered = registerAchievementDefinition(definition);
      registry.set(registered.achievementId, registered);
      return registered;
    },
    processEvent(event = {}, adapters = {}) {
      const validation = validateAchievementInput({
        mutatesBattleLogic: event.mutatesBattleLogic,
        mutatesEconomyCalculations: event.mutatesEconomyCalculations,
        mutatesPersonality: event.mutatesPersonality,
        mutatesMemory: event.mutatesMemory,
        createsItemDirectly: event.createsItemDirectly,
        bypassValidation: event.bypassValidation
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_achievement_input",
          validation,
          decides: false,
          component: AE_COMPONENT.ACHIEVEMENT_API
        });
      }

      const userId = event.userId || "anonymous";
      const stats = event.stats || event;
      const unlocked = [];

      for (const definition of registry.values()) {
        const userUnlocks = getUserUnlocks(userId);
        if (userUnlocks.has(definition.achievementId) && !definition.repeatable) continue;
        const conditions = checkUnlockConditions(definition, stats);
        if (!conditions.met) continue;
        const result = unlockAchievement(definition, userId, stats, adapters);
        if (result.ok) unlocked.push(result);
      }

      const analytics = collectAchievementAnalytics({
        unlockedTotal: history.length,
        rarestAchievementId: AE_CANON_ACHIEVEMENT.BATTLES_100,
        topPlayers: [{ userId, count: getUserUnlocks(userId).size }],
        popularUnlocks: Array.from(unlockCounts.entries()).map(([id, count]) => ({ id, count })),
        completedCollections: 0
      });

      const persistence = persistAchievements({
        registrySize: registry.size,
        unlockedByUser: userId,
        unlockedCount: getUserUnlocks(userId).size
      });

      return Object.freeze({
        ok: true,
        unlocked: Object.freeze(unlocked),
        analytics,
        persistence,
        mutatesBattleLogic: false,
        mutatesEconomyCalculations: false,
        decides: false,
        component: AE_COMPONENT.ACHIEVEMENT_API
      });
    },
    reportBattleEvent(outcome = {}, adapters = {}) {
      const validation = validateAchievementInput({
        mutatesBattleLogic: outcome.mutatesBattleLogic,
        mutatesEconomyCalculations: outcome.mutatesEconomyCalculations
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_battle_report",
          validation,
          component: AE_COMPONENT.ACHIEVEMENT_API
        });
      }

      return this.processEvent(
        {
          userId: outcome.userId || outcome.winner,
          stats: {
            firstBattle: outcome.firstBattle,
            firstVictory: outcome.firstVictory,
            battleCount: outcome.battleCount
          }
        },
        adapters
      );
    },
    getUserAchievements(userId) {
      return Object.freeze(Array.from(getUserUnlocks(userId)));
    },
    registry() {
      return Object.freeze(Array.from(registry.values()));
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createAchievementApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: AE_COMPONENT.ACHIEVEMENT_API
  });
}

module.exports = {
  AE_COMPONENT,
  AE_COMPONENT_ORDER,
  AE_CATEGORY,
  AE_CATEGORY_ORDER,
  AE_BADGE,
  AE_DIFFICULTY,
  AE_CANON_ACHIEVEMENT,
  AE_FORBIDDEN_ACTIVITIES,
  AE_RUNTIME_ANCHORS,
  DEFAULT_ACHIEVEMENT_DEFINITIONS,
  manageAchievements,
  registerAchievementDefinition,
  resolveAchievementFromRegistry,
  checkUnlockConditions,
  grantTitle,
  assignBadge,
  assignTrophy,
  buildDisplayPlan,
  validateAchievementUnlock,
  recordAchievementHistory,
  collectAchievementAnalytics,
  persistAchievements,
  buildAchievementPipeline,
  buildAchievementLifecycle,
  validateAchievementInput,
  distributeAchievementReward,
  createAchievementEngine,
  createAchievementApiResponse,
  assertAchievementForbiddenActivity
};
