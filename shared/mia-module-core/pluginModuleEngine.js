"use strict";

/**
 * Master Canon 0049 — Plugin & Module Engine: safe install, update and detach modules without rewriting core.
 */

const crypto = require("crypto");

const PME_COMPONENT = Object.freeze({
  MODULE_MANAGER: "module_manager",
  PLUGIN_REGISTRY: "plugin_registry",
  MANIFEST_VALIDATOR: "manifest_validator",
  DEPENDENCY_RESOLVER: "dependency_resolver",
  LIFECYCLE_MANAGER: "lifecycle_manager",
  EVENT_BUS_ADAPTER: "event_bus_adapter",
  CONFIG_MANAGER: "config_manager",
  SECURITY_GATE: "security_gate",
  HOT_RELOAD_GUARD: "hot_reload_guard",
  ERROR_RECOVERY: "error_recovery",
  MODULE_METRICS: "module_metrics",
  MODULE_API: "module_api"
});

const PME_COMPONENT_ORDER = Object.freeze(Object.values(PME_COMPONENT));

const PME_STATE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  RUNNING: "running",
  DEGRADED: "degraded",
  PAUSED: "paused",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed"
});

const PME_STATE_ORDER = Object.freeze([
  PME_STATE.CREATED,
  PME_STATE.INITIALIZED,
  PME_STATE.READY,
  PME_STATE.RUNNING,
  PME_STATE.DEGRADED,
  PME_STATE.PAUSED,
  PME_STATE.STOPPING,
  PME_STATE.STOPPED
]);

const PME_TRANSITIONS = Object.freeze({
  [PME_STATE.CREATED]: [PME_STATE.INITIALIZED, PME_STATE.FAILED],
  [PME_STATE.INITIALIZED]: [PME_STATE.READY, PME_STATE.FAILED],
  [PME_STATE.READY]: [PME_STATE.RUNNING, PME_STATE.FAILED],
  [PME_STATE.RUNNING]: [PME_STATE.DEGRADED, PME_STATE.PAUSED, PME_STATE.STOPPING, PME_STATE.FAILED],
  [PME_STATE.DEGRADED]: [PME_STATE.RUNNING, PME_STATE.PAUSED, PME_STATE.STOPPING, PME_STATE.FAILED],
  [PME_STATE.PAUSED]: [PME_STATE.RUNNING, PME_STATE.STOPPING, PME_STATE.FAILED],
  [PME_STATE.STOPPING]: [PME_STATE.STOPPED, PME_STATE.FAILED],
  [PME_STATE.STOPPED]: [PME_STATE.CREATED]
});

const PME_SYSTEM_EVENT = Object.freeze({
  INITIALIZED: "PLUGIN_AND_MODULE_ENGINE_INITIALIZED",
  STARTED: "PLUGIN_AND_MODULE_ENGINE_STARTED",
  UPDATED: "PLUGIN_AND_MODULE_ENGINE_UPDATED",
  FAILED: "PLUGIN_AND_MODULE_ENGINE_FAILED",
  STOPPED: "PLUGIN_AND_MODULE_ENGINE_STOPPED"
});

const PME_FORBIDDEN_ACTIVITIES = Object.freeze([
  "bypass_event_bus",
  "bypass_decision_engine",
  "bypass_action_orchestrator",
  "bypass_public_api",
  "run_unverified_in_production"
]);

const PME_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-module-core/pluginModuleEngine.js",
  "shared/mia-creature-core/creatureEvolutionEngine.js",
  "shared/mia-event-core/eventBus.js",
  "shared/mia-event-core/eventRegistry.js",
  "shared/mia-core-canon/lifecycleManager.js",
  "shared/mia-monitoring-core/monitoringSystem.js",
  "scripts/MIA_CONFIG.js"
]);

