"use strict";

/**
 * Master Canon 0030 — Goal Management System: strategic goal layer for MIA.
 */

const crypto = require("crypto");

const GMS_COMPONENT = Object.freeze({
  GOAL_REGISTRY: "goal_registry",
  GOAL_PLANNER: "goal_planner",
  GOAL_PRIORITIZER: "goal_prioritizer",
  GOAL_EVALUATOR: "goal_evaluator",
  GOAL_SCHEDULER: "goal_scheduler",
  GOAL_DEPENDENCY_MANAGER: "goal_dependency_manager",
  GOAL_CONFLICT_RESOLVER: "goal_conflict_resolver",
  GOAL_LIFECYCLE_MANAGER: "goal_lifecycle_manager",
  GOAL_METRICS: "goal_metrics",
  GOAL_HISTORY: "goal_history",
  GOAL_LEARNING: "goal_learning",
  GOAL_API: "goal_api"
});

const GMS_COMPONENT_ORDER = Object.freeze(Object.values(GMS_COMPONENT));

const GMS_GOAL_TYPE = Object.freeze({
  REACTIVE: "reactive",
  PLANNED: "planned",
  PERSISTENT: "persistent",
  EMERGENCY: "emergency"
});

const GMS_GOAL_STATE = Object.freeze({
  CREATED: "created",
  PLANNED: "planned",
  ACTIVE: "active",
  WAITING: "waiting",
  COMPLETED: "completed",
  ARCHIVED: "archived",
  CANCELLED: "cancelled"
});

const GMS_GOAL_ID = Object.freeze({
  THANK_GIFT: "thank_gift",
  RESPOND_CHAT: "respond_chat",
  COMPLETE_BATTLE: "complete_battle",
  PROTECT_PERFORMANCE: "protect_performance",
  CONTINUE_STREAM: "continue_stream",
  GROW_COMMUNITY: "grow_community",
  IMPROVE_AI: "improve_ai",
  DEVELOP_KOJNOZROUT: "develop_kojnozout",
  OBS_RECOVERY: "obs_recovery",
  SYSTEM_RECOVERY: "system_recovery"
});

const GMS_SCHEDULE = Object.freeze({
  IMMEDIATE: "immediate",
  AFTER_BATTLE: "after_battle",
  AFTER_VIDEO: "after_video",
  NIGHTLY: "nightly"
});

const GMS_FORBIDDEN_ACTIVITIES = Object.freeze([
  "execute_actions",
  "mutate_memory",
  "mutate_rules",
  "mutate_economy",
  "bypass_decision_engine"
]);

const GMS_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-goal-core/goalManagementSystem.js",
  "shared/mia-decision-core/decisionEngine.js",
  "shared/mia-action-core/actionOrchestrator.js",
  "shared/mia-memory-core/index.js"
]);

const LIFECYCLE_TRANSITIONS = Object.freeze({
  [GMS_GOAL_STATE.CREATED]: Object.freeze([GMS_GOAL_STATE.PLANNED, GMS_GOAL_STATE.CANCELLED]),
  [GMS_GOAL_STATE.PLANNED]: Object.freeze([GMS_GOAL_STATE.ACTIVE, GMS_GOAL_STATE.CANCELLED]),
  [GMS_GOAL_STATE.ACTIVE]: Object.freeze([
    GMS_GOAL_STATE.WAITING,
    GMS_GOAL_STATE.COMPLETED,
    GMS_GOAL_STATE.CANCELLED
  ]),
  [GMS_GOAL_STATE.WAITING]: Object.freeze([
    GMS_GOAL_STATE.ACTIVE,
    GMS_GOAL_STATE.COMPLETED,
    GMS_GOAL_STATE.CANCELLED
  ]),
  [GMS_GOAL_STATE.COMPLETED]: Object.freeze([GMS_GOAL_STATE.ARCHIVED]),
  [GMS_GOAL_STATE.ARCHIVED]: Object.freeze([]),
  [GMS_GOAL_STATE.CANCELLED]: Object.freeze([])
});

const MAX_ACTIVE_MS = 5 * 60 * 1000;

