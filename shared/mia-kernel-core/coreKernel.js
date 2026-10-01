"use strict";

/**
 * Master Canon 0050 — MIA Core Kernel: Layer 0 environment for all platform systems.
 * No domain logic (AI, Battle, Economy, OBS, chat, platforms).
 */

const crypto = require("crypto");

const KERNEL_COMPONENT = Object.freeze({
  BOOT: "boot",
  RUNTIME: "runtime",
  CONFIGURATION: "configuration",
  SERVICES: "services",
  SCHEDULER: "scheduler",
  REGISTRY: "registry",
  MONITORING: "monitoring",
  DIAGNOSTICS: "diagnostics",
  RECOVERY: "recovery",
  SECURITY: "security",
  MODULE_RUNTIME: "module_runtime",
  SHUTDOWN: "shutdown"
});

const KERNEL_COMPONENT_ORDER = Object.freeze(Object.values(KERNEL_COMPONENT));

const KERNEL_BOOT_PIPELINE = Object.freeze([
  "power",
  "node",
  "kernel",
  "configuration",
  "registries",
  "services",
  "runtime",
  "ready"
]);

const KERNEL_STATE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed",
  SAFE_MODE: "safe_mode"
});

const KERNEL_SERVICE_STATE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed"
});

const KERNEL_SERVICE_TRANSITIONS = Object.freeze({
  [KERNEL_SERVICE_STATE.CREATED]: [KERNEL_SERVICE_STATE.INITIALIZED],
  [KERNEL_SERVICE_STATE.INITIALIZED]: [KERNEL_SERVICE_STATE.READY],
  [KERNEL_SERVICE_STATE.READY]: [KERNEL_SERVICE_STATE.RUNNING],
  [KERNEL_SERVICE_STATE.RUNNING]: [KERNEL_SERVICE_STATE.PAUSED, KERNEL_SERVICE_STATE.STOPPING, KERNEL_SERVICE_STATE.FAILED],
  [KERNEL_SERVICE_STATE.PAUSED]: [KERNEL_SERVICE_STATE.RUNNING, KERNEL_SERVICE_STATE.STOPPING],
  [KERNEL_SERVICE_STATE.STOPPING]: [KERNEL_SERVICE_STATE.STOPPED],
  [KERNEL_SERVICE_STATE.STOPPED]: [],
  [KERNEL_SERVICE_STATE.FAILED]: [KERNEL_SERVICE_STATE.CREATED]
});

const KERNEL_RECOVERY_LEVEL = Object.freeze({
  L1_SERVICE: 1,
  L2_MODULE: 2,
  L3_RUNTIME: 3,
  L4_SAFE_MODE: 4,
  L5_SHUTDOWN: 5
});

const KERNEL_REGISTRY_KIND = Object.freeze({
  SERVICE: "service",
  MODULE: "module",
  EVENT: "event",
  API: "api",
  CONFIGURATION: "configuration",
  FEATURE: "feature"
});

const KERNEL_PUBLIC_API = Object.freeze([
  "boot",
  "shutdown",
  "restart",
  "pause",
  "resume",
  "reload",
  "status",
  "health",
  "diagnostics"
]);

const KERNEL_FORBIDDEN_ACTIVITIES = Object.freeze([
  "play_video",
  "play_audio",
  "speak",
  "decide_battle",
  "calculate_economy",
  "reply_chat",
  "generate_text",
  "control_personality",
  "control_emotion",
  "communicate_tiktok_api",
  "domain_logic"
]);

const KERNEL_SAFE_MODE_SERVICES = Object.freeze(["kernel", "logger", "diagnostics", "configuration"]);

const KERNEL_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-kernel-core/coreKernel.js",
  "shared/mia-core-canon/runtimeManager.js",
  "shared/mia-core-canon/lifecycleManager.js",
  "shared/mia-module-core/pluginModuleEngine.js",
  "shared/mia-monitoring-core/monitoringSystem.js",
  "scripts/MIA_CONFIG.js",
  "scripts/MIA_SERVER_BOOTSTRAP.js",
  "index.js",
  "server.js"
]);

