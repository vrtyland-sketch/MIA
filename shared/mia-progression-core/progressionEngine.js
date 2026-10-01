"use strict";

/**
 * Master Canon 0042 — Quest & Progression Engine: long-term community motivation for MIA.
 */

const crypto = require("crypto");

const QPE_COMPONENT = Object.freeze({
  QUEST_MANAGER: "quest_manager",
  PROGRESSION_MANAGER: "progression_manager",
  XP_MANAGER: "xp_manager",
  LEVEL_MANAGER: "level_manager",
  MISSION_MANAGER: "mission_manager",
  SEASON_MANAGER: "season_manager",
  REWARD_DISTRIBUTOR: "reward_distributor",
  UNLOCK_MANAGER: "unlock_manager",
  PROGRESS_ANALYTICS: "progress_analytics",
  PROGRESS_HISTORY: "progress_history",
  PROGRESS_PERSISTENCE: "progress_persistence",
  PROGRESS_API: "progress_api"
});

const QPE_COMPONENT_ORDER = Object.freeze(Object.values(QPE_COMPONENT));

const QPE_QUEST_TYPE = Object.freeze({
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  EVENT: "event",
  STORY: "story",
  COMMUNITY: "community"
});

const QPE_QUEST_TYPE_ORDER = Object.freeze(Object.values(QPE_QUEST_TYPE));

const QPE_PROGRESS_LAYER = Object.freeze({
  PLAYER: "player",
  KOJNOZROUT: "kojnozrout",
  COMMUNITY: "community"
});

const QPE_ENTITY_TYPE = Object.freeze({
  VIEWER: "viewer",
  KOJNOZROUT: "kojnozrout",
  MIA: "mia",
  COMMUNITY: "community",
  BATTLE_TEAM: "battle_team"
});

const QPE_XP_RATE = Object.freeze({
  CHAT: 5,
  GIFT: 10,
  BATTLE: 15,
  QUEST: 20,
  EVENT: 12,
  ACHIEVEMENT: 25
});

const QPE_XP_PER_LEVEL = 100;

const QPE_COMMUNITY_GOAL = Object.freeze({
  COMMENTS_FOR_NEW_KOJ: 100000,
  GIFTS_FOR_ARENA: 10000
});

const QPE_SEASON = Object.freeze({
  SUMMER: "summer",
  HALLOWEEN: "halloween",
  CHRISTMAS: "christmas",
  EASTER: "easter",
  ANNIVERSARY: "anniversary"
});

const QPE_QUEST_STATE = Object.freeze({
  CREATED: "created",
  ACTIVE: "active",
  IN_PROGRESS: "in_progress",
  CHECKING: "checking",
  REWARDED: "rewarded",
  ARCHIVED: "archived"
});

const QPE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_battle_logic",
  "mutate_economy_calculations",
  "mutate_personality",
  "mutate_memory",
  "create_items_outside_economy"
]);

const QPE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-progression-core/progressionEngine.js",
  "scripts/MIA_KOJNOZROUT_CARE_QUEST.js",
  "scripts/MIA_KOJNOZROUT_EVOLUTION.js",
  "scripts/MIA_KOJNOZROUT_ENGINE.js",
  "shared/mia-economy-core/economyEngine.js"
]);

function manageQuests(input = {}) {
  return Object.freeze({
    ok: true,
    questCatalog: Object.freeze(input.questCatalog || {}),
    activeQuests: Object.freeze(input.activeQuests || []),
    component: QPE_COMPONENT.QUEST_MANAGER
  });
}

function createQuestDefinition(input = {}) {
  const questId = input.questId || `quest-${crypto.randomUUID()}`;
  return Object.freeze({
    ok: true,
    questId,
    name: input.name || "Quest",
    description: input.description || "",
    type: input.type || QPE_QUEST_TYPE.DAILY,
    conditions: Object.freeze(input.conditions || {}),
    rewards: Object.freeze(input.rewards || {}),
    state: input.state || QPE_QUEST_STATE.CREATED,
    validUntil: input.validUntil || null,
    dataDriven: true,
    component: QPE_COMPONENT.QUEST_MANAGER
  });
}

