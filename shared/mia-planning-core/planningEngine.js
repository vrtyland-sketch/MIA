"use strict";

/**
 * Master Canon 0031 — Planning Engine: multi-level strategic planning for MIA.
 */

const crypto = require("crypto");

const PE_COMPONENT = Object.freeze({
  PLAN_GENERATOR: "plan_generator",
  TASK_DECOMPOSER: "task_decomposer",
  RESOURCE_PLANNER: "resource_planner",
  TIMELINE_MANAGER: "timeline_manager",
  SCENARIO_PLANNER: "scenario_planner",
  PREDICTION_ENGINE: "prediction_engine",
  CONSTRAINT_SOLVER: "constraint_solver",
  PLAN_OPTIMIZER: "plan_optimizer",
  REPLANNING_ENGINE: "replanning_engine",
  PLAN_VALIDATOR: "plan_validator",
  PLAN_HISTORY: "plan_history",
  LEARNING_ADAPTER: "learning_adapter",
  PLANNING_API: "planning_api"
});

const PE_COMPONENT_ORDER = Object.freeze(Object.values(PE_COMPONENT));

const PE_PLAN_HORIZON = Object.freeze({
  IMMEDIATE: "immediate",
  SHORT_TERM: "short_term",
  LONG_TERM: "long_term",
  CRISIS: "crisis"
});

const PE_SCENARIO_ID = Object.freeze({
  NORMAL: "variant_a_normal",
  GIFT_SURGE: "variant_b_gift_surge",
  OBS_OUTAGE: "variant_c_obs_outage"
});

const PE_TIMELINE_SLOT = Object.freeze({
  NOW: "now",
  IN_5_SECONDS: "in_5_seconds",
  AFTER_BATTLE: "after_battle",
  AFTER_STREAM: "after_stream",
  NIGHTLY: "nightly"
});

const PE_RESOURCE = Object.freeze({
  CPU: "cpu",
  RAM: "ram",
  GPU: "gpu",
  AI_MODEL: "ai_model",
  OBS: "obs",
  TIME: "time",
  NETWORK: "network"
});

const PE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "execute_actions",
  "mutate_memory",
  "mutate_goal_registry",
  "bypass_decision_engine",
  "ignore_system_rules"
]);

const PE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-planning-core/planningEngine.js",
  "shared/mia-goal-core/goalManagementSystem.js",
  "shared/mia-decision-core/decisionEngine.js",
  "shared/mia-action-core/actionOrchestrator.js"
]);

const GOAL_TASK_TEMPLATES = Object.freeze({
  complete_battle: Object.freeze([
    { taskId: "battle-1", action: "evaluate_state", order: 1 },
    { taskId: "battle-2", action: "select_item", order: 2 },
    { taskId: "battle-3", action: "prepare_animation", order: 3 },
    { taskId: "battle-4", action: "announce_result", order: 4 },
    { taskId: "battle-5", action: "store_statistics", order: 5 }
  ]),
  thank_gift: Object.freeze([
    { taskId: "gift-1", action: "evaluate_gift", order: 1 },
    { taskId: "gift-2", action: "thank_donor", order: 2 },
    { taskId: "gift-3", action: "play_tier_video", order: 3 },
    { taskId: "gift-4", action: "show_gift_overlay", order: 4 }
  ]),
  respond_chat: Object.freeze([
    { taskId: "chat-1", action: "read_message", order: 1 },
    { taskId: "chat-2", action: "chat_reply", order: 2 }
  ]),
  obs_recovery: Object.freeze([
    { taskId: "obs-1", action: "detect_outage", order: 1 },
    { taskId: "obs-2", action: "recover_obs", order: 2 },
    { taskId: "obs-3", action: "verify_stream", order: 3 }
  ]),
  grow_community: Object.freeze([
    { taskId: "dev-1", action: "analyze", order: 1 },
    { taskId: "dev-2", action: "design", order: 2 },
    { taskId: "dev-3", action: "implement", order: 3 },
    { taskId: "dev-4", action: "test", order: 4 },
    { taskId: "dev-5", action: "deploy", order: 5 }
  ])
});

