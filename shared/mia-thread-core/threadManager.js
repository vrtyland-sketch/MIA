"use strict";

/**
 * Master Canon 0059 — Thread Manager: sole authority for thread lifecycle, pools, and synchronization.
 */

const TM_COMPONENT = Object.freeze({
  THREAD_MANAGER: "thread_manager",
  THREAD_REGISTRY: "thread_registry",
  THREAD_POOL: "thread_pool",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  SYNC_ENGINE: "sync_engine",
  DEADLOCK_DETECTOR: "deadlock_detector",
  STARVATION_DETECTOR: "starvation_detector",
  LIMIT_ENFORCER: "limit_enforcer",
  AI_POOL_BRIDGE: "ai_pool_bridge",
  BATTLE_POOL_BRIDGE: "battle_pool_bridge",
  AUDIT_LOG: "audit_log",
  METRICS: "metrics"
});

const TM_COMPONENT_ORDER = Object.freeze(Object.values(TM_COMPONENT));

const TM_HIERARCHY = Object.freeze([
  "kernel",
  "service",
  "process",
  "thread",
  "task"
]);

const TM_THREAD_TYPE = Object.freeze({
  KERNEL: "kernel",
  WORKER: "worker",
  IO: "io",
  BACKGROUND: "background"
});

const TM_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  BACKGROUND: "background"
});

const TM_PRIORITY_ORDER = Object.freeze([
  TM_PRIORITY.CRITICAL,
  TM_PRIORITY.HIGH,
  TM_PRIORITY.NORMAL,
  TM_PRIORITY.LOW,
  TM_PRIORITY.BACKGROUND
]);

const TM_STATE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  RUNNING: "running",
  WAITING: "waiting",
  BLOCKED: "blocked",
  FINISHED: "finished",
  FAILED: "failed",
  STARVATION: "starvation"
});

const TM_TRANSITIONS = Object.freeze({
  [TM_STATE.CREATED]: [TM_STATE.INITIALIZED, TM_STATE.FAILED],
  [TM_STATE.INITIALIZED]: [TM_STATE.READY, TM_STATE.FAILED],
  [TM_STATE.READY]: [TM_STATE.RUNNING, TM_STATE.WAITING, TM_STATE.STARVATION, TM_STATE.FAILED],
  [TM_STATE.RUNNING]: [TM_STATE.WAITING, TM_STATE.BLOCKED, TM_STATE.FINISHED, TM_STATE.FAILED],
  [TM_STATE.WAITING]: [TM_STATE.READY, TM_STATE.RUNNING, TM_STATE.BLOCKED, TM_STATE.STARVATION, TM_STATE.FAILED],
  [TM_STATE.BLOCKED]: [TM_STATE.WAITING, TM_STATE.RUNNING, TM_STATE.FAILED],
  [TM_STATE.FINISHED]: [TM_STATE.CREATED],
  [TM_STATE.FAILED]: [TM_STATE.CREATED, TM_STATE.FINISHED],
  [TM_STATE.STARVATION]: [TM_STATE.READY, TM_STATE.RUNNING, TM_STATE.FAILED]
});

const TM_SYNC = Object.freeze({
  MUTEX: "mutex",
  SEMAPHORE: "semaphore",
  RW_LOCK: "rwlock",
  ATOMIC: "atomic",
  EVENT: "event"
});

const TM_PUBLIC_API = Object.freeze([
  "create",
  "acquire",
  "release",
  "start",
  "stop",
  "block",
  "detectDeadlocks",
  "detectStarvation",
  "ensurePool",
  "applyLimits",
  "metrics"
]);

const TM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-thread-core/threadManager.js",
  "shared/mia-process-core/processManager.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "docs/master-canon/0059-thread-manager.md"
]);

const TM_DEFAULT_LIMITS = Object.freeze({
  maxThreads: 128,
  poolSize: 8,
  maxAiThreads: 16,
  maxIoThreads: 16,
  maxBackgroundThreads: 8,
  allowScaleUp: true
});

const TM_KERNEL_THREAD_IDS = Object.freeze([
  "thr-watchdog",
  "thr-recovery",
  "thr-monitoring"
]);

function priorityRank(priority) {
  const idx = TM_PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? TM_PRIORITY_ORDER.length : idx;
}

function transitionThreadState(from, to) {
  const allowed = TM_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_transition", from, to };
  }
  return { ok: true, from, to };
}