function manageProgression(input = {}) {
  return Object.freeze({
    ok: true,
    layers: Object.freeze({
      player: input.player || { xp: 0, level: 1 },
      kojnozrout: input.kojnozrout || { xp: 0, level: 1 },
      community: input.community || { xp: 0, level: 1, comments: 0, gifts: 0 }
    }),
    component: QPE_COMPONENT.PROGRESSION_MANAGER
  });
}

function awardXp(source = "chat", amount) {
  const xp =
    amount != null
      ? Number(amount)
      : QPE_XP_RATE[String(source || "").toUpperCase()] || 0;
  return Object.freeze({
    ok: xp > 0,
    source,
    xp,
    isEconomyPoints: false,
    component: QPE_COMPONENT.XP_MANAGER
  });
}

function calculateLevel(totalXp = 0) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(xp / QPE_XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % QPE_XP_PER_LEVEL;
  return Object.freeze({
    ok: true,
    level,
    totalXp: xp,
    xpIntoLevel,
    xpToNext: QPE_XP_PER_LEVEL - xpIntoLevel,
    component: QPE_COMPONENT.LEVEL_MANAGER
  });
}

function createMission(input = {}) {
  return Object.freeze({
    ok: true,
    missionId: input.missionId || `mission-${crypto.randomUUID()}`,
    label: input.label || "Mission",
    target: input.target != null ? Number(input.target) : 1,
    progress: 0,
    reward: Object.freeze(input.reward || { xp: QPE_XP_RATE.QUEST }),
    component: QPE_COMPONENT.MISSION_MANAGER
  });
}

function checkMissionProgress(mission = {}, delta = 1) {
  const progress = Math.min(mission.target, (mission.progress || 0) + Math.max(0, Number(delta) || 0));
  const complete = progress >= mission.target;
  return Object.freeze({
    ok: true,
    missionId: mission.missionId,
    progress,
    target: mission.target,
    complete,
    component: QPE_COMPONENT.MISSION_MANAGER
  });
}

function manageSeason(input = {}) {
  return Object.freeze({
    ok: true,
    seasonId: input.seasonId || QPE_SEASON.SUMMER,
    name: input.name || input.seasonId || QPE_SEASON.SUMMER,
    active: input.active !== false,
    quests: Object.freeze(input.quests || []),
    cosmetics: Object.freeze(input.cosmetics || []),
    component: QPE_COMPONENT.SEASON_MANAGER
  });
}

function distributeReward(reward = {}, adapters = {}) {
  if (reward.createsItemDirectly === true) {
    return Object.freeze({
      ok: false,
      error: "items_must_flow_through_economy",
      component: QPE_COMPONENT.REWARD_DISTRIBUTOR
    });
  }

  let economyResult = null;
  if (reward.economyEvent && adapters.economyEngine) {
    economyResult = adapters.economyEngine.processEvent(reward.economyEvent, adapters);
  }

  return Object.freeze({
    ok: economyResult ? economyResult.ok !== false : true,
    xp: reward.xp || 0,
    viaEconomy: Boolean(economyResult),
    economyResult,
    component: QPE_COMPONENT.REWARD_DISTRIBUTOR
  });
}

function unlockFeature(input = {}) {
  return Object.freeze({
    ok: true,
    unlockId: input.unlockId || `unlock-${crypto.randomUUID()}`,
    feature: input.feature || "feature",
    entityType: input.entityType || QPE_ENTITY_TYPE.VIEWER,
    permanent: input.permanent !== false,
    component: QPE_COMPONENT.UNLOCK_MANAGER
  });
}

