"use strict";

/**
 * Master Canon 0028 — Decision Engine: context, planning, action plans.
 */

const crypto = require("crypto");

const DE_COMPONENT = Object.freeze({
  INPUT_COLLECTOR: "input_collector",
  CONTEXT_BUILDER: "context_builder",
  SITUATION_ANALYZER: "situation_analyzer",
  GOAL_MANAGER: "goal_manager",
  RULE_EVALUATOR: "rule_evaluator",
  EMOTION_ADAPTER: "emotion_adapter",
  MEMORY_ADAPTER: "memory_adapter",
  KNOWLEDGE_ADAPTER: "knowledge_adapter",
  STRATEGY_SELECTOR: "strategy_selector",
  DECISION_PLANNER: "decision_planner",
  RISK_ANALYZER: "risk_analyzer",
  DECISION_VALIDATOR: "decision_validator",
  ACTION_GENERATOR: "action_generator",
  LEARNING_FEEDBACK: "learning_feedback",
  DECISION_API: "decision_api"
});

const DE_COMPONENT_ORDER = Object.freeze(Object.values(DE_COMPONENT));

const DE_GOAL = Object.freeze({
  RESPOND_CHAT: "respond_chat",
  THANK_GIFT: "thank_gift",
  COMPLETE_BATTLE: "complete_battle",
  PROTECT_PERFORMANCE: "protect_performance",
  CONTINUE_STREAM: "continue_stream"
});

const DE_RULE_DOMAIN = Object.freeze({
  BATTLE: "battle",
  ECONOMY: "economy",
  SAFETY: "safety",
  MODERATION: "moderation",
  PERSONALITY: "personality"
});

const DE_STRATEGY = Object.freeze({
  ATTACK: "attack",
  DEFEND: "defend",
  CONSERVE: "conserve",
  ACKNOWLEDGE: "acknowledge",
  DEFER: "defer"
});

const DE_ACTION_KIND = Object.freeze({
  PLAY_VIDEO: "play_video",
  OVERLAY: "overlay",
  SPEECH: "speech",
  MEMORY_UPDATE: "memory_update",
  ANALYTICS: "analytics",
  FEED_KOJNOZROUT: "feed_kojnozout",
  NOOP: "noop"
});

const DE_OPERATION = Object.freeze({
  COLLECT: "collect",
  BUILD_CONTEXT: "build_context",
  ANALYZE: "analyze",
  DECIDE: "decide",
  VALIDATE: "validate",
  PLAN: "plan",
  LEARN: "learn"
});

const DE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "execute_actions_directly",
  "mutate_database",
  "play_video_directly",
  "render_graphics_directly",
  "bypass_action_orchestrator",
  "bypass_safety_rules"
]);

const DE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-decision-core/decisionEngine.js",
  "shared/platform_runtime_rules/decision_engine.js",
  "shared/mia-memory-core/index.js"
]);

function collectDecisionInputs(sources = {}) {
  const inputs = Object.freeze({
    event: sources.event || null,
    monitoring: sources.monitoring || null,
    obs: sources.obs || null,
    battle: sources.battle || null,
    chat: sources.chat || null,
    scheduler: sources.scheduler || null,
    collectedAt: Date.now(),
    component: DE_COMPONENT.INPUT_COLLECTOR
  });
  return Object.freeze({
    ok: true,
    inputs,
    operation: DE_OPERATION.COLLECT
  });
}

function buildDecisionContext(collected = {}, adapters = {}) {
  const event = collected.event || {};
  const emotion = adapters.emotion || {};
  const memory = adapters.memory || {};
  const knowledge = adapters.knowledge || {};

  const context = Object.freeze({
    contextId: `ctx-${crypto.randomUUID()}`,
    eventType: String(event.type || event.eventType || "unknown"),
    gift: event.gift || null,
    battleActive: Boolean(event.battleActive || adapters.battle?.active),
    mood: emotion.mood || adapters.mood || "neutral",
    chatMessage: event.message || event.text || null,
    userId: event.userId || event.donorId || null,
    memoryLayers: Object.freeze({
      working: Boolean(memory.working),
      shortTerm: Boolean(memory.shortTerm),
      longTerm: Boolean(memory.longTerm),
      episodic: Boolean(memory.episodic),
      semantic: Boolean(memory.semantic),
      procedural: Boolean(memory.procedural)
    }),
    knowledgeLinks: Object.freeze(knowledge.links || []),
    trustScore: emotion.trustScore != null ? Number(emotion.trustScore) : null,
    builtAt: Date.now()
  });

  return Object.freeze({
    ok: true,
    context,
    operation: DE_OPERATION.BUILD_CONTEXT,
    component: DE_COMPONENT.CONTEXT_BUILDER
  });
}

