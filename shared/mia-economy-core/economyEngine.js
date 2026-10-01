"use strict";

/**
 * Master Canon 0041 — Economy Engine: central economic layer for MIA platform.
 */

const crypto = require("crypto");

const EE_COMPONENT = Object.freeze({
  ECONOMY_MANAGER: "economy_manager",
  POINT_CALCULATOR: "point_calculator",
  GIFT_ECONOMY: "gift_economy",
  CHAT_ECONOMY: "chat_economy",
  BOWL_ECONOMY: "bowl_economy",
  PLAYLIST_ECONOMY: "playlist_economy",
  REWARD_MANAGER: "reward_manager",
  ACHIEVEMENT_MANAGER: "achievement_manager",
  ECONOMY_VALIDATOR: "economy_validator",
  ECONOMY_ANALYTICS: "economy_analytics",
  ECONOMY_HISTORY: "economy_history",
  ECONOMY_API: "economy_api"
});

const EE_COMPONENT_ORDER = Object.freeze(Object.values(EE_COMPONENT));

const EE_POINT_RATE = Object.freeze({
  COIN_TO_POINTS: 7.5,
  VALID_COMMENT_TO_POINTS: 7.5
});

const EE_MILESTONE = Object.freeze({
  THANKS: 37.5,
  ITEM: 75,
  BATTLE: 150,
  PLAYLIST: 250
});

const EE_REWARD_TYPE = Object.freeze({
  ITEM: "item",
  BATTLE_BONUS: "battle_bonus",
  ACHIEVEMENT: "achievement",
  COSMETIC: "cosmetic",
  TITLE: "title",
  EVENT: "event",
  THANKS: "thanks"
});

const EE_LIMIT = Object.freeze({
  CHAT_PER_USER_MS: 3000,
  DAILY_POINTS: 100000,
  HOURLY_POINTS: 10000
});

const EE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "control_battle",
  "mutate_personality",
  "mutate_memory",
  "generate_overlays",
  "play_videos"
]);

const EE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-economy-core/economyEngine.js",
  "scripts/MIA_GIFT_ECONOMY.js",
  "scripts/MIA_GIFT_RUNTIME.js",
  "scripts/MIA_CHAT_REWARD_ENGINE.js",
  "shared/mia-inventory-core/inventoryEngine.js",
  "shared/stream_economy_config.json"
]);

function manageEconomy(input = {}) {
  return Object.freeze({
    ok: true,
    economyId: input.economyId || `economy-${crypto.randomUUID()}`,
    rules: Object.freeze(input.rules || EE_POINT_RATE),
    limits: Object.freeze(input.limits || EE_LIMIT),
    state: input.state || "active",
    component: EE_COMPONENT.ECONOMY_MANAGER
  });
}

function calculatePoints(source = "gift", input = {}) {
  let points = 0;
  if (source === "gift") {
    const coins = input.coins != null ? Number(input.coins) : 0;
    points = Math.round(coins * EE_POINT_RATE.COIN_TO_POINTS * 1000) / 1000;
  } else if (source === "chat") {
    points = input.valid === false ? 0 : EE_POINT_RATE.VALID_COMMENT_TO_POINTS;
  } else if (source === "battle") {
    points = input.points != null ? Number(input.points) : 0;
  }
  return Object.freeze({
    ok: points >= 0,
    source,
    points,
    formula:
      source === "gift"
        ? "coins_x_7_5"
        : source === "chat"
          ? "valid_comment_7_5"
          : "custom",
    component: EE_COMPONENT.POINT_CALCULATOR
  });
}

function processGiftEconomy(input = {}) {
  const calc = calculatePoints("gift", { coins: input.coins });
  return Object.freeze({
    ok: calc.ok,
    coins: input.coins != null ? Number(input.coins) : 0,
    points: calc.points,
    giftMapExternal: true,
    component: EE_COMPONENT.GIFT_ECONOMY
  });
}

function processChatEconomy(input = {}, lastCommentAt = {}) {
  const userId = input.userId || "anonymous";
  const now = input.now != null ? Number(input.now) : Date.now();
  const last = lastCommentAt[userId] || 0;
  const spam = input.spam === true || !String(input.message || "").trim();
  const tooSoon = last > 0 && now - last < EE_LIMIT.CHAT_PER_USER_MS;

  const valid = !spam && !tooSoon && input.moderator !== true;
  const calc = calculatePoints("chat", { valid });

  return Object.freeze({
    ok: valid,
    userId,
    points: calc.points,
    valid,
    spam,
    tooSoon,
    component: EE_COMPONENT.CHAT_ECONOMY
  });
}

function processBowlEconomy(bowl = {}, pointsToAdd = 0) {
  const current = bowl.percent != null ? Number(bowl.percent) : 0;
  const added = Math.max(0, Number(pointsToAdd) || 0);
  const fillRate = bowl.fillRate != null ? Number(bowl.fillRate) : 0.05;
  const next = Math.min(100, Math.round((current + added * fillRate) * 1000) / 1000);
  const full = next >= 100;

  return Object.freeze({
    ok: true,
    percent: next,
    full,
    triggerTier: full ? "T4" : null,
    resetOnFull: full,
    memoryEvent: full ? "bowl_full_t4" : null,
    component: EE_COMPONENT.BOWL_ECONOMY
  });
}

