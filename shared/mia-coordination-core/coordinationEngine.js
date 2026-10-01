"use strict";

/**
 * Master Canon 0087 — Coordination Engine.
 * Kernel Layer 0 sole central authority for synchronization.
 * Coordinates WHEN processes interact safely — does NOT decide which service runs what
 * (that is Orchestrator 0086). Protects shared resources via locks/mutex/semaphore/barrier.
 */

const crypto = require("crypto");

const CE_COMPONENT = Object.freeze({
  COORDINATION_ENGINE: "coordination_engine",
  INTAKE_GATE: "intake_gate",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  LOCK_MANAGER: "lock_manager",
  MUTEX_ENGINE: "mutex_engine",
  SEMAPHORE_ENGINE: "semaphore_engine",
  BARRIER_ENGINE: "barrier_engine",
  WAIT_SIGNAL: "wait_signal",
  DEADLOCK_PREVENTION: "deadlock_prevention",
  RACE_PREVENTION: "race_prevention",
  SECURITY_GATE: "security_gate",
  COORDINATION_AUDIT: "coordination_audit"
});

const CE_COMPONENT_ORDER = Object.freeze(Object.values(CE_COMPONENT));

const CE_DESCRIPTOR_FIELDS = Object.freeze([
  "coordinationId",
  "type",
  "processes",
  "synchronizationPoints",
  "priority",
  "status",
  "correlationId"
]);

const CE_STATUS = Object.freeze({
  ACTIVE: "active",
  WAITING: "waiting",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
});

const CE_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "orchestrator_engine",
  "orchestrator-engine",
  "workflow_engine",
  "workflow-engine",
  "decision_engine",
  "decision-engine",
  "state_manager",
  "state-manager",
  "service_manager",
  "service-manager",
  "thread_manager",
  "platform",
  "security",
  "monitoring"
]);

const CE_FLAGS = Object.freeze({
  soleCoordinationAuthority: true,
  selectsServices: false,
  synchronizesOnly: true,
  preventsDeadlocks: true,
  preventsRaceConditions: true,
  distinctFromOrchestrator: true
});

const CE_PUBLIC_API = Object.freeze([
  "lock",
  "unlock",
  "wait",
  "signal",
  "barrier",
  "coordinate"
]);

const CE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-coordination-core/coordinationEngine.js",
  "shared/mia-orchestrator-core/orchestratorEngine.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-kernel-decision-core/decisionEngine.js",
  "shared/mia-workflow-core/workflowEngine.js",
  "docs/master-canon/0087-coordination-engine.md"
]);

/** Canonical lock order prevents circular waits when multiple resources are taken. */
const CE_LOCK_ORDER = Object.freeze([
  "bowl_state",
  "inventory",
  "battle_state",
  "runtime_cache",
  "obs_queue",
  "ai_workers",
  "generic"
]);

let activeCoordinationEngine = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function lockRank(resourceId) {
  const id = String(resourceId || "generic").trim().toLowerCase();
  const idx = CE_LOCK_ORDER.indexOf(id);
  return idx >= 0 ? idx : CE_LOCK_ORDER.indexOf("generic");
}

function createCoordinationDescriptor(input = {}) {
  const type = String(input.type || "").trim();
  if (!type) return { ok: false, error: "missing_type" };

  const coordinationId =
    input.coordinationId != null && String(input.coordinationId).trim()
      ? String(input.coordinationId).trim()
      : makeId("coord");

  const processes = Array.isArray(input.processes)
    ? Object.freeze(input.processes.map((p) => String(p)))
    : Object.freeze([]);

  const synchronizationPoints = Array.isArray(input.synchronizationPoints)
    ? Object.freeze(input.synchronizationPoints.map((p) => String(p)))
    : Object.freeze([]);

  const priority =
    typeof input.priority === "number" && Number.isFinite(input.priority)
      ? Math.floor(input.priority)
      : 0;

  const status = String(input.status || CE_STATUS.ACTIVE).trim() || CE_STATUS.ACTIVE;

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : null;

  return {
    ok: true,
    descriptor: Object.freeze({
      coordinationId,
      type,
      processes,
      synchronizationPoints,
      priority,
      status,
      correlationId
    })
  };
}

