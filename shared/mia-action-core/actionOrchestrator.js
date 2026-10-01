"use strict";

/**
 * Master Canon 0029 — Action Orchestrator: execute Action Plans from Decision Engine.
 */

const crypto = require("crypto");

const AO_COMPONENT = Object.freeze({
  ACTION_QUEUE: "action_queue",
  ACTION_SCHEDULER: "action_scheduler",
  DEPENDENCY_MANAGER: "dependency_manager",
  EXECUTION_PLANNER: "execution_planner",
  PARALLEL_EXECUTOR: "parallel_executor",
  SYNCHRONIZATION_MANAGER: "synchronization_manager",
  TIMEOUT_MANAGER: "timeout_manager",
  RETRY_MANAGER: "retry_manager",
  ROLLBACK_MANAGER: "rollback_manager",
  COMPLETION_TRACKER: "completion_tracker",
  FEEDBACK_COLLECTOR: "feedback_collector",
  METRICS_COLLECTOR: "metrics_collector",
  ACTION_API: "action_api"
});

const AO_COMPONENT_ORDER = Object.freeze(Object.values(AO_COMPONENT));

const AO_ACTION_STATE = Object.freeze({
  WAITING: "waiting",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const AO_MODULE = Object.freeze({
  OVERLAY: "overlay",
  VIDEO_ENGINE: "video_engine",
  SPEECH: "speech",
  AI: "ai",
  OBS: "obs",
  MEMORY: "memory",
  ANALYTICS: "analytics",
  KOJNOZROUT: "kojnozout",
  NOOP: "noop"
});

const AO_DEFAULT_TIMEOUT_MS = Object.freeze({
  [AO_MODULE.OVERLAY]: 200,
  [AO_MODULE.VIDEO_ENGINE]: 2000,
  [AO_MODULE.SPEECH]: 10000,
  [AO_MODULE.AI]: 30000,
  [AO_MODULE.OBS]: 5000,
  [AO_MODULE.MEMORY]: 5000,
  [AO_MODULE.ANALYTICS]: 2000,
  [AO_MODULE.KOJNOZROUT]: 5000,
  [AO_MODULE.NOOP]: 100
});

const AO_SYNC_GROUP = Object.freeze({
  PRESENTATION: "presentation_sync"
});

const AO_FORBIDDEN_ACTIVITIES = Object.freeze([
  "create_own_decisions",
  "mutate_economy",
  "mutate_memory_content",
  "mutate_battle_rules",
  "mutate_ai_responses",
  "bypass_decision_engine",
  "mutate_action_plan"
]);

const AO_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-action-core/actionOrchestrator.js",
  "shared/mia-decision-core/decisionEngine.js",
  "scripts/MIA_DELIVERY_RUNTIME.js",
  "scripts/MIA_OVERLAY_STATE.js"
]);

const KIND_TO_MODULE = Object.freeze({
  play_video: AO_MODULE.VIDEO_ENGINE,
  overlay: AO_MODULE.OVERLAY,
  speech: AO_MODULE.SPEECH,
  memory_update: AO_MODULE.MEMORY,
  analytics: AO_MODULE.ANALYTICS,
  feed_kojnozout: AO_MODULE.KOJNOZROUT,
  noop: AO_MODULE.NOOP
});

const SYNC_KINDS = new Set(["play_video", "overlay", "speech"]);

function moduleForKind(kind) {
  return KIND_TO_MODULE[kind] || AO_MODULE.AI;
}

function timeoutForModule(module) {
  return AO_DEFAULT_TIMEOUT_MS[module] || AO_DEFAULT_TIMEOUT_MS[AO_MODULE.AI];
}

function priorityForStep(step = {}, index = 0) {
  if (step.priority != null) return Number(step.priority);
  return 100 - index;
}

function enqueueActionPlan(actionPlan = {}, options = {}) {
  const planId = actionPlan.planId || `plan-${crypto.randomUUID()}`;
  const steps = Array.isArray(actionPlan.steps) ? actionPlan.steps : [];

  const actions = steps.map((step, index) => {
    const module = moduleForKind(step.kind);
    return Object.freeze({
      actionId: step.stepId || `action-${index + 1}`,
      planId,
      kind: step.kind,
      action: step.action,
      module,
      priority: priorityForStep(step, index),
      state: AO_ACTION_STATE.WAITING,
      timeoutMs: step.timeoutMs != null ? Number(step.timeoutMs) : timeoutForModule(module),
      dependencies: Object.freeze(step.dependencies || []),
      syncGroup: SYNC_KINDS.has(step.kind) ? AO_SYNC_GROUP.PRESENTATION : null,
      attempts: 0,
      maxRetries: options.maxRetries != null ? Number(options.maxRetries) : 2,
      component: AO_COMPONENT.ACTION_QUEUE
    });
  });

  return Object.freeze({
    ok: true,
    planId,
    queueId: `queue-${crypto.randomUUID()}`,
    actions: Object.freeze(actions),
    planSnapshot: Object.freeze({ ...actionPlan, steps: Object.freeze([...steps]) }),
    component: AO_COMPONENT.ACTION_QUEUE
  });
}