const DEFAULT_MODULE_MANIFESTS = Object.freeze([
  {
    moduleId: "battle",
    name: "Battle Engine Module",
    version: "1.0.0",
    api: "battleEngine",
    verified: true,
    publishes: ["BATTLE_STARTED", "BATTLE_FINISHED"],
    subscribes: ["DECISION_MADE"],
    dependencies: ["decision_engine"],
    permissions: ["game.battle"]
  },
  {
    moduleId: "fishing",
    name: "Fishing Module",
    version: "0.1.0",
    api: "gameModule",
    verified: true,
    publishes: ["FISHING_CATCH"],
    subscribes: ["QUEST_COMPLETED"],
    dependencies: ["inventory_engine"],
    permissions: ["game.minigame"]
  }
]);

function createModuleManifest(input = {}) {
  if (!input.moduleId || !input.version) {
    return Object.freeze({
      ok: false,
      error: "manifest_incomplete",
      component: PME_COMPONENT.MANIFEST_VALIDATOR
    });
  }
  return Object.freeze({
    ok: true,
    moduleId: input.moduleId,
    name: input.name || input.moduleId,
    version: input.version,
    api: input.api || "moduleApi",
    inputSchema: input.inputSchema || "module.input.v1",
    outputSchema: input.outputSchema || "module.output.v1",
    publishes: Object.freeze(input.publishes || []),
    subscribes: Object.freeze(input.subscribes || []),
    dependencies: Object.freeze(input.dependencies || []),
    permissions: Object.freeze(input.permissions || []),
    verified: input.verified === true,
    configVersion: input.configVersion || "1.0",
    timeouts: Object.freeze(input.timeouts || { startMs: 5000, stopMs: 3000 }),
    retryPolicy: Object.freeze(input.retryPolicy || { maxAttempts: 3, backoffMs: 250 }),
    idempotent: input.idempotent !== false,
    component: PME_COMPONENT.MANIFEST_VALIDATOR
  });
}

function validateManifest(manifest = {}) {
  const required = ["moduleId", "version", "api", "inputSchema", "outputSchema"];
  const missing = required.filter((key) => !manifest[key]);
  if (missing.length > 0) {
    return Object.freeze({
      ok: false,
      error: "manifest_validation_failed",
      missing,
      component: PME_COMPONENT.MANIFEST_VALIDATOR
    });
  }
  return Object.freeze({
    ok: true,
    manifest,
    component: PME_COMPONENT.MANIFEST_VALIDATOR
  });
}

function resolveDependencies(manifest = {}, registry = {}) {
  const unresolved = (manifest.dependencies || []).filter((dep) => !registry[dep] && dep !== manifest.moduleId);
  return Object.freeze({
    ok: unresolved.length === 0,
    moduleId: manifest.moduleId,
    dependencies: Object.freeze(manifest.dependencies || []),
    unresolved: Object.freeze(unresolved),
    component: PME_COMPONENT.DEPENDENCY_RESOLVER
  });
}

function transitionModuleState(current = PME_STATE.CREATED, next = PME_STATE.INITIALIZED) {
  const allowed = PME_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return Object.freeze({
      ok: false,
      error: "invalid_module_transition",
      from: current,
      to: next,
      component: PME_COMPONENT.LIFECYCLE_MANAGER
    });
  }
  return Object.freeze({
    ok: true,
    from: current,
    to: next,
    component: PME_COMPONENT.LIFECYCLE_MANAGER
  });
}

function publishModuleEvent(eventType, payload = {}, adapters = {}) {
  if (payload.bypassEventBus === true) {
    return Object.freeze({
      ok: false,
      error: "event_bus_required",
      component: PME_COMPONENT.EVENT_BUS_ADAPTER
    });
  }
  const correlationId = payload.correlationId || `corr-${crypto.randomUUID()}`;
  const event = Object.freeze({
    type: eventType,
    correlationId,
    payload: Object.freeze({ ...payload, correlationId }),
    at: Date.now()
  });
  let published = false;
  if (adapters.eventBus && typeof adapters.eventBus.publish === "function") {
    adapters.eventBus.publish(event);
    published = true;
  }
  return Object.freeze({
    ok: true,
    event,
    published,
    viaEventBus: published,
    component: PME_COMPONENT.EVENT_BUS_ADAPTER
  });
}