const DEFAULT_KERNEL_SERVICES = Object.freeze([
  { serviceId: "kernel", name: "Kernel", version: "1.0.0", dependencies: [], priority: 0, owner: "mia" },
  { serviceId: "logger", name: "Logger", version: "1.0.0", dependencies: ["kernel"], priority: 1, owner: "mia" },
  { serviceId: "configuration", name: "Configuration", version: "1.0.0", dependencies: ["kernel"], priority: 1, owner: "mia" },
  { serviceId: "diagnostics", name: "Diagnostics", version: "1.0.0", dependencies: ["logger", "configuration"], priority: 2, owner: "mia" },
  { serviceId: "scheduler", name: "Scheduler", version: "1.0.0", dependencies: ["kernel"], priority: 2, owner: "mia" },
  { serviceId: "monitoring", name: "Monitoring", version: "1.0.0", dependencies: ["scheduler", "diagnostics"], priority: 3, owner: "mia" }
]);

function assertKernelForbiddenActivity(activity) {
  const forbidden = KERNEL_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function createServiceRecord(input = {}) {
  if (!input.serviceId || !input.name || !input.version) {
    return Object.freeze({
      ok: false,
      error: "service_incomplete",
      component: KERNEL_COMPONENT.SERVICES
    });
  }
  return Object.freeze({
    ok: true,
    serviceId: input.serviceId,
    name: input.name,
    version: input.version,
    dependencies: Object.freeze(input.dependencies || []),
    priority: input.priority != null ? Number(input.priority) : 10,
    health: input.health || "unknown",
    status: input.status || KERNEL_SERVICE_STATE.CREATED,
    owner: input.owner || "mia",
    component: KERNEL_COMPONENT.SERVICES
  });
}

function transitionServiceState(current, next) {
  const allowed = KERNEL_SERVICE_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return Object.freeze({
      ok: false,
      error: "service_state_skip_forbidden",
      from: current,
      to: next,
      component: KERNEL_COMPONENT.SERVICES
    });
  }
  return Object.freeze({ ok: true, from: current, to: next, component: KERNEL_COMPONENT.SERVICES });
}