function scheduleActions(queue = {}) {
  const actions = [...(queue.actions || [])];
  actions.sort((a, b) => b.priority - a.priority || a.actionId.localeCompare(b.actionId));

  return Object.freeze({
    ok: true,
    planId: queue.planId,
    scheduled: Object.freeze(actions),
    component: AO_COMPONENT.ACTION_SCHEDULER
  });
}

function resolveDependencies(scheduled = {}) {
  const actions = scheduled.scheduled || [];
  const byId = new Map(actions.map((a) => [a.actionId, a]));
  const waves = [];
  const completed = new Set();
  const remaining = new Set(actions.map((a) => a.actionId));

  while (remaining.size > 0) {
    const ready = [];
    for (const actionId of remaining) {
      const action = byId.get(actionId);
      const deps = action.dependencies || [];
      if (deps.every((dep) => completed.has(dep))) {
        ready.push(action);
      }
    }

    if (ready.length === 0) {
      return Object.freeze({
        ok: false,
        error: "dependency_cycle",
        component: AO_COMPONENT.DEPENDENCY_MANAGER
      });
    }

    ready.sort((a, b) => b.priority - a.priority);
    waves.push(Object.freeze(ready));
    for (const action of ready) {
      remaining.delete(action.actionId);
      completed.add(action.actionId);
    }
  }

  return Object.freeze({
    ok: true,
    planId: scheduled.planId,
    waves: Object.freeze(waves),
    component: AO_COMPONENT.DEPENDENCY_MANAGER
  });
}

function planExecution(waves = [], modules = {}) {
  const tasks = [];
  for (const wave of waves) {
    for (const action of wave) {
      const module = modules[action.module] ? action.module : action.module;
      tasks.push(
        Object.freeze({
          actionId: action.actionId,
          planId: action.planId,
          kind: action.kind,
          action: action.action,
          module,
          syncGroup: action.syncGroup,
          timeoutMs: action.timeoutMs,
          component: AO_COMPONENT.EXECUTION_PLANNER
        })
      );
    }
  }

  return Object.freeze({
    ok: true,
    tasks: Object.freeze(tasks),
    waveCount: waves.length,
    component: AO_COMPONENT.EXECUTION_PLANNER
  });
}

function checkTimeout(action = {}, startedAt = Date.now()) {
  const elapsed = Date.now() - startedAt;
  const limit = action.timeoutMs || timeoutForModule(action.module);
  return Object.freeze({
    ok: elapsed <= limit,
    elapsedMs: elapsed,
    limitMs: limit,
    timedOut: elapsed > limit,
    component: AO_COMPONENT.TIMEOUT_MANAGER
  });
}

function retryAction(action = {}, error = null) {
  const attempts = (action.attempts || 0) + 1;
  const maxRetries = action.maxRetries != null ? action.maxRetries : 2;
  const canRetry = attempts <= maxRetries;

  return Object.freeze({
    ok: canRetry,
    actionId: action.actionId,
    attempts,
    maxRetries,
    retry: canRetry,
    error: error ? String(error.message || error) : null,
    component: AO_COMPONENT.RETRY_MANAGER
  });
}

function rollbackActions(completed = [], failedAction = null) {
  const reversible = completed.filter((r) => r.rollbackable === true);
  const rolledBack = reversible
    .slice()
    .reverse()
    .map((r) =>
      Object.freeze({
        actionId: r.actionId,
        kind: r.kind,
        module: r.module,
        rollback: true,
        reason: failedAction ? `failed:${failedAction.actionId}` : "plan_failure"
      })
    );

  return Object.freeze({
    ok: true,
    rolledBack: Object.freeze(rolledBack),
    count: rolledBack.length,
    component: AO_COMPONENT.ROLLBACK_MANAGER
  });
}