function analyzeSituation(context = {}) {
  let score = 0.3;
  if (context.gift) score += 0.25;
  if (context.battleActive) score += 0.2;
  if (context.chatMessage) score += 0.15;
  if (context.trustScore != null && context.trustScore > 70) score += 0.1;

  return Object.freeze({
    situationScore: Math.round(Math.min(1, score) * 1000) / 1000,
    importance: score >= 0.7 ? "high" : score >= 0.45 ? "medium" : "low",
    systemsEngaged: Object.freeze(
      [
        context.gift ? "economy" : null,
        context.battleActive ? "battle" : null,
        context.chatMessage ? "chat" : null,
        context.memoryLayers?.working ? "memory" : null
      ].filter(Boolean)
    ),
    component: DE_COMPONENT.SITUATION_ANALYZER
  });
}

function manageGoals(context = {}, candidates = []) {
  const defaults = [
    { goal: DE_GOAL.CONTINUE_STREAM, priority: 10 },
    { goal: DE_GOAL.PROTECT_PERFORMANCE, priority: 90 }
  ];

  const goals = (candidates.length > 0 ? candidates : defaults).slice();
  if (context.gift) goals.push({ goal: DE_GOAL.THANK_GIFT, priority: 80 });
  if (context.chatMessage) goals.push({ goal: DE_GOAL.RESPOND_CHAT, priority: 70 });
  if (context.battleActive) goals.push({ goal: DE_GOAL.COMPLETE_BATTLE, priority: 85 });

  const ordered = goals
    .sort((a, b) => b.priority - a.priority)
    .map((g, idx) => Object.freeze({ ...g, rank: idx + 1 }));

  return Object.freeze({
    goals: Object.freeze(ordered),
    topGoal: ordered[0] || null,
    component: DE_COMPONENT.GOAL_MANAGER
  });
}

function evaluateRules(context = {}, rules = []) {
  const violations = [];
  const applied = [];

  const catalog = rules.length
    ? rules
    : [
        { domain: DE_RULE_DOMAIN.SAFETY, rule: "reject_unsafe_actions", priority: 100 },
        { domain: DE_RULE_DOMAIN.ECONOMY, rule: "respect_mia_points_only", priority: 90 },
        { domain: DE_RULE_DOMAIN.MODERATION, rule: "block_spam_gifts", priority: 85 },
        { domain: DE_RULE_DOMAIN.PERSONALITY, rule: "stay_in_character", priority: 70 }
      ];

  for (const rule of catalog) {
    applied.push(rule);
    if (rule.domain === DE_RULE_DOMAIN.MODERATION && context.gift?.spam) {
      violations.push("spam_gift_blocked");
    }
    if (rule.domain === DE_RULE_DOMAIN.SAFETY && context.forceUnsafe) {
      violations.push("unsafe_action_blocked");
    }
  }

  return Object.freeze({
    ok: violations.length === 0,
    violations: Object.freeze(violations),
    appliedRules: Object.freeze(applied),
    component: DE_COMPONENT.RULE_EVALUATOR
  });
}

function adaptEmotionContext(snapshot = {}) {
  return Object.freeze({
    readOnly: true,
    mood: snapshot.mood || "neutral",
    trustScore: snapshot.trustScore != null ? Number(snapshot.trustScore) : null,
    relationships: Object.freeze(snapshot.relationships || []),
    component: DE_COMPONENT.EMOTION_ADAPTER
  });
}

function adaptMemoryContext(layers = {}) {
  return Object.freeze({
    readOnly: true,
    layers: Object.freeze({
      working: layers.working || null,
      shortTerm: layers.shortTerm || null,
      longTerm: layers.longTerm || null,
      episodic: layers.episodic || null,
      semantic: layers.semantic || null,
      procedural: layers.procedural || null
    }),
    component: DE_COMPONENT.MEMORY_ADAPTER
  });
}

