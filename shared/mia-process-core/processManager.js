"use strict";

/**
 * Master Canon 0057 — Process Manager: execution layer for processes owned by services.
 * Service Manager describes what; Process Manager controls how/where it runs.
 */

const PM_COMPONENT = Object.freeze({
  PROCESS_MANAGER: "process_manager",
  PROCESS_REGISTRY: "process_registry",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  RESTART_POLICY: "restart_policy",
  ZOMBIE_DETECTOR: "zombie_detector",
  DEADLOCK_DETECTOR: "deadlock_detector",
  RESOURCE_GATE: "resource_gate",
  WORKER_POOL: "worker_pool",
  EXTERNAL_MONITOR: "external_monitor",
  ISOLATION_GUARD: "isolation_guard",
  AUDIT_LOG: "audit_log",
  WATCHDOG_FEED: "watchdog_feed"
});

const PM_COMPONENT_ORDER = Object.freeze(Object.values(PM_COMPONENT));

const PM_LAYER = Object.freeze({
  SERVICE: "service",
  PROCESS: "process"
});

const PM_PROCESS_TYPE = Object.freeze({
  KERNEL: "kernel",
  WORKER: "worker",
  IO: "io",
  BACKGROUND: "background",
  EXTERNAL: "external",
  RUNTIME: "runtime"
});

const PM_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  BACKGROUND: "background"
});

const PM_PRIORITY_ORDER = Object.freeze([
  PM_PRIORITY.CRITICAL,
  PM_PRIORITY.HIGH,
  PM_PRIORITY.NORMAL,
  PM_PRIORITY.LOW,
  PM_PRIORITY.BACKGROUND
]);

const PM_STATE = Object.freeze({
  CREATED: "created",
  STARTING: "starting",
  RUNNING: "running",
  WAITING: "waiting",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed",
  ZOMBIE: "zombie"
});

const PM_TRANSITIONS = Object.freeze({
  [PM_STATE.CREATED]: [PM_STATE.STARTING, PM_STATE.FAILED],
  [PM_STATE.STARTING]: [PM_STATE.RUNNING, PM_STATE.FAILED],
  [PM_STATE.RUNNING]: [PM_STATE.WAITING, PM_STATE.PAUSED, PM_STATE.STOPPING, PM_STATE.FAILED],
  [PM_STATE.WAITING]: [PM_STATE.RUNNING, PM_STATE.STOPPING, PM_STATE.FAILED, PM_STATE.ZOMBIE],
  [PM_STATE.PAUSED]: [PM_STATE.RUNNING, PM_STATE.STOPPING, PM_STATE.FAILED],
  [PM_STATE.STOPPING]: [PM_STATE.STOPPED, PM_STATE.FAILED],
  [PM_STATE.STOPPED]: [PM_STATE.STARTING, PM_STATE.CREATED],
  [PM_STATE.FAILED]: [PM_STATE.STARTING, PM_STATE.STOPPED],
  [PM_STATE.ZOMBIE]: [PM_STATE.STOPPING, PM_STATE.FAILED, PM_STATE.STOPPED]
});

const PM_RESTART_POLICY = Object.freeze({
  NEVER: "never",
  IMMEDIATE: "immediate",
  DELAYED: "delayed",
  EXPONENTIAL: "exponential",
  RECOVERY_CONFIRM: "recovery_confirm"
});

const PM_PUBLIC_API = Object.freeze([
  "create",
  "start",
  "stop",
  "pause",
  "resume",
  "restart",
  "fail",
  "detectZombies",
  "detectDeadlocks",
  "configureWorkerPool",
  "registerExternal",
  "metrics"
]);

const PM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-process-core/processManager.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "docs/master-canon/0057-process-manager.md"
]);

const PM_KERNEL_PROCESS_IDS = Object.freeze([
  "proc-runtime",
  "proc-recovery",
  "proc-watchdog"
]);