function trackCompletion(planId, actionResults = []) {
  const states = actionResults.map((r) => r.state);
  const allCompleted = states.length > 0 && states.every((s) => s === AO_ACTION_STATE.COMPLETED);
  const anyFailed = states.some((s) => s === AO_ACTION_STATE.FAILED);
  const anyCancelled = states.some((s) => s === AO_ACTION_STATE.CANCELLED);

  let planState = AO_ACTION_STATE.RUNNING;
  if (allCompleted) planState = AO_ACTION_STATE.COMPLETED;
  else if (anyFailed) planState = AO_ACTION_STATE.FAILED;
  else if (anyCancelled) planState = AO_ACTION_STATE.CANCELLED;

  return Object.freeze({
    planId,
    planState,
    actions: Object.freeze(actionResults),
    component: AO_COMPONENT.COMPLETION_TRACKER
  });
}

function collectFeedback(actionResults = [], runMeta = {}) {
  const successes = actionResults.filter((r) => r.state === AO_ACTION_STATE.COMPLETED).length;
  const failures = actionResults.filter((r) => r.state === AO_ACTION_STATE.FAILED).length;

  return Object.freeze({
    planId: runMeta.planId,
    success: failures === 0 && successes > 0,
    successes,
    failures,
    results: Object.freeze(
      actionResults.map((r) =>
        Object.freeze({
          actionId: r.actionId,
          kind: r.kind,
          module: r.module,
          state: r.state,
          durationMs: r.durationMs || 0,
          attempts: r.attempts || 1,
          error: r.error || null
        })
      )
    ),
    forDecisionEngine: true,
    component: AO_COMPONENT.FEEDBACK_COLLECTOR
  });
}

function collectMetrics(run = {}) {
  const results = run.actionResults || [];
  const parallelWaves = run.parallelWaves || 0;
  const timeouts = results.filter((r) => r.timedOut).length;
  const rollbacks = run.rollbackCount || 0;
  const retries = results.reduce((sum, r) => sum + Math.max(0, (r.attempts || 1) - 1), 0);

  return Object.freeze({
    planId: run.planId,
    actionCount: results.length,
    durationMs: run.durationMs || 0,
    parallelWaves,
    successRate: results.length ? successesRatio(results) : 0,
    failures: results.filter((r) => r.state === AO_ACTION_STATE.FAILED).length,
    timeouts,
    rollbacks,
    retries,
    component: AO_COMPONENT.METRICS_COLLECTOR
  });
}

function successesRatio(results) {
  const ok = results.filter((r) => r.state === AO_ACTION_STATE.COMPLETED).length;
  return Math.round((ok / results.length) * 1000) / 1000;
}

async function executeActionTask(task, handler, options = {}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastError = null;

  while (attempts <= (task.maxRetries != null ? task.maxRetries : 2)) {
    attempts += 1;
    const timeoutMs = task.timeoutMs || timeoutForModule(task.module);

    try {
      const result = await Promise.race([
        Promise.resolve(handler(task)),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("timeout")), timeoutMs);
        })
      ]);

      const durationMs = Date.now() - startedAt;
      const timeoutCheck = checkTimeout(task, startedAt);

      return Object.freeze({
        actionId: task.actionId,
        kind: task.kind,
        action: task.action,
        module: task.module,
        state: AO_ACTION_STATE.COMPLETED,
        durationMs,
        attempts,
        timedOut: timeoutCheck.timedOut,
        rollbackable: task.kind === "overlay",
        result: result || null,
        component: AO_COMPONENT.PARALLEL_EXECUTOR
      });
    } catch (err) {
      lastError = err;
      const retry = retryAction({ ...task, attempts }, err);
      if (!retry.retry) break;
      if (options.retryDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs));
      }
    }
  }

  return Object.freeze({
    actionId: task.actionId,
    kind: task.kind,
    action: task.action,
    module: task.module,
    state: AO_ACTION_STATE.FAILED,
    durationMs: Date.now() - startedAt,
    attempts,
    timedOut: String(lastError?.message || "").includes("timeout"),
    error: String(lastError?.message || lastError || "execution_failed"),
    rollbackable: task.kind === "overlay",
    component: AO_COMPONENT.PARALLEL_EXECUTOR
  });
}

async function executeParallel(tasks = [], handlers = {}, options = {}) {
  const execs = tasks.map((task) => {
    const handler = handlers[task.module] || handlers[task.kind] || handlers.default;
    if (typeof handler !== "function") {
      return Promise.resolve(
        Object.freeze({
          actionId: task.actionId,
          kind: task.kind,
          module: task.module,
          state: AO_ACTION_STATE.FAILED,
          error: "missing_handler",
          component: AO_COMPONENT.PARALLEL_EXECUTOR
        })
      );
    }
    return executeActionTask(task, handler, options);
  });

  const results = await Promise.all(execs);
  return Object.freeze({
    ok: results.every((r) => r.state === AO_ACTION_STATE.COMPLETED),
    results: Object.freeze(results),
    component: AO_COMPONENT.PARALLEL_EXECUTOR
  });
}