function generatePlan(goal = {}, context = {}) {
  const planId = `plan-${crypto.randomUUID()}`;
  const horizon =
    goal.type === "emergency"
      ? PE_PLAN_HORIZON.CRISIS
      : goal.type === "persistent"
        ? PE_PLAN_HORIZON.LONG_TERM
        : goal.type === "planned"
          ? PE_PLAN_HORIZON.SHORT_TERM
          : PE_PLAN_HORIZON.IMMEDIATE;

  return Object.freeze({
    ok: true,
    planId,
    goalId: goal.goalId,
    goalName: goal.name || goal.goalId,
    horizon,
    rationale: `goal:${goal.goalId || "unknown"}`,
    createdAt: Date.now(),
    executes: false,
    forDecisionEngine: true,
    component: PE_COMPONENT.PLAN_GENERATOR
  });
}

function decomposeTasks(goal = {}, options = {}) {
  const template = GOAL_TASK_TEMPLATES[goal.goalId] || [{ taskId: "task-1", action: "observe", order: 1 }];
  const depth = options.depth != null ? Number(options.depth) : template.length;

  const tasks = template.slice(0, depth).map((task) =>
    Object.freeze({
      ...task,
      goalId: goal.goalId,
      component: PE_COMPONENT.TASK_DECOMPOSER
    })
  );

  return Object.freeze({
    ok: true,
    goalId: goal.goalId,
    tasks: Object.freeze(tasks),
    component: PE_COMPONENT.TASK_DECOMPOSER
  });
}

function planResources(tasks = [], resources = {}) {
  const budget = Object.freeze({
    [PE_RESOURCE.CPU]: resources.cpu != null ? Number(resources.cpu) : 0.8,
    [PE_RESOURCE.RAM]: resources.ram != null ? Number(resources.ram) : 0.75,
    [PE_RESOURCE.GPU]: resources.gpu != null ? Number(resources.gpu) : 0.7,
    [PE_RESOURCE.AI_MODEL]: resources.aiModel != null ? Number(resources.aiModel) : 1,
    [PE_RESOURCE.OBS]: resources.obs != null ? Number(resources.obs) : 1,
    [PE_RESOURCE.TIME]: resources.timeMs != null ? Number(resources.timeMs) : 30000,
    [PE_RESOURCE.NETWORK]: resources.network != null ? Number(resources.network) : 1
  });

  const taskCost = tasks.length * 0.08;
  const withinBudget =
    taskCost <= budget[PE_RESOURCE.CPU] &&
    taskCost <= budget[PE_RESOURCE.RAM] &&
    tasks.length * 2000 <= budget[PE_RESOURCE.TIME];

  return Object.freeze({
    ok: withinBudget,
    budget,
    estimatedCost: Math.round(taskCost * 1000) / 1000,
    taskCount: tasks.length,
    component: PE_COMPONENT.RESOURCE_PLANNER
  });
}

function buildTimeline(plan = {}, slots = []) {
  const defaultSlots = slots.length
    ? slots
    : [
        PE_TIMELINE_SLOT.NOW,
        PE_TIMELINE_SLOT.IN_5_SECONDS,
        PE_TIMELINE_SLOT.AFTER_BATTLE,
        PE_TIMELINE_SLOT.AFTER_STREAM,
        PE_TIMELINE_SLOT.NIGHTLY
      ];

  const timeline = defaultSlots.map((slot, index) =>
    Object.freeze({
      slot,
      order: index + 1,
      planId: plan.planId,
      component: PE_COMPONENT.TIMELINE_MANAGER
    })
  );

  return Object.freeze({
    ok: true,
    planId: plan.planId,
    timeline: Object.freeze(timeline),
    component: PE_COMPONENT.TIMELINE_MANAGER
  });
}

function planScenarios(goal = {}, context = {}) {
  const scenarios = [
    Object.freeze({
      scenarioId: PE_SCENARIO_ID.NORMAL,
      label: "Normal flow",
      weight: 1,
      component: PE_COMPONENT.SCENARIO_PLANNER
    }),
    Object.freeze({
      scenarioId: PE_SCENARIO_ID.GIFT_SURGE,
      label: "Gift surge",
      weight: context.giftSurge ? 0.9 : 0.2,
      component: PE_COMPONENT.SCENARIO_PLANNER
    }),
    Object.freeze({
      scenarioId: PE_SCENARIO_ID.OBS_OUTAGE,
      label: "OBS outage",
      weight: context.obsDown ? 2 : 0.1,
      component: PE_COMPONENT.SCENARIO_PLANNER
    })
  ];

  const selected = scenarios.slice().sort((a, b) => b.weight - a.weight)[0];

  return Object.freeze({
    ok: true,
    goalId: goal.goalId,
    scenarios: Object.freeze(scenarios),
    selected,
    component: PE_COMPONENT.SCENARIO_PLANNER
  });
}

