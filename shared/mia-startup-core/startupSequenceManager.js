"use strict";

/**
 * Master Canon 0052 — Startup Sequence Manager: ordered startup of services after Boot Manager.
 * No Battle/AI/game domain decisions — orchestration of startup order only.
 */

const crypto = require("crypto");

const SSM_COMPONENT = Object.freeze({
  SEQUENCE_MANAGER: "sequence_manager",
  LAYER_ORCHESTRATOR: "layer_orchestrator",
  DEPENDENCY_GRAPH: "dependency_graph",
  STARTUP_QUEUE: "startup_queue",
  PARALLEL_STARTER: "parallel_starter",
  SYNC_BARRIER: "sync_barrier",
  TIMEOUT_MANAGER: "timeout_manager",
  RETRY_MANAGER: "retry_manager",
  STARTUP_REPORT: "startup_report",
  STARTUP_METRICS: "startup_metrics",
  PLUGIN_HOOK: "plugin_hook",
  STARTUP_API: "startup_api"
});

const SSM_COMPONENT_ORDER = Object.freeze(Object.values(SSM_COMPONENT));

const SSM_LAYER = Object.freeze({
  L0_KERNEL: 0,
  L1_RUNTIME: 1,
  L2_INFRA: 2,
  L3_AI: 3,
  L4_GAMEPLAY: 4,
  L5_PRESENTATION: 5,
  L6_PLATFORMS: 6,
  L7_READY: 7
});

const SSM_LAYER_ORDER = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]);

const SSM_LAYER_SERVICES = Object.freeze({
  0: Object.freeze(["kernel", "logger", "configuration", "diagnostics", "recovery"]),
  1: Object.freeze(["runtime", "registries", "monitoring", "scheduler", "watchdog"]),
  2: Object.freeze(["memory", "event_bus", "module_runtime", "plugin_runtime"]),
  3: Object.freeze([
    "decision_engine",
    "action_orchestrator",
    "conversation",
    "speech",
    "personality",
    "emotion"
  ]),
  4: Object.freeze([
    "inventory",
    "economy",
    "battle",
    "quest",
    "community",
    "story",
    "world"
  ]),
  5: Object.freeze(["obs", "overlay", "video", "audio", "platform_connectors"]),
  6: Object.freeze(["tiktok", "kick", "twitch", "discord", "youtube", "api_connectors"]),
  7: Object.freeze(["ready"])
});

const SSM_SERVICE_STATE = Object.freeze({
  WAITING: "waiting",
  STARTING: "starting",
  INITIALIZING: "initializing",
  READY: "ready",
  RUNNING: "running",
  FAILED: "failed"
});

const SSM_SERVICE_TRANSITIONS = Object.freeze({
  [SSM_SERVICE_STATE.WAITING]: [SSM_SERVICE_STATE.STARTING, SSM_SERVICE_STATE.FAILED],
  [SSM_SERVICE_STATE.STARTING]: [SSM_SERVICE_STATE.INITIALIZING, SSM_SERVICE_STATE.FAILED],
  [SSM_SERVICE_STATE.INITIALIZING]: [SSM_SERVICE_STATE.READY, SSM_SERVICE_STATE.FAILED],
  [SSM_SERVICE_STATE.READY]: [SSM_SERVICE_STATE.RUNNING, SSM_SERVICE_STATE.FAILED],
  [SSM_SERVICE_STATE.RUNNING]: [],
  [SSM_SERVICE_STATE.FAILED]: [SSM_SERVICE_STATE.WAITING]
});

const SSM_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  OPTIONAL: "optional"
});

const SSM_PRIORITY_ORDER = Object.freeze([
  SSM_PRIORITY.CRITICAL,
  SSM_PRIORITY.HIGH,
  SSM_PRIORITY.NORMAL,
  SSM_PRIORITY.LOW,
  SSM_PRIORITY.OPTIONAL
]);

const SSM_DEFAULT_TIMEOUTS_MS = Object.freeze({
  start: 5000,
  initialization: 10000,
  ready: 5000
});