function validateModuleConfig(input = {}) {
  if (input.secretsInRepo === true) {
    return Object.freeze({
      ok: false,
      error: "secrets_in_repo_forbidden",
      component: PME_COMPONENT.CONFIG_MANAGER
    });
  }
  return Object.freeze({
    ok: true,
    configVersion: input.configVersion || "1.0",
    validated: true,
    hardcodedCritical: input.hardcodedCritical === true ? false : true,
    component: PME_COMPONENT.CONFIG_MANAGER
  });
}

function assertProductionGate(manifest = {}, environment = "production") {
  if (environment === "production" && manifest.verified !== true) {
    return Object.freeze({
      ok: false,
      error: "unverified_module_in_production",
      moduleId: manifest.moduleId,
      component: PME_COMPONENT.SECURITY_GATE
    });
  }
  return Object.freeze({
    ok: true,
    moduleId: manifest.moduleId,
    environment,
    component: PME_COMPONENT.SECURITY_GATE
  });
}

function canHotReload(context = {}) {
  if (context.battleActive || context.economyTransactionActive || context.obsActionActive) {
    return Object.freeze({
      ok: false,
      error: "hot_reload_blocked",
      reason: context.battleActive
        ? "battle_active"
        : context.economyTransactionActive
          ? "economy_transaction_active"
          : "obs_action_active",
      component: PME_COMPONENT.HOT_RELOAD_GUARD
    });
  }
  return Object.freeze({
    ok: true,
    safe: true,
    component: PME_COMPONENT.HOT_RELOAD_GUARD
  });
}

function recordModuleError(input = {}) {
  return Object.freeze({
    ok: true,
    errorId: input.errorId || `err-${crypto.randomUUID()}`,
    componentId: input.componentId || PME_COMPONENT.MODULE_API,
    severity: input.severity || "error",
    at: input.at || Date.now(),
    correlationId: input.correlationId || `corr-${crypto.randomUUID()}`,
    message: input.message || "module_error",
    cause: input.cause || null,
    recoveryStep: input.recoveryStep || "retry_or_disable_module",
    component: PME_COMPONENT.ERROR_RECOVERY
  });
}

function collectModuleMetrics(input = {}) {
  return Object.freeze({
    ok: true,
    health: input.health || "healthy",
    inputs: input.inputs != null ? Number(input.inputs) : 0,
    outputs: input.outputs != null ? Number(input.outputs) : 0,
    latencyMs: input.latencyMs != null ? Number(input.latencyMs) : 0,
    errorRate: input.errorRate != null ? Number(input.errorRate) : 0,
    retries: input.retries != null ? Number(input.retries) : 0,
    timeouts: input.timeouts != null ? Number(input.timeouts) : 0,
    queueDepth: input.queueDepth != null ? Number(input.queueDepth) : 0,
    component: PME_COMPONENT.MODULE_METRICS
  });
}

function manageModuleRecord(input = {}) {
  return Object.freeze({
    ok: true,
    moduleId: input.moduleId,
    state: input.state || PME_STATE.CREATED,
    manifest: input.manifest || null,
    component: PME_COMPONENT.MODULE_MANAGER
  });
}

function assertPluginForbiddenActivity(activity) {
  const forbidden = PME_FORBIDDEN_ACTIVITIES.includes(activity);
  return Object.freeze({ ok: !forbidden, activity, forbidden });
}

