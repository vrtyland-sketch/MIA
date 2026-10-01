"use strict";

/**
 * Master Canon 0056 — Resource Manager: central allocation, limits, and monitoring of system resources.
 * No service may allocate resources on its own.
 */

const RM_COMPONENT = Object.freeze({
  RESOURCE_MANAGER: "resource_manager",
  RESOURCE_REGISTRY: "resource_registry",
  ALLOCATOR: "allocator",
  CPU_MANAGER: "cpu_manager",
  MEMORY_MANAGER: "memory_manager",
  GPU_MANAGER: "gpu_manager",
  DISK_MANAGER: "disk_manager",
  NETWORK_MANAGER: "network_manager",
  LIMIT_ENFORCER: "limit_enforcer",
  OPTIMIZER: "optimizer",
  ALARM_ENGINE: "alarm_engine",
  WATCHDOG_FEED: "watchdog_feed"
});

const RM_COMPONENT_ORDER = Object.freeze(Object.values(RM_COMPONENT));

const RM_DOMAIN = Object.freeze({
  HARDWARE: "hardware",
  RUNTIME: "runtime",
  APPLICATION: "application",
  AI: "ai"
});

const RM_RESOURCE_KIND = Object.freeze({
  EXCLUSIVE: "exclusive",
  SHARED: "shared",
  LIMITED: "limited"
});

const RM_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  OPTIONAL: "optional"
});

const RM_PRIORITY_ORDER = Object.freeze([
  RM_PRIORITY.CRITICAL,
  RM_PRIORITY.HIGH,
  RM_PRIORITY.NORMAL,
  RM_PRIORITY.LOW,
  RM_PRIORITY.OPTIONAL
]);

const RM_STATUS = Object.freeze({
  AVAILABLE: "available",
  ALLOCATED: "allocated",
  THROTTLED: "throttled",
  EXHAUSTED: "exhausted",
  RELEASED: "released"
});

const RM_ALARM = Object.freeze({
  WARNING: "warning",
  HIGH: "high",
  CRITICAL: "critical",
  EMERGENCY: "emergency"
});

const RM_ALARM_ORDER = Object.freeze([
  RM_ALARM.WARNING,
  RM_ALARM.HIGH,
  RM_ALARM.CRITICAL,
  RM_ALARM.EMERGENCY
]);

const RM_CONNECTION_STATE = Object.freeze({
  OPENING: "opening",
  OPEN: "open",
  IDLE: "idle",
  CLOSING: "closing",
  CLOSED: "closed"
});

const RM_PUBLIC_API = Object.freeze([
  "register",
  "request",
  "release",
  "updateUsage",
  "applyLimits",
  "optimize",
  "evaluateAlarms",
  "watchdogSnapshot",
  "metrics",
  "list"
]);

const RM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-resource-core/resourceManager.js",
  "shared/mia-configuration-core/configurationManager.js",
  "shared/mia-service-core/serviceManager.js",
  "docs/master-canon/0056-resource-manager.md"
]);

const RM_KERNEL_OWNERS = Object.freeze(["kernel", "runtime", "recovery", "logger"]);

const RM_DEFAULT_LIMITS = Object.freeze({
  cpuMax: 90,
  ramMax: 85,
  gpuMax: 95,
  cacheMax: 512,
  queueMax: 1000,
  connectionMax: 200,
  aiRequestMax: 50
});

function priorityRank(priority) {
  const idx = RM_PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? RM_PRIORITY_ORDER.length : idx;
}

function assertSelfAllocateForbidden(activity) {
  if (activity === "self_allocate" || activity === "direct_resource_grab") {
    return { ok: false, error: "self_allocate_forbidden" };
  }
  return { ok: true };
}

function createResourceRecord(input = {}) {
  const id = String(input.id || input.resourceId || "").trim();
  if (!id) return { ok: false, error: "missing_resource_id" };

  const maximum = Number(input.maximum);
  if (!Number.isFinite(maximum) || maximum < 0) {
    return { ok: false, error: "invalid_maximum" };
  }

  return {
    ok: true,
    record: Object.freeze({
      resourceId: id,
      type: input.type || "generic",
      domain: input.domain || RM_DOMAIN.RUNTIME,
      kind: input.kind || RM_RESOURCE_KIND.SHARED,
      owner: input.owner || null,
      allocated: Number(input.allocated) || 0,
      maximum,
      currentUsage: Number(input.currentUsage) || 0,
      priority: input.priority || RM_PRIORITY.NORMAL,
      status: input.status || RM_STATUS.AVAILABLE,
      gpuOptional: input.gpuOptional !== false
    })
  };
}

