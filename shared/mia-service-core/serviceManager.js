"use strict";

/**
 * Master Canon 0053 — Service Manager: central registry and lifecycle for all long-running MIA services.
 */

const crypto = require("crypto");

const SVM_COMPONENT = Object.freeze({
  SERVICE_MANAGER: "service_manager",
  SERVICE_REGISTRY: "service_registry",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  DESCRIPTOR_VALIDATOR: "descriptor_validator",
  RESTART_POLICY: "restart_policy",
  HEALTH_MONITOR: "health_monitor",
  COMMUNICATION_GATE: "communication_gate",
  ISOLATION_GUARD: "isolation_guard",
  SERVICE_METRICS: "service_metrics",
  AUDIT_LOG: "audit_log",
  PLUGIN_REGISTRATION: "plugin_registration",
  SERVICE_API: "service_api"
});

const SVM_COMPONENT_ORDER = Object.freeze(Object.values(SVM_COMPONENT));

const SVM_CATEGORY = Object.freeze({
  KERNEL: "kernel",
  CORE: "core",
  AI: "ai",
  GAMEPLAY: "gameplay",
  PRESENTATION: "presentation",
  PLATFORM: "platform",
  PLUGIN: "plugin"
});

const SVM_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  OPTIONAL: "optional"
});

const SVM_PRIORITY_ORDER = Object.freeze([
  SVM_PRIORITY.CRITICAL,
  SVM_PRIORITY.HIGH,
  SVM_PRIORITY.NORMAL,
  SVM_PRIORITY.LOW,
  SVM_PRIORITY.OPTIONAL
]);

const SVM_STATE = Object.freeze({
  CREATED: "created",
  REGISTERED: "registered",
  INITIALIZED: "initialized",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  UNREGISTERED: "unregistered",
  FAILED: "failed"
});

const SVM_TRANSITIONS = Object.freeze({
  [SVM_STATE.CREATED]: [SVM_STATE.REGISTERED, SVM_STATE.FAILED],
  [SVM_STATE.REGISTERED]: [SVM_STATE.INITIALIZED, SVM_STATE.UNREGISTERED, SVM_STATE.FAILED],
  [SVM_STATE.INITIALIZED]: [SVM_STATE.READY, SVM_STATE.STOPPING, SVM_STATE.FAILED],
  [SVM_STATE.READY]: [SVM_STATE.RUNNING, SVM_STATE.STOPPING, SVM_STATE.FAILED],
  [SVM_STATE.RUNNING]: [SVM_STATE.PAUSED, SVM_STATE.STOPPING, SVM_STATE.FAILED],
  [SVM_STATE.PAUSED]: [SVM_STATE.RUNNING, SVM_STATE.STOPPING, SVM_STATE.FAILED],
  [SVM_STATE.STOPPING]: [SVM_STATE.STOPPED, SVM_STATE.FAILED],
  [SVM_STATE.STOPPED]: [SVM_STATE.INITIALIZED, SVM_STATE.UNREGISTERED, SVM_STATE.FAILED],
  [SVM_STATE.UNREGISTERED]: [],
  [SVM_STATE.FAILED]: [SVM_STATE.REGISTERED, SVM_STATE.INITIALIZED, SVM_STATE.STOPPED]
});

const SVM_HEALTH = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNAVAILABLE: "unavailable",
  FAILED: "failed"
});

const SVM_AUTOSTART = Object.freeze({
  AUTO: "autostart",
  MANUAL: "manual",
  DISABLED: "disabled"
});

const SVM_RESTART_POLICY = Object.freeze({
  NEVER: "never",
  IMMEDIATE: "immediate",
  DELAYED: "delayed",
  EXPONENTIAL: "exponential",
  RECOVERY_CONFIRM: "recovery_confirm"
});

const SVM_REQUIRED_METHODS = Object.freeze([
  "initialize",
  "start",
  "stop",
  "pause",
  "resume",
  "restart",
  "health",
  "dispose"
]);