function registerGoal(registry = {}, input = {}) {
  const goalId = input.goalId || `goal-${crypto.randomUUID()}`;
  const record = Object.freeze({
    goalId,
    name: input.name || goalId,
    description: input.description || "",
    type: input.type || GMS_GOAL_TYPE.REACTIVE,
    priority: input.priority != null ? Number(input.priority) : 50,
    state: input.state || GMS_GOAL_STATE.CREATED,
    owner: input.owner || "mia.main",
    dependencies: Object.freeze(input.dependencies || []),
    schedule: input.schedule || GMS_SCHEDULE.IMMEDIATE,
    createdAt: input.createdAt || Date.now(),
    expectedCompletionAt: input.expectedCompletionAt || null,
    component: GMS_COMPONENT.GOAL_REGISTRY
  });

  const goals = Object.freeze([...(registry.goals || []), record]);
  return Object.freeze({
    ok: true,
    goal: record,
    goals,
    component: GMS_COMPONENT.GOAL_REGISTRY
  });
}

function planGoal(goal = {}, steps = []) {
  const plannedSteps = (steps.length ? steps : defaultStepsForGoal(goal)).map((step, index) =>
    Object.freeze({
      stepId: step.stepId || `goal-step-${index + 1}`,
      action: step.action,
      kind: step.kind || "action_plan",
      component: GMS_COMPONENT.GOAL_PLANNER
    })
  );

  return Object.freeze({
    ok: true,
    goalId: goal.goalId,
    steps: Object.freeze(plannedSteps),
    component: GMS_COMPONENT.GOAL_PLANNER
  });
}

function defaultStepsForGoal(goal = {}) {
  if (goal.goalId === GMS_GOAL_ID.COMPLETE_BATTLE) {
    return [
      { action: "use_item" },
      { action: "battle_animation" },
      { action: "evaluate_battle" },
      { action: "store_battle_result" }
    ];
  }
  if (goal.goalId === GMS_GOAL_ID.THANK_GIFT) {
    return [{ action: "thank_donor" }, { action: "play_tier_video" }];
  }
  if (goal.goalId === GMS_GOAL_ID.RESPOND_CHAT) {
    return [{ action: "chat_reply" }];
  }
  return [{ action: "observe" }];
}

function scoreGoal(goal = {}, context = {}) {
  let score = goal.priority != null ? Number(goal.priority) : 50;

  if (goal.type === GMS_GOAL_TYPE.EMERGENCY) score += 1000;
  if (goal.type === GMS_GOAL_TYPE.REACTIVE) score += 20;
  if (goal.type === GMS_GOAL_TYPE.PERSISTENT) score += 5;

  if (context.gift && goal.goalId === GMS_GOAL_ID.THANK_GIFT) score += 30;
  if (context.chatMessage && goal.goalId === GMS_GOAL_ID.RESPOND_CHAT) score += 25;
  if (context.battleActive && goal.goalId === GMS_GOAL_ID.COMPLETE_BATTLE) score += 35;
  if (context.systemLoad != null && context.systemLoad > 0.85) {
    if (goal.goalId === GMS_GOAL_ID.PROTECT_PERFORMANCE) score += 40;
  }
  if (context.obsDown && goal.goalId === GMS_GOAL_ID.OBS_RECOVERY) score += 500;

  return Math.round(score * 1000) / 1000;
}