function assertSyncRequired(activity) {
  if (activity === "shared_memory_without_sync" || activity === "unsynchronized_write") {
    return { ok: false, error: "unsynchronized_memory_forbidden" };
  }
  return { ok: true };
}

function createThreadDescriptor(input = {}) {
  const threadId = String(input.threadId || input.id || "").trim();
  if (!threadId) return { ok: false, error: "missing_thread_id" };
  const parentProcess = String(input.parentProcess || "").trim();
  if (!parentProcess) return { ok: false, error: "missing_parent_process" };
  const ownerService = String(input.ownerService || "").trim();
  if (!ownerService) return { ok: false, error: "missing_owner_service" };

  const now = Date.now();
  return {
    ok: true,
    descriptor: Object.freeze({
      threadId,
      parentProcess,
      ownerService,
      type: input.type || TM_THREAD_TYPE.WORKER,
      priority: input.priority || TM_PRIORITY.NORMAL,
      status: TM_STATE.CREATED,
      cpuUsage: 0,
      memoryUsage: 0,
      created: now,
      lastActivity: now,
      pool: input.pool || null,
      readySince: null,
      waitMs: 0,
      runMs: 0,
      contextSwitches: 0,
      errorCount: 0,
      blockedOn: null,
      holding: Object.freeze([])
    })
  };
}