const SVM_OPTIONAL_METHODS = Object.freeze(["reload", "backup", "restore", "metrics"]);

const SVM_COMMUNICATION = Object.freeze({
  EVENT_BUS: "event_bus",
  PUBLIC_API: "public_api",
  SERVICE_CONTRACT: "service_contract"
});

const SVM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "run_outside_manager",
  "direct_internal_call",
  "duplicate_service_id",
  "overwrite_kernel_service",
  "start_unverified_service",
  "plugin_direct_start"
]);

const SVM_PUBLIC_API = Object.freeze([
  "register",
  "unregister",
  "start",
  "stop",
  "pause",
  "resume",
  "restart",
  "health",
  "list",
  "status",
  "metrics"
]);

const SVM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-service-core/serviceManager.js",
  "shared/mia-startup-core/startupSequenceManager.js",
  "shared/mia-boot-core/bootManager.js",
  "shared/mia-kernel-core/coreKernel.js",
  "shared/mia-module-core/pluginModuleEngine.js",
  "index.js",
  "server.js"
]);

const SVM_KERNEL_PROTECTED = Object.freeze(["logger", "recovery", "scheduler", "runtime", "kernel"]);

function assertServiceForbiddenActivity(activity) {
  const forbidden = SVM_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function transitionServiceState(current, next) {
  const allowed = SVM_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return Object.freeze({
      ok: false,
      error: "invalid_service_lifecycle_transition",
      from: current,
      to: next,
      component: SVM_COMPONENT.LIFECYCLE_CONTROLLER
    });
  }
  return Object.freeze({ ok: true, from: current, to: next, component: SVM_COMPONENT.LIFECYCLE_CONTROLLER });
}

function createServiceDescriptor(input = {}) {
  if (!input.id || !input.name || !input.version) {
    return Object.freeze({
      ok: false,
      error: "descriptor_incomplete",
      component: SVM_COMPONENT.DESCRIPTOR_VALIDATOR
    });
  }
  return Object.freeze({
    ok: true,
    id: input.id,
    name: input.name,
    displayName: input.displayName || input.name,
    version: input.version,
    owner: input.owner || "mia",
    category: input.category || SVM_CATEGORY.CORE,
    priority: input.priority || SVM_PRIORITY.NORMAL,
    dependencies: Object.freeze(input.dependencies || []),
    configuration: Object.freeze(input.configuration || {}),
    autoStart: input.autoStart || SVM_AUTOSTART.MANUAL,
    healthStatus: input.healthStatus || SVM_HEALTH.UNAVAILABLE,
    permissions: Object.freeze(input.permissions || []),
    restartPolicy: input.restartPolicy || SVM_RESTART_POLICY.IMMEDIATE,
    restartDelayMs: input.restartDelayMs != null ? Number(input.restartDelayMs) : 1000,
    verified: input.verified !== false,
    methods: Object.freeze(input.methods || SVM_REQUIRED_METHODS.slice()),
    component: SVM_COMPONENT.DESCRIPTOR_VALIDATOR
  });
}

function validateServiceInterface(methods = []) {
  const missing = SVM_REQUIRED_METHODS.filter((m) => !methods.includes(m));
  return Object.freeze({
    ok: missing.length === 0,
    missing: Object.freeze(missing),
    optionalPresent: Object.freeze(SVM_OPTIONAL_METHODS.filter((m) => methods.includes(m))),
    component: SVM_COMPONENT.DESCRIPTOR_VALIDATOR
  });
}

function assertCommunicationAllowed(channel) {
  const allowed = Object.values(SVM_COMMUNICATION).includes(channel);
  return Object.freeze({
    ok: allowed,
    channel,
    error: allowed ? null : "direct_internal_call_forbidden",
    component: SVM_COMPONENT.COMMUNICATION_GATE
  });
}

