"use strict";

/**
 * Master Canon 0039 — Battle Engine: gameplay battle subsystem for MIA.
 */

const crypto = require("crypto");

const BE_COMPONENT = Object.freeze({
  BATTLE_MANAGER: "battle_manager",
  BATTLE_SESSION_MANAGER: "battle_session_manager",
  BATTLE_STATE_MACHINE: "battle_state_machine",
  INVENTORY_MANAGER: "inventory_manager",
  ITEM_MANAGER: "item_manager",
  ACTION_QUEUE: "action_queue",
  DAMAGE_CALCULATOR: "damage_calculator",
  AI_BATTLE_CONTROLLER: "ai_battle_controller",
  BATTLE_RENDERER: "battle_renderer",
  BATTLE_ANALYTICS: "battle_analytics",
  BATTLE_HISTORY: "battle_history",
  BATTLE_API: "battle_api"
});

const BE_COMPONENT_ORDER = Object.freeze(Object.values(BE_COMPONENT));

const BE_STATE = Object.freeze({
  WAITING: "waiting",
  PREPARING: "preparing",
  STARTING: "starting",
  ACTIVE: "active",
  FINISHING: "finishing",
  COMPLETED: "completed",
  ARCHIVED: "archived"
});

const BE_STATE_ORDER = Object.freeze(Object.values(BE_STATE));

const BE_TYPE = Object.freeze({
  FRIENDLY: "friendly_battle",
  RANKED: "ranked_battle",
  EVENT: "event_battle",
  BOSS: "boss_battle",
  COMMUNITY: "community_battle",
  STORY: "story_battle"
});

const BE_KOJ_CLASS = Object.freeze({
  TANK: "tank",
  FIGHTER: "fighter",
  ASSASSIN: "assassin",
  SUPPORT: "support"
});

const BE_ACTION = Object.freeze({
  ATTACK: "attack",
  HEAL: "heal",
  LOVE: "love",
  DEFEND: "defend",
  ITEM: "item",
  BUFF: "buff"
});

const BE_DEFAULT_DURATION_MS = 5 * 60 * 1000;
const BE_DEFAULT_ACTION_COOLDOWN_MS = 15000;

const BE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_stream_economy",
  "mutate_personality",
  "mutate_memory",
  "bypass_decision_engine",
  "play_video_outside_orchestrator"
]);

const BE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-battle-core/battleEngine.js",
  "scripts/MIA_ARENA_BATTLE.js",
  "scripts/MIA_KOJ_BATTLE_CHOREOGRAPHY.js",
  "mia-output-overlay/arena-battle-overlay.html",
  "shared/mia-obs-core/obsIntegrationLayer.js",
  "shared/mia-decision-core/decisionEngine.js"
]);

const KOJ_CLASS_STATS = Object.freeze({
  [BE_KOJ_CLASS.TANK]: Object.freeze({ attack: 6, defense: 14, speed: 4, support: 5 }),
  [BE_KOJ_CLASS.FIGHTER]: Object.freeze({ attack: 10, defense: 10, speed: 8, support: 6 }),
  [BE_KOJ_CLASS.ASSASSIN]: Object.freeze({ attack: 14, defense: 5, speed: 12, support: 4 }),
  [BE_KOJ_CLASS.SUPPORT]: Object.freeze({ attack: 5, defense: 7, speed: 7, support: 15 })
});

function manageBattle(input = {}) {
  return Object.freeze({
    ok: true,
    battleId: input.battleId || `battle-${crypto.randomUUID()}`,
    type: input.type || BE_TYPE.COMMUNITY,
    state: input.state || BE_STATE.WAITING,
    durationMs: input.durationMs != null ? Number(input.durationMs) : BE_DEFAULT_DURATION_MS,
    participants: Object.freeze(input.participants || []),
    score: Object.freeze(input.score || {}),
    component: BE_COMPONENT.BATTLE_MANAGER
  });
}