const PM_DEFAULT_MAX_RESTARTS = 5;
const PM_DEFAULT_MAX_PROCESSES = 256;
const PM_DEFAULT_ZOMBIE_IDLE_MS = 60_000;
const PM_DEFAULT_WAIT_TOO_LONG_MS = 30_000;

function transitionProcessState(from, to) {
  const allowed = PM_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_transition", from, to };
  }
  return { ok: true, from, to };
}

function evaluateRestartPolicy(policy, restartCount = 0, baseDelayMs = 1000, maxRestarts = PM_DEFAULT_MAX_RESTARTS) {
  if (restartCount >= maxRestarts) {
    return { restart: false, error: "max_restarts_exceeded", requiresRecoveryConfirm: true };
  }
  switch (policy) {
    case PM_RESTART_POLICY.NEVER:
      return { restart: false };
    case PM_RESTART_POLICY.IMMEDIATE:
      return { restart: true, delayMs: 0 };
    case PM_RESTART_POLICY.DELAYED:
      return { restart: true, delayMs: baseDelayMs };
    case PM_RESTART_POLICY.EXPONENTIAL:
      return { restart: true, delayMs: baseDelayMs * Math.pow(2, restartCount) };
    case PM_RESTART_POLICY.RECOVERY_CONFIRM:
      return { restart: false, requiresRecoveryConfirm: true };
    default:
      return { restart: false, error: "unknown_policy" };
  }
}

function createProcessDescriptor(input = {}) {
  const processId = String(input.processId || input.id || "").trim();
  if (!processId) return { ok: false, error: "missing_process_id" };
  const ownerService = String(input.ownerService || "").trim();
  if (!ownerService) return { ok: false, error: "missing_owner_service" };

  return {
    ok: true,
    descriptor: Object.freeze({
      processId,
      parentProcess: input.parentProcess || null,
      ownerService,
      type: input.type || PM_PROCESS_TYPE.WORKER,
      priority: input.priority || PM_PRIORITY.NORMAL,
      status: PM_STATE.CREATED,
      cpu: Number(input.cpu) || 0,
      ram: Number(input.ram) || 0,
      startTime: null,
      restartCount: 0,
      errorCount: 0,
      latencyMs: 0,
      lastActivityAt: Date.now(),
      restartPolicy: input.restartPolicy || PM_RESTART_POLICY.DELAYED,
      maxRestarts: Number.isFinite(input.maxRestarts) ? input.maxRestarts : PM_DEFAULT_MAX_RESTARTS,
      external: input.external === true || input.type === PM_PROCESS_TYPE.EXTERNAL,
      waitingOn: input.waitingOn || null,
      resourcesReserved: false
    })
  };
}