function processCommunityGoal(goalId, current = 0, target) {
  const resolvedTarget =
    target != null
      ? Number(target)
      : goalId === "new_kojnozrout"
        ? QPE_COMMUNITY_GOAL.COMMENTS_FOR_NEW_KOJ
        : goalId === "new_arena"
          ? QPE_COMMUNITY_GOAL.GIFTS_FOR_ARENA
          : 0;
  const value = Math.max(0, Number(current) || 0);
  const complete = value >= resolvedTarget;
  const unlock =
    complete && goalId === "new_kojnozrout"
      ? unlockFeature({ feature: "new_kojnozrout", entityType: QPE_ENTITY_TYPE.COMMUNITY })
      : complete && goalId === "new_arena"
        ? unlockFeature({ feature: "new_battle_arena", entityType: QPE_ENTITY_TYPE.COMMUNITY })
        : null;

  return Object.freeze({
    ok: true,
    goalId,
    current: value,
    target: resolvedTarget,
    complete,
    unlock,
    layer: QPE_PROGRESS_LAYER.COMMUNITY,
    component: QPE_COMPONENT.PROGRESSION_MANAGER
  });
}

function processKojProgression(input = {}) {
  const xpGain = awardXp(input.source || "quest", input.xp);
  const totalXp = (input.totalXp || 0) + xpGain.xp;
  const level = calculateLevel(totalXp);
  const unlocks = [];
  if (level.level >= 2) {
    unlocks.push(
      unlockFeature({
        feature: "new_attack",
        entityType: QPE_ENTITY_TYPE.KOJNOZROUT,
        unlockId: `koj-attack-l${level.level}`
      })
    );
  }

  return Object.freeze({
    ok: true,
    kojId: input.kojId || "koj-default",
    xpGain,
    level,
    unlocks: Object.freeze(unlocks),
    layer: QPE_PROGRESS_LAYER.KOJNOZROUT,
    component: QPE_COMPONENT.PROGRESSION_MANAGER
  });
}

function recordProgressHistory(event = {}, payload = {}) {
  return Object.freeze({
    ok: true,
    historyId: `prog-hist-${crypto.randomUUID()}`,
    event,
    payload: Object.freeze(payload),
    immutable: true,
    recordedAt: Date.now(),
    component: QPE_COMPONENT.PROGRESS_HISTORY
  });
}

function collectProgressAnalytics(run = {}) {
  return Object.freeze({
    questsCompleted: run.questsCompleted || 0,
    xpEarned: run.xpEarned || 0,
    levelUps: run.levelUps || 0,
    communityActivity: run.communityActivity || 0,
    popularQuestType: run.popularQuestType || null,
    component: QPE_COMPONENT.PROGRESS_ANALYTICS
  });
}

function persistProgress(snapshot = {}) {
  return Object.freeze({
    ok: true,
    snapshotId: `prog-snap-${crypto.randomUUID()}`,
    snapshot: Object.freeze(snapshot),
    persistedAt: Date.now(),
    component: QPE_COMPONENT.PROGRESS_PERSISTENCE
  });
}

function buildQuestLifecycle(stages = {}) {
  return Object.freeze({
    ok: true,
    lifecycle: Object.freeze([
      { step: "creation", done: Boolean(stages.creation) },
      { step: "activation", done: Boolean(stages.activation) },
      { step: "fulfillment", done: Boolean(stages.fulfillment) },
      { step: "check", done: Boolean(stages.check) },
      { step: "reward", done: Boolean(stages.reward) },
      { step: "archive", done: Boolean(stages.archive) }
    ]),
    component: QPE_COMPONENT.QUEST_MANAGER
  });
}

function buildProgressPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "activity", done: Boolean(stages.activity) },
      { step: "xp", done: Boolean(stages.xp) },
      { step: "level", done: Boolean(stages.level) },
      { step: "reward", done: Boolean(stages.reward) },
      { step: "unlock", done: Boolean(stages.unlock) },
      { step: "history", done: Boolean(stages.history) }
    ]),
    component: QPE_COMPONENT.PROGRESSION_MANAGER
  });
}