function buildDependencyGraph(services = []) {
  const nodes = services.map((s) => s.serviceId);
  const edges = [];
  for (const service of services) {
    for (const dep of service.dependencies || []) {
      edges.push(Object.freeze({ from: dep, to: service.serviceId }));
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let cyclic = false;

  function dfs(node) {
    if (visiting.has(node)) {
      cyclic = true;
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const edge of edges) {
      if (edge.from === node) dfs(edge.to);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of nodes) dfs(node);

  return Object.freeze({
    ok: !cyclic,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    cyclic,
    component: KERNEL_COMPONENT.REGISTRY
  });
}

function createRuntimeContext(input = {}) {
  return Object.freeze({
    ok: true,
    runtimeId: input.runtimeId || `rt-${crypto.randomUUID()}`,
    bootId: input.bootId || `boot-${crypto.randomUUID()}`,
    startTime: input.startTime || Date.now(),
    version: input.version || "1.0.0",
    build: input.build || "canon-0050",
    environment: input.environment || "development",
    activeModules: Object.freeze(input.activeModules || []),
    loadedServices: Object.freeze(input.loadedServices || []),
    currentState: input.currentState || KERNEL_STATE.CREATED,
    component: KERNEL_COMPONENT.RUNTIME
  });
}

function runBootPipeline(steps = {}) {
  const pipeline = KERNEL_BOOT_PIPELINE.map((step) =>
    Object.freeze({ step, done: steps[step] === true })
  );
  const orderOk = KERNEL_BOOT_PIPELINE.every((step, index) => {
    if (!steps[step]) return true;
    return KERNEL_BOOT_PIPELINE.slice(0, index).every((prev) => steps[prev] === true);
  });
  return Object.freeze({
    ok: pipeline.every((s) => s.done) && orderOk,
    pipeline: Object.freeze(pipeline),
    orderOk,
    immutableOrder: true,
    component: KERNEL_COMPONENT.BOOT
  });
}

function collectKernelHealth(input = {}) {
  return Object.freeze({
    ok: true,
    cpu: input.cpu != null ? Number(input.cpu) : 0,
    ram: input.ram != null ? Number(input.ram) : 0,
    services: input.services || "ok",
    eventBus: input.eventBus || "ok",
    runtime: input.runtime || "ok",
    registry: input.registry || "ok",
    obsConnection: input.obsConnection || "unchecked",
    platformConnectors: input.platformConnectors || "unchecked",
    intervalMs: input.intervalMs != null ? Number(input.intervalMs) : 5000,
    component: KERNEL_COMPONENT.MONITORING
  });
}

function planRecovery(level = KERNEL_RECOVERY_LEVEL.L1_SERVICE, target = {}) {
  const levels = {
    [KERNEL_RECOVERY_LEVEL.L1_SERVICE]: "restart_service",
    [KERNEL_RECOVERY_LEVEL.L2_MODULE]: "restart_module",
    [KERNEL_RECOVERY_LEVEL.L3_RUNTIME]: "restart_runtime",
    [KERNEL_RECOVERY_LEVEL.L4_SAFE_MODE]: "enter_safe_mode",
    [KERNEL_RECOVERY_LEVEL.L5_SHUTDOWN]: "controlled_shutdown"
  };
  return Object.freeze({
    ok: true,
    level: Number(level),
    action: levels[level] || "unknown",
    target: Object.freeze(target),
    component: KERNEL_COMPONENT.RECOVERY
  });
}

function enterSafeMode(context = {}) {
  return Object.freeze({
    ok: true,
    state: KERNEL_STATE.SAFE_MODE,
    activeServices: KERNEL_SAFE_MODE_SERVICES,
    aiDisabled: true,
    domainDisabled: true,
    previousState: context.currentState || null,
    component: KERNEL_COMPONENT.RECOVERY
  });
}

function createKernelDiagnostics(input = {}) {
  return Object.freeze({
    ok: true,
    runtimeId: input.runtimeId || null,
    bootPipeline: input.bootPipeline || null,
    dependencyGraph: input.dependencyGraph || null,
    health: input.health || null,
    auditTrailLength: input.auditTrailLength != null ? Number(input.auditTrailLength) : 0,
    component: KERNEL_COMPONENT.DIAGNOSTICS
  });
}

function createCoreKernel(options = {}) {
  const audit = [];
  const registries = {
    [KERNEL_REGISTRY_KIND.SERVICE]: {},
    [KERNEL_REGISTRY_KIND.MODULE]: {},
    [KERNEL_REGISTRY_KIND.EVENT]: {},
    [KERNEL_REGISTRY_KIND.API]: {},
    [KERNEL_REGISTRY_KIND.CONFIGURATION]: {},
    [KERNEL_REGISTRY_KIND.FEATURE]: {}
  };
  const services = new Map();
  let context = createRuntimeContext({
    version: options.version || "1.0.0",
    build: options.build || "canon-0050",
    environment: options.environment || "development"
  });
  let state = KERNEL_STATE.CREATED;
  let safeMode = false;
  let healthIntervalMs = options.healthIntervalMs != null ? Number(options.healthIntervalMs) : 5000;

  function auditAction(action, detail = {}) {
    audit.push(
      Object.freeze({
        at: Date.now(),
        action,
        detail: Object.freeze(detail),
        runtimeId: context.runtimeId
      })
    );
  }

  for (const svc of DEFAULT_KERNEL_SERVICES) {
    const record = createServiceRecord(svc);
    if (record.ok) {
      services.set(record.serviceId, { ...record });
      registries[KERNEL_REGISTRY_KIND.SERVICE][record.serviceId] = record;
    }
  }

  function boot() {
    if (state === KERNEL_STATE.RUNNING) {
      return Object.freeze({ ok: false, error: "already_running", component: KERNEL_COMPONENT.BOOT });
    }

    const steps = {
      power: true,
      node: true,
      kernel: true,
      configuration: true,
      registries: true,
      services: true,
      runtime: true,
      ready: true
    };
    const pipeline = runBootPipeline(steps);
    if (!pipeline.ok) {
      state = KERNEL_STATE.FAILED;
      return Object.freeze({ ok: false, error: "boot_pipeline_failed", pipeline });
    }

    for (const [serviceId, service] of services) {
      let status = KERNEL_SERVICE_STATE.CREATED;
      for (const next of [
        KERNEL_SERVICE_STATE.INITIALIZED,
        KERNEL_SERVICE_STATE.READY,
        KERNEL_SERVICE_STATE.RUNNING
      ]) {
        const transition = transitionServiceState(status, next);
        if (!transition.ok) {
          state = KERNEL_STATE.FAILED;
          return Object.freeze({ ok: false, error: "service_boot_failed", serviceId, transition });
        }
        status = next;
      }
      services.set(serviceId, { ...service, status, health: "healthy" });
    }

    const graph = buildDependencyGraph([...services.values()]);
    if (graph.cyclic) {
      state = KERNEL_STATE.FAILED;
      return Object.freeze({ ok: false, error: "cyclic_dependency", graph });
    }

    state = KERNEL_STATE.RUNNING;
    safeMode = false;
    context = createRuntimeContext({
      ...context,
      bootId: `boot-${crypto.randomUUID()}`,
      startTime: Date.now(),
      currentState: state,
      loadedServices: [...services.keys()],
      activeModules: Object.keys(registries[KERNEL_REGISTRY_KIND.MODULE])
    });
    auditAction("boot", { bootId: context.bootId });
    return Object.freeze({
      ok: true,
      context,
      pipeline,
      graph,
      mutatesDomain: false,
      component: KERNEL_COMPONENT.BOOT
    });
  }

  function shutdown() {
    for (const [serviceId, service] of services) {
      if (service.status === KERNEL_SERVICE_STATE.RUNNING || service.status === KERNEL_SERVICE_STATE.PAUSED) {
        const stopping = transitionServiceState(service.status, KERNEL_SERVICE_STATE.STOPPING);
        if (stopping.ok) {
          const stopped = transitionServiceState(KERNEL_SERVICE_STATE.STOPPING, KERNEL_SERVICE_STATE.STOPPED);
          services.set(serviceId, { ...service, status: stopped.ok ? KERNEL_SERVICE_STATE.STOPPED : service.status });
        }
      }
    }
    state = KERNEL_STATE.STOPPED;
    context = createRuntimeContext({ ...context, currentState: state });
    auditAction("shutdown");
    return Object.freeze({
      ok: true,
      state,
      context,
      dataPreserved: true,
      component: KERNEL_COMPONENT.SHUTDOWN
    });
  }

  function restart() {
    const stopped = shutdown();
    if (!stopped.ok) return stopped;
    return boot();
  }

  function pause() {
    if (state !== KERNEL_STATE.RUNNING) {
      return Object.freeze({ ok: false, error: "not_running", component: KERNEL_COMPONENT.RUNTIME });
    }
    state = KERNEL_STATE.PAUSED;
    context = createRuntimeContext({ ...context, currentState: state });
    auditAction("pause");
    return Object.freeze({ ok: true, state, context, component: KERNEL_COMPONENT.RUNTIME });
  }

  function resume() {
    if (state !== KERNEL_STATE.PAUSED) {
      return Object.freeze({ ok: false, error: "not_paused", component: KERNEL_COMPONENT.RUNTIME });
    }
    state = KERNEL_STATE.RUNNING;
    context = createRuntimeContext({ ...context, currentState: state });
    auditAction("resume");
    return Object.freeze({ ok: true, state, context, component: KERNEL_COMPONENT.RUNTIME });
  }

  function reload(optionsReload = {}) {
    if (optionsReload.bypassRuntime === true) {
      return Object.freeze({
        ok: false,
        error: "runtime_bypass_forbidden",
        component: KERNEL_COMPONENT.MODULE_RUNTIME
      });
    }
    auditAction("reload", { modules: optionsReload.modules || [] });
    return Object.freeze({
      ok: true,
      hotReload: true,
      requiresFullRestart: false,
      component: KERNEL_COMPONENT.MODULE_RUNTIME
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      state,
      safeMode,
      context,
      serviceCount: services.size,
      publicApi: KERNEL_PUBLIC_API,
      component: KERNEL_COMPONENT.RUNTIME
    });
  }

  function health(sample = {}) {
    const snapshot = collectKernelHealth({
      intervalMs: healthIntervalMs,
      runtime: state === KERNEL_STATE.RUNNING || state === KERNEL_STATE.SAFE_MODE ? "ok" : state,
      registry: "ok",
      services: [...services.values()].every((s) => s.health === "healthy" || s.status === KERNEL_SERVICE_STATE.STOPPED)
        ? "ok"
        : "degraded",
      ...sample
    });
    auditAction("health");
    return snapshot;
  }

  function diagnostics() {
    const graph = buildDependencyGraph([...services.values()]);
    const diag = createKernelDiagnostics({
      runtimeId: context.runtimeId,
      bootPipeline: runBootPipeline({
        power: true,
        node: true,
        kernel: true,
        configuration: true,
        registries: true,
        services: true,
        runtime: true,
        ready: state === KERNEL_STATE.RUNNING || state === KERNEL_STATE.SAFE_MODE || state === KERNEL_STATE.PAUSED
      }),
      dependencyGraph: graph,
      health: health(),
      auditTrailLength: audit.length
    });
    return diag;
  }

  function recover(level = KERNEL_RECOVERY_LEVEL.L1_SERVICE, target = {}) {
    const plan = planRecovery(level, target);
    auditAction("recover", { level, action: plan.action });

    if (level === KERNEL_RECOVERY_LEVEL.L4_SAFE_MODE) {
      const mode = enterSafeMode(context);
      safeMode = true;
      state = KERNEL_STATE.SAFE_MODE;
      for (const [serviceId, service] of services) {
        if (!KERNEL_SAFE_MODE_SERVICES.includes(serviceId) && service.status === KERNEL_SERVICE_STATE.RUNNING) {
          services.set(serviceId, { ...service, status: KERNEL_SERVICE_STATE.STOPPED, health: "stopped_safe_mode" });
        }
      }
      context = createRuntimeContext({
        ...context,
        currentState: state,
        loadedServices: KERNEL_SAFE_MODE_SERVICES.slice()
      });
      return Object.freeze({ ok: true, plan, mode, context, component: KERNEL_COMPONENT.RECOVERY });
    }

    if (level === KERNEL_RECOVERY_LEVEL.L5_SHUTDOWN) {
      return Object.freeze({ ok: true, plan, shutdown: shutdown(), component: KERNEL_COMPONENT.RECOVERY });
    }

    if (level === KERNEL_RECOVERY_LEVEL.L3_RUNTIME) {
      return Object.freeze({ ok: true, plan, restart: restart(), component: KERNEL_COMPONENT.RECOVERY });
    }

    if (target.serviceId && services.has(target.serviceId)) {
      const service = services.get(target.serviceId);
      services.set(target.serviceId, {
        ...service,
        status: KERNEL_SERVICE_STATE.RUNNING,
        health: "healthy"
      });
    }

    return Object.freeze({ ok: true, plan, component: KERNEL_COMPONENT.RECOVERY });
  }

  function registerInRegistry(kind, id, record = {}) {
    if (!Object.values(KERNEL_REGISTRY_KIND).includes(kind)) {
      return Object.freeze({ ok: false, error: "unknown_registry_kind", component: KERNEL_COMPONENT.REGISTRY });
    }
    registries[kind][id] = Object.freeze({ id, ...record });
    auditAction("register", { kind, id });
    return Object.freeze({ ok: true, kind, id, component: KERNEL_COMPONENT.REGISTRY });
  }

  function getRegistry(kind) {
    return Object.freeze({ ...(registries[kind] || {}) });
  }

  return {
    boot,
    shutdown,
    restart,
    pause,
    resume,
    reload,
    status,
    health,
    diagnostics,
    recover,
    registerInRegistry,
    getRegistry,
    getRuntimeContext() {
      return context;
    },
    getDependencyGraph() {
      return buildDependencyGraph([...services.values()]);
    },
    listServices() {
      return Object.freeze([...services.values()].map((s) => createServiceRecord(s)));
    },
    setHealthInterval(ms) {
      healthIntervalMs = Number(ms);
      return Object.freeze({ ok: true, intervalMs: healthIntervalMs, component: KERNEL_COMPONENT.MONITORING });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        state,
        safeMode,
        runtimeId: context.runtimeId,
        serviceCount: services.size,
        auditCount: audit.length,
        component: KERNEL_COMPONENT.RUNTIME
      });
    }
  };
}

module.exports = {
  KERNEL_COMPONENT,
  KERNEL_COMPONENT_ORDER,
  KERNEL_BOOT_PIPELINE,
  KERNEL_STATE,
  KERNEL_SERVICE_STATE,
  KERNEL_SERVICE_TRANSITIONS,
  KERNEL_RECOVERY_LEVEL,
  KERNEL_REGISTRY_KIND,
  KERNEL_PUBLIC_API,
  KERNEL_FORBIDDEN_ACTIVITIES,
  KERNEL_SAFE_MODE_SERVICES,
  KERNEL_RUNTIME_ANCHORS,
  DEFAULT_KERNEL_SERVICES,
  assertKernelForbiddenActivity,
  createServiceRecord,
  transitionServiceState,
  buildDependencyGraph,
  createRuntimeContext,
  runBootPipeline,
  collectKernelHealth,
  planRecovery,
  enterSafeMode,
  createKernelDiagnostics,
  createCoreKernel
};