function createBattleSession(battle = {}, seed = {}) {
  const startedAt = seed.startedAt || Date.now();
  return Object.freeze({
    ok: true,
    sessionId: seed.sessionId || `session-${crypto.randomUUID()}`,
    battleId: battle.battleId,
    startedAt,
    endsAt: startedAt + (battle.durationMs || BE_DEFAULT_DURATION_MS),
    actionLog: Object.freeze(seed.actionLog || []),
    activePlayers: Object.freeze(seed.activePlayers || battle.participants || []),
    inventorySnapshot: Object.freeze(seed.inventorySnapshot || {}),
    component: BE_COMPONENT.BATTLE_SESSION_MANAGER
  });
}

function transitionBattleState(fromState, toState) {
  const fromIndex = BE_STATE_ORDER.indexOf(fromState);
  const toIndex = BE_STATE_ORDER.indexOf(toState);
  const valid = fromIndex >= 0 && toIndex >= 0 && toIndex === fromIndex + 1;
  return Object.freeze({
    ok: valid,
    from: fromState,
    to: toState,
    skipped: false,
    component: BE_COMPONENT.BATTLE_STATE_MACHINE
  });
}

function advanceBattleState(current = BE_STATE.WAITING) {
  const index = BE_STATE_ORDER.indexOf(current);
  const next = index >= 0 && index < BE_STATE_ORDER.length - 1 ? BE_STATE_ORDER[index + 1] : current;
  return transitionBattleState(current, next);
}

function createInventory(battleId = "", items = []) {
  return Object.freeze({
    ok: true,
    battleId,
    items: Object.freeze(items),
    separateFromStreamEconomy: true,
    component: BE_COMPONENT.INVENTORY_MANAGER
  });
}

function defineItem(input = {}) {
  return Object.freeze({
    ok: true,
    item: Object.freeze({
      itemId: input.itemId || `item-${crypto.randomUUID()}`,
      name: input.name || "Item",
      type: input.type || "consumable",
      effect: input.effect || BE_ACTION.ATTACK,
      cooldownMs: input.cooldownMs != null ? Number(input.cooldownMs) : BE_DEFAULT_ACTION_COOLDOWN_MS,
      cost: input.cost != null ? Number(input.cost) : 0,
      rarity: input.rarity || "common"
    }),
    component: BE_COMPONENT.ITEM_MANAGER
  });
}

function enqueueBattleAction(queue = [], action = {}) {
  const entry = Object.freeze({
    actionId: action.actionId || `action-${crypto.randomUUID()}`,
    playerId: action.playerId,
    action: action.action || BE_ACTION.ATTACK,
    itemId: action.itemId || null,
    queuedAt: Date.now(),
    priority: action.priority != null ? Number(action.priority) : 50
  });
  const next = [...queue, entry].sort((a, b) => a.queuedAt - b.queuedAt);
  return Object.freeze({
    ok: Boolean(entry.playerId),
    entry,
    queue: Object.freeze(next),
    component: BE_COMPONENT.ACTION_QUEUE
  });
}

function canPlayerAct(playerId, lastActionAt = {}, now = Date.now()) {
  const last = lastActionAt[playerId] || 0;
  const allowed = now - last >= BE_DEFAULT_ACTION_COOLDOWN_MS;
  return Object.freeze({
    ok: allowed,
    playerId,
    cooldownRemainingMs: allowed ? 0 : BE_DEFAULT_ACTION_COOLDOWN_MS - (now - last),
    component: BE_COMPONENT.ACTION_QUEUE
  });
}

function calculateDamage(input = {}) {
  const attackerClass = input.attackerClass || BE_KOJ_CLASS.FIGHTER;
  const defenderClass = input.defenderClass || BE_KOJ_CLASS.TANK;
  const item = input.item || {};
  const stats = KOJ_CLASS_STATS[attackerClass] || KOJ_CLASS_STATS[BE_KOJ_CLASS.FIGHTER];
  const defense = (KOJ_CLASS_STATS[defenderClass] || KOJ_CLASS_STATS[BE_KOJ_CLASS.TANK]).defense;

  const base = stats.attack + (item.power != null ? Number(item.power) : 0);
  const buff = input.buffMultiplier != null ? Number(input.buffMultiplier) : 1;
  const randomFactor = input.randomSeed != null ? 1 : 1;
  const raw = Math.max(1, Math.round((base * buff * randomFactor - defense * 0.35) * 10) / 10);

  return Object.freeze({
    ok: true,
    damage: raw,
    deterministic: input.randomSeed != null,
    formula: "item+attack-defense+buffs",
    component: BE_COMPONENT.DAMAGE_CALCULATOR
  });
}

