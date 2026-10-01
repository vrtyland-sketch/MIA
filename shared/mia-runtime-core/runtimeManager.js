"use strict";

/**
 * Master Canon 0062 — Runtime Manager.
 * Owns the single active MIA Runtime context, registry, lifecycle, session,
 * diagnostics, and coordination of Kernel runtime services.
 */

const crypto = require("crypto");
const os = require("os");

const RM_COMPONENT = Object.freeze({
  RUNTIME_MANAGER: "runtime_manager",
  RUNTIME_CONTEXT: "runtime_context",
  RUNTIME_REGISTRY: "runtime_registry",
  RUNTIME_SESSION: "runtime_session",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  KERNEL_COORDINATOR: "kernel_coordinator",
  CONFIGURATION_BRIDGE: "configuration_bridge",
  MODULE_BRIDGE: "module_bridge",
  PLATFORM_BRIDGE: "platform_bridge",
  SNAPSHOT_ENGINE: "snapshot_engine",
  MONITORING: "monitoring",
  AUDIT_LOG: "audit_log"
});

const RM_COMPONENT_ORDER = Object.freeze(Object.values(RM_COMPONENT));

const RM_STATE = Object.freeze({
  BOOTING: "booting",
  INITIALIZING: "initializing",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  RECOVERING: "recovering",
  STOPPING: "stopping",
  STOPPED: "stopped",
  FAILED: "failed"
});

const RM_TRANSITIONS = Object.freeze({
  [RM_STATE.BOOTING]: [RM_STATE.INITIALIZING, RM_STATE.FAILED],
  [RM_STATE.INITIALIZING]: [RM_STATE.READY, RM_STATE.FAILED],
  [RM_STATE.READY]: [RM_STATE.RUNNING, RM_STATE.STOPPING, RM_STATE.FAILED],
  [RM_STATE.RUNNING]: [
    RM_STATE.PAUSED,
    RM_STATE.RECOVERING,
    RM_STATE.STOPPING,
    RM_STATE.FAILED
  ],
  [RM_STATE.PAUSED]: [
    RM_STATE.RUNNING,
    RM_STATE.RECOVERING,
    RM_STATE.STOPPING,
    RM_STATE.FAILED
  ],
  [RM_STATE.RECOVERING]: [
    RM_STATE.RUNNING,
    RM_STATE.PAUSED,
    RM_STATE.STOPPING,
    RM_STATE.FAILED
  ],
  [RM_STATE.STOPPING]: [RM_STATE.STOPPED, RM_STATE.FAILED],
  [RM_STATE.STOPPED]: [RM_STATE.BOOTING],
  [RM_STATE.FAILED]: [RM_STATE.RECOVERING, RM_STATE.STOPPING]
});

const RM_REGISTRY_KIND = Object.freeze({
  SERVICE: "services",
  PROCESS: "processes",
  THREAD: "threads",
  MODULE: "modules",
  PLUGIN: "plugins",
  PLATFORM: "platforms"
});

const RM_CORE_SERVICES = Object.freeze([
  "service-manager",
  "process-manager",
  "thread-manager",
  "task-scheduler",
  "timer-engine",
  "resource-manager",
  "state-manager"
]);

const RM_PUBLIC_API = Object.freeze([
  "runtime",
  "status",
  "uptime",
  "pause",
  "resume",
  "reload",
  "shutdown",
  "restart"
]);

const RM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-runtime-core/runtimeManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "shared/mia-process-core/processManager.js",
  "shared/mia-state-core/stateManager.js",
  "docs/master-canon/0062-runtime-manager.md"
]);

const RM_AUTHORIZED_ACTORS = Object.freeze([
  "kernel",
  "boot-manager",
  "recovery-manager",
  "runtime-manager",
  "operator"
]);

let activeRuntime = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function validateRuntimeTransition(from, to) {
  const allowed = RM_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_runtime_transition", from, to };
  }
  return { ok: true, from, to };
}

function createRuntimeContext(input = {}) {
  if (input.bootCompleted !== true) {
    return { ok: false, error: "boot_not_completed" };
  }

  const startTime = Number.isFinite(input.startTime)
    ? input.startTime
    : Date.now();
  const context = Object.freeze({
    runtimeId: input.runtimeId || makeId("runtime"),
    bootId: input.bootId || makeId("boot"),
    version: String(input.version || "1.0.0"),
    build: String(input.build || "development"),
    environment: String(input.environment || process.env.NODE_ENV || "development"),
    hostname: String(input.hostname || os.hostname()),
    startTime,
    status: RM_STATE.BOOTING,
    kernelVersion: String(input.kernelVersion || "1.0.0")
  });

  return { ok: true, context };
}