function processPlaylistEconomy(balance = 0, request = {}) {
  const cost = EE_MILESTONE.PLAYLIST;
  const ok = balance >= cost && request.enqueue === true;
  return Object.freeze({
    ok,
    cost,
    balanceBefore: balance,
    balanceAfter: ok ? balance - cost : balance,
    debitOnEnqueue: true,
    component: EE_COMPONENT.PLAYLIST_ECONOMY
  });
}

function resolveMilestoneReward(totalPoints = 0) {
  const points = Number(totalPoints) || 0;
  const rewards = [];
  if (points >= EE_MILESTONE.THANKS) rewards.push(EE_REWARD_TYPE.THANKS);
  if (points >= EE_MILESTONE.ITEM) rewards.push(EE_REWARD_TYPE.ITEM);
  if (points >= EE_MILESTONE.BATTLE) rewards.push(EE_REWARD_TYPE.BATTLE_BONUS);
  if (points >= EE_MILESTONE.PLAYLIST) rewards.push(EE_REWARD_TYPE.EVENT);
  return Object.freeze({
    ok: true,
    rewards: Object.freeze(rewards),
    component: EE_COMPONENT.REWARD_MANAGER
  });
}

function grantReward(rewardType = EE_REWARD_TYPE.ITEM, context = {}) {
  return Object.freeze({
    ok: true,
    rewardType,
    rewardId: `reward-${crypto.randomUUID()}`,
    itemId: context.itemId || null,
    battleBonus: rewardType === EE_REWARD_TYPE.BATTLE_BONUS,
    component: EE_COMPONENT.REWARD_MANAGER
  });
}

function evaluateAchievement(input = {}) {
  const achievements = [];
  if (input.firstBattle) achievements.push("first_battle");
  if (input.firstGift) achievements.push("first_gift");
  if ((input.commentCount || 0) >= 100) achievements.push("comments_100");
  if ((input.totalPoints || 0) >= 1000) achievements.push("points_1000");
  if (input.firstVictory) achievements.push("first_victory");

  return Object.freeze({
    ok: achievements.length > 0,
    unlocked: Object.freeze(achievements),
    component: EE_COMPONENT.ACHIEVEMENT_MANAGER
  });
}

function validateEconomyChange(change = {}, state = {}) {
  const errors = [];
  if (change.points != null && Number(change.points) < 0) errors.push("negative_points");
  if (change.duplicate === true) errors.push("duplicate_operation");
  if (change.points > EE_LIMIT.HOURLY_POINTS && !change.limitOverride) errors.push("hourly_limit");
  if (state.balance != null && change.debit != null && state.balance < change.debit) {
    errors.push("insufficient_balance");
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: EE_COMPONENT.ECONOMY_VALIDATOR
  });
}

function recordEconomyHistory(event = {}, payload = {}) {
  return Object.freeze({
    ok: true,
    historyId: `econ-hist-${crypto.randomUUID()}`,
    event,
    payload: Object.freeze(payload),
    immutable: true,
    recordedAt: Date.now(),
    component: EE_COMPONENT.ECONOMY_HISTORY
  });
}

function collectEconomyAnalytics(run = {}) {
  return Object.freeze({
    totalPoints: run.totalPoints || 0,
    earnedPoints: run.earnedPoints || 0,
    spentPoints: run.spentPoints || 0,
    communityActivity: run.communityActivity || 0,
    bowlPercent: run.bowlPercent != null ? run.bowlPercent : null,
    component: EE_COMPONENT.ECONOMY_ANALYTICS
  });
}

function buildEconomyPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "event", done: Boolean(stages.event) },
      { step: "validator", done: Boolean(stages.validator) },
      { step: "calculation", done: Boolean(stages.calculation) },
      { step: "points", done: Boolean(stages.points) },
      { step: "reward", done: Boolean(stages.reward) },
      { step: "inventory", done: Boolean(stages.inventory) },
      { step: "memory", done: Boolean(stages.memory) },
      { step: "analytics", done: Boolean(stages.analytics) }
    ]),
    component: EE_COMPONENT.ECONOMY_MANAGER
  });
}

function validateEconomyInput(input = {}) {
  const errors = [];
  if (input.controlsBattle === true) errors.push("battle_control_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesMemory === true) errors.push("memory_mutation_forbidden");
  if (input.bypassPipeline === true) errors.push("pipeline_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: EE_COMPONENT.ECONOMY_API
  });
}

function assertEconomyForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !EE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createEconomyEngine(options = {}) {
  const history = [];
  const lastChatAt = {};
  let balance = options.initialBalance != null ? Number(options.initialBalance) : 0;
  let bowl = { percent: 0 };
  let totalEarned = 0;
  let totalSpent = 0;

  return {
    processEvent(input = {}, adapters = {}) {
      const validation = validateEconomyInput({
        controlsBattle: input.controlsBattle,
        mutatesPersonality: input.mutatesPersonality,
        mutatesMemory: input.mutatesMemory,
        bypassPipeline: input.bypassPipeline
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_economy_input",
          validation,
          decides: false,
          component: EE_COMPONENT.ECONOMY_API
        });
      }

      const event = input.event || {};
      let points = 0;
      let gift = null;
      let chat = null;
      let bowlResult = null;
      let playlist = null;
      let reward = null;

      if (event.type === "gift") {
        gift = processGiftEconomy({ coins: event.coins });
        points = gift.points;
      } else if (event.type === "chat") {
        chat = processChatEconomy(
          {
            userId: event.userId,
            message: event.message,
            spam: event.spam,
            now: event.now
          },
          lastChatAt
        );
        if (chat.ok) lastChatAt[event.userId] = event.now || Date.now();
        points = chat.points;
      } else if (event.type === "battle_reward") {
        points = calculatePoints("battle", { points: event.points }).points;
      }

      const changeValidation = validateEconomyChange({ points, duplicate: input.duplicate });
      if (!changeValidation.ok) {
        return Object.freeze({
          ok: false,
          error: "economy_validation_failed",
          changeValidation,
          component: EE_COMPONENT.ECONOMY_API
        });
      }

      const balanceBefore = balance;
      balance += points;
      totalEarned += points;

      bowlResult = processBowlEconomy(bowl, points);
      if (bowlResult.resetOnFull) bowl = { percent: 0 };
      else bowl = { percent: bowlResult.percent };

      resolveMilestoneReward(balance);
      const itemMilestoneCrossed =
        balanceBefore < EE_MILESTONE.ITEM && balance >= EE_MILESTONE.ITEM;
      if (itemMilestoneCrossed) {
        reward = grantReward(EE_REWARD_TYPE.ITEM, { itemId: event.itemId || "community_item" });
      }

      if (event.type === "playlist_enqueue") {
        playlist = processPlaylistEconomy(balance, { enqueue: true });
        if (playlist.ok) {
          balance = playlist.balanceAfter;
          totalSpent += playlist.cost;
        }
      }

      const achievements = evaluateAchievement({
        firstBattle: event.firstBattle,
        firstGift: event.type === "gift",
        commentCount: event.commentCount,
        totalPoints: balance,
        firstVictory: event.firstVictory
      });

      let inventoryResult = null;
      if (reward && adapters.inventoryEngine && typeof adapters.inventoryEngine.grantLoot === "function") {
        inventoryResult = adapters.inventoryEngine.grantLoot({
          ownerId: event.userId || "community",
          inventoryId: `inv-${event.userId || "community"}`,
          source: "gift",
          table: { entries: [{ itemId: reward.itemId || "community_item", weight: 1 }] },
          rng: () => 0.5
        });
      }

      const hist = recordEconomyHistory(event.type || "unknown", {
        points,
        balance,
        bowlPercent: bowl.percent
      });
      history.push(hist);

      const analytics = collectEconomyAnalytics({
        totalPoints: balance,
        earnedPoints: totalEarned,
        spentPoints: totalSpent,
        communityActivity: Object.keys(lastChatAt).length,
        bowlPercent: bowl.percent
      });

      const pipeline = buildEconomyPipeline({
        event: true,
        validator: changeValidation.ok,
        calculation: true,
        points: points > 0 || Boolean(playlist?.ok),
        reward: true,
        inventory: !itemMilestoneCrossed || Boolean(inventoryResult?.ok),
        memory: true,
        analytics: true
      });

      const hasEffect = points > 0 || Boolean(playlist?.ok);

      return Object.freeze({
        ok: pipeline.pipeline.every((s) => s.done) && hasEffect,
        points,
        balance,
        gift,
        chat,
        bowl: bowlResult,
        playlist,
        reward,
        achievements,
        inventory: inventoryResult,
        analytics,
        pipeline,
        decides: false,
        controlsBattle: false,
        component: EE_COMPONENT.ECONOMY_API
      });
    },
    balance() {
      return balance;
    },
    bowl() {
      return Object.freeze({ ...bowl });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createEconomyApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: EE_COMPONENT.ECONOMY_API
  });
}

module.exports = {
  EE_COMPONENT,
  EE_COMPONENT_ORDER,
  EE_POINT_RATE,
  EE_MILESTONE,
  EE_REWARD_TYPE,
  EE_LIMIT,
  EE_FORBIDDEN_ACTIVITIES,
  EE_RUNTIME_ANCHORS,
  manageEconomy,
  calculatePoints,
  processGiftEconomy,
  processChatEconomy,
  processBowlEconomy,
  processPlaylistEconomy,
  resolveMilestoneReward,
  grantReward,
  evaluateAchievement,
  validateEconomyChange,
  recordEconomyHistory,
  collectEconomyAnalytics,
  buildEconomyPipeline,
  validateEconomyInput,
  createEconomyEngine,
  createEconomyApiResponse,
  assertEconomyForbiddenActivity
};