function controlAiBattle(context = {}) {
  const risk = context.risk != null ? Number(context.risk) : 0.5;
  const supplies = context.supplies != null ? Number(context.supplies) : 0.5;
  const winChance = Math.min(0.95, Math.max(0.05, supplies * 0.6 + (1 - risk) * 0.4));

  let strategy = "balanced";
  if (supplies < 0.3) strategy = "defensive";
  else if (winChance > 0.7) strategy = "aggressive";

  return Object.freeze({
    ok: true,
    strategy,
    winChance: Math.round(winChance * 1000) / 1000,
    recommendedAction: strategy === "defensive" ? BE_ACTION.DEFEND : BE_ACTION.ATTACK,
    aiOnly: true,
    component: BE_COMPONENT.AI_BATTLE_CONTROLLER
  });
}

function planBattleRender(battle = {}, animationAdapter = {}) {
  return Object.freeze({
    ok: true,
    battleId: battle.battleId,
    overlay: "arena-battle-overlay.html",
    hud: true,
    animationEngine: true,
    obsViaLayer: true,
    targets: Object.freeze(["battle_overlay", "kojnozout_runtime", "mia_head"]),
    animationPlan: animationAdapter.state || null,
    component: BE_COMPONENT.BATTLE_RENDERER
  });
}

function collectBattleAnalytics(run = {}) {
  return Object.freeze({
    battleCount: run.battleCount || 1,
    wins: run.wins || 0,
    losses: run.losses || 0,
    itemsUsed: run.itemsUsed || 0,
    avgDurationMs: run.avgDurationMs || BE_DEFAULT_DURATION_MS,
    topStrategy: run.topStrategy || "balanced",
    component: BE_COMPONENT.BATTLE_ANALYTICS
  });
}

function recordBattleHistory(battle = {}, session = {}, result = {}) {
  return Object.freeze({
    ok: true,
    historyId: `history-${crypto.randomUUID()}`,
    battleId: battle.battleId,
    participants: battle.participants,
    items: session.inventorySnapshot,
    timeline: Object.freeze(session.actionLog || []),
    winner: result.winner || null,
    stats: Object.freeze(result.stats || {}),
    memoryLinked: true,
    component: BE_COMPONENT.BATTLE_HISTORY
  });
}

function validateBattleInput(input = {}) {
  const errors = [];
  if (!input.fromDecision && !input.tiktokBattleTrigger) errors.push("decision_or_trigger_required");
  if (input.mutatesStreamEconomy === true) errors.push("stream_economy_mutation_forbidden");
  if (input.decidesEconomy === true) errors.push("economy_decision_forbidden");
  if (input.bypassDecisionEngine === true) errors.push("decision_engine_bypass_forbidden");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: BE_COMPONENT.BATTLE_API
  });
}

function assertBattleForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !BE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createBattleEngine(options = {}) {
  let currentBattle = null;
  let currentSession = null;
  let currentState = BE_STATE.WAITING;
  const queue = [];
  const lastActionAt = {};
  const history = [];

  return {
    start(input = {}) {
      const validation = validateBattleInput({
        fromDecision: input.fromDecision === true || Boolean(input.decision),
        tiktokBattleTrigger: input.tiktokBattleTrigger === true,
        mutatesStreamEconomy: input.mutatesStreamEconomy,
        decidesEconomy: input.decidesEconomy,
        bypassDecisionEngine: input.bypassDecisionEngine
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_battle_input",
          validation,
          decides: false,
          component: BE_COMPONENT.BATTLE_API
        });
      }

      const battle = manageBattle({
        type: input.type || BE_TYPE.COMMUNITY,
        participants: input.participants || [],
        durationMs: input.durationMs || BE_DEFAULT_DURATION_MS
      });

      let state = BE_STATE.WAITING;
      const transitions = [];
      while (state !== BE_STATE.ACTIVE) {
        const next = advanceBattleState(state);
        if (!next.ok) break;
        transitions.push(next);
        state = next.to;
      }

      const session = createBattleSession(battle, {
        activePlayers: input.participants || [],
        inventorySnapshot: input.inventory || createInventory(battle.battleId, input.items || []).items
      });

      const inventory = createInventory(battle.battleId, input.items || []);
      currentBattle = battle;
      currentSession = session;
      currentState = state;

      return Object.freeze({
        ok: true,
        battle,
        session,
        inventory,
        state,
        transitions: Object.freeze(transitions),
        tiktokTriggerOnly: input.tiktokBattleTrigger === true,
        miaDecidesOutcome: true,
        decides: false,
        component: BE_COMPONENT.BATTLE_API
      });
    },
    queueAction(action = {}) {
      const cooldown = canPlayerAct(action.playerId, lastActionAt);
      if (!cooldown.ok) {
        return Object.freeze({
          ok: false,
          error: "action_cooldown",
          cooldown,
          component: BE_COMPONENT.ACTION_QUEUE
        });
      }

      const queued = enqueueBattleAction(queue, action);
      if (!queued.ok) return queued;

      queue.length = 0;
      queue.push(...queued.queue);
      lastActionAt[action.playerId] = Date.now();

      if (currentSession) {
        currentSession = createBattleSession(currentBattle, {
          ...currentSession,
          actionLog: [...(currentSession.actionLog || []), queued.entry]
        });
      }

      const damage =
        action.action === BE_ACTION.ATTACK || action.action === BE_ACTION.ITEM
          ? calculateDamage({
              attackerClass: action.attackerClass || BE_KOJ_CLASS.FIGHTER,
              defenderClass: action.defenderClass || BE_KOJ_CLASS.TANK,
              item: action.item || {},
              randomSeed: action.randomSeed
            })
          : null;

      return Object.freeze({
        ok: true,
        queued: queued.entry,
        damage,
        queue: queued.queue,
        component: BE_COMPONENT.ACTION_QUEUE
      });
    },
    finish(result = {}) {
      let state = currentState;
      const transitions = [];
      while (state !== BE_STATE.ARCHIVED) {
        const next = advanceBattleState(state);
        if (!next.ok) break;
        transitions.push(next);
        state = next.to;
      }

      const historyEntry = recordBattleHistory(
        currentBattle || manageBattle(),
        currentSession || createBattleSession({}),
        result
      );
      history.push(historyEntry);

      const analytics = collectBattleAnalytics({
        battleCount: history.length,
        wins: result.winner ? 1 : 0,
        losses: result.winner ? 0 : 1,
        itemsUsed: (currentSession?.actionLog || []).filter((a) => a.itemId).length,
        avgDurationMs: currentSession
          ? Math.max(0, Date.now() - currentSession.startedAt)
          : BE_DEFAULT_DURATION_MS
      });

      const render = planBattleRender(currentBattle || {}, { state });

      currentState = BE_STATE.ARCHIVED;
      const output = Object.freeze({
        ok: true,
        state,
        transitions: Object.freeze(transitions),
        history: historyEntry,
        analytics,
        render,
        decides: false,
        component: BE_COMPONENT.BATTLE_API
      });

      currentBattle = null;
      currentSession = null;
      return output;
    },
    aiEvaluate(context = {}) {
      return controlAiBattle(context);
    },
    state() {
      return Object.freeze({
        battle: currentBattle,
        session: currentSession,
        state: currentState,
        queue: Object.freeze([...queue])
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createBattleApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: BE_COMPONENT.BATTLE_API
  });
}

module.exports = {
  BE_COMPONENT,
  BE_COMPONENT_ORDER,
  BE_STATE,
  BE_STATE_ORDER,
  BE_TYPE,
  BE_KOJ_CLASS,
  BE_ACTION,
  BE_DEFAULT_DURATION_MS,
  BE_DEFAULT_ACTION_COOLDOWN_MS,
  BE_FORBIDDEN_ACTIVITIES,
  BE_RUNTIME_ANCHORS,
  KOJ_CLASS_STATS,
  manageBattle,
  createBattleSession,
  transitionBattleState,
  advanceBattleState,
  createInventory,
  defineItem,
  enqueueBattleAction,
  canPlayerAct,
  calculateDamage,
  controlAiBattle,
  planBattleRender,
  collectBattleAnalytics,
  recordBattleHistory,
  validateBattleInput,
  createBattleEngine,
  createBattleApiResponse,
  assertBattleForbiddenActivity
};
