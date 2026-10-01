"use strict";

/**
 * Master Canon 0058 — Task Scheduler: sole planner for when/where/order of tasks.
 * Does not execute tasks directly — schedules them onto Process Manager / worker pool.
 */

const TS_COMPONENT = Object.freeze({
  TASK_SCHEDULER: "task_scheduler",
  TASK_REGISTRY: "task_registry",
  PRIORITY_QUEUE: "priority_queue",
  DELAYED_QUEUE: "delayed_queue",
  RETRY_QUEUE: "retry_queue",
  WORKER_POOL_BRIDGE: "worker_pool_bridge",
  DEPENDENCY_RESOLVER: "dependency_resolver",
  TIMEOUT_WATCHER: "timeout_watcher",
  OVERLOAD_GUARD: "overload_guard",
  POLICY_ENGINE: "policy_engine",
  AUDIT_LOG: "audit_log",
  METRICS: "metrics"
});

const TS_COMPONENT_ORDER = Object.freeze(Object.values(TS_COMPONENT));

const TS_LAYER = Object.freeze({
  PROCESS: "process",
  TASK: "task"
});

const TS_STATE = Object.freeze({
  CREATED: "created",
  QUEUED: "queued",
  SCHEDULED: "scheduled",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const TS_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  BACKGROUND: "background"
});

const TS_PRIORITY_ORDER = Object.freeze([
  TS_PRIORITY.CRITICAL,
  TS_PRIORITY.HIGH,
  TS_PRIORITY.NORMAL,
  TS_PRIORITY.LOW,
  TS_PRIORITY.BACKGROUND
]);

const TS_QUEUE = Object.freeze({
  IMMEDIATE: "immediate",
  PRIORITY: "priority",
  DELAYED: "delayed",
  SCHEDULED: "scheduled",
  RETRY: "retry"
});

const TS_QUEUE_ORDER = Object.freeze([
  TS_QUEUE.IMMEDIATE,
  TS_QUEUE.PRIORITY,
  TS_QUEUE.DELAYED,
  TS_QUEUE.SCHEDULED,
  TS_QUEUE.RETRY
]);

const TS_TASK_TYPE = Object.freeze({
  SYSTEM: "system",
  SERVICE: "service",
  AI: "ai",
  GAMEPLAY: "gameplay",
  PLATFORM: "platform",
  MAINTENANCE: "maintenance"
});

const TS_POLICY = Object.freeze({
  PRIORITY_FIRST: "priority_first",
  FIFO: "fifo",
  ROUND_ROBIN: "round_robin",
  DEADLINE_FIRST: "deadline_first",
  WEIGHTED_FAIR: "weighted_fair_queue"
});

const TS_RETRY_POLICY = Object.freeze({
  NONE: "none",
  FIXED: "fixed",
  EXPONENTIAL: "exponential",
  CUSTOM: "custom"
});

const TS_PUBLIC_API = Object.freeze([
  "submit",
  "schedule",
  "cancel",
  "complete",
  "fail",
  "tick",
  "setPolicy",
  "setWorkerPoolSize",
  "handleOverload",
  "metrics"
]);

const TS_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-process-core/processManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "docs/master-canon/0058-task-scheduler.md"
]);

const TS_DEFAULT_MAX_QUEUE = 1000;
const TS_DEFAULT_WORKERS = 4;

function priorityRank(priority) {
  const idx = TS_PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? TS_PRIORITY_ORDER.length : idx;
}

function evaluateRetry(policy, attempt, maxRetries, baseDelayMs = 1000) {
  if (policy === TS_RETRY_POLICY.NONE || maxRetries <= 0) {
    return { retry: false };
  }
  if (attempt >= maxRetries) {
    return { retry: false, error: "retries_exhausted" };
  }
  if (policy === TS_RETRY_POLICY.FIXED) {
    return { retry: true, delayMs: baseDelayMs };
  }
  if (policy === TS_RETRY_POLICY.EXPONENTIAL) {
    return { retry: true, delayMs: baseDelayMs * Math.pow(2, attempt) };
  }
  if (policy === TS_RETRY_POLICY.CUSTOM) {
    return { retry: true, delayMs: baseDelayMs };
  }
  return { retry: false, error: "unknown_retry_policy" };
}