function createResourceManager(options = {}) {
  const singleton = options.singleton !== false;
  const registry = new Map();
  const allocations = new Map();
  const connections = new Map();
  const alarms = [];
  const audit = [];
  let limits = { ...RM_DEFAULT_LIMITS, ...(options.limits || {}) };
  let throttleCount = 0;
  let optimizeCount = 0;
  let watchdogNotices = 0;

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function getRecord(id) {
    return registry.get(id) || null;
  }

  function setRecord(id, patch) {
    const prev = getRecord(id);
    if (!prev) return null;
    const next = { ...prev, ...patch };
    registry.set(id, Object.freeze(next));
    return next;
  }

  function register(input) {
    const built = createResourceRecord(input);
    if (!built.ok) return built;
    if (registry.has(built.record.resourceId)) {
      return { ok: false, error: "duplicate_resource_id" };
    }
    registry.set(built.record.resourceId, built.record);
    appendAudit({
      action: "register",
      resourceId: built.record.resourceId,
      actor: input.actor || "system"
    });
    return { ok: true, record: built.record };
  }

  function request(resourceId, amount, meta = {}) {
    const forbidden = assertSelfAllocateForbidden(meta.activity);
    if (!forbidden.ok) return forbidden;

    const record = getRecord(resourceId);
    if (!record) return { ok: false, error: "unknown_resource" };

    const qty = Number(amount);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { ok: false, error: "invalid_amount" };
    }

    const owner = String(meta.owner || "").trim();
    if (!owner) return { ok: false, error: "missing_owner" };

    const priority = meta.priority || record.priority;

    if (record.kind === RM_RESOURCE_KIND.EXCLUSIVE) {
      if (record.owner && record.owner !== owner && record.status === RM_STATUS.ALLOCATED) {
        if (priorityRank(priority) >= priorityRank(record.priority)) {
          return { ok: false, error: "exclusive_owned", owner: record.owner };
        }
      }
    }

    const projected = record.allocated + qty;
    if (projected > record.maximum) {
      if (priorityRank(priority) > priorityRank(RM_PRIORITY.CRITICAL)) {
        throttleCount += 1;
        setRecord(resourceId, { status: RM_STATUS.THROTTLED });
        return { ok: false, error: "limit_exceeded", throttled: true };
      }
      return { ok: false, error: "limit_exceeded" };
    }

    if (record.kind === RM_RESOURCE_KIND.LIMITED) {
      const limitKey = limitKeyFor(record);
      if (limitKey && projected > limits[limitKey]) {
        return { ok: false, error: "configured_limit_exceeded", limit: limits[limitKey] };
      }
    }

    const next = setRecord(resourceId, {
      owner: record.kind === RM_RESOURCE_KIND.EXCLUSIVE ? owner : record.owner || owner,
      allocated: projected,
      currentUsage: Math.max(record.currentUsage, projected),
      priority,
      status: RM_STATUS.ALLOCATED
    });

    const allocId = `${resourceId}:${owner}:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
    allocations.set(allocId, Object.freeze({
      allocId,
      resourceId,
      owner,
      amount: qty,
      priority,
      at: Date.now()
    }));

    appendAudit({
      action: "allocate",
      resourceId,
      owner,
      amount: qty,
      actor: meta.actor || owner
    });

    return { ok: true, allocId, record: next };
  }

  function limitKeyFor(record) {
    if (record.type === "cpu") return "cpuMax";
    if (record.type === "ram") return "ramMax";
    if (record.type === "gpu") return "gpuMax";
    if (record.type === "cache") return "cacheMax";
    if (record.type === "queue") return "queueMax";
    if (record.type === "websocket" || record.type === "http" || record.type === "connection") {
      return "connectionMax";
    }
    if (record.type === "ai_request") return "aiRequestMax";
    return null;
  }

  function release(allocId, meta = {}) {
    const alloc = allocations.get(allocId);
    if (!alloc) return { ok: false, error: "unknown_allocation" };

    const record = getRecord(alloc.resourceId);
    if (!record) return { ok: false, error: "unknown_resource" };

    const allocated = Math.max(0, record.allocated - alloc.amount);
    const patch = {
      allocated,
      currentUsage: Math.min(record.currentUsage, allocated),
      status: allocated === 0 ? RM_STATUS.AVAILABLE : RM_STATUS.ALLOCATED
    };
    if (record.kind === RM_RESOURCE_KIND.EXCLUSIVE && allocated === 0) {
      patch.owner = null;
    }
    const next = setRecord(alloc.resourceId, patch);
    allocations.delete(allocId);

    if (meta.connectionId && connections.has(meta.connectionId)) {
      connections.set(
        meta.connectionId,
        Object.freeze({
          ...connections.get(meta.connectionId),
          state: RM_CONNECTION_STATE.CLOSED
        })
      );
    }

    appendAudit({
      action: "release",
      resourceId: alloc.resourceId,
      owner: alloc.owner,
      amount: alloc.amount,
      actor: meta.actor || alloc.owner
    });

    return { ok: true, record: next };
  }

  function updateUsage(resourceId, usage, meta = {}) {
    const record = getRecord(resourceId);
    if (!record) return { ok: false, error: "unknown_resource" };
    const value = Number(usage);
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, error: "invalid_usage" };
    }
    const status =
      value >= record.maximum
        ? RM_STATUS.EXHAUSTED
        : value > record.maximum * 0.9
          ? RM_STATUS.THROTTLED
          : record.allocated > 0
            ? RM_STATUS.ALLOCATED
            : RM_STATUS.AVAILABLE;

    const next = setRecord(resourceId, { currentUsage: value, status });

    if (record.type === "ram" && value > record.maximum * 0.95) {
      watchdogNotices += 1;
      appendAudit({
        action: "memory_pressure",
        resourceId,
        usage: value,
        notifyWatchdog: true,
        actor: meta.actor || "monitor"
      });
    }

    return { ok: true, record: next };
  }

  function openConnection(connectionId, meta = {}) {
    const id = String(connectionId || "").trim();
    if (!id) return { ok: false, error: "missing_connection_id" };
    if (connections.has(id) && connections.get(id).state !== RM_CONNECTION_STATE.CLOSED) {
      return { ok: false, error: "connection_exists" };
    }
    const openCount = [...connections.values()].filter(
      (c) => c.state === RM_CONNECTION_STATE.OPEN || c.state === RM_CONNECTION_STATE.IDLE
    ).length;
    if (openCount >= limits.connectionMax) {
      return { ok: false, error: "connection_limit" };
    }
    connections.set(
      id,
      Object.freeze({
        connectionId: id,
        type: meta.type || "websocket",
        owner: meta.owner || "unknown",
        state: RM_CONNECTION_STATE.OPEN,
        openedAt: Date.now()
      })
    );
    return { ok: true, connectionId: id, state: RM_CONNECTION_STATE.OPEN };
  }

  function closeConnection(connectionId) {
    const conn = connections.get(connectionId);
    if (!conn) return { ok: false, error: "unknown_connection" };
    connections.set(
      connectionId,
      Object.freeze({ ...conn, state: RM_CONNECTION_STATE.CLOSED, closedAt: Date.now() })
    );
    return { ok: true, connectionId, state: RM_CONNECTION_STATE.CLOSED };
  }

  function applyLimits(nextLimits = {}) {
    limits = Object.freeze({ ...limits, ...nextLimits });
    appendAudit({ action: "apply_limits", limits: { ...limits }, actor: "configuration_manager" });
    return { ok: true, limits: { ...limits } };
  }

  function protectKernel() {
    for (const id of registry.keys()) {
      const record = getRecord(id);
      if (record && RM_KERNEL_OWNERS.includes(record.owner)) {
        setRecord(id, { priority: RM_PRIORITY.CRITICAL });
      }
    }
    return { ok: true, kernelProtected: true };
  }

  function optimize(meta = {}) {
    const actions = [];
    const kernelSafe = meta.affectKernel !== true;

    const cache = getRecord("cache");
    if (cache && cache.currentUsage > limits.cacheMax * 0.8) {
      setRecord("cache", {
        currentUsage: Math.floor(cache.currentUsage * 0.5),
        allocated: Math.floor(cache.allocated * 0.5),
        status: RM_STATUS.AVAILABLE
      });
      actions.push("flush_cache");
    }

    let closed = 0;
    for (const [id, conn] of connections) {
      if (conn.state === RM_CONNECTION_STATE.IDLE) {
        connections.set(id, Object.freeze({ ...conn, state: RM_CONNECTION_STATE.CLOSED }));
        closed += 1;
      }
    }
    if (closed) actions.push(`close_idle_connections:${closed}`);

    const paused = [];
    for (const [id, record] of registry) {
      if (
        record.priority === RM_PRIORITY.LOW ||
        record.priority === RM_PRIORITY.OPTIONAL
      ) {
        if (RM_KERNEL_OWNERS.includes(record.owner)) continue;
        if (!kernelSafe && RM_KERNEL_OWNERS.includes(record.owner)) continue;
        setRecord(id, { status: RM_STATUS.THROTTLED });
        paused.push(id);
      }
    }
    if (paused.length) actions.push(`pause_low_priority:${paused.length}`);

    optimizeCount += 1;
    appendAudit({
      action: "optimize",
      actions,
      kernelAffected: false,
      actor: meta.actor || "resource_manager"
    });

    return {
      ok: true,
      actions: Object.freeze(actions),
      kernelAffected: false,
      deferredTasks: paused.length
    };
  }

  function usageRatio(type) {
    const record = [...registry.values()].find((r) => r.type === type);
    if (!record || record.maximum <= 0) return 0;
    return record.currentUsage / record.maximum;
  }

  function evaluateAlarms() {
    const raised = [];
    const cpu = usageRatio("cpu");
    const ram = usageRatio("ram");
    const disk = usageRatio("disk");
    const openConns = [...connections.values()].filter(
      (c) => c.state === RM_CONNECTION_STATE.OPEN || c.state === RM_CONNECTION_STATE.IDLE
    ).length;

    function raise(level, reason, reaction) {
      const alarm = Object.freeze({
        level,
        reason,
        reaction,
        at: Date.now()
      });
      alarms.push(alarm);
      raised.push(alarm);
    }

    if (cpu >= 0.7 || ram >= 0.7) raise(RM_ALARM.WARNING, "elevated_usage", "monitor");
    if (cpu >= 0.85 || ram >= 0.85 || openConns > limits.connectionMax * 0.8) {
      raise(RM_ALARM.HIGH, "high_pressure", "throttle_low_priority");
    }
    if (cpu >= 0.95 || ram >= 0.95 || disk >= 0.95) {
      raise(RM_ALARM.CRITICAL, "resource_critical", "optimize_and_notify_watchdog");
      watchdogNotices += 1;
    }
    if (cpu >= 1 || ram >= 1) {
      raise(RM_ALARM.EMERGENCY, "resource_exhausted", "protect_kernel_and_recovery");
      protectKernel();
      watchdogNotices += 1;
    }

    return { ok: true, alarms: Object.freeze(raised), total: alarms.length };
  }

  function watchdogSnapshot() {
    return Object.freeze({
      source: "resource_manager",
      cpu: usageRatio("cpu"),
      ram: usageRatio("ram"),
      gpu: usageRatio("gpu"),
      disk: usageRatio("disk"),
      connections: [...connections.values()].filter(
        (c) => c.state !== RM_CONNECTION_STATE.CLOSED
      ).length,
      aiRequests: (getRecord("ai_requests") || { currentUsage: 0 }).currentUsage,
      cache: (getRecord("cache") || { currentUsage: 0 }).currentUsage,
      queues: (getRecord("queues") || { currentUsage: 0 }).currentUsage,
      memoryLeakSuspect: usageRatio("ram") > 0.9,
      diskFull: usageRatio("disk") > 0.95,
      tooManyWebsockets: [...connections.values()].filter((c) => c.type === "websocket" && c.state !== RM_CONNECTION_STATE.CLOSED).length >
        limits.connectionMax * 0.9,
      canStartRecovery: alarms.some((a) => a.level === RM_ALARM.CRITICAL || a.level === RM_ALARM.EMERGENCY),
      notices: watchdogNotices
    });
  }

  function metrics() {
    const byDomain = {};
    for (const d of Object.values(RM_DOMAIN)) byDomain[d] = 0;
    for (const r of registry.values()) {
      byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
    }
    return Object.freeze({
      resources: registry.size,
      allocations: allocations.size,
      connections: connections.size,
      alarms: alarms.length,
      throttleCount,
      optimizeCount,
      watchdogNotices,
      limits: Object.freeze({ ...limits }),
      byDomain: Object.freeze(byDomain),
      cpu: usageRatio("cpu"),
      ram: usageRatio("ram"),
      gpu: usageRatio("gpu"),
      disk: usageRatio("disk")
    });
  }

  function list() {
    return Object.freeze({
      resources: Object.freeze([...registry.values()]),
      allocations: Object.freeze([...allocations.values()]),
      connections: Object.freeze([...connections.values()])
    });
  }

  if (options.seedDefaults !== false) {
    const defaults = [
      { id: "cpu", type: "cpu", domain: RM_DOMAIN.HARDWARE, kind: RM_RESOURCE_KIND.SHARED, maximum: 100, priority: RM_PRIORITY.CRITICAL, owner: "kernel" },
      { id: "ram", type: "ram", domain: RM_DOMAIN.HARDWARE, kind: RM_RESOURCE_KIND.SHARED, maximum: 100, priority: RM_PRIORITY.CRITICAL, owner: "kernel" },
      { id: "gpu", type: "gpu", domain: RM_DOMAIN.HARDWARE, kind: RM_RESOURCE_KIND.SHARED, maximum: 100, priority: RM_PRIORITY.NORMAL, gpuOptional: true },
      { id: "disk", type: "disk", domain: RM_DOMAIN.HARDWARE, kind: RM_RESOURCE_KIND.SHARED, maximum: 100, priority: RM_PRIORITY.HIGH },
      { id: "network", type: "network", domain: RM_DOMAIN.HARDWARE, kind: RM_RESOURCE_KIND.SHARED, maximum: 100, priority: RM_PRIORITY.HIGH },
      { id: "threads", type: "threads", domain: RM_DOMAIN.RUNTIME, kind: RM_RESOURCE_KIND.LIMITED, maximum: 64, priority: RM_PRIORITY.HIGH },
      { id: "timers", type: "timers", domain: RM_DOMAIN.RUNTIME, kind: RM_RESOURCE_KIND.LIMITED, maximum: 256, priority: RM_PRIORITY.NORMAL },
      { id: "queues", type: "queue", domain: RM_DOMAIN.RUNTIME, kind: RM_RESOURCE_KIND.LIMITED, maximum: 1000, priority: RM_PRIORITY.HIGH },
      { id: "cache", type: "cache", domain: RM_DOMAIN.RUNTIME, kind: RM_RESOURCE_KIND.LIMITED, maximum: 512, priority: RM_PRIORITY.NORMAL },
      { id: "port_8080", type: "port", domain: RM_DOMAIN.APPLICATION, kind: RM_RESOURCE_KIND.EXCLUSIVE, maximum: 1, priority: RM_PRIORITY.HIGH },
      { id: "obs_ws", type: "websocket", domain: RM_DOMAIN.APPLICATION, kind: RM_RESOURCE_KIND.LIMITED, maximum: 10, priority: RM_PRIORITY.NORMAL },
      { id: "ai_requests", type: "ai_request", domain: RM_DOMAIN.AI, kind: RM_RESOURCE_KIND.LIMITED, maximum: 50, priority: RM_PRIORITY.NORMAL },
      { id: "ai_tokens", type: "ai_tokens", domain: RM_DOMAIN.AI, kind: RM_RESOURCE_KIND.LIMITED, maximum: 100000, priority: RM_PRIORITY.NORMAL }
    ];
    for (const def of defaults) {
      register(def);
    }
    updateUsage("cpu", 20);
    updateUsage("ram", 30);
    updateUsage("disk", 40);
    updateUsage("cache", 100);
  }

  return {
    register,
    request,
    release,
    updateUsage,
    openConnection,
    closeConnection,
    applyLimits,
    optimize,
    evaluateAlarms,
    watchdogSnapshot,
    protectKernel,
    assertSelfAllocateForbidden,
    metrics,
    list,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    getLimits() {
      return Object.freeze({ ...limits });
    },
    status() {
      return Object.freeze({
        singleton,
        soleAllocator: true,
        gpuRequired: false,
        component: RM_COMPONENT.RESOURCE_MANAGER,
        resourceCount: registry.size
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
  RM_COMPONENT,
  RM_COMPONENT_ORDER,
  RM_DOMAIN,
  RM_RESOURCE_KIND,
  RM_PRIORITY,
  RM_PRIORITY_ORDER,
  RM_STATUS,
  RM_ALARM,
  RM_ALARM_ORDER,
  RM_CONNECTION_STATE,
  RM_PUBLIC_API,
  RM_RUNTIME_ANCHORS,
  RM_KERNEL_OWNERS,
  RM_DEFAULT_LIMITS,
  assertSelfAllocateForbidden,
  createResourceRecord,
  createResourceManager
};