function createThreadManager(options = {}) {
  const singleton = options.singleton !== false;
  const threads = new Map();
  const pools = new Map();
  const locks = new Map();
  const waitGraph = new Map();
  const audit = [];
  let limits = { ...TM_DEFAULT_LIMITS, ...(options.limits || {}) };
  let createAttempts = 0;
  let reusedCount = 0;
  let resourcesAvailable = options.resourcesAvailable !== false;

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function get(threadId) {
    return threads.get(threadId) || null;
  }

  function set(threadId, patch) {
    const prev = get(threadId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    threads.set(threadId, next);
    return next;
  }

  function countByType(type) {
    let n = 0;
    for (const t of threads.values()) {
      if (t.type === type && t.status !== TM_STATE.FINISHED) n += 1;
    }
    return n;
  }

  function ensurePool(poolName, size = limits.poolSize) {
    const name = String(poolName || "").trim();
    if (!name) return { ok: false, error: "missing_pool_name" };
    const n = Number(size);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "invalid_pool_size" };

    if (!pools.has(name)) {
      pools.set(
        name,
        Object.freeze({
          name,
          size: n,
          free: [],
          busy: []
        })
      );
    } else {
      const prev = pools.get(name);
      pools.set(name, Object.freeze({ ...prev, size: n }));
    }
    return { ok: true, pool: pools.get(name) };
  }

  function updatePool(name, patchFn) {
    const prev = pools.get(name);
    if (!prev) return null;
    const draft = {
      name: prev.name,
      size: prev.size,
      free: [...prev.free],
      busy: [...prev.busy]
    };
    patchFn(draft);
    const next = Object.freeze({
      name: draft.name,
      size: draft.size,
      free: Object.freeze(draft.free),
      busy: Object.freeze(draft.busy)
    });
    pools.set(name, next);
    return next;
  }

  function create(input = {}, meta = {}) {
    createAttempts += 1;
    const built = createThreadDescriptor(input);
    if (!built.ok) return built;
    if (threads.has(built.descriptor.threadId)) {
      return { ok: false, error: "duplicate_thread_id" };
    }

    const active = [...threads.values()].filter((t) => t.status !== TM_STATE.FINISHED).length;
    if (active >= limits.maxThreads) {
      return { ok: false, error: "max_threads_exceeded" };
    }

    if (built.descriptor.type === TM_THREAD_TYPE.IO && countByType(TM_THREAD_TYPE.IO) >= limits.maxIoThreads) {
      return { ok: false, error: "max_io_threads_exceeded" };
    }
    if (
      built.descriptor.type === TM_THREAD_TYPE.BACKGROUND &&
      countByType(TM_THREAD_TYPE.BACKGROUND) >= limits.maxBackgroundThreads
    ) {
      return { ok: false, error: "max_background_threads_exceeded" };
    }
    if (
      (input.pool === "ai" || built.descriptor.ownerService === "ai") &&
      countByType(TM_THREAD_TYPE.WORKER) >= limits.maxAiThreads &&
      input.pool === "ai"
    ) {
      // checked more precisely below via pool size
    }

    if (input.pool === "ai") {
      const aiBusy = [...threads.values()].filter(
        (t) => t.pool === "ai" && t.status !== TM_STATE.FINISHED
      ).length;
      if (aiBusy >= limits.maxAiThreads) {
        return { ok: false, error: "max_ai_threads_exceeded" };
      }
    }

    if (!resourcesAvailable && meta.forceResources !== true) {
      return { ok: false, error: "insufficient_resources" };
    }

    if (limits.allowScaleUp === false && meta.scaleUp === true) {
      return { ok: false, error: "scale_up_disabled" };
    }

    threads.set(built.descriptor.threadId, built.descriptor);
    appendAudit({
      action: "created",
      threadId: built.descriptor.threadId,
      ownerService: built.descriptor.ownerService,
      result: "created"
    });

    // advance to READY by default for pool use
    set(built.descriptor.threadId, { status: TM_STATE.INITIALIZED });
    set(built.descriptor.threadId, {
      status: TM_STATE.READY,
      readySince: Date.now(),
      pool: input.pool || null
    });

    if (input.pool) {
      ensurePool(input.pool);
      updatePool(input.pool, (p) => {
        p.free.push(built.descriptor.threadId);
      });
    }

    return { ok: true, thread: get(built.descriptor.threadId) };
  }

  function acquire(poolName, meta = {}) {
    ensurePool(poolName);
    const pool = pools.get(poolName);

    if (pool.free.length) {
      const threadId = pool.free[0];
      updatePool(poolName, (p) => {
        p.free = p.free.filter((id) => id !== threadId);
        p.busy.push(threadId);
      });
      reusedCount += 1;
      const started = start(threadId, { reason: "pool_reuse" });
      appendAudit({
        action: "acquired",
        threadId,
        ownerService: get(threadId).ownerService,
        result: "reused"
      });
      return { ok: true, thread: started.thread || get(threadId), reused: true };
    }

    if (!resourcesAvailable) {
      return { ok: false, error: "no_free_thread_insufficient_resources" };
    }
    if (limits.allowScaleUp === false) {
      return { ok: false, error: "no_free_thread_scale_disabled" };
    }

    const activeInPool = pool.free.length + pool.busy.length;
    if (activeInPool >= pool.size && poolName !== "ai") {
      // allow scale only if under global limits and config allows
      if (!limits.allowScaleUp) return { ok: false, error: "pool_full" };
    }
    if (poolName === "ai") {
      const aiCount = [...threads.values()].filter(
        (t) => t.pool === "ai" && t.status !== TM_STATE.FINISHED
      ).length;
      if (aiCount >= limits.maxAiThreads) {
        return { ok: false, error: "max_ai_threads_exceeded" };
      }
    }

    const threadId =
      meta.threadId ||
      `${poolName}-thr-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
    const created = create(
      {
        threadId,
        parentProcess: meta.parentProcess || `${poolName}-process`,
        ownerService: meta.ownerService || poolName,
        type: meta.type || TM_THREAD_TYPE.WORKER,
        priority: meta.priority || TM_PRIORITY.NORMAL,
        pool: poolName
      },
      { scaleUp: true }
    );
    if (!created.ok) return created;

    updatePool(poolName, (p) => {
      p.free = p.free.filter((id) => id !== threadId);
      if (!p.busy.includes(threadId)) p.busy.push(threadId);
    });
    start(threadId, { reason: "pool_scale" });
    return { ok: true, thread: get(threadId), reused: false, scaled: true };
  }

  function release(threadId) {
    const thr = get(threadId);
    if (!thr) return { ok: false, error: "unknown_thread" };
    if (TM_KERNEL_THREAD_IDS.includes(threadId)) {
      return { ok: false, error: "kernel_thread_protected" };
    }

    set(threadId, {
      status: TM_STATE.READY,
      readySince: Date.now(),
      blockedOn: null,
      lastActivity: Date.now()
    });
    waitGraph.delete(threadId);

    if (thr.pool && pools.has(thr.pool)) {
      updatePool(thr.pool, (p) => {
        p.busy = p.busy.filter((id) => id !== threadId);
        if (!p.free.includes(threadId)) p.free.push(threadId);
      });
    }

    appendAudit({
      action: "released",
      threadId,
      ownerService: thr.ownerService,
      result: "ready"
    });
    return { ok: true, thread: get(threadId) };
  }

  function start(threadId, meta = {}) {
    const thr = get(threadId);
    if (!thr) return { ok: false, error: "unknown_thread" };
    let from = thr.status;
    if (from === TM_STATE.CREATED) {
      set(threadId, { status: TM_STATE.INITIALIZED });
      from = TM_STATE.INITIALIZED;
    }
    if (from === TM_STATE.INITIALIZED) {
      set(threadId, { status: TM_STATE.READY, readySince: Date.now() });
      from = TM_STATE.READY;
    }
    if (from === TM_STATE.STARVATION) {
      set(threadId, { status: TM_STATE.READY, readySince: Date.now() });
      from = TM_STATE.READY;
    }
    const t = transitionThreadState(from, TM_STATE.RUNNING);
    if (!t.ok) return t;

    const next = set(threadId, {
      status: TM_STATE.RUNNING,
      lastActivity: Date.now(),
      contextSwitches: thr.contextSwitches + 1,
      readySince: null
    });
    appendAudit({
      action: "started",
      threadId,
      ownerService: thr.ownerService,
      reason: meta.reason || "start",
      result: "running"
    });
    return { ok: true, thread: next };
  }

  function stop(threadId, meta = {}) {
    const thr = get(threadId);
    if (!thr) return { ok: false, error: "unknown_thread" };
    if (TM_KERNEL_THREAD_IDS.includes(threadId) && meta.force !== true) {
      return { ok: false, error: "kernel_thread_protected" };
    }
    const next = set(threadId, {
      status: TM_STATE.FINISHED,
      blockedOn: null,
      lastActivity: Date.now()
    });
    waitGraph.delete(threadId);
    if (thr.pool && pools.has(thr.pool)) {
      updatePool(thr.pool, (p) => {
        p.free = p.free.filter((id) => id !== threadId);
        p.busy = p.busy.filter((id) => id !== threadId);
      });
    }
    appendAudit({
      action: "finished",
      threadId,
      ownerService: thr.ownerService,
      reason: meta.reason || "stop",
      result: "finished"
    });
    return { ok: true, thread: next };
  }

  function block(threadId, resourceId) {
    const thr = get(threadId);
    if (!thr) return { ok: false, error: "unknown_thread" };
    const t = transitionThreadState(thr.status, TM_STATE.BLOCKED);
    if (!t.ok && thr.status !== TM_STATE.RUNNING && thr.status !== TM_STATE.WAITING) {
      return t;
    }
    waitGraph.set(threadId, String(resourceId));
    const next = set(threadId, {
      status: TM_STATE.BLOCKED,
      blockedOn: String(resourceId),
      lastActivity: Date.now()
    });
    appendAudit({
      action: "blocked",
      threadId,
      ownerService: thr.ownerService,
      reason: `resource:${resourceId}`,
      result: "blocked"
    });
    return { ok: true, thread: next };
  }

  function createSync(kind, name, opts = {}) {
    if (!Object.values(TM_SYNC).includes(kind)) {
      return { ok: false, error: "unknown_sync_kind" };
    }
    const id = String(name || "").trim();
    if (!id) return { ok: false, error: "missing_sync_name" };
    if (locks.has(id)) return { ok: false, error: "sync_exists" };
    locks.set(
      id,
      Object.freeze({
        id,
        kind,
        holder: null,
        waiters: Object.freeze([]),
        permits: kind === TM_SYNC.SEMAPHORE ? Number(opts.permits) || 1 : 1,
        value: kind === TM_SYNC.ATOMIC ? opts.value ?? 0 : null
      })
    );
    return { ok: true, sync: locks.get(id) };
  }

  function lock(syncId, threadId) {
    const sync = locks.get(syncId);
    const thr = get(threadId);
    if (!sync) return { ok: false, error: "unknown_sync" };
    if (!thr) return { ok: false, error: "unknown_thread" };

    if (sync.kind === TM_SYNC.ATOMIC) {
      return { ok: true, atomic: true };
    }

    if (!sync.holder || sync.holder === threadId) {
      locks.set(
        syncId,
        Object.freeze({
          ...sync,
          holder: threadId,
          waiters: sync.waiters
        })
      );
      set(threadId, {
        holding: Object.freeze([...(thr.holding || []), syncId])
      });
      return { ok: true, acquired: true };
    }

    locks.set(
      syncId,
      Object.freeze({
        ...sync,
        waiters: Object.freeze([...sync.waiters, threadId])
      })
    );
    waitGraph.set(threadId, sync.holder);
    block(threadId, sync.holder);
    return { ok: false, acquired: false, waitingOn: sync.holder };
  }

  function unlock(syncId, threadId) {
    const sync = locks.get(syncId);
    if (!sync) return { ok: false, error: "unknown_sync" };
    if (sync.holder !== threadId) return { ok: false, error: "not_holder" };
    const nextWaiters = [...sync.waiters];
    const nextHolder = nextWaiters.shift() || null;
    locks.set(
      syncId,
      Object.freeze({
        ...sync,
        holder: nextHolder,
        waiters: Object.freeze(nextWaiters)
      })
    );
    const thr = get(threadId);
    if (thr) {
      set(threadId, {
        holding: Object.freeze((thr.holding || []).filter((x) => x !== syncId))
      });
    }
    waitGraph.delete(threadId);
    if (nextHolder) {
      waitGraph.delete(nextHolder);
      set(nextHolder, { status: TM_STATE.READY, blockedOn: null, readySince: Date.now() });
    }
    return { ok: true, nextHolder };
  }

  function detectDeadlocks() {
    const visiting = new Set();
    const visited = new Set();
    const cycles = [];

    function dfs(node, stack) {
      if (visiting.has(node)) {
        const i = stack.indexOf(node);
        cycles.push(Object.freeze([...stack.slice(i), node]));
        return;
      }
      if (visited.has(node)) return;
      visiting.add(node);
      stack.push(node);
      const next = waitGraph.get(node);
      if (next) dfs(next, stack);
      stack.pop();
      visiting.delete(node);
      visited.add(node);
    }

    for (const id of waitGraph.keys()) dfs(id, []);

    if (cycles.length) {
      for (const cycle of cycles) {
        for (const threadId of cycle) {
          if (threads.has(threadId) && !TM_KERNEL_THREAD_IDS.includes(threadId)) {
            set(threadId, { status: TM_STATE.FAILED, errorCount: get(threadId).errorCount + 1 });
            waitGraph.delete(threadId);
          }
        }
        appendAudit({
          action: "deadlock",
          threadId: cycle[0],
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

  function detectStarvation(now = Date.now(), thresholdMs = 30_000) {
    const starved = [];
    for (const thr of threads.values()) {
      if (thr.status !== TM_STATE.READY && thr.status !== TM_STATE.WAITING) continue;
      const since = thr.readySince || thr.lastActivity || thr.created;
      if (now - since > thresholdMs) {
        const boosted =
          TM_PRIORITY_ORDER[Math.max(0, priorityRank(thr.priority) - 1)] || TM_PRIORITY.CRITICAL;
        set(thr.threadId, {
          status: TM_STATE.STARVATION,
          priority: boosted,
          lastActivity: now
        });
        starved.push(
          Object.freeze({
            threadId: thr.threadId,
            previousPriority: thr.priority,
            boostedPriority: boosted
          })
        );
        appendAudit({
          action: "starvation",
          threadId: thr.threadId,
          ownerService: thr.ownerService,
          reason: "ready_too_long",
          result: `boost:${boosted}`
        });
      }
    }
    return { ok: true, starved: Object.freeze(starved) };
  }

  function applyLimits(next = {}) {
    limits = Object.freeze({ ...limits, ...next });
    appendAudit({
      action: "limits",
      threadId: null,
      ownerService: "configuration_manager",
      reason: "apply_limits",
      result: "updated"
    });
    return { ok: true, limits: { ...limits } };
  }

  function spawnBattleThreads(parentProcess = "battle-process") {
    const ids = ["physics", "damage", "effects"];
    const created = [];
    ensurePool("battle", 3);
    for (const name of ids) {
      const threadId = `battle-${name}`;
      const result = create({
        threadId,
        parentProcess,
        ownerService: "battle-engine",
        type: TM_THREAD_TYPE.WORKER,
        priority: TM_PRIORITY.NORMAL,
        pool: "battle"
      });
      if (result.ok) {
        start(threadId, { reason: "battle_parallel" });
        created.push(threadId);
      }
    }
    return { ok: true, threads: Object.freeze(created) };
  }

  function scaleAiPool(load) {
    ensurePool("ai", limits.poolSize);
    const target = Math.min(
      limits.maxAiThreads,
      Math.max(1, Math.ceil(Number(load) || 1))
    );
    const current = [...threads.values()].filter(
      (t) => t.pool === "ai" && t.status !== TM_STATE.FINISHED
    ).length;
    const created = [];
    for (let i = current; i < target; i += 1) {
      const got = acquire("ai", {
        ownerService: "conversation",
        parentProcess: "ai-process",
        type: TM_THREAD_TYPE.WORKER,
        priority: TM_PRIORITY.NORMAL
      });
      if (!got.ok) break;
      created.push(got.thread.threadId);
    }
    return { ok: true, target, created: Object.freeze(created), poolSize: pools.get("ai").size };
  }

  function heartbeat(threadId, metrics = {}) {
    const thr = get(threadId);
    if (!thr) return { ok: false, error: "unknown_thread" };
    return {
      ok: true,
      thread: set(threadId, {
        lastActivity: Date.now(),
        cpuUsage: metrics.cpuUsage != null ? metrics.cpuUsage : thr.cpuUsage,
        memoryUsage: metrics.memoryUsage != null ? metrics.memoryUsage : thr.memoryUsage,
        runMs: metrics.runMs != null ? metrics.runMs : thr.runMs,
        waitMs: metrics.waitMs != null ? metrics.waitMs : thr.waitMs
      })
    };
  }

  function metrics() {
    const byStatus = {};
    const byType = {};
    for (const s of Object.values(TM_STATE)) byStatus[s] = 0;
    for (const t of Object.values(TM_THREAD_TYPE)) byType[t] = 0;
    for (const thr of threads.values()) {
      byStatus[thr.status] = (byStatus[thr.status] || 0) + 1;
      byType[thr.type] = (byType[thr.type] || 0) + 1;
    }
    return Object.freeze({
      threads: threads.size,
      pools: pools.size,
      reusedCount,
      createAttempts,
      limits: Object.freeze({ ...limits }),
      byStatus: Object.freeze(byStatus),
      byType: Object.freeze(byType)
    });
  }

  if (options.seedDefaults !== false) {
    create({
      threadId: "thr-watchdog",
      parentProcess: "proc-watchdog",
      ownerService: "watchdog",
      type: TM_THREAD_TYPE.KERNEL,
      priority: TM_PRIORITY.CRITICAL
    });
    create({
      threadId: "thr-recovery",
      parentProcess: "proc-recovery",
      ownerService: "recovery",
      type: TM_THREAD_TYPE.KERNEL,
      priority: TM_PRIORITY.CRITICAL
    });
    create({
      threadId: "thr-monitoring",
      parentProcess: "proc-runtime",
      ownerService: "monitoring",
      type: TM_THREAD_TYPE.KERNEL,
      priority: TM_PRIORITY.CRITICAL
    });
    ensurePool("default", limits.poolSize);
    ensurePool("ai", Math.min(4, limits.maxAiThreads));
    for (let i = 1; i <= 2; i += 1) {
      create({
        threadId: `default-thr-${i}`,
        parentProcess: "proc-runtime",
        ownerService: "runtime",
        type: TM_THREAD_TYPE.WORKER,
        pool: "default"
      });
    }
  }

  return {
    create,
    acquire,
    release,
    start,
    stop,
    block,
    createSync,
    lock,
    unlock,
    detectDeadlocks,
    detectStarvation,
    ensurePool,
    applyLimits,
    spawnBattleThreads,
    scaleAiPool,
    heartbeat,
    transitionThreadState,
    assertSyncRequired,
    metrics,
    getThread(threadId) {
      return get(threadId);
    },
    getPool(name) {
      return pools.get(name) || null;
    },
    list() {
      return Object.freeze({
        threads: Object.freeze([...threads.values()]),
        pools: Object.freeze([...pools.values()])
      });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    getLimits() {
      return Object.freeze({ ...limits });
    },
    status() {
      return Object.freeze({
        singleton,
        soleThreadAuthority: true,
        hierarchy: TM_HIERARCHY,
        component: TM_COMPONENT.THREAD_MANAGER,
        threadCount: threads.size,
        poolCount: pools.size
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
  TM_COMPONENT,
  TM_COMPONENT_ORDER,
  TM_HIERARCHY,
  TM_THREAD_TYPE,
  TM_PRIORITY,
  TM_PRIORITY_ORDER,
  TM_STATE,
  TM_TRANSITIONS,
  TM_SYNC,
  TM_PUBLIC_API,
  TM_RUNTIME_ANCHORS,
  TM_DEFAULT_LIMITS,
  TM_KERNEL_THREAD_IDS,
  transitionThreadState,
  assertSyncRequired,
  createThreadDescriptor,
  createThreadManager
};