function createProcessManager(options = {}) {
  const singleton = options.singleton !== false;
  const processes = new Map();
  const waits = new Map();
  const audit = [];
  let createCount = 0;
  let maxProcesses = options.maxProcesses || PM_DEFAULT_MAX_PROCESSES;
  let workerPoolSize = options.workerPoolSize || 3;
  let resourceAllocator =
    options.resourceAllocator ||
    ((need) => ({
      ok: need && need.ok !== false,
      reserved: need && need.ok !== false,
      error: need && need.ok === false ? need.error || "insufficient_resources" : null
    }));

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function get(processId) {
    return processes.get(processId) || null;
  }

  function set(processId, patch) {
    const prev = get(processId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    processes.set(processId, next);
    return next;
  }

  function create(input = {}, meta = {}) {
    if (processes.size >= maxProcesses) {
      return { ok: false, error: "process_spawn_limit" };
    }

    const built = createProcessDescriptor(input);
    if (!built.ok) return built;
    if (processes.has(built.descriptor.processId)) {
      return { ok: false, error: "duplicate_process_id" };
    }

    const resources = resourceAllocator({
      cpu: input.cpuNeed || 1,
      ram: input.ramNeed || 16,
      queues: input.queueNeed || 0,
      network: input.networkNeed || 0,
      cache: input.cacheNeed || 0,
      ok: meta.resourcesAvailable !== false
    });
    if (!resources.ok) {
      appendAudit({
        action: "create_denied",
        processId: built.descriptor.processId,
        ownerService: built.descriptor.ownerService,
        reason: "insufficient_resources",
        result: "denied"
      });
      return { ok: false, error: "insufficient_resources" };
    }

    const record = Object.freeze({
      ...built.descriptor,
      resourcesReserved: true,
      registered: true
    });
    processes.set(record.processId, record);
    createCount += 1;

    appendAudit({
      action: "create",
      processId: record.processId,
      ownerService: record.ownerService,
      reason: meta.reason || "service_request",
      result: "created"
    });

    if (meta.autoStart !== false) {
      return start(record.processId, meta);
    }
    return { ok: true, process: record, resourcesReserved: true };
  }

  function start(processId, meta = {}) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    if (!proc.ownerService) return { ok: false, error: "missing_owner" };
    if (!proc.registered) return { ok: false, error: "unregistered_process" };
    if (!proc.resourcesReserved) return { ok: false, error: "resources_not_reserved" };

    let from = proc.status;
    if (from === PM_STATE.CREATED) {
      const t1 = transitionProcessState(from, PM_STATE.STARTING);
      if (!t1.ok) return t1;
      set(processId, { status: PM_STATE.STARTING });
      from = PM_STATE.STARTING;
    }
    if (from === PM_STATE.STOPPED || from === PM_STATE.FAILED) {
      const t0 = transitionProcessState(from, PM_STATE.STARTING);
      if (!t0.ok) return t0;
      set(processId, { status: PM_STATE.STARTING });
      from = PM_STATE.STARTING;
    }

    const t2 = transitionProcessState(from, PM_STATE.RUNNING);
    if (!t2.ok) return t2;

    const next = set(processId, {
      status: PM_STATE.RUNNING,
      startTime: proc.startTime || Date.now(),
      lastActivityAt: Date.now()
    });

    appendAudit({
      action: "start",
      processId,
      ownerService: proc.ownerService,
      reason: meta.reason || "start",
      result: "running"
    });

    return { ok: true, process: next };
  }

  function stop(processId, meta = {}) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    if (PM_KERNEL_PROCESS_IDS.includes(processId) && meta.force !== true) {
      return { ok: false, error: "kernel_process_protected" };
    }

    const t1 = transitionProcessState(proc.status, PM_STATE.STOPPING);
    if (!t1.ok && proc.status !== PM_STATE.ZOMBIE) {
      if (proc.status === PM_STATE.CREATED) {
        const next = set(processId, { status: PM_STATE.STOPPED });
        return { ok: true, process: next };
      }
      return t1;
    }
    set(processId, { status: PM_STATE.STOPPING });
    const next = set(processId, { status: PM_STATE.STOPPED, waitingOn: null });
    waits.delete(processId);

    appendAudit({
      action: "stop",
      processId,
      ownerService: proc.ownerService,
      reason: meta.reason || "stop",
      result: "stopped"
    });
    return { ok: true, process: next };
  }

  function pause(processId) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    const t = transitionProcessState(proc.status, PM_STATE.PAUSED);
    if (!t.ok) return t;
    const next = set(processId, { status: PM_STATE.PAUSED });
    appendAudit({
      action: "pause",
      processId,
      ownerService: proc.ownerService,
      reason: "pause",
      result: "paused"
    });
    return { ok: true, process: next };
  }

  function resume(processId) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    const t = transitionProcessState(proc.status, PM_STATE.RUNNING);
    if (!t.ok) return t;
    const next = set(processId, { status: PM_STATE.RUNNING, lastActivityAt: Date.now() });
    return { ok: true, process: next };
  }

  function wait(processId, waitingOn) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    const t = transitionProcessState(proc.status, PM_STATE.WAITING);
    if (!t.ok) return t;
    waits.set(processId, { waitingOn, since: Date.now() });
    const next = set(processId, { status: PM_STATE.WAITING, waitingOn });
    return { ok: true, process: next };
  }

  function fail(processId, reason = "error") {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    const next = set(processId, {
      status: PM_STATE.FAILED,
      errorCount: proc.errorCount + 1,
      lastActivityAt: Date.now()
    });
    appendAudit({
      action: "fail",
      processId,
      ownerService: proc.ownerService,
      reason,
      result: "failed"
    });

    const othersRunning = [...processes.values()].filter(
      (p) => p.processId !== processId && p.status === PM_STATE.RUNNING
    );
    return {
      ok: true,
      process: next,
      isolatesOthers: true,
      othersStillRunning: othersRunning.map((p) => p.processId),
      stopsRuntime: PM_KERNEL_PROCESS_IDS.includes(processId) && proc.type === PM_PROCESS_TYPE.KERNEL
    };
  }

  function restart(processId, meta = {}) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };

    const decision = evaluateRestartPolicy(
      proc.restartPolicy,
      proc.restartCount,
      meta.baseDelayMs || 1000,
      proc.maxRestarts
    );
    if (!decision.restart) {
      appendAudit({
        action: "restart_denied",
        processId,
        ownerService: proc.ownerService,
        reason: decision.error || "policy",
        result: "denied"
      });
      return { ok: false, ...decision };
    }

    if (proc.status !== PM_STATE.STOPPED && proc.status !== PM_STATE.FAILED) {
      const stopped = stop(processId, { ...meta, force: true, reason: "restart" });
      if (!stopped.ok) return stopped;
    }

    set(processId, {
      restartCount: proc.restartCount + 1,
      resourcesReserved: true
    });
    const started = start(processId, { reason: meta.reason || "restart" });
    if (!started.ok) return started;

    appendAudit({
      action: "restart",
      processId,
      ownerService: proc.ownerService,
      reason: meta.reason || "restart",
      result: "running"
    });

    return {
      ok: true,
      process: started.process,
      attempt: proc.restartCount + 1,
      delayMs: decision.delayMs
    };
  }

  function detectZombies(now = Date.now(), thresholds = {}) {
    const idleMs = thresholds.idleMs || PM_DEFAULT_ZOMBIE_IDLE_MS;
    const waitMs = thresholds.waitMs || PM_DEFAULT_WAIT_TOO_LONG_MS;
    const zombies = [];

    for (const proc of processes.values()) {
      const reasons = [];
      if (!proc.ownerService) reasons.push("no_owner");
      if (
        (proc.status === PM_STATE.RUNNING || proc.status === PM_STATE.WAITING) &&
        now - (proc.lastActivityAt || 0) > idleMs
      ) {
        reasons.push("no_activity");
      }
      if (proc.status === PM_STATE.WAITING && waits.has(proc.processId)) {
        const w = waits.get(proc.processId);
        if (now - w.since > waitMs) reasons.push("waiting_too_long");
      }
      if (proc.unresponsive === true) reasons.push("no_response");

      if (reasons.length) {
        set(proc.processId, { status: PM_STATE.ZOMBIE });
        zombies.push(
          Object.freeze({
            processId: proc.processId,
            reasons: Object.freeze(reasons),
            handOff: "recovery_manager"
          })
        );
        appendAudit({
          action: "zombie_detected",
          processId: proc.processId,
          ownerService: proc.ownerService,
          reason: reasons.join(","),
          result: "zombie"
        });
      }
    }

    return { ok: true, zombies: Object.freeze(zombies) };
  }

  function detectDeadlocks() {
    const graph = new Map();
    for (const [id, waitInfo] of waits) {
      const target = waitInfo.waitingOn;
      if (!target) continue;
      if (!graph.has(id)) graph.set(id, []);
      graph.get(id).push(String(target));
    }

    const visiting = new Set();
    const visited = new Set();
    const cycles = [];

    function dfs(node, stack) {
      if (visiting.has(node)) {
        const i = stack.indexOf(node);
        cycles.push(Object.freeze([...stack.slice(i), node]));
        return true;
      }
      if (visited.has(node)) return false;
      visiting.add(node);
      stack.push(node);
      for (const next of graph.get(node) || []) {
        dfs(next, stack);
      }
      stack.pop();
      visiting.delete(node);
      visited.add(node);
      return false;
    }

    for (const id of graph.keys()) dfs(id, []);

    if (cycles.length) {
      for (const cycle of cycles) {
        for (const processId of cycle) {
          if (processes.has(processId)) {
            set(processId, { status: PM_STATE.FAILED });
          }
        }
        appendAudit({
          action: "deadlock_detected",
          processId: cycle[0],
          ownerService: (get(cycle[0]) || {}).ownerService || null,
          reason: `cycle:${cycle.join("->")}`,
          result: "isolated_recovery"
        });
      }
    }

    return {
      ok: cycles.length === 0,
      deadlocks: Object.freeze(cycles),
      isolated: cycles.length > 0,
      recovery: cycles.length > 0
    };
  }

  function configureWorkerPool(size) {
    const n = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > 64) {
      return { ok: false, error: "invalid_pool_size" };
    }
    workerPoolSize = n;
    return { ok: true, workerPoolSize };
  }

  function spawnWorkers(ownerService, count = workerPoolSize) {
    const created = [];
    const n = Math.min(count, workerPoolSize);
    for (let i = 1; i <= n; i += 1) {
      const result = create(
        {
          processId: `${ownerService}-worker-${i}`,
          ownerService,
          type: PM_PROCESS_TYPE.WORKER,
          priority: PM_PRIORITY.NORMAL,
          parentProcess: `${ownerService}-pool`
        },
        { reason: "worker_pool" }
      );
      if (result.ok) created.push(result.process.processId);
    }
    return { ok: true, workers: Object.freeze(created), poolSize: workerPoolSize };
  }

  function registerExternal(input = {}) {
    return create(
      {
        ...input,
        type: PM_PROCESS_TYPE.EXTERNAL,
        external: true,
        processId: input.processId || `ext-${input.name || "process"}`,
        ownerService: input.ownerService || input.name || "external"
      },
      { reason: "external_monitor", autoStart: true }
    );
  }

  function heartbeat(processId, metrics = {}) {
    const proc = get(processId);
    if (!proc) return { ok: false, error: "unknown_process" };
    const next = set(processId, {
      lastActivityAt: Date.now(),
      cpu: metrics.cpu != null ? metrics.cpu : proc.cpu,
      ram: metrics.ram != null ? metrics.ram : proc.ram,
      latencyMs: metrics.latencyMs != null ? metrics.latencyMs : proc.latencyMs,
      unresponsive: false
    });
    return { ok: true, process: next };
  }

  function metrics() {
    const byStatus = {};
    const byType = {};
    for (const s of Object.values(PM_STATE)) byStatus[s] = 0;
    for (const t of Object.values(PM_PROCESS_TYPE)) byType[t] = 0;
    let restarts = 0;
    let errors = 0;
    for (const p of processes.values()) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byType[p.type] = (byType[p.type] || 0) + 1;
      restarts += p.restartCount;
      errors += p.errorCount;
    }
    return Object.freeze({
      processes: processes.size,
      createCount,
      maxProcesses,
      workerPoolSize,
      restarts,
      errors,
      byStatus: Object.freeze(byStatus),
      byType: Object.freeze(byType)
    });
  }

  function watchdogSnapshot() {
    return Object.freeze({
      source: "process_manager",
      running: [...processes.values()].filter((p) => p.status === PM_STATE.RUNNING).length,
      failed: [...processes.values()].filter((p) => p.status === PM_STATE.FAILED).length,
      zombies: [...processes.values()].filter((p) => p.status === PM_STATE.ZOMBIE).length,
      processes: Object.freeze(
        [...processes.values()].map((p) =>
          Object.freeze({
            processId: p.processId,
            ownerService: p.ownerService,
            status: p.status,
            cpu: p.cpu,
            ram: p.ram,
            restartCount: p.restartCount,
            errorCount: p.errorCount,
            latencyMs: p.latencyMs,
            uptimeMs: p.startTime ? Date.now() - p.startTime : 0
          })
        )
      )
    });
  }

  if (options.seedDefaults !== false) {
    create(
      {
        processId: "proc-runtime",
        ownerService: "runtime",
        type: PM_PROCESS_TYPE.KERNEL,
        priority: PM_PRIORITY.CRITICAL,
        restartPolicy: PM_RESTART_POLICY.RECOVERY_CONFIRM
      },
      { reason: "seed" }
    );
    create(
      {
        processId: "proc-recovery",
        ownerService: "recovery",
        type: PM_PROCESS_TYPE.KERNEL,
        priority: PM_PRIORITY.CRITICAL,
        restartPolicy: PM_RESTART_POLICY.NEVER
      },
      { reason: "seed" }
    );
    create(
      {
        processId: "proc-watchdog",
        ownerService: "watchdog",
        type: PM_PROCESS_TYPE.KERNEL,
        priority: PM_PRIORITY.CRITICAL,
        restartPolicy: PM_RESTART_POLICY.IMMEDIATE
      },
      { reason: "seed" }
    );
    create(
      {
        processId: "proc-battle",
        ownerService: "battle-engine",
        type: PM_PROCESS_TYPE.WORKER,
        priority: PM_PRIORITY.NORMAL
      },
      { reason: "seed" }
    );
    create(
      {
        processId: "proc-obs",
        ownerService: "obs",
        type: PM_PROCESS_TYPE.IO,
        priority: PM_PRIORITY.LOW
      },
      { reason: "seed" }
    );
    create(
      {
        processId: "proc-memory",
        ownerService: "memory",
        type: PM_PROCESS_TYPE.RUNTIME,
        priority: PM_PRIORITY.HIGH
      },
      { reason: "seed" }
    );
  }

  return {
    create,
    start,
    stop,
    pause,
    resume,
    wait,
    fail,
    restart,
    detectZombies,
    detectDeadlocks,
    configureWorkerPool,
    spawnWorkers,
    registerExternal,
    heartbeat,
    evaluateRestartPolicy,
    transitionProcessState,
    metrics,
    watchdogSnapshot,
    list() {
      return Object.freeze({ processes: Object.freeze([...processes.values()]) });
    },
    getProcess(processId) {
      return get(processId);
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    status() {
      return Object.freeze({
        singleton,
        managesExecution: true,
        managesLogicalServices: false,
        component: PM_COMPONENT.PROCESS_MANAGER,
        processCount: processes.size,
        workerPoolSize,
        maxProcesses
      });
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics(),
        watchdog: watchdogSnapshot()
      });
    }
  };
}

module.exports = {
  PM_COMPONENT,
  PM_COMPONENT_ORDER,
  PM_LAYER,
  PM_PROCESS_TYPE,
  PM_PRIORITY,
  PM_PRIORITY_ORDER,
  PM_STATE,
  PM_TRANSITIONS,
  PM_RESTART_POLICY,
  PM_PUBLIC_API,
  PM_RUNTIME_ANCHORS,
  PM_KERNEL_PROCESS_IDS,
  PM_DEFAULT_MAX_RESTARTS,
  transitionProcessState,
  evaluateRestartPolicy,
  createProcessDescriptor,
  createProcessManager
};