function adaptKnowledgeContext(graph = {}) {
  return Object.freeze({
    readOnly: true,
    entities: Object.freeze(graph.entities || []),
    relationships: Object.freeze(graph.relationships || []),
    links: Object.freeze(graph.links || []),
    component: DE_COMPONENT.KNOWLEDGE_ADAPTER
  });
}

function selectStrategy(context = {}, situation = {}) {
  if (context.gift?.spam) {
    return Object.freeze({ strategy: DE_STRATEGY.DEFER, reason: "spam_detected" });
  }
  if (context.battleActive && situation.importance === "high") {
    return Object.freeze({ strategy: DE_STRATEGY.ATTACK, reason: "active_battle" });
  }
  if (context.gift) {
    return Object.freeze({ strategy: DE_STRATEGY.ACKNOWLEDGE, reason: "gift_received" });
  }
  if (context.chatMessage) {
    return Object.freeze({ strategy: DE_STRATEGY.ACKNOWLEDGE, reason: "chat_message" });
  }
  return Object.freeze({ strategy: DE_STRATEGY.DEFER, reason: "no_immediate_action" });
}

function planDecision(strategy = {}, context = {}, goals = {}) {
  const steps = [];
  const topGoal = goals.topGoal?.goal;

  if (topGoal === DE_GOAL.THANK_GIFT || context.gift) {
    steps.push(
      { kind: DE_ACTION_KIND.SPEECH, action: "thank_donor" },
      { kind: DE_ACTION_KIND.PLAY_VIDEO, action: "play_tier_video" },
      { kind: DE_ACTION_KIND.OVERLAY, action: "show_gift_overlay" },
      { kind: DE_ACTION_KIND.FEED_KOJNOZROUT, action: "kojnozout_reaction" },
      { kind: DE_ACTION_KIND.MEMORY_UPDATE, action: "store_gift_episode" },
      { kind: DE_ACTION_KIND.ANALYTICS, action: "track_gift" }
    );
  } else if (topGoal === DE_GOAL.RESPOND_CHAT || context.chatMessage) {
    steps.push(
      { kind: DE_ACTION_KIND.SPEECH, action: "chat_reply" },
      { kind: DE_ACTION_KIND.MEMORY_UPDATE, action: "store_chat_turn" }
    );
  } else if (topGoal === DE_GOAL.COMPLETE_BATTLE || context.battleActive) {
    steps.push(
      { kind: DE_ACTION_KIND.OVERLAY, action: "battle_overlay" },
      { kind: DE_ACTION_KIND.ANALYTICS, action: "track_battle" }
    );
  } else {
    steps.push({ kind: DE_ACTION_KIND.NOOP, action: "observe" });
  }

  return Object.freeze({
    strategy: strategy.strategy,
    steps: Object.freeze(
      steps.map((s, idx) =>
        Object.freeze({
          stepId: `step-${idx + 1}`,
          kind: s.kind,
          action: s.action,
          execute: false
        })
      )
    ),
    component: DE_COMPONENT.DECISION_PLANNER
  });
}

function analyzeRisk(plan = {}, context = {}) {
  const risks = [];
  if ((plan.steps || []).length > 8) risks.push("plan_too_long");
  if (context.systemLoad != null && context.systemLoad > 0.9) risks.push("system_overload");
  if (context.gift?.spam) risks.push("gift_spam");
  if (context.conflictingActions) risks.push("action_conflict");

  const level = risks.length >= 2 ? "high" : risks.length === 1 ? "medium" : "low";
  const approved = level !== "high";

  return Object.freeze({
    approved,
    riskLevel: level,
    risks: Object.freeze(risks),
    component: DE_COMPONENT.RISK_ANALYZER
  });
}

function validateDecision(plan = {}, checks = {}) {
  const errors = [];
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) {
    errors.push("missing_steps");
  }
  if (plan.steps?.some((s) => s.execute === true)) {
    errors.push("direct_execution_forbidden");
  }
  if (checks.ruleViolations?.length) {
    errors.push(...checks.ruleViolations);
  }
  if (checks.riskApproved === false) {
    errors.push("risk_not_approved");
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: DE_COMPONENT.DECISION_VALIDATOR
  });
}