function predictSituation(context = {}) {
  const predictions = [];

  if (context.battleActive) {
    predictions.push({ signal: "battle_in_progress", confidence: 0.85 });
  }
  if (context.systemLoad != null && context.systemLoad > 0.8) {
    predictions.push({ signal: "system_overload_risk", confidence: context.systemLoad });
  }
  if (context.chatVelocity != null && context.chatVelocity > 50) {
    predictions.push({ signal: "chat_activity_spike", confidence: 0.7 });
  }
  if (context.giftRate != null && context.giftRate > 10) {
    predictions.push({ signal: "gift_surge_likely", confidence: 0.75 });
  }

  return Object.freeze({
    ok: true,
    predictions: Object.freeze(predictions),
    readOnly: true,
    component: PE_COMPONENT.PREDICTION_ENGINE
  });
}

function solveConstraints(plan = {}, constraints = {}, context = {}) {
  const violations = [];
  const isCrisis =
    plan.horizon === PE_PLAN_HORIZON.CRISIS || plan.goalId === "obs_recovery" || context.obsDown === true;

  if (context.systemLoad != null && context.systemLoad > 0.95 && !isCrisis) {
    violations.push("performance_limit");
  }
  if (context.gift?.spam) {
    violations.push("economy_spam");
  }
  if (constraints.battleRules === false) {
    violations.push("battle_rules");
  }
  if (constraints.safety === false) {
    violations.push("safety");
  }
  if ((plan.tasks || []).length > 12) {
    violations.push("plan_too_long");
  }

  return Object.freeze({
    ok: violations.length === 0,
    violations: Object.freeze(violations),
    component: PE_COMPONENT.CONSTRAINT_SOLVER
  });
}

function optimizePlan(variants = []) {
  const scored = variants.map((variant) =>
    Object.freeze({
      ...variant,
      score:
        (variant.durationMs != null ? 10000 / Math.max(1, variant.durationMs) : 1) +
        (variant.quality != null ? Number(variant.quality) : 0.5) -
        (variant.resourceCost != null ? Number(variant.resourceCost) : 0),
      component: PE_COMPONENT.PLAN_OPTIMIZER
    })
  );

  const selected = scored.slice().sort((a, b) => b.score - a.score)[0] || null;

  return Object.freeze({
    ok: Boolean(selected),
    variants: Object.freeze(scored),
    selected,
    component: PE_COMPONENT.PLAN_OPTIMIZER
  });
}

function replan(plan = {}, change = {}) {
  const reason = change.reason || "situation_changed";
  const tasks = [...(plan.tasks || [])];

  if (change.battleEndedEarly) {
    const idx = tasks.findIndex((t) => t.action === "announce_result");
    if (idx >= 0) tasks.splice(idx, 0, { taskId: `replan-${Date.now()}`, action: "fast_evaluate", order: idx });
  }

  return Object.freeze({
    ok: true,
    planId: plan.planId,
    replanId: `replan-${crypto.randomUUID()}`,
    reason,
    tasks: Object.freeze(tasks),
    component: PE_COMPONENT.REPLANNING_ENGINE
  });
}

function validatePlan(plan = {}, checks = {}) {
  const errors = [];

  if (!plan.planId) errors.push("missing_plan_id");
  if (!plan.goalId) errors.push("missing_goal_id");
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) errors.push("missing_tasks");
  if (plan.executes === true) errors.push("direct_execution_forbidden");
  if (checks.constraints && checks.constraints.ok === false) {
    errors.push(...(checks.constraints.violations || []));
  }
  if (checks.resources && checks.resources.ok === false) {
    errors.push("resource_budget_exceeded");
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: PE_COMPONENT.PLAN_VALIDATOR
  });
}

function recordPlanHistory(plan = {}, outcome = {}) {
  return Object.freeze({
    historyId: `plan-history-${crypto.randomUUID()}`,
    planId: plan.planId,
    goalId: plan.goalId,
    startedAt: outcome.startedAt || plan.createdAt,
    completedAt: outcome.completedAt || Date.now(),
    progress: Object.freeze(outcome.progress || []),
    result: outcome.result || null,
    success: outcome.success !== false,
    component: PE_COMPONENT.PLAN_HISTORY
  });
}