function createTaskDescriptor(input = {}) {
  const taskId = String(input.taskId || input.id || "").trim();
  if (!taskId) return { ok: false, error: "missing_task_id" };
  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const now = Date.now();
  return {
    ok: true,
    descriptor: Object.freeze({
      taskId,
      type: input.type || TS_TASK_TYPE.SERVICE,
      owner,
      priority: input.priority || TS_PRIORITY.NORMAL,
      createdTime: now,
      scheduledTime: input.scheduledTime || null,
      delayMs: Number(input.delayMs) || 0,
      timeout: Number.isFinite(input.timeout) ? input.timeout : 30_000,
      retries: Number.isFinite(input.retries) ? input.retries : 0,
      maxRetries: Number.isFinite(input.maxRetries) ? input.maxRetries : 3,
      retryPolicy: input.retryPolicy || TS_RETRY_POLICY.FIXED,
      dependencies: Object.freeze([...(input.dependencies || [])]),
      status: TS_STATE.CREATED,
      queue: null,
      optional: input.optional === true,
      mergeKey: input.mergeKey || null,
      permission: input.permission || "task.execute",
      deadline: input.deadline || null,
      startedAt: null,
      waitMs: 0,
      assignedWorker: null
    })
  };
}

function createTaskScheduler(options = {}) {
  const singleton = options.singleton !== false;
  const tasks = new Map();
  const queues = {
    [TS_QUEUE.IMMEDIATE]: [],
    [TS_QUEUE.PRIORITY]: [],
    [TS_QUEUE.DELAYED]: [],
    [TS_QUEUE.SCHEDULED]: [],
    [TS_QUEUE.RETRY]: []
  };
  const audit = [];
  const completedIds = new Set();
  let policy = options.policy || TS_POLICY.PRIORITY_FIRST;
  let workerPoolSize = options.workerPoolSize || TS_DEFAULT_WORKERS;
  let busyWorkers = 0;
  let roundRobinIndex = 0;
  let maxQueue = options.maxQueue || TS_DEFAULT_MAX_QUEUE;
  let emergencyMode = false;
  let deferredLow = 0;
  let mergedCount = 0;
  let rejectedOptional = 0;
  let retryCount = 0;
  let failedCount = 0;
  let totalWaitMs = 0;
  let waitSamples = 0;
  const allowedPermissions = new Set(options.allowedPermissions || ["task.execute", "task.admin", "kernel.task"]);

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function get(taskId) {
    return tasks.get(taskId) || null;
  }

  function set(taskId, patch) {
    const prev = get(taskId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    tasks.set(taskId, next);
    return next;
  }

  function queueLength() {
    return TS_QUEUE_ORDER.reduce((sum, q) => sum + queues[q].length, 0);
  }

  function enqueue(taskId, queueName) {
    if (queueLength() >= maxQueue && get(taskId)?.priority !== TS_PRIORITY.CRITICAL) {
      return { ok: false, error: "queue_overflow" };
    }
    queues[queueName].push(taskId);
    set(taskId, { status: TS_STATE.QUEUED, queue: queueName });
    appendAudit({
      action: "queued",
      taskId,
      owner: get(taskId).owner,
      queue: queueName,
      result: "queued"
    });
    return { ok: true, queue: queueName };
  }

  function submit(input = {}, meta = {}) {
    const built = createTaskDescriptor(input);
    if (!built.ok) return built;
    if (tasks.has(built.descriptor.taskId)) {
      return { ok: false, error: "duplicate_task_id" };
    }
    if (!allowedPermissions.has(built.descriptor.permission) && meta.permissionOk !== true) {
      return { ok: false, error: "permission_denied" };
    }

    if (emergencyMode && built.descriptor.optional) {
      rejectedOptional += 1;
      return { ok: false, error: "optional_rejected_overload" };
    }

    if (built.descriptor.mergeKey) {
      for (const existing of tasks.values()) {
        if (
          existing.mergeKey === built.descriptor.mergeKey &&
          (existing.status === TS_STATE.QUEUED || existing.status === TS_STATE.SCHEDULED)
        ) {
          mergedCount += 1;
          appendAudit({
            action: "merged",
            taskId: built.descriptor.taskId,
            owner: built.descriptor.owner,
            result: `merged_into:${existing.taskId}`
          });
          return { ok: true, mergedInto: existing.taskId, merged: true };
        }
      }
    }

    tasks.set(built.descriptor.taskId, built.descriptor);
    appendAudit({
      action: "created",
      taskId: built.descriptor.taskId,
      owner: built.descriptor.owner,
      result: "created"
    });

    let queueName = TS_QUEUE.PRIORITY;
    if (input.immediate === true || built.descriptor.priority === TS_PRIORITY.CRITICAL) {
      queueName = TS_QUEUE.IMMEDIATE;
    } else if (built.descriptor.delayMs > 0) {
      queueName = TS_QUEUE.DELAYED;
      set(built.descriptor.taskId, {
        scheduledTime: Date.now() + built.descriptor.delayMs
      });
    } else if (built.descriptor.scheduledTime) {
      queueName = TS_QUEUE.SCHEDULED;
    }

    const queued = enqueue(built.descriptor.taskId, queueName);
    if (!queued.ok) return queued;
    return { ok: true, task: get(built.descriptor.taskId), executesDirectly: false };
  }

  function schedule(taskId, when = Date.now()) {
    const task = get(taskId);
    if (!task) return { ok: false, error: "unknown_task" };
    set(taskId, { scheduledTime: when, status: TS_STATE.SCHEDULED });
    if (!queues[TS_QUEUE.SCHEDULED].includes(taskId)) {
      queues[TS_QUEUE.SCHEDULED].push(taskId);
    }
    appendAudit({
      action: "scheduled",
      taskId,
      owner: task.owner,
      result: "scheduled"
    });
    return { ok: true, task: get(taskId) };
  }

  function depsSatisfied(task) {
    return task.dependencies.every((dep) => completedIds.has(dep));
  }

  function sortCandidates(ids) {
    const list = ids.map((id) => get(id)).filter(Boolean);
    if (policy === TS_POLICY.FIFO) {
      return list.sort((a, b) => a.createdTime - b.createdTime);
    }
    if (policy === TS_POLICY.DEADLINE_FIRST) {
      return list.sort((a, b) => {
        const da = a.deadline || Number.MAX_SAFE_INTEGER;
        const db = b.deadline || Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    }
    if (policy === TS_POLICY.ROUND_ROBIN) {
      if (!list.length) return list;
      const rotated = list.slice(roundRobinIndex % list.length).concat(list.slice(0, roundRobinIndex % list.length));
      roundRobinIndex += 1;
      return rotated;
    }
    if (policy === TS_POLICY.WEIGHTED_FAIR) {
      return list.sort((a, b) => {
        const wa = 5 - priorityRank(a.priority);
        const wb = 5 - priorityRank(b.priority);
        return wb - wa || a.createdTime - b.createdTime;
      });
    }
    // PRIORITY_FIRST default — kernel/critical first
    return list.sort((a, b) => {
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return a.createdTime - b.createdTime;
    });
  }

  function selectRunnable(now = Date.now()) {
    // promote delayed/scheduled that are due
    for (const qName of [TS_QUEUE.DELAYED, TS_QUEUE.SCHEDULED, TS_QUEUE.RETRY]) {
      const keep = [];
      for (const id of queues[qName]) {
        const task = get(id);
        if (!task) continue;
        const due =
          !task.scheduledTime || task.scheduledTime <= now;
        if (due) {
          queues[TS_QUEUE.PRIORITY].push(id);
          set(id, { status: TS_STATE.QUEUED, queue: TS_QUEUE.PRIORITY });
        } else {
          keep.push(id);
        }
      }
      queues[qName] = keep;
    }

    const candidates = [];
    for (const qName of [TS_QUEUE.IMMEDIATE, TS_QUEUE.PRIORITY]) {
      for (const id of queues[qName]) {
        const task = get(id);
        if (!task) continue;
        if (task.status !== TS_STATE.QUEUED && task.status !== TS_STATE.SCHEDULED) continue;
        if (!depsSatisfied(task)) continue;
        if (emergencyMode && priorityRank(task.priority) > priorityRank(TS_PRIORITY.HIGH) && task.type !== TS_TASK_TYPE.SYSTEM) {
          continue;
        }
        candidates.push(id);
      }
    }

    return sortCandidates(candidates);
  }

  function assignWorker(taskId) {
    if (busyWorkers >= workerPoolSize) return { ok: false, error: "no_worker" };
    busyWorkers += 1;
    const workerId = `worker-${((busyWorkers - 1) % workerPoolSize) + 1}`;
    set(taskId, { assignedWorker: workerId });
    return { ok: true, workerId };
  }

  function releaseWorker() {
    busyWorkers = Math.max(0, busyWorkers - 1);
  }

  function dequeue(taskId) {
    for (const qName of TS_QUEUE_ORDER) {
      queues[qName] = queues[qName].filter((id) => id !== taskId);
    }
  }

  function startTask(taskId, now = Date.now()) {
    const task = get(taskId);
    if (!task) return { ok: false, error: "unknown_task" };
    if (!depsSatisfied(task)) return { ok: false, error: "dependencies_unmet" };

    const worker = assignWorker(taskId);
    if (!worker.ok) return worker;

    dequeue(taskId);
    const waitMs = now - task.createdTime;
    totalWaitMs += waitMs;
    waitSamples += 1;

    set(taskId, {
      status: TS_STATE.RUNNING,
      startedAt: now,
      waitMs,
      scheduledTime: task.scheduledTime || now
    });

    appendAudit({
      action: "started",
      taskId,
      owner: task.owner,
      worker: worker.workerId,
      result: "running"
    });

    return { ok: true, task: get(taskId), workerId: worker.workerId, executesDirectly: false };
  }

  function tick(now = Date.now(), maxStarts = workerPoolSize) {
    const started = [];
    const runnable = selectRunnable(now);
    for (const task of runnable) {
      if (started.length >= maxStarts) break;
      if (busyWorkers >= workerPoolSize) break;
      const result = startTask(task.taskId, now);
      if (result.ok) started.push(result.task);
    }
    const timeouts = checkTimeouts(now);
    return {
      ok: true,
      started: Object.freeze(started),
      timedOut: timeouts.timedOut,
      parallel: started.length > 1
    };
  }

  function complete(taskId, meta = {}) {
    const task = get(taskId);
    if (!task) return { ok: false, error: "unknown_task" };
    if (task.status === TS_STATE.RUNNING) releaseWorker();
    dequeue(taskId);
    set(taskId, { status: TS_STATE.COMPLETED, assignedWorker: null });
    completedIds.add(taskId);
    appendAudit({
      action: "completed",
      taskId,
      owner: task.owner,
      reason: meta.reason || "done",
      result: "completed"
    });
    return { ok: true, task: get(taskId) };
  }

  function cancel(taskId, meta = {}) {
    const task = get(taskId);
    if (!task) return { ok: false, error: "unknown_task" };
    if (task.type === TS_TASK_TYPE.SYSTEM && task.priority === TS_PRIORITY.CRITICAL && meta.force !== true) {
      return { ok: false, error: "kernel_task_protected" };
    }
    if (task.status === TS_STATE.RUNNING) releaseWorker();
    dequeue(taskId);
    set(taskId, { status: TS_STATE.CANCELLED, assignedWorker: null });
    appendAudit({
      action: "cancelled",
      taskId,
      owner: task.owner,
      reason: meta.reason || "cancel",
      result: "cancelled"
    });
    return { ok: true, task: get(taskId) };
  }

  function fail(taskId, reason = "error") {
    const task = get(taskId);
    if (!task) return { ok: false, error: "unknown_task" };
    if (task.status === TS_STATE.RUNNING) releaseWorker();

    const decision = evaluateRetry(task.retryPolicy, task.retries, task.maxRetries);
    if (decision.retry) {
      retryCount += 1;
      const nextRetries = task.retries + 1;
      set(taskId, {
        status: TS_STATE.QUEUED,
        retries: nextRetries,
        scheduledTime: Date.now() + (decision.delayMs || 0),
        assignedWorker: null
      });
      dequeue(taskId);
      queues[TS_QUEUE.RETRY].push(taskId);
      set(taskId, { queue: TS_QUEUE.RETRY });
      appendAudit({
        action: "retry",
        taskId,
        owner: task.owner,
        reason,
        result: `retry:${nextRetries}`
      });
      return { ok: true, retry: true, attempt: nextRetries, delayMs: decision.delayMs };
    }

    dequeue(taskId);
    set(taskId, { status: TS_STATE.FAILED, assignedWorker: null });
    failedCount += 1;
    appendAudit({
      action: "failed",
      taskId,
      owner: task.owner,
      reason,
      result: "failed"
    });
    return { ok: true, retry: false, task: get(taskId) };
  }

  function checkTimeouts(now = Date.now()) {
    const timedOut = [];
    for (const task of [...tasks.values()]) {
      if (task.status !== TS_STATE.RUNNING || !task.startedAt) continue;
      if (now - task.startedAt <= task.timeout) continue;

      timedOut.push(task.taskId);
      releaseWorker();
      dequeue(task.taskId);

      appendAudit({
        action: "cancelled",
        taskId: task.taskId,
        owner: task.owner,
        reason: "timeout",
        result: "cancelled"
      });

      const decision = evaluateRetry(task.retryPolicy, task.retries, task.maxRetries);
      if (decision.retry) {
        retryCount += 1;
        const nextRetries = task.retries + 1;
        set(task.taskId, {
          status: TS_STATE.QUEUED,
          retries: nextRetries,
          scheduledTime: now + (decision.delayMs || 0),
          queue: TS_QUEUE.RETRY,
          assignedWorker: null,
          startedAt: null
        });
        queues[TS_QUEUE.RETRY].push(task.taskId);
        appendAudit({
          action: "retry",
          taskId: task.taskId,
          owner: task.owner,
          reason: "timeout",
          result: `retry:${nextRetries}`
        });
      } else {
        set(task.taskId, {
          status: TS_STATE.FAILED,
          assignedWorker: null,
          startedAt: null
        });
        failedCount += 1;
        appendAudit({
          action: "failed",
          taskId: task.taskId,
          owner: task.owner,
          reason: "timeout_recovery",
          result: "failed"
        });
      }
    }
    return { ok: true, timedOut: Object.freeze(timedOut) };
  }

  function handleOverload(meta = {}) {
    emergencyMode = true;
    let deferred = 0;
    for (const qName of [TS_QUEUE.PRIORITY, TS_QUEUE.IMMEDIATE]) {
      const keep = [];
      for (const id of queues[qName]) {
        const task = get(id);
        if (!task) continue;
        if (
          task.priority === TS_PRIORITY.LOW ||
          task.priority === TS_PRIORITY.BACKGROUND
        ) {
          task.optional
            ? (rejectedOptional += 1)
            : (deferred += 1);
          set(id, {
            status: TS_STATE.SCHEDULED,
            queue: TS_QUEUE.DELAYED,
            scheduledTime: Date.now() + (meta.deferMs || 5000)
          });
          queues[TS_QUEUE.DELAYED].push(id);
          deferredLow += 1;
        } else {
          keep.push(id);
        }
      }
      queues[qName] = keep;
    }

    appendAudit({
      action: "overload",
      taskId: null,
      owner: "scheduler",
      reason: meta.reason || "overload",
      result: "emergency_mode"
    });

    return {
      ok: true,
      emergencyMode: true,
      deferredLowPriority: deferred,
      rejectedOptional,
      kernelProtected: true
    };
  }

  function setPolicy(next) {
    if (!Object.values(TS_POLICY).includes(next)) {
      return { ok: false, error: "unknown_policy" };
    }
    policy = next;
    return { ok: true, policy };
  }

  function setWorkerPoolSize(size) {
    const n = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > 64) {
      return { ok: false, error: "invalid_pool_size" };
    }
    workerPoolSize = n;
    return { ok: true, workerPoolSize };
  }

  function metrics() {
    return Object.freeze({
      tasks: tasks.size,
      active: [...tasks.values()].filter((t) => t.status === TS_STATE.RUNNING).length,
      queueLengths: Object.freeze(
        Object.fromEntries(TS_QUEUE_ORDER.map((q) => [q, queues[q].length]))
      ),
      avgWaitMs: waitSamples ? totalWaitMs / waitSamples : 0,
      retries: retryCount,
      failed: failedCount,
      workerPoolSize,
      busyWorkers,
      workerUtilization: workerPoolSize ? busyWorkers / workerPoolSize : 0,
      emergencyMode,
      deferredLow,
      mergedCount,
      rejectedOptional,
      policy
    });
  }

  return {
    submit,
    schedule,
    cancel,
    complete,
    fail,
    tick,
    checkTimeouts,
    selectRunnable,
    handleOverload,
    setPolicy,
    setWorkerPoolSize,
    evaluateRetry,
    metrics,
    getTask(taskId) {
      return get(taskId);
    },
    list() {
      return Object.freeze({
        tasks: Object.freeze([...tasks.values()]),
        queues: Object.freeze(
          Object.fromEntries(TS_QUEUE_ORDER.map((q) => [q, Object.freeze([...queues[q]])]))
        )
      });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    status() {
      return Object.freeze({
        singleton,
        soleScheduler: true,
        executesTasksDirectly: false,
        component: TS_COMPONENT.TASK_SCHEDULER,
        policy,
        workerPoolSize,
        emergencyMode
      });
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics()
      });
    }
  };
}

module.exports = {
  TS_COMPONENT,
  TS_COMPONENT_ORDER,
  TS_LAYER,
  TS_STATE,
  TS_PRIORITY,
  TS_PRIORITY_ORDER,
  TS_QUEUE,
  TS_QUEUE_ORDER,
  TS_TASK_TYPE,
  TS_POLICY,
  TS_RETRY_POLICY,
  TS_PUBLIC_API,
  TS_RUNTIME_ANCHORS,
  evaluateRetry,
  createTaskDescriptor,
  createTaskScheduler
};