function createRuntimeManager(options = {}) {
  if (
    activeRuntime &&
    activeRuntime.isActive() &&
    options.allowParallelForTest !== true
  ) {
    return Object.freeze({
      ok: false,
      error: "runtime_instance_already_active",
      runtimeId: activeRuntime.runtimeId
    });
  }

  const built = createRuntimeContext(options);
  if (!built.ok) return Object.freeze(built);

  const baseContext = built.context;
  const registries = Object.fromEntries(
    Object.values(RM_REGISTRY_KIND).map((kind) => [kind, new Map()])
  );
  const audit = [];
  const configuration = Object.freeze({ ...(options.configuration || {}) });
  let runtimeConfiguration = configuration;
  let state = RM_STATE.BOOTING;
  let destroyed = false;
  let sessionEndedAt = null;
  let restartCount = 0;
  let snapshotCount = 0;
  let configurationUpdates = 0;
  let recoveryCount = 0;

  const sessionBase = Object.freeze({
    runtimeId: baseContext.runtimeId,
    bootId: baseContext.bootId,
    startedAt: baseContext.startTime,
    configuration,
    auditId: options.auditId || makeId("audit")
  });

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      RM_AUTHORIZED_ACTORS.includes(meta.actor || "")
    );
  }

  function appendAudit(action, previousState, nextState, meta = {}) {
    audit.push(
      Object.freeze({
        at: Date.now(),
        runtimeId: baseContext.runtimeId,
        bootId: baseContext.bootId,
        action,
        previousState,
        nextState,
        reason: meta.reason || action,
        initiator: meta.actor || "runtime-manager",
        immutable: true
      })
    );
  }

  function transition(nextState, meta = {}) {
    if (!isAuthorized(meta)) {
      appendAudit("transition_denied", state, state, {
        ...meta,
        reason: "unauthorized_runtime_change"
      });
      return { ok: false, error: "unauthorized_runtime_change" };
    }

    const validation = validateRuntimeTransition(state, nextState);
    if (!validation.ok) {
      appendAudit("transition_denied", state, state, {
        ...meta,
        reason: validation.error
      });
      return validation;
    }

    const previous = state;
    state = nextState;
    appendAudit("state_changed", previous, state, meta);
    return { ok: true, previousState: previous, state };
  }

  function runtime() {
    return Object.freeze({
      ...baseContext,
      uptime: Math.max(0, Date.now() - baseContext.startTime),
      status: state
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      active: !destroyed && state !== RM_STATE.STOPPED,
      state,
      runtimeId: baseContext.runtimeId,
      bootId: baseContext.bootId,
      destroyed
    });
  }

  function uptime() {
    return Math.max(0, Date.now() - baseContext.startTime);
  }

  function session() {
    const activeModules = [...registries.modules.values()]
      .filter((item) => item.active)
      .map((item) => item.id);
    return Object.freeze({
      ...sessionBase,
      configuration: runtimeConfiguration,
      activeModules: Object.freeze(activeModules),
      endedAt: sessionEndedAt,
      active: sessionEndedAt == null
    });
  }

  function registerComponent(kind, input = {}, meta = {}) {
    if (!Object.values(RM_REGISTRY_KIND).includes(kind)) {
      return { ok: false, error: "unknown_registry_kind" };
    }
    const id = String(input.id || input.moduleId || input.serviceId || "").trim();
    if (!id) return { ok: false, error: "missing_component_id" };
    if (registries[kind].has(id)) {
      return { ok: false, error: "duplicate_runtime_component", id };
    }

    const record = Object.freeze({
      id,
      kind,
      version: String(input.version || "1.0.0"),
      state: input.state || "active",
      owner: input.owner || "runtime",
      dependencies: Object.freeze([...(input.dependencies || [])]),
      active: input.active !== false,
      connected: kind === RM_REGISTRY_KIND.PLATFORM
        ? input.connected !== false
        : undefined,
      registeredAt: Date.now()
    });
    registries[kind].set(id, record);
    appendAudit("component_registered", state, state, {
      actor: meta.actor || "runtime-manager",
      reason: `${kind}:${id}`
    });
    return { ok: true, component: record };
  }

  function unregisterComponent(kind, id, meta = {}) {
    if (!registries[kind]) return { ok: false, error: "unknown_registry_kind" };
    if (!registries[kind].has(id)) {
      return { ok: false, error: "component_not_found" };
    }
    registries[kind].delete(id);
    appendAudit("component_unregistered", state, state, {
      actor: meta.actor || "runtime-manager",
      reason: `${kind}:${id}`
    });
    return { ok: true, id };
  }

  function registry() {
    const view = {};
    for (const kind of Object.values(RM_REGISTRY_KIND)) {
      view[kind] = Object.freeze([...registries[kind].values()]);
    }
    return Object.freeze(view);
  }

  function initialize(meta = {}) {
    const t1 = transition(RM_STATE.INITIALIZING, {
      actor: meta.actor || "boot-manager",
      reason: meta.reason || "boot_handoff"
    });
    if (!t1.ok) return t1;

    for (const id of RM_CORE_SERVICES) {
      if (!registries.services.has(id)) {
        registerComponent(
          RM_REGISTRY_KIND.SERVICE,
          { id, owner: "kernel", state: "ready" },
          { actor: "runtime-manager" }
        );
      }
    }

    return transition(RM_STATE.READY, {
      actor: "runtime-manager",
      reason: "runtime_initialized"
    });
  }

  function run(meta = {}) {
    return transition(RM_STATE.RUNNING, {
      actor: meta.actor || "runtime-manager",
      reason: meta.reason || "runtime_run"
    });
  }

  function pause(meta = {}) {
    return transition(RM_STATE.PAUSED, {
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "runtime_pause"
    });
  }

  function resume(meta = {}) {
    return transition(RM_STATE.RUNNING, {
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "runtime_resume"
    });
  }

  function recover(meta = {}) {
    const entered = transition(RM_STATE.RECOVERING, {
      actor: meta.actor || "recovery-manager",
      authorized: meta.authorized,
      reason: meta.reason || "runtime_recovery"
    });
    if (!entered.ok) return entered;
    recoveryCount += 1;
    return Object.freeze({
      ok: true,
      state,
      recoveryManager: true,
      recoveryCount
    });
  }

  function completeRecovery(meta = {}) {
    return transition(meta.resumePaused ? RM_STATE.PAUSED : RM_STATE.RUNNING, {
      actor: meta.actor || "recovery-manager",
      authorized: meta.authorized,
      reason: meta.reason || "recovery_complete"
    });
  }

  function applyConfiguration(next = {}, meta = {}) {
    if (!isAuthorized(meta)) {
      return { ok: false, error: "unauthorized_runtime_change" };
    }
    if (meta.validated !== true) {
      return { ok: false, error: "configuration_not_validated" };
    }
    if (meta.hotReload === true && meta.supported !== true) {
      return { ok: false, error: "configuration_restart_required" };
    }

    runtimeConfiguration = Object.freeze({
      ...runtimeConfiguration,
      ...next
    });
    configurationUpdates += 1;
    const affectedModules = Object.freeze([...(meta.affectedModules || [])]);
    appendAudit("configuration_applied", state, state, {
      actor: meta.actor,
      reason: meta.reason || "runtime_configuration_update"
    });
    return {
      ok: true,
      runtimeUpdated: true,
      affectedModules,
      modulesReloaded: meta.hotReload === true ? affectedModules : Object.freeze([]),
      restartRequired: meta.hotReload !== true
    };
  }

  function reload(meta = {}) {
    if (!isAuthorized(meta)) {
      return { ok: false, error: "unauthorized_runtime_change" };
    }
    const affectedModules = Object.freeze([...(meta.affectedModules || [])]);
    appendAudit("reload", state, state, {
      actor: meta.actor,
      reason: meta.reason || "runtime_reload"
    });
    return { ok: true, reloaded: affectedModules };
  }

  function disconnectPlatform(id, meta = {}) {
    const platform = registries.platforms.get(id);
    if (!platform) return { ok: false, error: "platform_not_found" };
    registries.platforms.set(
      id,
      Object.freeze({
        ...platform,
        connected: false,
        active: false,
        state: "disconnected"
      })
    );
    appendAudit("platform_disconnected", state, state, {
      actor: meta.actor || "runtime-manager",
      reason: id
    });
    return {
      ok: true,
      platformId: id,
      runtimeContinues: state === RM_STATE.RUNNING || state === RM_STATE.PAUSED,
      runtimeState: state
    };
  }

  function metrics() {
    const resources =
      typeof options.resourceMetrics === "function"
        ? options.resourceMetrics()
        : options.resourceMetrics || {};
    return Object.freeze({
      uptime: uptime(),
      services: registries.services.size,
      processes: registries.processes.size,
      threads: registries.threads.size,
      modules: registries.modules.size,
      plugins: registries.plugins.size,
      platforms: registries.platforms.size,
      cpu: Number(resources.cpu) || 0,
      ram: Number(resources.ram) || 0,
      gpu: Number(resources.gpu) || 0,
      network: Number(resources.network) || 0,
      snapshots: snapshotCount,
      configurationUpdates,
      restartCount,
      recoveryCount
    });
  }

  function snapshot() {
    snapshotCount += 1;
    return Object.freeze({
      ok: true,
      diagnosticOnly: true,
      completeRuntimeRecoveryMechanism: false,
      createdAt: Date.now(),
      context: runtime(),
      services: Object.freeze([...registries.services.values()]),
      processes: Object.freeze([...registries.processes.values()]),
      threads: Object.freeze([...registries.threads.values()]),
      configuration: runtimeConfiguration,
      resources: metrics(),
      modules: Object.freeze([...registries.modules.values()])
    });
  }

  function shutdown(meta = {}) {
    if (!isAuthorized(meta)) {
      return { ok: false, error: "unauthorized_runtime_change" };
    }
    if (state === RM_STATE.STOPPED) {
      return { ok: true, state, alreadyStopped: true };
    }
    const stopping = transition(RM_STATE.STOPPING, {
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "runtime_shutdown"
    });
    if (!stopping.ok) return stopping;
    const stopped = transition(RM_STATE.STOPPED, {
      actor: "runtime-manager",
      reason: "shutdown_complete"
    });
    sessionEndedAt = Date.now();
    activeRuntime = null;
    return stopped;
  }

  function destroy(meta = {}) {
    if (state !== RM_STATE.STOPPED) {
      return { ok: false, error: "runtime_must_be_stopped" };
    }
    destroyed = true;
    for (const kind of Object.values(RM_REGISTRY_KIND)) {
      registries[kind].clear();
    }
    appendAudit("destroy", state, state, {
      actor: meta.actor || "runtime-manager",
      reason: meta.reason || "runtime_destroy"
    });
    activeRuntime = null;
    return { ok: true, destroyed: true };
  }

  function restart(meta = {}) {
    if (!isAuthorized(meta)) {
      return { ok: false, error: "unauthorized_runtime_change" };
    }
    const stopped = shutdown({
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "runtime_restart"
    });
    if (!stopped.ok) return stopped;
    restartCount += 1;
    return Object.freeze({
      ok: true,
      restartRequested: true,
      restartCount,
      previousRuntimeId: baseContext.runtimeId
    });
  }

  const manager = Object.freeze({
    ok: true,
    runtime,
    status,
    uptime,
    session,
    registry,
    registerComponent,
    unregisterComponent,
    initialize,
    run,
    pause,
    resume,
    recover,
    completeRecovery,
    applyConfiguration,
    reload,
    disconnectPlatform,
    snapshot,
    metrics,
    shutdown,
    restart,
    destroy,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    isActive() {
      return !destroyed && state !== RM_STATE.STOPPED;
    }
  });

  activeRuntime = {
    runtimeId: baseContext.runtimeId,
    isActive: manager.isActive
  };
  appendAudit("create", null, state, {
    actor: "boot-manager",
    reason: "boot_completed"
  });

  if (options.autoInitialize !== false) {
    const initialized = initialize({ actor: "boot-manager" });
    if (initialized.ok && options.autoRun !== false) {
      run({ actor: "runtime-manager" });
    }
  }

  return manager;
}

function clearRuntimeSingletonForTest() {
  activeRuntime = null;
}

module.exports = {
  RM_COMPONENT,
  RM_COMPONENT_ORDER,
  RM_STATE,
  RM_TRANSITIONS,
  RM_REGISTRY_KIND,
  RM_CORE_SERVICES,
  RM_PUBLIC_API,
  RM_RUNTIME_ANCHORS,
  RM_AUTHORIZED_ACTORS,
  validateRuntimeTransition,
  createRuntimeContext,
  createRuntimeManager,
  clearRuntimeSingletonForTest
};