function validateProgressInput(input = {}) {
  const errors = [];
  if (input.mutatesBattleLogic === true) errors.push("battle_logic_forbidden");
  if (input.mutatesEconomyCalculations === true) errors.push("economy_calculation_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesMemory === true) errors.push("memory_mutation_forbidden");
  if (input.createsItemDirectly === true) errors.push("economy_item_creation_required");
  if (input.bypassPipeline === true) errors.push("pipeline_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: QPE_COMPONENT.PROGRESS_API
  });
}

function assertProgressForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !QPE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createProgressionEngine(options = {}) {
  const questCatalog = new Map();
  const missions = new Map();
  const history = [];
  const unlocks = [];
  let totalXpEarned = 0;
  let questsCompleted = 0;
  let levelUps = 0;

  const player = { xp: 0, level: 1, entityId: options.playerId || "player-default" };
  const koj = { xp: 0, level: 1, kojId: options.kojId || "koj-default" };
  const community = { comments: 0, gifts: 0, xp: 0, level: 1 };

  return {
    registerQuest(definition = {}) {
      const quest = createQuestDefinition(definition);
      questCatalog.set(quest.questId, quest);
      return quest;
    },
    registerMission(missionInput = {}) {
      const mission = createMission(missionInput);
      missions.set(mission.missionId, {
        missionId: mission.missionId,
        label: mission.label,
        target: mission.target,
        progress: 0,
        reward: mission.reward
      });
      return mission;
    },
    processActivity(activity = {}, adapters = {}) {
      const validation = validateProgressInput({
        mutatesBattleLogic: activity.mutatesBattleLogic,
        mutatesEconomyCalculations: activity.mutatesEconomyCalculations,
        mutatesPersonality: activity.mutatesPersonality,
        mutatesMemory: activity.mutatesMemory,
        createsItemDirectly: activity.createsItemDirectly,
        bypassPipeline: activity.bypassPipeline
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_progress_input",
          validation,
          decides: false,
          component: QPE_COMPONENT.PROGRESS_API
        });
      }

      const xpGain = awardXp(activity.type, activity.xp);
      const beforeLevel = calculateLevel(player.xp).level;
      player.xp += xpGain.xp;
      totalXpEarned += xpGain.xp;
      const level = calculateLevel(player.xp);
      player.level = level.level;
      if (level.level > beforeLevel) levelUps += 1;

      let missionResult = null;
      if (activity.missionId && missions.has(activity.missionId)) {
        const mission = missions.get(activity.missionId);
        missionResult = checkMissionProgress(mission, activity.delta || 1);
        mission.progress = missionResult.progress;
        if (missionResult.complete) questsCompleted += 1;
      }

      if (activity.type === "chat") community.comments += 1;
      if (activity.type === "gift") community.gifts += 1;

      let rewardResult = null;
      if (missionResult?.complete && missionResult.missionId) {
        const mission = missions.get(missionResult.missionId);
        rewardResult = distributeReward(
          {
            xp: mission.reward?.xp || QPE_XP_RATE.QUEST,
            economyEvent: mission.reward?.economyEvent
          },
          adapters
        );
      } else if (activity.economyEvent) {
        rewardResult = distributeReward({ economyEvent: activity.economyEvent }, adapters);
      }

      const featureUnlock =
        level.level >= 2
          ? unlockFeature({
              feature: "voice_reaction_pack",
              entityType: QPE_ENTITY_TYPE.VIEWER,
              unlockId: `viewer-voice-l${level.level}`
            })
          : null;
      if (featureUnlock) unlocks.push(featureUnlock);

      const hist = recordProgressHistory(activity.type || "activity", {
        xp: xpGain.xp,
        level: level.level,
        playerXp: player.xp
      });
      history.push(hist);

      const analytics = collectProgressAnalytics({
        questsCompleted,
        xpEarned: totalXpEarned,
        levelUps,
        communityActivity: community.comments + community.gifts,
        popularQuestType: activity.questType || null
      });

      const pipeline = buildProgressPipeline({
        activity: true,
        xp: xpGain.xp > 0,
        level: true,
        reward: !missionResult?.complete || Boolean(rewardResult?.ok),
        unlock: !featureUnlock || Boolean(featureUnlock.ok),
        history: true
      });

      const persistence = persistProgress({
        player,
        koj,
        community,
        unlocks: unlocks.map((u) => u.unlockId)
      });

      return Object.freeze({
        ok: pipeline.pipeline.every((s) => s.done) && xpGain.xp > 0,
        xp: xpGain.xp,
        level,
        mission: missionResult,
        reward: rewardResult,
        unlock: featureUnlock,
        analytics,
        pipeline,
        persistence,
        economyPointsSeparate: true,
        mutatesBattleLogic: false,
        mutatesEconomyCalculations: false,
        decides: false,
        component: QPE_COMPONENT.PROGRESS_API
      });
    },
    reportBattleOutcome(outcome = {}, adapters = {}) {
      const validation = validateProgressInput({
        mutatesBattleLogic: outcome.mutatesBattleLogic,
        mutatesEconomyCalculations: outcome.mutatesEconomyCalculations
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_battle_report",
          validation,
          component: QPE_COMPONENT.PROGRESS_API
        });
      }

      const xpGain = awardXp("battle", outcome.xp);
      player.xp += xpGain.xp;
      totalXpEarned += xpGain.xp;
      const level = calculateLevel(player.xp);
      player.level = level.level;

      let rewardResult = null;
      if (outcome.economyEvent && adapters.economyEngine) {
        rewardResult = distributeReward({ economyEvent: outcome.economyEvent }, adapters);
      }

      const hist = recordProgressHistory("battle_outcome", {
        battleId: outcome.battleId,
        winner: outcome.winner,
        xp: xpGain.xp
      });
      history.push(hist);

      return Object.freeze({
        ok: true,
        battleId: outcome.battleId,
        winner: outcome.winner,
        xp: xpGain.xp,
        level,
        reward: rewardResult,
        battleAnnouncedOnly: true,
        controlsBattle: false,
        component: QPE_COMPONENT.PROGRESS_API
      });
    },
    advanceCommunity(goalId, amount = 1) {
      if (goalId === "new_kojnozrout") community.comments += amount;
      if (goalId === "new_arena") community.gifts += amount;
      const current =
        goalId === "new_kojnozrout" ? community.comments : goalId === "new_arena" ? community.gifts : 0;
      return processCommunityGoal(goalId, current);
    },
    snapshot() {
      return persistProgress({ player, koj, community, unlocks: unlocks.map((u) => u.unlockId) });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createProgressApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: QPE_COMPONENT.PROGRESS_API
  });
}

module.exports = {
  QPE_COMPONENT,
  QPE_COMPONENT_ORDER,
  QPE_QUEST_TYPE,
  QPE_QUEST_TYPE_ORDER,
  QPE_PROGRESS_LAYER,
  QPE_ENTITY_TYPE,
  QPE_XP_RATE,
  QPE_XP_PER_LEVEL,
  QPE_COMMUNITY_GOAL,
  QPE_SEASON,
  QPE_QUEST_STATE,
  QPE_FORBIDDEN_ACTIVITIES,
  QPE_RUNTIME_ANCHORS,
  manageQuests,
  createQuestDefinition,
  manageProgression,
  awardXp,
  calculateLevel,
  createMission,
  checkMissionProgress,
  manageSeason,
  distributeReward,
  unlockFeature,
  processCommunityGoal,
  processKojProgression,
  recordProgressHistory,
  collectProgressAnalytics,
  persistProgress,
  buildQuestLifecycle,
  buildProgressPipeline,
  validateProgressInput,
  createProgressionEngine,
  createProgressApiResponse,
  assertProgressForbiddenActivity
};