function synchronizeBarrier(groupId, waveResults = []) {
  const inGroup = waveResults.filter((r) => r.syncGroup === groupId);
  if (!inGroup.length) {
    return Object.freeze({
      ok: true,
      groupId,
      synchronized: true,
      waitedFor: 0,
      component: AO_COMPONENT.SYNCHRONIZATION_MANAGER
    });
  }

  const allDone = inGroup.every(
    (r) => r.state === AO_ACTION_STATE.COMPLETED || r.state === AO_ACTION_STATE.FAILED
  );

  return Object.freeze({
    ok: allDone,
    groupId,
    synchronized: allDone,
    waitedFor: inGroup.length,
    component: AO_COMPONENT.SYNCHRONIZATION_MANAGER
  });
}

function assertOrchestratorForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !AO_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function validateActionPlan(actionPlan = {}) {
  const errors = [];
  if (!actionPlan || !actionPlan.planId) errors.push("missing_plan_id");
  if (!Array.isArray(actionPlan.steps) || actionPlan.steps.length === 0) errors.push("missing_steps");
  if (actionPlan.orchestratorOnly !== true) errors.push("orchestrator_only_required");

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: AO_COMPONENT.ACTION_API
  });
}

function createActionOrchestrator(options = {}) {
  const history = [];

  return {
    async orchestrate(actionPlan = {}, handlers = {}) {
      const startedAt = Date.now();
      const validation = validateActionPlan(actionPlan);
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_action_plan",
          validation,
          decides: false,
          component: AO_COMPONENT.ACTION_API
        });
      }

      const queued = enqueueActionPlan(actionPlan, options);
      const scheduled = scheduleActions(queued);
      const deps = resolveDependencies(scheduled);
      if (!deps.ok) {
        return Object.freeze({
          ok: false,
          error: deps.error,
          component: AO_COMPONENT.ACTION_API
        });
      }

      const execution = planExecution(deps.waves, handlers);
      const actionResults = [];
      let rollbackCount = 0;

      for (const wave of deps.waves) {
        const waveTasks = execution.tasks.filter((t) => wave.some((w) => w.actionId === t.actionId));
        const waveExec = await executeParallel(waveTasks, handlers, options);

        for (const result of waveExec.results) {
          actionResults.push(result);
        }

        const sync = synchronizeBarrier(AO_SYNC_GROUP.PRESENTATION, waveExec.results);
        if (!sync.ok) {
          return Object.freeze({
            ok: false,
            error: "sync_failed",
            sync,
            component: AO_COMPONENT.ACTION_API
          });
        }

        const failed = waveExec.results.find((r) => r.state === AO_ACTION_STATE.FAILED);
        if (failed) {
          const rollback = rollbackActions(
            actionResults.filter((r) => r.state === AO_ACTION_STATE.COMPLETED),
            failed
          );
          rollbackCount = rollback.count;
          break;
        }
      }

      const completion = trackCompletion(actionPlan.planId, actionResults);
      const feedback = collectFeedback(actionResults, { planId: actionPlan.planId });
      const metrics = collectMetrics({
        planId: actionPlan.planId,
        actionResults,
        parallelWaves: deps.waves.length,
        durationMs: Date.now() - startedAt,
        rollbackCount
      });

      const run = Object.freeze({
        ok: completion.planState === AO_ACTION_STATE.COMPLETED,
        planId: actionPlan.planId,
        completion,
        feedback,
        metrics,
        rollbackCount,
        durationMs: Date.now() - startedAt,
        decides: false,
        component: AO_COMPONENT.ACTION_API
      });

      history.push(run);
      return run;
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createActionApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes !== false,
    data,
    component: AO_COMPONENT.ACTION_API
  });
}

module.exports = {
  AO_COMPONENT,
  AO_COMPONENT_ORDER,
  AO_ACTION_STATE,
  AO_MODULE,
  AO_DEFAULT_TIMEOUT_MS,
  AO_SYNC_GROUP,
  AO_FORBIDDEN_ACTIVITIES,
  AO_RUNTIME_ANCHORS,
  enqueueActionPlan,
  scheduleActions,
  resolveDependencies,
  planExecution,
  executeParallel,
  synchronizeBarrier,
  checkTimeout,
  retryAction,
  rollbackActions,
  trackCompletion,
  collectFeedback,
  collectMetrics,
  validateActionPlan,
  createActionOrchestrator,
  createActionApiResponse,
  assertOrchestratorForbiddenActivity
};