function generateActionPlan(decision = {}) {
  return Object.freeze({
    planId: decision.planId || `plan-${crypto.randomUUID()}`,
    rationale: decision.rationale || "decision_engine",
    goals: Object.freeze(decision.goals || []),
    strategy: decision.strategy || null,
    steps: Object.freeze(decision.steps || []),
    riskLevel: decision.riskLevel || "low",
    validated: decision.validated === true,
    orchestratorOnly: true,
    auditId: `decision-audit-${crypto.randomUUID()}`,
    component: DE_COMPONENT.ACTION_GENERATOR
  });
}

function applyLearningFeedback(plan = {}, outcome = {}) {
  const success = outcome.success !== false;
  return Object.freeze({
    planId: plan.planId,
    success,
    strategyAdjustment: success ? "reinforce" : "revise",
    notes: outcome.notes || null,
    component: DE_COMPONENT.LEARNING_FEEDBACK,
    operation: DE_OPERATION.LEARN
  });
}

function createDecisionEngine() {
  const strategyHistory = [];

  return {
    decide(input = {}) {
      const collected = collectDecisionInputs(input.sources || {});
      const emotion = adaptEmotionContext(input.adapters?.emotion || {});
      const memory = adaptMemoryContext(input.adapters?.memory || {});
      const knowledge = adaptKnowledgeContext(input.adapters?.knowledge || {});

      const built = buildDecisionContext(collected.inputs, {
        ...input.adapters,
        emotion,
        memory,
        knowledge
      });
      const context = built.context;

      const situation = analyzeSituation(context);
      const goals = manageGoals(context, input.goals || []);
      const rules = evaluateRules(context, input.rules || []);
      if (!rules.ok) {
        return Object.freeze({
          ok: false,
          error: "rules_blocked",
          violations: rules.violations,
          component: DE_COMPONENT.DECISION_API
        });
      }

      const strategy = selectStrategy(context, situation);
      const planDraft = planDecision(strategy, context, goals);
      const risk = analyzeRisk(planDraft, context);
      const validation = validateDecision(planDraft, {
        ruleViolations: rules.violations,
        riskApproved: risk.approved
      });

      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "validation_failed",
          validation,
          component: DE_COMPONENT.DECISION_API
        });
      }

      const actionPlan = generateActionPlan({
        planId: input.planId,
        rationale: `goal:${goals.topGoal?.goal || "none"};strategy:${strategy.strategy}`,
        goals: goals.goals,
        strategy: strategy.strategy,
        steps: planDraft.steps,
        riskLevel: risk.riskLevel,
        validated: true
      });

      strategyHistory.push(
        Object.freeze({
          planId: actionPlan.planId,
          strategy: strategy.strategy,
          at: Date.now()
        })
      );

      return Object.freeze({
        ok: true,
        context,
        situation,
        goals,
        strategy,
        actionPlan,
        executes: false,
        operation: DE_OPERATION.DECIDE,
        component: DE_COMPONENT.DECISION_API
      });
    },
    learn(plan, outcome = {}) {
      return applyLearningFeedback(plan, outcome);
    },
    strategyHistory() {
      return Object.freeze([...strategyHistory]);
    }
  };
}

function createDecisionApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: options.decides !== false,
    executes: false,
    data,
    component: DE_COMPONENT.DECISION_API
  });
}

function assertDecisionForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !DE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  DE_COMPONENT,
  DE_COMPONENT_ORDER,
  DE_GOAL,
  DE_RULE_DOMAIN,
  DE_STRATEGY,
  DE_ACTION_KIND,
  DE_OPERATION,
  DE_FORBIDDEN_ACTIVITIES,
  DE_RUNTIME_ANCHORS,
  collectDecisionInputs,
  buildDecisionContext,
  analyzeSituation,
  manageGoals,
  evaluateRules,
  adaptEmotionContext,
  adaptMemoryContext,
  adaptKnowledgeContext,
  selectStrategy,
  planDecision,
  analyzeRisk,
  validateDecision,
  generateActionPlan,
  applyLearningFeedback,
  createDecisionEngine,
  createDecisionApiResponse,
  assertDecisionForbiddenActivity
};