function createCoordinationEngine(options = {}) {
  if (
    activeCoordinationEngine &&
    activeCoordinationEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "coordination_engine_already_active",
      soleCoordinationAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || CE_AUTHORIZED_SOURCES);
  const defaultLockTimeoutMs =
    typeof options.defaultLockTimeoutMs === "number"
      ? Math.max(0, Math.floor(options.defaultLockTimeoutMs))
      : 5000;

  /** @type {Map<string, { holder: string, since: number, waiters: string[] }>} */
  const locks = new Map();
  /** @type {Map<string, Set<string>>} processId -> held resources */
  const heldByProcess = new Map();
  /** @type {Map<string, { permits: number, max: number, waiters: object[] }>} */
  const semaphores = new Map();
  /** @type {Map<string, { required: number, arrived: Set<string>, released: boolean }>} */
  const barriers = new Map();
  /** @type {Map<string, { waiters: string[], signaled: boolean }>} */
  const conditions = new Map();
  /** @type {Map<string, object>} */
  const coordinations = new Map();

  const auditLog = [];
  let syncCount = 0;
  let lockCount = 0;
  let semaphoreOpCount = 0;
  let barrierCount = 0;
  let conflictCount = 0;
  let deadlockCount = 0;
  let waitDurationSumMs = 0;
  let waitSamples = 0;
  let active = true;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function gate(meta) {
    if (meta && meta.selectService === true) {
      return Object.freeze({
        ok: false,
        error: "service_selection_rejected",
        selectsServices: false,
        synchronizesOnly: true
      });
    }
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_coordination" });
    }
    if (!isSourceVerified(meta)) {
      return Object.freeze({ ok: false, error: "forged_coordination_blocked" });
    }
    return null;
  }

  function nowMs(meta = {}) {
    if (typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)) {
      return meta.nowMs;
    }
    return Date.now();
  }

  function recordAudit(entry) {
    auditLog.push(
      Object.freeze({
        coordinationId: entry.coordinationId != null ? entry.coordinationId : null,
        syncObject: entry.syncObject != null ? entry.syncObject : null,
        processes: entry.processes != null ? Object.freeze([...(entry.processes || [])]) : null,
        lockedAt: entry.lockedAt != null ? entry.lockedAt : null,
        unlockedAt: entry.unlockedAt != null ? entry.unlockedAt : null,
        result: entry.result || "unknown"
      })
    );
  }

  function getHeld(processId) {
    if (!heldByProcess.has(processId)) heldByProcess.set(processId, new Set());
    return heldByProcess.get(processId);
  }

  function wouldViolateLockOrder(processId, resourceId) {
    const held = getHeld(processId);
    if (held.size === 0) return false;
    const newRank = lockRank(resourceId);
    for (const h of held) {
      if (lockRank(h) > newRank) return true;
    }
    return false;
  }

  function detectWaitCycle(startProcess, targetResource) {
    // If someone holding targetResource is waiting (transitively) for a lock we hold → cycle
    const lock = locks.get(targetResource);
    if (!lock || !lock.holder) return false;

    const visited = new Set();
    let current = lock.holder;
    while (current && !visited.has(current)) {
      visited.add(current);
      if (current === startProcess) return true;
      // find a resource this process is waiting for
      let next = null;
      for (const [res, info] of locks.entries()) {
        if ((info.waiters || []).includes(current)) {
          const holder = info.holder;
          if (holder) {
            next = holder;
            break;
          }
        }
      }
      if (!next) break;
      current = next;
    }
    return false;
  }

  function lock(resourceId, processId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;

    const resource = String(resourceId || "").trim();
    const process = String(processId || "").trim();
    if (!resource) return Object.freeze({ ok: false, error: "missing_resourceId" });
    if (!process) return Object.freeze({ ok: false, error: "missing_processId" });

    const t = nowMs(meta);
    const timeoutMs =
      typeof meta.timeoutMs === "number" && Number.isFinite(meta.timeoutMs)
        ? Math.max(0, Math.floor(meta.timeoutMs))
        : defaultLockTimeoutMs;

    if (wouldViolateLockOrder(process, resource)) {
      deadlockCount += 1;
      conflictCount += 1;
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `lock:${resource}`,
        processes: [process],
        lockedAt: t,
        result: "deadlock_lock_order_violation"
      });
      return Object.freeze({
        ok: false,
        error: "deadlock_prevented_lock_order",
        resourceId: resource,
        processId: process
      });
    }

    if (detectWaitCycle(process, resource)) {
      deadlockCount += 1;
      conflictCount += 1;
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `lock:${resource}`,
        processes: [process],
        lockedAt: t,
        result: "deadlock_cycle_detected"
      });
      return Object.freeze({
        ok: false,
        error: "deadlock_prevented_cycle",
        resourceId: resource,
        processId: process
      });
    }

    let info = locks.get(resource);
    if (!info) {
      info = { holder: null, since: null, waiters: [] };
      locks.set(resource, info);
    }

    if (info.holder == null) {
      info.holder = process;
      info.since = t;
      getHeld(process).add(resource);
      lockCount += 1;
      syncCount += 1;
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `lock:${resource}`,
        processes: [process],
        lockedAt: t,
        result: "locked"
      });
      return Object.freeze({
        ok: true,
        locked: true,
        resourceId: resource,
        processId: process,
        mutex: true
      });
    }

    if (info.holder === process) {
      return Object.freeze({
        ok: true,
        locked: true,
        reentrant: true,
        resourceId: resource,
        processId: process
      });
    }

    // contended
    conflictCount += 1;
    if (!info.waiters.includes(process)) info.waiters.push(process);

    // timeout: if waiter has been waiting beyond timeout relative to lock since
    // For deterministic tests: if meta.forceTimeout or now - since >= timeout while waiting
    if (info.since != null && t - info.since >= timeoutMs) {
      // auto-release stale lock (deadlock prevention via timeout)
      const staleHolder = info.holder;
      getHeld(staleHolder).delete(resource);
      info.holder = process;
      info.since = t;
      info.waiters = info.waiters.filter((w) => w !== process);
      getHeld(process).add(resource);
      lockCount += 1;
      syncCount += 1;
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `lock:${resource}`,
        processes: [staleHolder, process],
        lockedAt: t,
        unlockedAt: t,
        result: "lock_stolen_after_timeout"
      });
      return Object.freeze({
        ok: true,
        locked: true,
        recoveredFromTimeout: true,
        resourceId: resource,
        processId: process
      });
    }

    waitSamples += 1;
    waitDurationSumMs += Math.max(0, t - (info.since || t));
    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `lock:${resource}`,
      processes: [process, info.holder],
      lockedAt: t,
      result: "lock_wait"
    });
    return Object.freeze({
      ok: false,
      error: "resource_locked",
      waiting: true,
      resourceId: resource,
      holder: info.holder,
      processId: process
    });
  }

  function unlock(resourceId, processId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;

    const resource = String(resourceId || "").trim();
    const process = String(processId || "").trim();
    const info = locks.get(resource);
    if (!info || info.holder !== process) {
      return Object.freeze({
        ok: false,
        error: "not_lock_holder",
        resourceId: resource,
        processId: process
      });
    }

    const t = nowMs(meta);
    info.holder = null;
    info.since = null;
    getHeld(process).delete(resource);

    // hand off to first waiter if any
    let nextHolder = null;
    if (info.waiters.length > 0) {
      nextHolder = info.waiters.shift();
      info.holder = nextHolder;
      info.since = t;
      getHeld(nextHolder).add(resource);
      lockCount += 1;
    }

    syncCount += 1;
    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `lock:${resource}`,
      processes: [process].concat(nextHolder ? [nextHolder] : []),
      unlockedAt: t,
      result: nextHolder ? "unlocked_handoff" : "unlocked"
    });

    return Object.freeze({
      ok: true,
      unlocked: true,
      resourceId: resource,
      processId: process,
      handedTo: nextHolder
    });
  }

  function createSemaphore(name, maxPermits, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(name || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_semaphore" });
    const max = Math.max(1, Math.floor(Number(maxPermits) || 1));
    if (semaphores.has(id)) {
      return Object.freeze({ ok: false, error: "semaphore_exists" });
    }
    semaphores.set(id, { permits: max, max, waiters: [] });
    return Object.freeze({ ok: true, semaphore: id, max });
  }

  function acquireSemaphore(name, processId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(name || "").trim();
    const process = String(processId || "").trim();
    let sem = semaphores.get(id);
    if (!sem) {
      // auto-create with max from meta or 1
      const max =
        typeof meta.max === "number" && Number.isFinite(meta.max)
          ? Math.max(1, Math.floor(meta.max))
          : 1;
      sem = { permits: max, max, waiters: [] };
      semaphores.set(id, sem);
    }
    semaphoreOpCount += 1;
    syncCount += 1;
    if (sem.permits > 0) {
      sem.permits -= 1;
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `semaphore:${id}`,
        processes: [process],
        lockedAt: nowMs(meta),
        result: "semaphore_acquired"
      });
      return Object.freeze({
        ok: true,
        acquired: true,
        semaphore: id,
        remaining: sem.permits
      });
    }
    if (!sem.waiters.includes(process)) sem.waiters.push(process);
    conflictCount += 1;
    return Object.freeze({
      ok: false,
      error: "semaphore_exhausted",
      waiting: true,
      semaphore: id
    });
  }

  function releaseSemaphore(name, processId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(name || "").trim();
    const sem = semaphores.get(id);
    if (!sem) return Object.freeze({ ok: false, error: "semaphore_not_found" });
    semaphoreOpCount += 1;
    syncCount += 1;
    if (sem.permits < sem.max) sem.permits += 1;
    let woken = null;
    if (sem.waiters.length > 0 && sem.permits > 0) {
      woken = sem.waiters.shift();
      sem.permits -= 1;
    }
    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `semaphore:${id}`,
      processes: [String(processId || "")].concat(woken ? [woken] : []),
      unlockedAt: nowMs(meta),
      result: woken ? "semaphore_released_wakeup" : "semaphore_released"
    });
    return Object.freeze({
      ok: true,
      released: true,
      semaphore: id,
      remaining: sem.permits,
      woken
    });
  }

  function barrier(name, processId, required, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(name || "").trim();
    const process = String(processId || "").trim();
    const need = Math.max(1, Math.floor(Number(required) || 1));
    let bar = barriers.get(id);
    if (!bar || bar.released) {
      bar = { required: need, arrived: new Set(), released: false };
      barriers.set(id, bar);
    }
    bar.arrived.add(process);
    barrierCount += 1;
    syncCount += 1;

    if (bar.arrived.size >= bar.required) {
      bar.released = true;
      const arrived = [...bar.arrived];
      recordAudit({
        coordinationId: meta.coordinationId || null,
        syncObject: `barrier:${id}`,
        processes: arrived,
        unlockedAt: nowMs(meta),
        result: "barrier_released"
      });
      return Object.freeze({
        ok: true,
        released: true,
        barrier: id,
        arrived: Object.freeze(arrived)
      });
    }

    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `barrier:${id}`,
      processes: [process],
      lockedAt: nowMs(meta),
      result: "barrier_wait"
    });
    return Object.freeze({
      ok: true,
      waiting: true,
      barrier: id,
      arrived: bar.arrived.size,
      required: bar.required
    });
  }

  function wait(conditionId, processId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(conditionId || "").trim();
    const process = String(processId || "").trim();
    let cond = conditions.get(id);
    if (!cond) {
      cond = { waiters: [], signaled: false };
      conditions.set(id, cond);
    }
    if (cond.signaled) {
      cond.signaled = false;
      syncCount += 1;
      return Object.freeze({ ok: true, resumed: true, conditionId: id });
    }
    if (!cond.waiters.includes(process)) cond.waiters.push(process);
    syncCount += 1;
    waitSamples += 1;
    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `condition:${id}`,
      processes: [process],
      lockedAt: nowMs(meta),
      result: "wait"
    });
    return Object.freeze({ ok: true, waiting: true, conditionId: id });
  }

  function signal(conditionId, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    const id = String(conditionId || "").trim();
    let cond = conditions.get(id);
    if (!cond) {
      cond = { waiters: [], signaled: true };
      conditions.set(id, cond);
      syncCount += 1;
      return Object.freeze({ ok: true, signaled: true, woken: null });
    }
    const woken = cond.waiters.shift() || null;
    if (!woken) cond.signaled = true;
    syncCount += 1;
    recordAudit({
      coordinationId: meta.coordinationId || null,
      syncObject: `condition:${id}`,
      processes: woken ? [woken] : [],
      unlockedAt: nowMs(meta),
      result: "signal"
    });
    return Object.freeze({ ok: true, signaled: true, woken });
  }

  function coordinate(input = {}, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;

    const desc = createCoordinationDescriptor({
      type: input.type || "coordinate",
      processes: input.processes || [],
      synchronizationPoints: input.synchronizationPoints || [],
      priority: input.priority,
      correlationId: input.correlationId,
      status: CE_STATUS.ACTIVE
    });
    if (!desc.ok) return Object.freeze(desc);

    const entry = {
      descriptor: desc.descriptor,
      resources: Array.isArray(input.resources)
        ? input.resources.map((r) => String(r))
        : []
    };
    coordinations.set(entry.descriptor.coordinationId, entry);

    // optional: acquire listed resources in sorted lock order
    const ordered = [...entry.resources].sort(
      (a, b) => lockRank(a) - lockRank(b)
    );
    const process = String(
      (input.processes && input.processes[0]) || input.processId || "coordinator"
    );
    const acquired = [];
    for (const res of ordered) {
      const r = lock(res, process, {
        ...meta,
        coordinationId: entry.descriptor.coordinationId
      });
      if (!r.ok) {
        // rollback
        for (const a of acquired.reverse()) {
          unlock(a, process, { ...meta, authorized: true });
        }
        return Object.freeze({
          ok: false,
          error: r.error,
          coordinationId: entry.descriptor.coordinationId,
          failedResource: res
        });
      }
      acquired.push(res);
    }

    syncCount += 1;
    recordAudit({
      coordinationId: entry.descriptor.coordinationId,
      syncObject: "coordinate",
      processes: entry.descriptor.processes,
      lockedAt: nowMs(meta),
      result: "coordinated"
    });

    return Object.freeze({
      ok: true,
      coordination: entry.descriptor,
      acquired: Object.freeze(acquired),
      processId: process
    });
  }

  function forOrchestrator(input = {}, meta = {}) {
    return coordinate(input, {
      ...meta,
      source: meta.source || "orchestrator_engine",
      authorized: true
    });
  }

  function withStateLock(resourceId, processId, mutator, meta = {}) {
    const blocked = gate(meta);
    if (blocked) return blocked;
    // Race prevention: shared state mutate only under lock
    const locked = lock(resourceId, processId, meta);
    if (!locked.ok) {
      return Object.freeze({
        ok: false,
        error: "race_prevented_no_lock",
        detail: locked
      });
    }
    let result = null;
    let error = null;
    try {
      if (typeof mutator === "function") {
        result = mutator();
      }
    } catch (err) {
      error = err && err.message ? String(err.message) : "mutate_failed";
    }
    unlock(resourceId, processId, { ...meta, authorized: true });
    if (error) {
      return Object.freeze({ ok: false, error: "state_mutate_failed", message: error });
    }
    return Object.freeze({
      ok: true,
      result,
      racePrevented: true,
      resourceId: String(resourceId)
    });
  }

  function tryMutateWithoutLock() {
    return Object.freeze({
      ok: false,
      error: "race_prevented_unsynchronized_mutate",
      preventsRaceConditions: true
    });
  }

  function metrics() {
    return Object.freeze({
      syncCount,
      lockCount,
      semaphoreCount: semaphoreOpCount,
      barrierCount,
      conflictCount,
      deadlockCount,
      averageWaitMs: waitSamples > 0 ? waitDurationSumMs / waitSamples : 0
    });
  }

  function coordinationAudit() {
    return Object.freeze([...auditLog]);
  }

  function status() {
    return Object.freeze({
      active,
      singleton: true,
      soleCoordinationAuthority: true,
      lockCount: locks.size,
      semaphoreCount: semaphores.size,
      barrierCount: barriers.size,
      selectsServices: false,
      synchronizesOnly: true,
      preventsDeadlocks: true,
      preventsRaceConditions: true,
      distinctFromOrchestrator: true
    });
  }

  function getCoordination(coordinationId) {
    const e = coordinations.get(String(coordinationId || "").trim());
    if (!e) return Object.freeze({ ok: false, error: "coordination_not_found" });
    return Object.freeze({ ok: true, coordination: e.descriptor });
  }

  function isActive() {
    return active === true;
  }

  function shutdown() {
    active = false;
    if (activeCoordinationEngine === api) activeCoordinationEngine = null;
    return Object.freeze({ ok: true });
  }

  const api = {
    ok: true,
    lock,
    unlock,
    wait,
    signal,
    barrier,
    coordinate,
    createSemaphore,
    acquireSemaphore,
    releaseSemaphore,
    forOrchestrator,
    withStateLock,
    tryMutateWithoutLock,
    getCoordination,
    metrics,
    coordinationAudit,
    status,
    isActive,
    shutdown,
    soleCoordinationAuthority: true,
    selectsServices: false,
    synchronizesOnly: true,
    preventsDeadlocks: true,
    preventsRaceConditions: true,
    distinctFromOrchestrator: true
  };

  activeCoordinationEngine = api;
  return Object.freeze(api);
}

function clearCoordinationSingletonForTest() {
  if (activeCoordinationEngine) {
    try {
      activeCoordinationEngine.shutdown();
    } catch (_err) {
      /* ignore */
    }
  }
  activeCoordinationEngine = null;
}

module.exports = {
  CE_COMPONENT,
  CE_COMPONENT_ORDER,
  CE_DESCRIPTOR_FIELDS,
  CE_STATUS,
  CE_AUTHORIZED_SOURCES,
  CE_FLAGS,
  CE_PUBLIC_API,
  CE_RUNTIME_ANCHORS,
  CE_LOCK_ORDER,
  soleCoordinationAuthority: true,
  selectsServices: false,
  synchronizesOnly: true,
  preventsDeadlocks: true,
  preventsRaceConditions: true,
  distinctFromOrchestrator: true,
  createCoordinationDescriptor,
  createCoordinationEngine,
  clearCoordinationSingletonForTest,
  getActiveCoordinationEngine: () => activeCoordinationEngine
};