function applyPlanLearning(history = {}, outcome = {}) {
  const success = outcome.success !== false;
  return Object.freeze({
    historyId: history.historyId,
    planId: history.planId,
    success,
    strategyAdjustment: success ? "reinforce" : "revise",
    notes: outcome.notes || null,
    component: PE_COMPONENT.LEARNING_ADAPTER
  });
}

function adaptKnowledgeContext(knowledge = {}) {
  return Object.freeze({
    readOnly: true,
    entities: Object.freeze(knowledge.entities || []),
    relationships: Object.freeze(knowledge.relationships || []),
    links: Object.freeze(knowledge.links || []),
    component: PE_COMPONENT.PLANNING_API
  });
}

function toDecisionPlanHints(plan = {}) {
  return Object.freeze(
    (plan.tasks || []).map((task) =>
      Object.freeze({
        stepId: task.taskId,
        action: task.action,
        kind: task.kind || "plan_step",
        execute: false
      })
    )
  );
}

function assertPlanningForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !PE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createPlanningEngine(options = {}) {
  const historyLog = [];

  return {
    plan(goalResolution = {}, context = {}, adapters = {}) {
      const goal = goalResolution.topGoal || goalResolution.goal || null;
      if (!goal) {
        return Object.freeze({
          ok: false,
          error: "missing_goal",
          executes: false,
          component: PE_COMPONENT.PLANNING_API
        });
      }

      const knowledge = adaptKnowledgeContext(adapters.knowledge || {});
      const generated = generatePlan(goal, context);
      const decomposed = decomposeTasks(goal, options);
      const resources = planResources(decomposed.tasks, context.resources || options.resources || {});
      const timeline = buildTimeline(generated);
      const scenarios = planScenarios(goal, context);
      const predictions = predictSituation(context);

      const variants = [
        { variantId: "a", durationMs: 4000, quality: 0.9, resourceCost: 0.6 },
        { variantId: "b", durationMs: 2000, quality: 0.85, resourceCost: 0.4 }
      ];
      const optimized = optimizePlan(variants);

      const draftPlan = Object.freeze({
        ...generated,
        goalId: goal.goalId,
        tasks: decomposed.tasks,
        timeline: timeline.timeline,
        scenario: scenarios.selected,
        predictions: predictions.predictions,
        knowledge
      });

      const constraints = solveConstraints(draftPlan, options.constraints || {}, context);
      const validation = validatePlan(draftPlan, { constraints, resources });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "plan_validation_failed",
          validation,
          executes: false,
          component: PE_COMPONENT.PLANNING_API
        });
      }

      const result = Object.freeze({
        ok: true,
        plan: draftPlan,
        resources,
        timeline,
        scenarios,
        predictions,
        optimized: optimized.selected,
        decisionHints: toDecisionPlanHints(draftPlan),
        executes: false,
        forDecisionEngine: true,
        component: PE_COMPONENT.PLANNING_API
      });

      return result;
    },
    replan(plan, change = {}) {
      return replan(plan, change);
    },
    complete(plan = {}, outcome = {}) {
      const history = recordPlanHistory(plan, outcome);
      historyLog.push(history);
      const learning = applyPlanLearning(history, outcome);
      return Object.freeze({
        ok: true,
        history,
        learning,
        component: PE_COMPONENT.PLANNING_API
      });
    },
    history() {
      return Object.freeze([...historyLog]);
    }
  };
}

function createPlanningApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    executes: false,
    decides: options.decides === true,
    data,
    component: PE_COMPONENT.PLANNING_API
  });
}

module.exports = {
  PE_COMPONENT,
  PE_COMPONENT_ORDER,
  PE_PLAN_HORIZON,
  PE_SCENARIO_ID,
  PE_TIMELINE_SLOT,
  PE_RESOURCE,
  PE_FORBIDDEN_ACTIVITIES,
  PE_RUNTIME_ANCHORS,
  generatePlan,
  decomposeTasks,
  planResources,
  buildTimeline,
  planScenarios,
  predictSituation,
  solveConstraints,
  optimizePlan,
  replan,
  validatePlan,
  recordPlanHistory,
  applyPlanLearning,
  adaptKnowledgeContext,
  toDecisionPlanHints,
  createPlanningEngine,
  createPlanningApiResponse,
  assertPlanningForbiddenActivity
};