function prioritizeGoals(goals = [], context = {}) {
  const scored = goals
    .map((goal) =>
      Object.freeze({
        ...goal,
        priorityScore: scoreGoal(goal, context),
        component: GMS_COMPONENT.GOAL_PRIORITIZER
      })
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((goal, index) => Object.freeze({ ...goal, rank: index + 1 }));

  return Object.freeze({
    ok: true,
    goals: Object.freeze(scored),
    topGoal: scored[0] || null,
    component: GMS_COMPONENT.GOAL_PRIORITIZER
  });
}

function evaluateGoal(goal = {}, context = {}) {
  const risks = [];
  if (goal.type === GMS_GOAL_TYPE.REACTIVE && context.systemLoad != null && context.systemLoad > 0.95) {
    risks.push("system_overloaded");
  }
  if (goal.goalId === GMS_GOAL_ID.RESPOND_CHAT && context.battleActive) {
    risks.push("battle_attention_conflict");
  }
  if (goal.dependencies?.length) {
    risks.push("has_dependencies");
  }

  return Object.freeze({
    ok: risks.length === 0,
    goalId: goal.goalId,
    risks: Object.freeze(risks),
    approved: risks.length <= 1,
    component: GMS_COMPONENT.GOAL_EVALUATOR
  });
}

function scheduleGoal(goal = {}, hint = {}) {
  let schedule = goal.schedule || GMS_SCHEDULE.IMMEDIATE;

  if (hint.afterBattle || (goal.goalId === GMS_GOAL_ID.GROW_COMMUNITY && hint.battleActive)) {
    schedule = GMS_SCHEDULE.AFTER_BATTLE;
  } else if (hint.afterVideo) {
    schedule = GMS_SCHEDULE.AFTER_VIDEO;
  } else if (goal.type === GMS_GOAL_TYPE.PLANNED && hint.nightly) {
    schedule = GMS_SCHEDULE.NIGHTLY;
  }

  return Object.freeze({
    ok: true,
    goalId: goal.goalId,
    schedule,
    component: GMS_COMPONENT.GOAL_SCHEDULER
  });
}

function resolveGoalDependencies(goals = []) {
  const byId = new Map(goals.map((g) => [g.goalId, g]));
  const waves = [];
  const completed = new Set();
  const remaining = new Set(goals.map((g) => g.goalId));

  while (remaining.size > 0) {
    const ready = [];
    for (const goalId of remaining) {
      const goal = byId.get(goalId);
      const deps = goal.dependencies || [];
      if (deps.every((dep) => completed.has(dep))) ready.push(goal);
    }

    if (ready.length === 0) {
      return Object.freeze({
        ok: false,
        error: "dependency_cycle",
        component: GMS_COMPONENT.GOAL_DEPENDENCY_MANAGER
      });
    }

    waves.push(Object.freeze(ready));
    for (const goal of ready) {
      remaining.delete(goal.goalId);
      completed.add(goal.goalId);
    }
  }

  return Object.freeze({
    ok: true,
    waves: Object.freeze(waves),
    component: GMS_COMPONENT.GOAL_DEPENDENCY_MANAGER
  });
}

function resolveGoalConflicts(goals = [], context = {}) {
  const prioritized = prioritizeGoals(goals, context);
  const top = prioritized.topGoal;
  const deferred = [];
  const merged = [];

  for (const goal of prioritized.goals) {
    if (!top || goal.goalId === top.goalId) continue;

    const evaluation = evaluateGoal(goal, context);
    if (evaluation.risks.includes("battle_attention_conflict")) {
      deferred.push(
        Object.freeze({
          goalId: goal.goalId,
          reason: "defer_for_battle",
          component: GMS_COMPONENT.GOAL_CONFLICT_RESOLVER
        })
      );
      continue;
    }

    if (
      top.goalId === GMS_GOAL_ID.THANK_GIFT &&
      goal.goalId === GMS_GOAL_ID.RESPOND_CHAT &&
      context.gift &&
      context.chatMessage
    ) {
      merged.push(
        Object.freeze({
          goalIds: Object.freeze([top.goalId, goal.goalId]),
          strategy: "combine_acknowledgement",
          component: GMS_COMPONENT.GOAL_CONFLICT_RESOLVER
        })
      );
    }
  }

  return Object.freeze({
    ok: true,
    winner: top,
    deferred: Object.freeze(deferred),
    merged: Object.freeze(merged),
    component: GMS_COMPONENT.GOAL_CONFLICT_RESOLVER
  });
}

function transitionGoalLifecycle(goal = {}, toState) {
  const fromState = goal.state || GMS_GOAL_STATE.CREATED;
  const allowed = LIFECYCLE_TRANSITIONS[fromState] || [];
  const ok = allowed.includes(toState);

  return Object.freeze({
    ok,
    goalId: goal.goalId,
    fromState,
    toState,
    goal: ok
      ? Object.freeze({
          ...goal,
          state: toState,
          updatedAt: Date.now(),
          component: GMS_COMPONENT.GOAL_LIFECYCLE_MANAGER
        })
      : null,
    component: GMS_COMPONENT.GOAL_LIFECYCLE_MANAGER
  });
}

function enforceActiveGoalLimit(goal = {}) {
  const activatedAt = goal.activatedAt || goal.createdAt || Date.now();
  const elapsed = Date.now() - activatedAt;
  if (goal.state === GMS_GOAL_STATE.ACTIVE && elapsed > MAX_ACTIVE_MS) {
    return transitionGoalLifecycle(goal, GMS_GOAL_STATE.WAITING);
  }
  return Object.freeze({ ok: true, goal, enforced: false, component: GMS_COMPONENT.GOAL_LIFECYCLE_MANAGER });
}

function collectGoalMetrics(goal = {}, runMeta = {}) {
  return Object.freeze({
    goalId: goal.goalId,
    durationMs: runMeta.durationMs || 0,
    stepCount: runMeta.stepCount || 0,
    success: runMeta.success !== false,
    attempts: runMeta.attempts || 1,
    resourceCost: runMeta.resourceCost || 0,
    economicBenefit: runMeta.economicBenefit || 0,
    component: GMS_COMPONENT.GOAL_METRICS
  });
}

function recordGoalHistory(goal = {}, outcome = {}) {
  return Object.freeze({
    historyId: `goal-history-${crypto.randomUUID()}`,
    goalId: goal.goalId,
    name: goal.name,
    type: goal.type,
    progress: Object.freeze(outcome.progress || []),
    decisions: Object.freeze(outcome.decisions || []),
    result: outcome.result || null,
    errors: Object.freeze(outcome.errors || []),
    startedAt: outcome.startedAt || goal.createdAt,
    completedAt: outcome.completedAt || Date.now(),
    component: GMS_COMPONENT.GOAL_HISTORY
  });
}

function applyGoalLearning(history = {}, outcome = {}) {
  const success = outcome.success !== false;
  return Object.freeze({
    historyId: history.historyId,
    goalId: history.goalId,
    success,
    planningAdjustment: success ? "reinforce" : "revise",
    notes: outcome.notes || null,
    component: GMS_COMPONENT.GOAL_LEARNING
  });
}

function adaptMemoryContext(memory = {}) {
  return Object.freeze({
    readOnly: true,
    working: Boolean(memory.working),
    shortTerm: Boolean(memory.shortTerm),
    longTerm: Boolean(memory.longTerm),
    episodic: Boolean(memory.episodic),
    procedural: Boolean(memory.procedural),
    emotional: Boolean(memory.emotional),
    component: GMS_COMPONENT.GOAL_API
  });
}

function reactiveGoalsFromContext(context = {}) {
  const goals = [];

  goals.push(
    Object.freeze({
      goalId: GMS_GOAL_ID.CONTINUE_STREAM,
      name: "Continue Stream",
      type: GMS_GOAL_TYPE.PERSISTENT,
      priority: 10,
      state: GMS_GOAL_STATE.ACTIVE,
      owner: "mia.main",
      dependencies: Object.freeze([]),
      schedule: GMS_SCHEDULE.IMMEDIATE,
      createdAt: Date.now()
    })
  );

  goals.push(
    Object.freeze({
      goalId: GMS_GOAL_ID.PROTECT_PERFORMANCE,
      name: "Protect Performance",
      type: GMS_GOAL_TYPE.PERSISTENT,
      priority: 90,
      state: GMS_GOAL_STATE.ACTIVE,
      owner: "mia.main",
      dependencies: Object.freeze([]),
      schedule: GMS_SCHEDULE.IMMEDIATE,
      createdAt: Date.now()
    })
  );

  if (context.obsDown || context.systemLoad != null && context.systemLoad > 0.98) {
    goals.push(
      Object.freeze({
        goalId: GMS_GOAL_ID.OBS_RECOVERY,
        name: "Recover OBS",
        type: GMS_GOAL_TYPE.EMERGENCY,
        priority: 1000,
        state: GMS_GOAL_STATE.CREATED,
        owner: "mia.main",
        dependencies: Object.freeze([]),
        schedule: GMS_SCHEDULE.IMMEDIATE,
        createdAt: Date.now()
      })
    );
  }

  if (context.gift) {
    goals.push(
      Object.freeze({
        goalId: GMS_GOAL_ID.THANK_GIFT,
        name: "Thank Gift",
        type: GMS_GOAL_TYPE.REACTIVE,
        priority: 80,
        state: GMS_GOAL_STATE.CREATED,
        owner: "mia.main",
        dependencies: Object.freeze([]),
        schedule: GMS_SCHEDULE.IMMEDIATE,
        createdAt: Date.now()
      })
    );
  }

  if (context.chatMessage) {
    goals.push(
      Object.freeze({
        goalId: GMS_GOAL_ID.RESPOND_CHAT,
        name: "Respond Chat",
        type: GMS_GOAL_TYPE.REACTIVE,
        priority: 70,
        state: GMS_GOAL_STATE.CREATED,
        owner: "mia.main",
        dependencies: Object.freeze([]),
        schedule: GMS_SCHEDULE.IMMEDIATE,
        createdAt: Date.now()
      })
    );
  }

  if (context.battleActive) {
    goals.push(
      Object.freeze({
        goalId: GMS_GOAL_ID.COMPLETE_BATTLE,
        name: "Complete Battle",
        type: GMS_GOAL_TYPE.REACTIVE,
        priority: 85,
        state: GMS_GOAL_STATE.CREATED,
        owner: "mia.main",
        dependencies: Object.freeze([]),
        schedule: GMS_SCHEDULE.IMMEDIATE,
        createdAt: Date.now()
      })
    );
  }

  return Object.freeze(goals);
}

function toDecisionGoalCandidates(goals = []) {
  return Object.freeze(
    goals.map((goal) =>
      Object.freeze({
        goal: goal.goalId,
        priority: goal.priorityScore != null ? Math.round(goal.priorityScore) : goal.priority,
        rank: goal.rank,
        schedule: goal.schedule,
        type: goal.type
      })
    )
  );
}

function assertGoalForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !GMS_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createGoalManagementSystem() {
  const registry = [];
  const historyLog = [];

  return {
    register(input = {}) {
      const result = registerGoal({ goals: registry }, input);
      if (result.ok) registry.push(result.goal);
      return result;
    },
    resolve(context = {}, options = {}) {
      const memory = adaptMemoryContext(options.memory || {});
      const discovered = reactiveGoalsFromContext(context);
      const registered = options.includeRegistry ? registry.slice() : [];
      const allGoals = [...registered, ...discovered];

      const prioritized = prioritizeGoals(allGoals, context);
      const conflicts = resolveGoalConflicts(prioritized.goals, context);
      const dependencies = resolveGoalDependencies(prioritized.goals);
      const winner = conflicts.winner;

      const planned = winner ? planGoal(winner) : null;
      const scheduled = winner
        ? scheduleGoal(winner, {
            battleActive: context.battleActive,
            afterVideo: options.afterVideo,
            nightly: options.nightly
          })
        : null;

      const candidates = toDecisionGoalCandidates(prioritized.goals);

      return Object.freeze({
        ok: true,
        executes: false,
        memory,
        goals: prioritized.goals,
        topGoal: winner,
        conflicts,
        dependencies,
        plan: planned,
        schedule: scheduled,
        decisionCandidates: candidates,
        component: GMS_COMPONENT.GOAL_API
      });
    },
    complete(goal = {}, outcome = {}) {
      const metrics = collectGoalMetrics(goal, outcome);
      const history = recordGoalHistory(goal, outcome);
      historyLog.push(history);
      const learning = applyGoalLearning(history, outcome);
      const archived = transitionGoalLifecycle(
        { ...goal, state: GMS_GOAL_STATE.COMPLETED },
        GMS_GOAL_STATE.ARCHIVED
      );

      return Object.freeze({
        ok: true,
        metrics,
        history,
        learning,
        archived: archived.goal,
        component: GMS_COMPONENT.GOAL_API
      });
    },
    history() {
      return Object.freeze([...historyLog]);
    },
    registry() {
      return Object.freeze([...registry]);
    }
  };
}

function createGoalApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    executes: false,
    decides: options.decides === true,
    data,
    component: GMS_COMPONENT.GOAL_API
  });
}

module.exports = {
  GMS_COMPONENT,
  GMS_COMPONENT_ORDER,
  GMS_GOAL_TYPE,
  GMS_GOAL_STATE,
  GMS_GOAL_ID,
  GMS_SCHEDULE,
  GMS_FORBIDDEN_ACTIVITIES,
  GMS_RUNTIME_ANCHORS,
  MAX_ACTIVE_MS,
  registerGoal,
  planGoal,
  prioritizeGoals,
  evaluateGoal,
  scheduleGoal,
  resolveGoalDependencies,
  resolveGoalConflicts,
  transitionGoalLifecycle,
  enforceActiveGoalLimit,
  collectGoalMetrics,
  recordGoalHistory,
  applyGoalLearning,
  adaptMemoryContext,
  reactiveGoalsFromContext,
  toDecisionGoalCandidates,
  createGoalManagementSystem,
  createGoalApiResponse,
  assertGoalForbiddenActivity
};