const SSM_FORBIDDEN_ACTIVITIES = Object.freeze([
  "decide_battle",
  "ai_decision",
  "game_logic",
  "mutate_economy",
  "chat_reply",
  "obs_direct_control",
  "start_platforms_before_ready"
]);

const SSM_PUBLIC_API = Object.freeze([
  "start",
  "stop",
  "status",
  "getQueue",
  "getReport",
  "getMetrics",
  "retryService"
]);

const SSM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-startup-core/startupSequenceManager.js",
  "shared/mia-boot-core/bootManager.js",
  "shared/mia-kernel-core/coreKernel.js",
  "shared/mia-module-core/pluginModuleEngine.js",
  "scripts/MIA_SERVER_BOOTSTRAP.js",
  "index.js",
  "server.js"
]);

const DEFAULT_SERVICE_DEFS = Object.freeze([
  { id: "kernel", layer: 0, priority: SSM_PRIORITY.CRITICAL, dependencies: [] },
  { id: "logger", layer: 0, priority: SSM_PRIORITY.CRITICAL, dependencies: ["kernel"] },
  { id: "configuration", layer: 0, priority: SSM_PRIORITY.CRITICAL, dependencies: ["logger"] },
  { id: "diagnostics", layer: 0, priority: SSM_PRIORITY.HIGH, dependencies: ["logger"] },
  { id: "recovery", layer: 0, priority: SSM_PRIORITY.HIGH, dependencies: ["diagnostics"] },
  { id: "runtime", layer: 1, priority: SSM_PRIORITY.HIGH, dependencies: ["configuration"] },
  { id: "registries", layer: 1, priority: SSM_PRIORITY.HIGH, dependencies: ["runtime"] },
  { id: "monitoring", layer: 1, priority: SSM_PRIORITY.HIGH, dependencies: ["logger"] },
  { id: "scheduler", layer: 1, priority: SSM_PRIORITY.HIGH, dependencies: ["runtime"] },
  { id: "watchdog", layer: 1, priority: SSM_PRIORITY.HIGH, dependencies: ["monitoring"] },
  { id: "memory", layer: 2, priority: SSM_PRIORITY.NORMAL, dependencies: ["runtime"] },
  { id: "event_bus", layer: 2, priority: SSM_PRIORITY.NORMAL, dependencies: ["memory"] },
  { id: "module_runtime", layer: 2, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus"] },
  { id: "plugin_runtime", layer: 2, priority: SSM_PRIORITY.LOW, dependencies: ["module_runtime"] },
  { id: "decision_engine", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus", "memory"] },
  { id: "action_orchestrator", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["decision_engine"] },
  { id: "conversation", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["decision_engine"] },
  { id: "speech", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["conversation"] },
  { id: "personality", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["decision_engine"] },
  { id: "emotion", layer: 3, priority: SSM_PRIORITY.NORMAL, dependencies: ["personality"] },
  { id: "inventory", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus"] },
  { id: "economy", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["inventory"] },
  { id: "battle", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["inventory", "economy", "event_bus"] },
  { id: "quest", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus"] },
  { id: "community", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus"] },
  { id: "story", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["community"] },
  { id: "world", layer: 4, priority: SSM_PRIORITY.NORMAL, dependencies: ["story"] },
  {
    id: "overlay",
    layer: 5,
    priority: SSM_PRIORITY.NORMAL,
    dependencies: ["runtime", "event_bus", "decision_engine"]
  },
  {
    id: "obs",
    layer: 5,
    priority: SSM_PRIORITY.NORMAL,
    dependencies: ["runtime", "event_bus", "decision_engine", "overlay"],
    optional: true
  },
  { id: "video", layer: 5, priority: SSM_PRIORITY.LOW, dependencies: ["overlay"] },
  { id: "audio", layer: 5, priority: SSM_PRIORITY.LOW, dependencies: ["speech"] },
  { id: "platform_connectors", layer: 5, priority: SSM_PRIORITY.NORMAL, dependencies: ["event_bus"] },
  { id: "tiktok", layer: 6, priority: SSM_PRIORITY.NORMAL, dependencies: ["platform_connectors"] },
  { id: "kick", layer: 6, priority: SSM_PRIORITY.NORMAL, dependencies: ["platform_connectors"] },
  { id: "twitch", layer: 6, priority: SSM_PRIORITY.NORMAL, dependencies: ["platform_connectors"] },
  { id: "discord", layer: 6, priority: SSM_PRIORITY.LOW, dependencies: ["platform_connectors"] },
  { id: "youtube", layer: 6, priority: SSM_PRIORITY.LOW, dependencies: ["platform_connectors"] },
  { id: "api_connectors", layer: 6, priority: SSM_PRIORITY.LOW, dependencies: ["platform_connectors"] },
  { id: "ready", layer: 7, priority: SSM_PRIORITY.CRITICAL, dependencies: [] }
]);

function assertStartupForbiddenActivity(activity) {
  const forbidden = SSM_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function transitionServiceState(current, next) {
  const allowed = SSM_SERVICE_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return Object.freeze({
      ok: false,
      error: "invalid_startup_state_transition",
      from: current,
      to: next,
      component: SSM_COMPONENT.SEQUENCE_MANAGER
    });
  }
  return Object.freeze({ ok: true, from: current, to: next, component: SSM_COMPONENT.SEQUENCE_MANAGER });
}

function buildStartupDependencyGraph(defs = DEFAULT_SERVICE_DEFS) {
  const nodes = defs.map((d) => d.id);
  const edges = [];
  for (const def of defs) {
    for (const dep of def.dependencies || []) {
      edges.push(Object.freeze({ from: dep, to: def.id }));
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let cyclic = false;

  function dfs(id) {
    if (visiting.has(id)) {
      cyclic = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of edges) {
      if (edge.from === id) dfs(edge.to);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of nodes) dfs(id);

  return Object.freeze({
    ok: !cyclic,
    cyclic,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    component: SSM_COMPONENT.DEPENDENCY_GRAPH
  });
}

function dependenciesSatisfied(serviceId, defs, states) {
  const def = defs.find((d) => d.id === serviceId);
  if (!def) return false;
  return (def.dependencies || []).every((dep) => {
    const st = states[dep];
    return st === SSM_SERVICE_STATE.READY || st === SSM_SERVICE_STATE.RUNNING;
  });
}

function buildStartupQueue(defs = DEFAULT_SERVICE_DEFS) {
  const byLayer = new Map();
  for (const def of defs) {
    if (def.id === "ready") continue;
    const list = byLayer.get(def.layer) || [];
    list.push(def);
    byLayer.set(def.layer, list);
  }

  const queue = [];
  const parallelGroups = [];

  for (const layer of SSM_LAYER_ORDER) {
    if (layer === 6 || layer === 7) continue;
    const services = (byLayer.get(layer) || []).slice().sort((a, b) => {
      return SSM_PRIORITY_ORDER.indexOf(a.priority) - SSM_PRIORITY_ORDER.indexOf(b.priority);
    });

    const groups = [];
    const remaining = [...services];
    while (remaining.length > 0) {
      const group = [];
      const idsInGroup = new Set();
      for (const svc of [...remaining]) {
        const depsInRemaining = (svc.dependencies || []).some((d) =>
          remaining.some((r) => r.id === d)
        );
        const depsInGroup = (svc.dependencies || []).some((d) => idsInGroup.has(d));
        if (!depsInRemaining && !depsInGroup) {
          group.push(svc.id);
          idsInGroup.add(svc.id);
          remaining.splice(remaining.indexOf(svc), 1);
        }
      }
      if (group.length === 0) {
        group.push(remaining.shift().id);
      }
      groups.push(Object.freeze(group));
      for (const id of group) queue.push(id);
    }

    parallelGroups.push(
      Object.freeze({
        layer,
        groups: Object.freeze(groups),
        syncAfter: true
      })
    );
  }

  queue.push("ready");
  return Object.freeze({
    ok: true,
    queue: Object.freeze(queue),
    parallelGroups: Object.freeze(parallelGroups),
    component: SSM_COMPONENT.STARTUP_QUEUE
  });
}

function synchronizeLayer(layer, states, defs) {
  const layerServices = defs.filter((d) => d.layer === layer && d.id !== "ready");
  const pending = layerServices.filter((d) => {
    const st = states[d.id];
    if (d.optional && st === SSM_SERVICE_STATE.FAILED) return false;
    return st !== SSM_SERVICE_STATE.READY && st !== SSM_SERVICE_STATE.RUNNING;
  });
  return Object.freeze({
    ok: pending.length === 0,
    layer,
    pending: Object.freeze(pending.map((p) => p.id)),
    canAdvance: pending.length === 0,
    component: SSM_COMPONENT.SYNC_BARRIER
  });
}

function runPluginHook(kernelReady = false) {
  if (!kernelReady) {
    return Object.freeze({
      ok: false,
      error: "kernel_not_ready",
      blocksKernel: false,
      component: SSM_COMPONENT.PLUGIN_HOOK
    });
  }
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      "kernel_ready",
      "plugin_discovery",
      "plugin_validation",
      "plugin_initialization",
      "plugin_ready"
    ]),
    blocksKernel: false,
    component: SSM_COMPONENT.PLUGIN_HOOK
  });
}

function assertObsStartupOrder(states = {}) {
  const required = ["runtime", "event_bus", "decision_engine", "overlay"];
  const missing = required.filter(
    (id) => states[id] !== SSM_SERVICE_STATE.READY && states[id] !== SSM_SERVICE_STATE.RUNNING
  );
  return Object.freeze({
    ok: missing.length === 0,
    missing: Object.freeze(missing),
    obsMayStart: missing.length === 0,
    component: SSM_COMPONENT.LAYER_ORCHESTRATOR
  });
}

function assertPlatformsAfterReady(platformReady = false, systemReady = false) {
  if (!systemReady && platformReady) {
    return Object.freeze({
      ok: false,
      error: "platforms_before_ready",
      component: SSM_COMPONENT.LAYER_ORCHESTRATOR
    });
  }
  return Object.freeze({
    ok: true,
    platformsAfterReady: true,
    component: SSM_COMPONENT.LAYER_ORCHESTRATOR
  });
}

function collectStartupMetrics(input = {}) {
  return Object.freeze({
    ok: true,
    totalDurationMs: input.totalDurationMs != null ? Number(input.totalDurationMs) : 0,
    serviceCount: input.serviceCount != null ? Number(input.serviceCount) : 0,
    slowestService: input.slowestService || null,
    parallelStarts: input.parallelStarts != null ? Number(input.parallelStarts) : 0,
    retryCount: input.retryCount != null ? Number(input.retryCount) : 0,
    failedCount: input.failedCount != null ? Number(input.failedCount) : 0,
    component: SSM_COMPONENT.STARTUP_METRICS
  });
}

function generateStartupReport(input = {}) {
  return Object.freeze({
    ok: true,
    startupId: input.startupId || `startup-${crypto.randomUUID()}`,
    services: Object.freeze(input.services || []),
    order: Object.freeze(input.order || []),
    timings: Object.freeze(input.timings || {}),
    parallelGroups: Object.freeze(input.parallelGroups || []),
    errors: Object.freeze(input.errors || []),
    warnings: Object.freeze(input.warnings || []),
    disabledModules: Object.freeze(input.disabledModules || []),
    state: input.state || "ready",
    component: SSM_COMPONENT.STARTUP_REPORT
  });
}

function createStartupSequenceManager(options = {}) {
  const defs = [...DEFAULT_SERVICE_DEFS, ...(options.extraServices || [])];
  const timeouts = { ...SSM_DEFAULT_TIMEOUTS_MS, ...(options.timeouts || {}) };
  const maxRetries = options.maxRetries != null ? Number(options.maxRetries) : 3;
  const states = {};
  const timings = {};
  const attempts = {};
  const audit = [];
  let lastReport = null;
  let lastMetrics = null;
  let state = "idle";
  let singleton = true;
  let bootCompleted = options.bootCompleted === true;

  for (const def of defs) {
    states[def.id] = SSM_SERVICE_STATE.WAITING;
    attempts[def.id] = 0;
  }

  function auditAction(action, detail = {}) {
    audit.push(Object.freeze({ at: Date.now(), action, detail: Object.freeze(detail) }));
  }

  function startService(serviceId, input = {}) {
    const def = defs.find((d) => d.id === serviceId);
    if (!def) {
      return Object.freeze({ ok: false, error: "unknown_service", component: SSM_COMPONENT.STARTUP_API });
    }
    if (states[serviceId] === SSM_SERVICE_STATE.RUNNING || states[serviceId] === SSM_SERVICE_STATE.READY) {
      return Object.freeze({
        ok: false,
        error: "double_initialization_forbidden",
        serviceId,
        component: SSM_COMPONENT.STARTUP_API
      });
    }
    if (!dependenciesSatisfied(serviceId, defs, states)) {
      return Object.freeze({
        ok: false,
        error: "dependencies_not_ready",
        serviceId,
        component: SSM_COMPONENT.STARTUP_API
      });
    }
    if (serviceId === "obs") {
      const obsGate = assertObsStartupOrder(states);
      if (!obsGate.ok || input.obsUnavailable === true) {
        if (def.optional || input.obsUnavailable === true || !obsGate.ok) {
          states[serviceId] = SSM_SERVICE_STATE.FAILED;
          return Object.freeze({
            ok: true,
            degraded: true,
            serviceId,
            warning: "obs_unavailable_continue",
            component: SSM_COMPONENT.STARTUP_API
          });
        }
        return Object.freeze({ ok: false, error: "obs_order_violation", obsGate, component: SSM_COMPONENT.STARTUP_API });
      }
    }
    if (def.layer === 6) {
      const systemReady =
        states.ready === SSM_SERVICE_STATE.READY || states.ready === SSM_SERVICE_STATE.RUNNING;
      if (!systemReady && !input.allowEarlyPlatform) {
        return Object.freeze({
          ok: false,
          error: "platforms_before_ready",
          component: SSM_COMPONENT.STARTUP_API
        });
      }
    }

    const startedAt = Date.now();
    let current = states[serviceId] || SSM_SERVICE_STATE.WAITING;
    for (const next of [
      SSM_SERVICE_STATE.STARTING,
      SSM_SERVICE_STATE.INITIALIZING,
      SSM_SERVICE_STATE.READY,
      SSM_SERVICE_STATE.RUNNING
    ]) {
      if (input.failAt === next) {
        states[serviceId] = SSM_SERVICE_STATE.FAILED;
        attempts[serviceId] += 1;
        timings[serviceId] = Date.now() - startedAt;
        return Object.freeze({
          ok: false,
          error: "service_start_failed",
          serviceId,
          failedAt: next,
          attempts: attempts[serviceId],
          component: SSM_COMPONENT.STARTUP_API
        });
      }
      const tr = transitionServiceState(current, next);
      if (!tr.ok) return tr;
      current = next;
      states[serviceId] = next;
    }
    timings[serviceId] = Date.now() - startedAt;
    attempts[serviceId] += 1;
    auditAction("start_service", { serviceId });
    return Object.freeze({
      ok: true,
      serviceId,
      state: states[serviceId],
      durationMs: timings[serviceId],
      component: SSM_COMPONENT.STARTUP_API
    });
  }

  function retryService(serviceId, input = {}) {
    if (attempts[serviceId] >= maxRetries) {
      return Object.freeze({
        ok: false,
        error: "max_retries_exceeded",
        serviceId,
        attempts: attempts[serviceId],
        recovery: true,
        component: SSM_COMPONENT.RETRY_MANAGER
      });
    }
    states[serviceId] = SSM_SERVICE_STATE.WAITING;
    return startService(serviceId, input);
  }

  function start(input = {}) {
    if (!bootCompleted && input.bootCompleted !== true) {
      return Object.freeze({
        ok: false,
        error: "boot_manager_required",
        component: SSM_COMPONENT.STARTUP_API
      });
    }
    bootCompleted = true;
    state = "starting";
    const startedAt = Date.now();
    const graph = buildStartupDependencyGraph(defs);
    if (!graph.ok) {
      state = "failed";
      return Object.freeze({
        ok: false,
        error: "cyclic_dependency",
        graph,
        component: SSM_COMPONENT.STARTUP_API
      });
    }

    const queuePlan = buildStartupQueue(defs);
    const errors = [];
    const warnings = [];
    const order = [];
    let parallelStarts = 0;
    let retryCount = 0;

    for (const groupInfo of queuePlan.parallelGroups) {
      for (const group of groupInfo.groups) {
        if (group.length > 1) parallelStarts += 1;
        for (const serviceId of group) {
          if ((input.disabledModules || []).includes(serviceId)) {
            warnings.push({ code: "module_disabled", serviceId });
            continue;
          }
          let result = startService(serviceId, {
            obsUnavailable: input.obsUnavailable === true && serviceId === "obs"
          });
          if (!result.ok && result.error === "service_start_failed") {
            while (!result.ok && attempts[serviceId] < maxRetries) {
              retryCount += 1;
              result = retryService(serviceId, input.failServices?.[serviceId] ? { failAt: SSM_SERVICE_STATE.STARTING } : {});
            }
            if (!result.ok) {
              const def = defs.find((d) => d.id === serviceId);
              if (def?.optional || def?.priority === SSM_PRIORITY.OPTIONAL || def?.priority === SSM_PRIORITY.LOW) {
                warnings.push({ code: "noncritical_failed", serviceId });
                errors.push({ serviceId, severity: "warning" });
              } else if (input.failServices?.[serviceId] && input.treatAsNonCritical?.includes(serviceId)) {
                warnings.push({ code: "noncritical_failed", serviceId });
              } else {
                errors.push({ serviceId, severity: "error" });
                if (!input.continueOnCriticalFailure) {
                  state = "failed";
                  lastReport = generateStartupReport({
                    order,
                    errors,
                    warnings,
                    state: "failed",
                    parallelGroups: queuePlan.parallelGroups
                  });
                  return Object.freeze({
                    ok: false,
                    error: "critical_service_failed",
                    serviceId,
                    report: lastReport,
                    component: SSM_COMPONENT.STARTUP_API
                  });
                }
              }
            }
          }
          if (result.ok) order.push(serviceId);
          if (result.degraded) warnings.push({ code: result.warning, serviceId });
        }
      }

      const sync = synchronizeLayer(groupInfo.layer, states, defs);
      if (!sync.ok && groupInfo.layer < 6) {
        const blocking = sync.pending.filter((id) => {
          const def = defs.find((d) => d.id === id);
          return !def?.optional && !(input.disabledModules || []).includes(id);
        });
        if (blocking.length > 0 && !input.skipSync) {
          state = "failed";
          return Object.freeze({
            ok: false,
            error: "layer_sync_failed",
            layer: groupInfo.layer,
            pending: blocking,
            component: SSM_COMPONENT.SYNC_BARRIER
          });
        }
      }
    }

    const kernelReady =
      states.kernel === SSM_SERVICE_STATE.RUNNING || states.kernel === SSM_SERVICE_STATE.READY;
    const plugins = runPluginHook(kernelReady);

    states.ready = SSM_SERVICE_STATE.RUNNING;
    order.push("ready");

    for (const platformId of ["tiktok", "kick", "twitch", "discord", "youtube", "api_connectors"]) {
      if ((input.disabledModules || []).includes(platformId)) continue;
      if (states[platformId] === SSM_SERVICE_STATE.WAITING) {
        const platformStart = startService(platformId, {});
        if (platformStart.ok) order.push(platformId);
      }
    }

    state = "ready";
    const failedCount = Object.values(states).filter((s) => s === SSM_SERVICE_STATE.FAILED).length;
    let slowestService = null;
    let slowestMs = -1;
    for (const [id, ms] of Object.entries(timings)) {
      if (ms > slowestMs) {
        slowestMs = ms;
        slowestService = id;
      }
    }

    lastMetrics = collectStartupMetrics({
      totalDurationMs: Date.now() - startedAt,
      serviceCount: order.length,
      slowestService,
      parallelStarts,
      retryCount,
      failedCount
    });

    lastReport = generateStartupReport({
      services: Object.keys(states),
      order,
      timings,
      parallelGroups: queuePlan.parallelGroups,
      errors,
      warnings,
      disabledModules: input.disabledModules || [],
      state: "ready"
    });

    auditAction("startup_complete", { state });
    return Object.freeze({
      ok: true,
      state: "ready",
      graph,
      queue: queuePlan,
      order: Object.freeze(order),
      plugins,
      report: lastReport,
      metrics: lastMetrics,
      mutatesDomain: false,
      decidesBattle: false,
      singleton,
      timeouts: Object.freeze({ ...timeouts }),
      component: SSM_COMPONENT.STARTUP_API
    });
  }

  function stop() {
    for (const id of Object.keys(states)) {
      states[id] = SSM_SERVICE_STATE.WAITING;
    }
    state = "stopped";
    auditAction("stop");
    return Object.freeze({ ok: true, state, component: SSM_COMPONENT.STARTUP_API });
  }

  function status() {
    return Object.freeze({
      ok: true,
      state,
      singleton,
      bootCompleted,
      publicApi: SSM_PUBLIC_API,
      layers: SSM_LAYER_ORDER,
      serviceStates: Object.freeze({ ...states }),
      component: SSM_COMPONENT.STARTUP_API
    });
  }

  return {
    start,
    stop,
    status,
    getQueue: () => buildStartupQueue(defs),
    getReport: () => lastReport,
    getMetrics: () => lastMetrics,
    retryService,
    startService,
    getDependencyGraph: () => buildStartupDependencyGraph(defs),
    synchronizeLayer: (layer) => synchronizeLayer(layer, states, defs),
    runPluginHook: (ready) => runPluginHook(ready),
    assertObsStartupOrder: () => assertObsStartupOrder(states),
    setTimeouts(next = {}) {
      Object.assign(timeouts, next);
      return Object.freeze({ ok: true, timeouts: Object.freeze({ ...timeouts }) });
    },
    getTimeouts() {
      return Object.freeze({ ...timeouts });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        state,
        singleton,
        serviceCount: Object.keys(states).length,
        component: SSM_COMPONENT.SEQUENCE_MANAGER
      });
    }
  };
}

module.exports = {
  SSM_COMPONENT,
  SSM_COMPONENT_ORDER,
  SSM_LAYER,
  SSM_LAYER_ORDER,
  SSM_LAYER_SERVICES,
  SSM_SERVICE_STATE,
  SSM_SERVICE_TRANSITIONS,
  SSM_PRIORITY,
  SSM_PRIORITY_ORDER,
  SSM_DEFAULT_TIMEOUTS_MS,
  SSM_FORBIDDEN_ACTIVITIES,
  SSM_PUBLIC_API,
  SSM_RUNTIME_ANCHORS,
  DEFAULT_SERVICE_DEFS,
  assertStartupForbiddenActivity,
  transitionServiceState,
  buildStartupDependencyGraph,
  buildStartupQueue,
  synchronizeLayer,
  runPluginHook,
  assertObsStartupOrder,
  assertPlatformsAfterReady,
  collectStartupMetrics,
  generateStartupReport,
  createStartupSequenceManager
};