function evaluateRestartPolicy(policy, attempt = 1, baseDelayMs = 1000) {
  if (policy === SVM_RESTART_POLICY.NEVER) {
    return Object.freeze({
      ok: false,
      restart: false,
      policy,
      component: SVM_COMPONENT.RESTART_POLICY
    });
  }
  if (policy === SVM_RESTART_POLICY.RECOVERY_CONFIRM) {
    return Object.freeze({
      ok: true,
      restart: false,
      requiresRecoveryConfirm: true,
      policy,
      component: SVM_COMPONENT.RESTART_POLICY
    });
  }
  let delayMs = 0;
  if (policy === SVM_RESTART_POLICY.DELAYED) delayMs = baseDelayMs;
  if (policy === SVM_RESTART_POLICY.EXPONENTIAL) delayMs = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  return Object.freeze({
    ok: true,
    restart: true,
    delayMs,
    policy,
    attempt,
    component: SVM_COMPONENT.RESTART_POLICY
  });
}

function collectServiceMetrics(input = {}) {
  return Object.freeze({
    ok: true,
    total: input.total != null ? Number(input.total) : 0,
    active: input.active != null ? Number(input.active) : 0,
    stopped: input.stopped != null ? Number(input.stopped) : 0,
    restarts: input.restarts != null ? Number(input.restarts) : 0,
    crashes: input.crashes != null ? Number(input.crashes) : 0,
    uptimeMs: input.uptimeMs != null ? Number(input.uptimeMs) : 0,
    cpu: input.cpu != null ? Number(input.cpu) : 0,
    ram: input.ram != null ? Number(input.ram) : 0,
    initDurationMs: input.initDurationMs != null ? Number(input.initDurationMs) : 0,
    component: SVM_COMPONENT.SERVICE_METRICS
  });
}