function createPluginModuleEngine(options = {}) {
  const registry = {};
  const states = new Map();
  const errors = [];
  const metrics = [];
  const environment = options.environment || "production";

  for (const manifest of DEFAULT_MODULE_MANIFESTS) {
    const created = createModuleManifest(manifest);
    if (created.ok) registry[created.moduleId] = created;
  }
  for (const depId of ["decision_engine", "inventory_engine", "event_bus"]) {
    const dep = createModuleManifest({
      moduleId: depId,
      name: depId,
      version: "1.0.0",
      verified: true,
      dependencies: []
    });
    if (dep.ok) registry[depId] = dep;
  }
  for (const extra of options.extraManifests || []) {
    const created = createModuleManifest(extra);
    if (created.ok) registry[created.moduleId] = created;
  }

  return {
    registerModule(input = {}) {
      const manifest = createModuleManifest(input);
      if (!manifest.ok) return manifest;
      const validation = validateManifest(manifest);
      if (!validation.ok) return validation;
      registry[manifest.moduleId] = manifest;
      states.set(manifest.moduleId, PME_STATE.CREATED);
      return Object.freeze({
        ok: true,
        manifest,
        state: PME_STATE.CREATED,
        component: PME_COMPONENT.PLUGIN_REGISTRY
      });
    },
    installModule(moduleId, adapters = {}) {
      const manifest = registry[moduleId];
      if (!manifest) {
        return Object.freeze({ ok: false, error: "module_not_found", component: PME_COMPONENT.MODULE_API });
      }
      const deps = resolveDependencies(manifest, registry);
      if (!deps.ok) return deps;
      const config = validateModuleConfig({ configVersion: manifest.configVersion });
      if (!config.ok) return config;
      const gate = assertProductionGate(manifest, environment);
      if (!gate.ok) return gate;

      const current = states.get(moduleId) || PME_STATE.CREATED;
      const toInit = transitionModuleState(current, PME_STATE.INITIALIZED);
      if (!toInit.ok) return toInit;
      states.set(moduleId, PME_STATE.INITIALIZED);

      const toReady = transitionModuleState(PME_STATE.INITIALIZED, PME_STATE.READY);
      states.set(moduleId, PME_STATE.READY);

      const event = publishModuleEvent(PME_SYSTEM_EVENT.INITIALIZED, { moduleId }, adapters);
      return Object.freeze({
        ok: true,
        manifest,
        state: PME_STATE.READY,
        dependencies: deps,
        config,
        event,
        component: PME_COMPONENT.MODULE_API
      });
    },
    startModule(moduleId, adapters = {}) {
      const manifest = registry[moduleId];
      if (!manifest) {
        return Object.freeze({ ok: false, error: "module_not_found", component: PME_COMPONENT.MODULE_API });
      }
      const gate = assertProductionGate(manifest, environment);
      if (!gate.ok) return gate;

      const current = states.get(moduleId) || PME_STATE.READY;
      const transition = transitionModuleState(current, PME_STATE.RUNNING);
      if (!transition.ok) return transition;
      states.set(moduleId, PME_STATE.RUNNING);

      const event = publishModuleEvent(
        PME_SYSTEM_EVENT.STARTED,
        { moduleId, correlationId: adapters.correlationId },
        adapters
      );
      metrics.push(collectModuleMetrics({ health: "healthy", inputs: 1 }));
      return Object.freeze({
        ok: true,
        moduleId,
        state: PME_STATE.RUNNING,
        event,
        bypassesDecisionEngine: false,
        bypassesActionOrchestrator: false,
        component: PME_COMPONENT.MODULE_API
      });
    },
    updateModule(moduleId, input = {}, adapters = {}) {
      const manifest = registry[moduleId];
      if (!manifest) {
        return Object.freeze({ ok: false, error: "module_not_found", component: PME_COMPONENT.MODULE_API });
      }
      const guard = canHotReload(input.context || {});
      if (!guard.ok) return guard;

      const nextManifest = createModuleManifest({
        ...manifest,
        ...input.manifest,
        moduleId,
        verified: input.manifest?.verified != null ? input.manifest.verified : manifest.verified
      });
      if (!nextManifest.ok) return nextManifest;
      registry[moduleId] = nextManifest;

      const event = publishModuleEvent(PME_SYSTEM_EVENT.UPDATED, { moduleId, version: nextManifest.version }, adapters);
      return Object.freeze({
        ok: true,
        manifest: nextManifest,
        hotReload: true,
        requiresCoreRestart: false,
        event,
        component: PME_COMPONENT.MODULE_API
      });
    },
    stopModule(moduleId, adapters = {}) {
      const manifest = registry[moduleId];
      if (!manifest) {
        return Object.freeze({ ok: false, error: "module_not_found", component: PME_COMPONENT.MODULE_API });
      }
      const current = states.get(moduleId) || PME_STATE.RUNNING;
      const stopping = transitionModuleState(current, PME_STATE.STOPPING);
      if (!stopping.ok && current !== PME_STATE.PAUSED) return stopping;
      states.set(moduleId, PME_STATE.STOPPING);
      states.set(moduleId, PME_STATE.STOPPED);

      const event = publishModuleEvent(PME_SYSTEM_EVENT.STOPPED, { moduleId }, adapters);
      return Object.freeze({
        ok: true,
        moduleId,
        state: PME_STATE.STOPPED,
        event,
        component: PME_COMPONENT.MODULE_API
      });
    },
    failModule(moduleId, input = {}, adapters = {}) {
      states.set(moduleId, PME_STATE.FAILED);
      const err = recordModuleError({
        componentId: moduleId,
        message: input.message,
        correlationId: input.correlationId,
        recoveryStep: input.recoveryStep
      });
      errors.push(err);
      const event = publishModuleEvent(PME_SYSTEM_EVENT.FAILED, { moduleId, errorId: err.errorId }, adapters);
      return Object.freeze({
        ok: false,
        error: err,
        state: PME_STATE.FAILED,
        event,
        platformContinues: true,
        component: PME_COMPONENT.ERROR_RECOVERY
      });
    },
    getModule(moduleId) {
      const manifest = registry[moduleId];
      if (!manifest) return null;
      return manageModuleRecord({
        moduleId,
        state: states.get(moduleId) || PME_STATE.CREATED,
        manifest
      });
    },
    listModules() {
      return Object.freeze(
        Object.keys(registry).map((moduleId) =>
          manageModuleRecord({
            moduleId,
            state: states.get(moduleId) || PME_STATE.CREATED,
            manifest: registry[moduleId]
          })
        )
      );
    },
    metrics() {
      return Object.freeze([...metrics]);
    },
    errors() {
      return Object.freeze([...errors]);
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        moduleCount: Object.keys(registry).length,
        runningCount: [...states.values()].filter((s) => s === PME_STATE.RUNNING).length,
        errorCount: errors.length,
        component: PME_COMPONENT.MODULE_API
      });
    }
  };
}

function createModuleApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: options.decides === true,
    executes: options.executes === true,
    data,
    component: PME_COMPONENT.MODULE_API
  });
}

module.exports = {
  PME_COMPONENT,
  PME_COMPONENT_ORDER,
  PME_STATE,
  PME_STATE_ORDER,
  PME_TRANSITIONS,
  PME_SYSTEM_EVENT,
  PME_FORBIDDEN_ACTIVITIES,
  PME_RUNTIME_ANCHORS,
  DEFAULT_MODULE_MANIFESTS,
  createModuleManifest,
  validateManifest,
  resolveDependencies,
  transitionModuleState,
  publishModuleEvent,
  validateModuleConfig,
  assertProductionGate,
  canHotReload,
  recordModuleError,
  collectModuleMetrics,
  manageModuleRecord,
  createPluginModuleEngine,
  createModuleApiResponse,
  assertPluginForbiddenActivity
};