function createServiceManager(options = {}) {
  const registry = new Map();
  const audit = [];
  const restartCounts = new Map();
  const startedAt = new Map();
  let singleton = true;

  function writeAudit(action, detail = {}) {
    const entry = Object.freeze({
      at: Date.now(),
      actor: detail.actor || "system",
      action,
      serviceId: detail.serviceId || null,
      from: detail.from || null,
      to: detail.to || null,
      reason: detail.reason || null,
      immutable: true
    });
    audit.push(entry);
    return entry;
  }

  function getRecord(serviceId) {
    return registry.get(serviceId) || null;
  }

  function register(input = {}, meta = {}) {
    const descriptor = createServiceDescriptor(input);
    if (!descriptor.ok) return descriptor;

    if (registry.has(descriptor.id)) {
      return Object.freeze({
        ok: false,
        error: "duplicate_service_id",
        serviceId: descriptor.id,
        component: SVM_COMPONENT.SERVICE_REGISTRY
      });
    }

    if (SVM_KERNEL_PROTECTED.includes(descriptor.id) && meta.overwriteKernel === true) {
      return Object.freeze({
        ok: false,
        error: "kernel_service_protected",
        serviceId: descriptor.id,
        component: SVM_COMPONENT.SERVICE_API
      });
    }

    if (descriptor.verified !== true && options.environment === "production") {
      return Object.freeze({
        ok: false,
        error: "unverified_service",
        serviceId: descriptor.id,
        component: SVM_COMPONENT.SERVICE_API
      });
    }

    const iface = validateServiceInterface(descriptor.methods);
    if (!iface.ok) {
      return Object.freeze({
        ok: false,
        error: "missing_required_interface",
        missing: iface.missing,
        component: SVM_COMPONENT.DESCRIPTOR_VALIDATOR
      });
    }

    if (meta.fromPlugin === true) {
      if (meta.validated !== true || meta.permissionsOk !== true) {
        return Object.freeze({
          ok: false,
          error: "plugin_registration_rejected",
          component: SVM_COMPONENT.PLUGIN_REGISTRATION
        });
      }
    }

    const record = {
      descriptor,
      state: SVM_STATE.CREATED,
      health: SVM_HEALTH.UNAVAILABLE,
      createdAt: Date.now()
    };

    const toRegistered = transitionServiceState(SVM_STATE.CREATED, SVM_STATE.REGISTERED);
    if (!toRegistered.ok) return toRegistered;
    record.state = SVM_STATE.REGISTERED;
    registry.set(descriptor.id, record);
    restartCounts.set(descriptor.id, 0);
    writeAudit("register", {
      serviceId: descriptor.id,
      from: SVM_STATE.CREATED,
      to: SVM_STATE.REGISTERED,
      actor: meta.actor || "boot",
      reason: meta.reason || "registration"
    });

    return Object.freeze({
      ok: true,
      serviceId: descriptor.id,
      state: record.state,
      descriptor,
      component: SVM_COMPONENT.SERVICE_REGISTRY
    });
  }

  function registerPluginService(input = {}, meta = {}) {
    return register(input, {
      ...meta,
      fromPlugin: true,
      validated: meta.validated === true,
      permissionsOk: meta.permissionsOk === true,
      actor: meta.actor || "plugin_runtime"
    });
  }

  function ensureRegistered(serviceId) {
    const record = getRecord(serviceId);
    if (!record) {
      return Object.freeze({
        ok: false,
        error: "service_not_registered",
        serviceId,
        component: SVM_COMPONENT.SERVICE_API
      });
    }
    if (record.state === SVM_STATE.UNREGISTERED) {
      return Object.freeze({
        ok: false,
        error: "service_unregistered",
        serviceId,
        component: SVM_COMPONENT.SERVICE_API
      });
    }
    return Object.freeze({ ok: true, record });
  }

  function applyTransition(serviceId, next, reason, actor = "system") {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    const record = gate.record;
    const tr = transitionServiceState(record.state, next);
    if (!tr.ok) return tr;
    const from = record.state;
    record.state = next;
    writeAudit("lifecycle", { serviceId, from, to: next, reason, actor });
    return Object.freeze({ ok: true, serviceId, from, to: next, component: SVM_COMPONENT.LIFECYCLE_CONTROLLER });
  }

  function initialize(serviceId) {
    const result = applyTransition(serviceId, SVM_STATE.INITIALIZED, "initialize");
    if (!result.ok) return result;
    const ready = applyTransition(serviceId, SVM_STATE.READY, "ready");
    return ready.ok ? ready : result;
  }

  function start(serviceId, optionsStart = {}) {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    const record = gate.record;

    for (const dep of record.descriptor.dependencies) {
      const depRecord = getRecord(dep);
      if (!depRecord || (depRecord.state !== SVM_STATE.RUNNING && depRecord.state !== SVM_STATE.READY)) {
        return Object.freeze({
          ok: false,
          error: "dependency_not_ready",
          serviceId,
          dependency: dep,
          component: SVM_COMPONENT.SERVICE_API
        });
      }
    }

    if (record.state === SVM_STATE.REGISTERED) {
      const init = initialize(serviceId);
      if (!init.ok) return init;
    }
    if (record.state === SVM_STATE.INITIALIZED) {
      const ready = applyTransition(serviceId, SVM_STATE.READY, "ready");
      if (!ready.ok) return ready;
    }
    if (record.state === SVM_STATE.STOPPED) {
      const reinit = applyTransition(serviceId, SVM_STATE.INITIALIZED, "reinitialize");
      if (!reinit.ok) return reinit;
      const ready = applyTransition(serviceId, SVM_STATE.READY, "ready");
      if (!ready.ok) return ready;
    }

    const started = applyTransition(serviceId, SVM_STATE.RUNNING, optionsStart.reason || "start");
    if (started.ok) {
      record.health = SVM_HEALTH.HEALTHY;
      startedAt.set(serviceId, Date.now());
    }
    return started;
  }

  function stop(serviceId, reason = "stop") {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    const record = gate.record;
    if (
      record.state === SVM_STATE.RUNNING ||
      record.state === SVM_STATE.PAUSED ||
      record.state === SVM_STATE.READY ||
      record.state === SVM_STATE.INITIALIZED
    ) {
      const stopping = applyTransition(serviceId, SVM_STATE.STOPPING, reason);
      if (!stopping.ok) return stopping;
    }
    if (record.state === SVM_STATE.STOPPING) {
      const stopped = applyTransition(serviceId, SVM_STATE.STOPPED, reason);
      if (stopped.ok) record.health = SVM_HEALTH.UNAVAILABLE;
      return stopped;
    }
    if (record.state === SVM_STATE.STOPPED) {
      return Object.freeze({ ok: true, serviceId, to: SVM_STATE.STOPPED, component: SVM_COMPONENT.SERVICE_API });
    }
    return Object.freeze({
      ok: false,
      error: "invalid_stop_state",
      state: record.state,
      component: SVM_COMPONENT.SERVICE_API
    });
  }

  function pause(serviceId) {
    const result = applyTransition(serviceId, SVM_STATE.PAUSED, "pause");
    if (result.ok) getRecord(serviceId).health = SVM_HEALTH.DEGRADED;
    return result;
  }

  function resume(serviceId) {
    const result = applyTransition(serviceId, SVM_STATE.RUNNING, "resume");
    if (result.ok) getRecord(serviceId).health = SVM_HEALTH.HEALTHY;
    return result;
  }

  function restart(serviceId, optionsRestart = {}) {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    const record = gate.record;
    const attempt = (restartCounts.get(serviceId) || 0) + 1;
    const policy = evaluateRestartPolicy(
      record.descriptor.restartPolicy,
      attempt,
      record.descriptor.restartDelayMs
    );

    if (policy.requiresRecoveryConfirm && optionsRestart.recoveryConfirmed !== true) {
      return Object.freeze({
        ok: false,
        error: "recovery_confirm_required",
        policy,
        component: SVM_COMPONENT.RESTART_POLICY
      });
    }
    if (!policy.restart && !policy.requiresRecoveryConfirm) {
      return Object.freeze({
        ok: false,
        error: "restart_policy_never",
        policy,
        component: SVM_COMPONENT.RESTART_POLICY
      });
    }

    if (record.state === SVM_STATE.RUNNING || record.state === SVM_STATE.PAUSED || record.state === SVM_STATE.FAILED) {
      if (record.state !== SVM_STATE.FAILED && record.state !== SVM_STATE.STOPPED) {
        const stopped = stop(serviceId, "restart");
        if (!stopped.ok && record.state !== SVM_STATE.FAILED) return stopped;
      }
      if (record.state === SVM_STATE.FAILED) {
        applyTransition(serviceId, SVM_STATE.STOPPED, "recover_from_failed");
      }
    }

    restartCounts.set(serviceId, attempt);
    const started = start(serviceId, { reason: "restart" });
    return Object.freeze({
      ok: started.ok,
      serviceId,
      attempt,
      policy,
      started,
      component: SVM_COMPONENT.RESTART_POLICY
    });
  }

  function fail(serviceId, reason = "crash") {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    const record = gate.record;
    const from = record.state;
    record.state = SVM_STATE.FAILED;
    record.health = SVM_HEALTH.FAILED;
    writeAudit("fail", { serviceId, from, to: SVM_STATE.FAILED, reason });

    const isCritical =
      record.descriptor.priority === SVM_PRIORITY.CRITICAL ||
      record.descriptor.category === SVM_CATEGORY.KERNEL;

    return Object.freeze({
      ok: true,
      serviceId,
      state: SVM_STATE.FAILED,
      stopsRuntime: isCritical,
      isolatesOthers: !isCritical,
      component: SVM_COMPONENT.ISOLATION_GUARD
    });
  }

  function health(serviceId, nextHealth) {
    if (serviceId) {
      const gate = ensureRegistered(serviceId);
      if (!gate.ok) return gate;
      if (nextHealth && Object.values(SVM_HEALTH).includes(nextHealth)) {
        gate.record.health = nextHealth;
        writeAudit("health", {
          serviceId,
          from: null,
          to: nextHealth,
          reason: "health_check"
        });
      }
      return Object.freeze({
        ok: true,
        serviceId,
        health: gate.record.health,
        state: gate.record.state,
        component: SVM_COMPONENT.HEALTH_MONITOR
      });
    }

    const snapshot = {};
    for (const [id, record] of registry) {
      snapshot[id] = record.health;
    }
    return Object.freeze({
      ok: true,
      health: Object.freeze(snapshot),
      component: SVM_COMPONENT.HEALTH_MONITOR
    });
  }

  function unregister(serviceId) {
    const gate = ensureRegistered(serviceId);
    if (!gate.ok) return gate;
    if (SVM_KERNEL_PROTECTED.includes(serviceId)) {
      return Object.freeze({
        ok: false,
        error: "kernel_service_protected",
        serviceId,
        component: SVM_COMPONENT.SERVICE_API
      });
    }
    const record = gate.record;
    if (record.state === SVM_STATE.RUNNING || record.state === SVM_STATE.PAUSED) {
      const stopped = stop(serviceId, "unregister");
      if (!stopped.ok) return stopped;
    }
    const unreg = applyTransition(serviceId, SVM_STATE.UNREGISTERED, "unregister");
    return unreg;
  }

  function list(filter = {}) {
    const items = [];
    for (const [id, record] of registry) {
      if (filter.category && record.descriptor.category !== filter.category) continue;
      if (filter.state && record.state !== filter.state) continue;
      items.push(
        Object.freeze({
          serviceId: id,
          state: record.state,
          health: record.health,
          category: record.descriptor.category,
          priority: record.descriptor.priority,
          autoStart: record.descriptor.autoStart
        })
      );
    }
    return Object.freeze({
      ok: true,
      services: Object.freeze(items),
      component: SVM_COMPONENT.SERVICE_REGISTRY
    });
  }

  function metrics() {
    let active = 0;
    let stopped = 0;
    let crashes = 0;
    let restarts = 0;
    let uptimeMs = 0;
    for (const [id, record] of registry) {
      if (record.state === SVM_STATE.RUNNING) active += 1;
      if (record.state === SVM_STATE.STOPPED || record.state === SVM_STATE.UNREGISTERED) stopped += 1;
      if (record.state === SVM_STATE.FAILED) crashes += 1;
      restarts += restartCounts.get(id) || 0;
      if (startedAt.has(id) && record.state === SVM_STATE.RUNNING) {
        uptimeMs += Date.now() - startedAt.get(id);
      }
    }
    return collectServiceMetrics({
      total: registry.size,
      active,
      stopped,
      restarts,
      crashes,
      uptimeMs
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton,
      publicApi: SVM_PUBLIC_API,
      serviceCount: registry.size,
      component: SVM_COMPONENT.SERVICE_API
    });
  }

  // Seed default catalog categories for contract coverage (not auto-started).
  if (options.seedDefaults !== false) {
    const defaults = [
      { id: "logger", name: "Logger", version: "1.0.0", category: SVM_CATEGORY.KERNEL, priority: SVM_PRIORITY.CRITICAL, autoStart: SVM_AUTOSTART.AUTO, restartPolicy: SVM_RESTART_POLICY.IMMEDIATE },
      { id: "recovery", name: "Recovery", version: "1.0.0", category: SVM_CATEGORY.KERNEL, priority: SVM_PRIORITY.CRITICAL, autoStart: SVM_AUTOSTART.AUTO },
      { id: "scheduler", name: "Scheduler", version: "1.0.0", category: SVM_CATEGORY.KERNEL, priority: SVM_PRIORITY.CRITICAL, autoStart: SVM_AUTOSTART.AUTO },
      { id: "runtime", name: "Runtime", version: "1.0.0", category: SVM_CATEGORY.KERNEL, priority: SVM_PRIORITY.HIGH, autoStart: SVM_AUTOSTART.AUTO },
      { id: "event-bus", name: "Event Bus", version: "1.0.0", category: SVM_CATEGORY.CORE, priority: SVM_PRIORITY.HIGH, autoStart: SVM_AUTOSTART.AUTO, dependencies: ["runtime"] },
      { id: "memory", name: "Memory", version: "1.0.0", category: SVM_CATEGORY.CORE, priority: SVM_PRIORITY.HIGH, autoStart: SVM_AUTOSTART.AUTO, dependencies: ["event-bus"] },
      { id: "decision", name: "Decision Engine", version: "1.0.0", category: SVM_CATEGORY.AI, priority: SVM_PRIORITY.NORMAL, dependencies: ["memory", "event-bus"] },
      { id: "battle-engine", name: "Battle Engine", version: "4.2.0", category: SVM_CATEGORY.GAMEPLAY, priority: SVM_PRIORITY.NORMAL, dependencies: ["event-bus", "inventory", "economy"], permissions: ["memory.read", "overlay.write"], restartPolicy: SVM_RESTART_POLICY.IMMEDIATE },
      { id: "inventory", name: "Inventory", version: "1.0.0", category: SVM_CATEGORY.GAMEPLAY, priority: SVM_PRIORITY.NORMAL, dependencies: ["event-bus"] },
      { id: "economy", name: "Economy", version: "1.0.0", category: SVM_CATEGORY.GAMEPLAY, priority: SVM_PRIORITY.NORMAL, dependencies: ["inventory"] },
      { id: "obs", name: "OBS Connector", version: "1.0.0", category: SVM_CATEGORY.PRESENTATION, priority: SVM_PRIORITY.LOW, optional: true, restartPolicy: SVM_RESTART_POLICY.DELAYED },
      { id: "tiktok", name: "TikTok Connector", version: "1.0.0", category: SVM_CATEGORY.PLATFORM, priority: SVM_PRIORITY.NORMAL }
    ];
    for (const def of defaults) {
      register({ ...def, autoStart: def.autoStart || SVM_AUTOSTART.MANUAL }, { actor: "seed" });
    }
  }

  return {
    register,
    registerPluginService,
    unregister,
    initialize,
    start,
    stop,
    pause,
    resume,
    restart,
    fail,
    health,
    list,
    status,
    metrics,
    assertCommunicationAllowed,
    evaluateRestartPolicy,
    validateServiceInterface,
    getDescriptor(serviceId) {
      const record = getRecord(serviceId);
      return record ? record.descriptor : null;
    },
    getState(serviceId) {
      const record = getRecord(serviceId);
      return record ? record.state : null;
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        serviceCount: registry.size,
        auditCount: audit.length,
        component: SVM_COMPONENT.SERVICE_MANAGER
      });
    }
  };
}

module.exports = {
  SVM_COMPONENT,
  SVM_COMPONENT_ORDER,
  SVM_CATEGORY,
  SVM_PRIORITY,
  SVM_PRIORITY_ORDER,
  SVM_STATE,
  SVM_TRANSITIONS,
  SVM_HEALTH,
  SVM_AUTOSTART,
  SVM_RESTART_POLICY,
  SVM_REQUIRED_METHODS,
  SVM_OPTIONAL_METHODS,
  SVM_COMMUNICATION,
  SVM_FORBIDDEN_ACTIVITIES,
  SVM_PUBLIC_API,
  SVM_RUNTIME_ANCHORS,
  SVM_KERNEL_PROTECTED,
  assertServiceForbiddenActivity,
  transitionServiceState,
  createServiceDescriptor,
  validateServiceInterface,
  assertCommunicationAllowed,
  evaluateRestartPolicy,
  collectServiceMetrics,
  createServiceManager
};
