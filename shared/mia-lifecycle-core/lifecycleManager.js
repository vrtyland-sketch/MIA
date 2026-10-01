"use strict";

/**
 * Master Canon 0063 — Lifecycle Manager.
 * Kernel Layer 0 orchestration for service/module/runtime/entity,
 * Battle and Kojnožrout lifecycles. No business logic.
 * Distinct from 0009 platform lifecycle in mia-core-canon.
 */

const crypto = require("crypto");

const LCM_COMPONENT = Object.freeze({
  LIFECYCLE_MANAGER: "lifecycle_manager",
  OBJECT_REGISTRY: "object_registry",
  PHASE_CONTROLLER: "phase_controller",
  TRANSITION_VALIDATOR: "transition_validator",
  EVENT_PUBLISHER: "event_publisher",
  HISTORY_STORE: "history_store",
  AUTHORIZATION_GATE: "authorization_gate",
  RUNTIME_BRIDGE: "runtime_bridge",
  BATTLE_BRIDGE: "battle_bridge",
  KOJNOZROUT_BRIDGE: "kojnozrout_bridge",
  CLEANUP_CONTROLLER: "cleanup_controller",
  METRICS: "metrics"
});

const LCM_COMPONENT_ORDER = Object.freeze(Object.values(LCM_COMPONENT));

const LCM_OBJECT_TYPE = Object.freeze({
  SERVICE: "service",
  MODULE: "module",
  PLUGIN: "plugin",
  PLATFORM: "platform",
  BATTLE: "battle",
  AI_AGENT: "ai_agent",
  KOJNOZROUT: "kojnozrout",
  OVERLAY: "overlay",
  RUNTIME: "runtime"
});

const LCM_PHASE = Object.freeze({
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  ACTIVE: "active",
  PAUSED: "paused",
  RESUMED: "resumed",
  STOPPING: "stopping",
  STOPPED: "stopped",
  DESTROYED: "destroyed",
  FAILED: "failed"
});

const LCM_DEFAULT_PHASES = Object.freeze([
  LCM_PHASE.CREATED,
  LCM_PHASE.INITIALIZED,
  LCM_PHASE.READY,
  LCM_PHASE.ACTIVE,
  LCM_PHASE.PAUSED,
  LCM_PHASE.RESUMED,
  LCM_PHASE.STOPPING,
  LCM_PHASE.STOPPED,
  LCM_PHASE.DESTROYED,
  LCM_PHASE.FAILED
]);

/** Strict default FSM — no READY→DESTROYED; cleanup before STOPPED→DESTROYED. */
const LCM_DEFAULT_TRANSITIONS = Object.freeze({
  [LCM_PHASE.CREATED]: [LCM_PHASE.INITIALIZED, LCM_PHASE.FAILED],
  [LCM_PHASE.INITIALIZED]: [LCM_PHASE.READY, LCM_PHASE.FAILED],
  [LCM_PHASE.READY]: [LCM_PHASE.ACTIVE, LCM_PHASE.STOPPING, LCM_PHASE.FAILED],
  [LCM_PHASE.ACTIVE]: [LCM_PHASE.PAUSED, LCM_PHASE.STOPPING, LCM_PHASE.FAILED],
  [LCM_PHASE.PAUSED]: [LCM_PHASE.RESUMED, LCM_PHASE.STOPPING, LCM_PHASE.FAILED],
  [LCM_PHASE.RESUMED]: [LCM_PHASE.ACTIVE, LCM_PHASE.STOPPING, LCM_PHASE.FAILED],
  [LCM_PHASE.STOPPING]: [LCM_PHASE.STOPPED, LCM_PHASE.FAILED],
  [LCM_PHASE.STOPPED]: [LCM_PHASE.DESTROYED],
  [LCM_PHASE.DESTROYED]: [],
  [LCM_PHASE.FAILED]: [LCM_PHASE.READY, LCM_PHASE.STOPPING, LCM_PHASE.DESTROYED]
});

const LCM_BATTLE_PHASE = Object.freeze({
  CREATED: "created",
  MATCHMAKING: "matchmaking",
  READY: "ready",
  ACTIVE: "active",
  FINISHED: "finished",
  REWARD: "reward",
  DESTROYED: "destroyed"
});

const LCM_BATTLE_TRANSITIONS = Object.freeze({
  [LCM_BATTLE_PHASE.CREATED]: [LCM_BATTLE_PHASE.MATCHMAKING],
  [LCM_BATTLE_PHASE.MATCHMAKING]: [LCM_BATTLE_PHASE.READY],
  [LCM_BATTLE_PHASE.READY]: [LCM_BATTLE_PHASE.ACTIVE],
  [LCM_BATTLE_PHASE.ACTIVE]: [LCM_BATTLE_PHASE.FINISHED],
  [LCM_BATTLE_PHASE.FINISHED]: [LCM_BATTLE_PHASE.REWARD],
  [LCM_BATTLE_PHASE.REWARD]: [LCM_BATTLE_PHASE.DESTROYED],
  [LCM_BATTLE_PHASE.DESTROYED]: []
});

const LCM_KOJ_PHASE = Object.freeze({
  CREATED: "created",
  SPAWNED: "spawned",
  ACTIVE: "active",
  SLEEPING: "sleeping",
  REMOVED: "removed"
});

const LCM_KOJ_TRANSITIONS = Object.freeze({
  [LCM_KOJ_PHASE.CREATED]: [LCM_KOJ_PHASE.SPAWNED],
  [LCM_KOJ_PHASE.SPAWNED]: [LCM_KOJ_PHASE.ACTIVE],
  [LCM_KOJ_PHASE.ACTIVE]: [LCM_KOJ_PHASE.SLEEPING, LCM_KOJ_PHASE.REMOVED],
  [LCM_KOJ_PHASE.SLEEPING]: [LCM_KOJ_PHASE.ACTIVE, LCM_KOJ_PHASE.REMOVED],
  [LCM_KOJ_PHASE.REMOVED]: []
});

const LCM_EVENT = Object.freeze({
  LIFECYCLE_CHANGED: "LifecycleChanged"
});

const LCM_PUBLIC_API = Object.freeze([
  "register",
  "initialize",
  "transition",
  "pause",
  "resume",
  "shutdown",
  "destroy",
  "recover",
  "runtimeTransition",
  "registerBattle",
  "registerKojnozrout",
  "metrics"
]);

const LCM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-core-canon/lifecycleManager.js",
  "shared/mia-lifecycle-core/lifecycleManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "shared/mia-state-core/stateManager.js",
  "docs/master-canon/0063-lifecycle-manager.md"
]);

const LCM_AUTHORIZED_ACTORS = Object.freeze([
  "kernel",
  "lifecycle_manager",
  "runtime-manager",
  "service_manager",
  "battle-engine",
  "kojnozrout-engine",
  "recovery-manager",
  "operator",
  "system"
]);

const LCM_KERNEL_PROTECTED = Object.freeze([
  "lifecycle-kernel",
  "runtime-kernel",
  "core-kernel"
]);

let activeLifecycleManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function validateLifecycleTransition(machine, from, to) {
  const allowed = (machine && machine[from]) || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_lifecycle_transition", from, to };
  }
  return { ok: true, from, to };
}

function assertDirectPhaseMutationForbidden(activity) {
  if (
    activity === "direct_phase_write" ||
    activity === "runtime_bypass" ||
    activity === "mutate_without_manager"
  ) {
    return { ok: false, error: "direct_phase_mutation_forbidden" };
  }
  return { ok: true };
}

function createLifecycleDescriptor(input = {}) {
  const objectId = String(input.objectId || input.id || "").trim();
  if (!objectId) return { ok: false, error: "missing_object_id" };
  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const objectType = input.objectType || LCM_OBJECT_TYPE.SERVICE;
  if (!Object.values(LCM_OBJECT_TYPE).includes(objectType)) {
    return { ok: false, error: "unknown_object_type" };
  }

  const now = Date.now();
  return {
    ok: true,
    descriptor: Object.freeze({
      lifecycleId: input.lifecycleId || makeId("lcm"),
      objectId,
      objectType,
      currentPhase: input.currentPhase || LCM_PHASE.CREATED,
      previousPhase: null,
      owner,
      created: now,
      updated: now,
      destroyed: null,
      protected:
        input.protected === true || LCM_KERNEL_PROTECTED.includes(objectId),
      machine: input.machine || LCM_DEFAULT_TRANSITIONS,
      cleanedUp: false,
      platformOwner: input.platformOwner || null
    })
  };
}

function createLifecycleManager(options = {}) {
  if (
    activeLifecycleManager &&
    activeLifecycleManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "lifecycle_manager_already_active",
      soleLifecycleAuthority: true
    });
  }

  const objects = new Map();
  const history = [];
  const audit = [];
  const publishedEvents = [];
  let failedTransitions = 0;
  let destroyedCount = 0;
  const eventBus =
    options.eventBus ||
    ({
      publish(event) {
        return { ok: true, event };
      }
    });
  const authorized = new Set(
    options.authorizedActors || LCM_AUTHORIZED_ACTORS
  );

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.actor || "") ||
      authorized.has(meta.source || "")
    );
  }

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at || Date.now(),
        immutable: true
      })
    );
  }

  function get(lifecycleId) {
    return objects.get(lifecycleId) || null;
  }

  function findByObjectId(objectId) {
    for (const record of objects.values()) {
      if (record.objectId === objectId && record.currentPhase !== LCM_PHASE.DESTROYED) {
        return record;
      }
    }
    return null;
  }

  function set(lifecycleId, patch) {
    const prev = get(lifecycleId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch, updated: Date.now() });
    objects.set(lifecycleId, next);
    return next;
  }

  function publishLifecycleChanged(payload) {
    const event = Object.freeze({
      type: LCM_EVENT.LIFECYCLE_CHANGED,
      ...payload,
      at: Date.now()
    });
    publishedEvents.push(event);
    const published = eventBus.publish(event);
    return { ok: !!published.ok, event };
  }

  function applyTransition(lifecycleId, nextPhase, meta = {}) {
    const forbidden = assertDirectPhaseMutationForbidden(meta.activity);
    if (!forbidden.ok) {
      failedTransitions += 1;
      return forbidden;
    }

    if (!isAuthorized(meta)) {
      failedTransitions += 1;
      appendAudit({
        action: "denied",
        lifecycleId,
        result: "unauthorized",
        actor: meta.actor || "unknown"
      });
      return { ok: false, error: "unauthorized_lifecycle_change" };
    }

    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };

    if (
      record.protected &&
      meta.force !== true &&
      !["kernel", "lifecycle_manager", "recovery-manager"].includes(
        meta.actor || meta.source || ""
      )
    ) {
      failedTransitions += 1;
      return { ok: false, error: "kernel_object_protected" };
    }

    if (
      nextPhase === LCM_PHASE.STOPPED &&
      record.currentPhase === LCM_PHASE.STOPPING &&
      meta.cleanupCompleted !== true &&
      record.cleanedUp !== true
    ) {
      failedTransitions += 1;
      appendAudit({
        action: "cleanup_required",
        lifecycleId,
        result: "cleanup_incomplete",
        actor: meta.actor || "unknown"
      });
      return { ok: false, error: "cleanup_required_before_stopped" };
    }

    if (
      nextPhase === LCM_PHASE.DESTROYED &&
      record.currentPhase !== LCM_PHASE.STOPPED &&
      meta.safeDestroy !== true
    ) {
      const machineAllowsDestroy = (
        (record.machine || LCM_DEFAULT_TRANSITIONS)[record.currentPhase] || []
      ).includes(LCM_PHASE.DESTROYED);
      if (!machineAllowsDestroy) {
        failedTransitions += 1;
        return { ok: false, error: "destroy_requires_stopped" };
      }
    }

    const validation = validateLifecycleTransition(
      record.machine,
      record.currentPhase,
      nextPhase
    );
    if (!validation.ok) {
      failedTransitions += 1;
      appendAudit({
        action: "invalid_transition",
        lifecycleId,
        objectId: record.objectId,
        result: `${record.currentPhase}->${nextPhase}`,
        actor: meta.actor || "unknown",
        reason: validation.error
      });
      return validation;
    }

    const previous = record.currentPhase;
    const now = Date.now();
    const patch = {
      previousPhase: previous,
      currentPhase: nextPhase,
      updated: now
    };
    if (
      (nextPhase === LCM_PHASE.DESTROYED ||
        nextPhase === LCM_KOJ_PHASE.REMOVED) &&
      record.cleanedUp !== true
    ) {
      patch.cleanedUp = true;
      appendAudit({
        action: "resource_cleanup",
        lifecycleId,
        objectId: record.objectId,
        result: "completed",
        actor: meta.actor || "lifecycle_manager",
        reason: meta.safeDestroy
          ? "failed_recovery_safe_cleanup"
          : "terminal_phase_cleanup"
      });
    }
    if (nextPhase === LCM_PHASE.STOPPED || meta.cleanupCompleted === true) {
      patch.cleanedUp = true;
    }
    if (nextPhase === LCM_PHASE.DESTROYED || nextPhase === LCM_KOJ_PHASE.REMOVED) {
      patch.destroyed = now;
      destroyedCount += 1;
    }

    const updated = set(lifecycleId, patch);
    const hist = Object.freeze({
      lifecycleId,
      objectId: record.objectId,
      previousPhase: previous,
      currentPhase: nextPhase,
      at: now,
      actor: meta.actor || "lifecycle_manager",
      reason: meta.reason || "transition",
      immutable: true
    });
    history.push(hist);

    appendAudit({
      action: "transition",
      lifecycleId,
      objectId: record.objectId,
      result: `${previous}->${nextPhase}`,
      actor: meta.actor || "lifecycle_manager",
      reason: meta.reason || "transition"
    });

    const published = publishLifecycleChanged({
      lifecycleId,
      objectId: record.objectId,
      objectType: record.objectType,
      previousPhase: previous,
      currentPhase: nextPhase,
      owner: record.owner,
      reason: meta.reason || "transition"
    });

    return {
      ok: true,
      lifecycle: updated,
      eventPublished: published.ok,
      eventType: LCM_EVENT.LIFECYCLE_CHANGED
    };
  }

  function register(input = {}, meta = {}) {
    const built = createLifecycleDescriptor(input);
    if (!built.ok) return built;

    if (findByObjectId(built.descriptor.objectId)) {
      return {
        ok: false,
        error: "duplicate_object_id",
        objectId: built.descriptor.objectId
      };
    }
    if (objects.has(built.descriptor.lifecycleId)) {
      return {
        ok: false,
        error: "duplicate_lifecycle_id",
        lifecycleId: built.descriptor.lifecycleId
      };
    }

    objects.set(built.descriptor.lifecycleId, built.descriptor);
    appendAudit({
      action: "registered",
      lifecycleId: built.descriptor.lifecycleId,
      objectId: built.descriptor.objectId,
      result: built.descriptor.currentPhase,
      actor: meta.actor || "system"
    });
    return { ok: true, lifecycle: built.descriptor };
  }

  function initialize(lifecycleId, meta = {}) {
    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };

    if (meta.validate === false || meta.validationFailed === true) {
      const failed = applyTransition(lifecycleId, LCM_PHASE.FAILED, {
        actor: meta.actor || "lifecycle_manager",
        authorized: true,
        reason: meta.reason || "validation_failed"
      });
      return {
        ok: false,
        error: "validation_failed",
        lifecycle: failed.lifecycle || get(lifecycleId)
      };
    }

    const initialized = applyTransition(lifecycleId, LCM_PHASE.INITIALIZED, {
      actor: meta.actor || "lifecycle_manager",
      authorized: meta.authorized,
      reason: meta.reason || "initialize"
    });
    if (!initialized.ok) return initialized;

    return applyTransition(lifecycleId, LCM_PHASE.READY, {
      actor: meta.actor || "lifecycle_manager",
      authorized: true,
      reason: "initialize_ready"
    });
  }

  function activate(lifecycleId, meta = {}) {
    return applyTransition(lifecycleId, LCM_PHASE.ACTIVE, {
      actor: meta.actor || "lifecycle_manager",
      authorized: meta.authorized,
      reason: meta.reason || "activate"
    });
  }

  function pause(lifecycleId, meta = {}) {
    return applyTransition(lifecycleId, LCM_PHASE.PAUSED, {
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "pause"
    });
  }

  function resume(lifecycleId, meta = {}) {
    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };

    if (record.currentPhase === LCM_PHASE.PAUSED) {
      const resumed = applyTransition(lifecycleId, LCM_PHASE.RESUMED, {
        actor: meta.actor || "operator",
        authorized: meta.authorized,
        reason: meta.reason || "resume"
      });
      if (!resumed.ok) return resumed;
    }

    return applyTransition(lifecycleId, LCM_PHASE.ACTIVE, {
      actor: meta.actor || "operator",
      authorized: meta.authorized,
      reason: meta.reason || "resume_active"
    });
  }

  function shutdown(lifecycleId, meta = {}) {
    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };

    if (record.currentPhase === LCM_PHASE.STOPPED) {
      return { ok: true, lifecycle: record, alreadyStopped: true };
    }
    if (record.currentPhase === LCM_PHASE.DESTROYED) {
      return { ok: false, error: "already_destroyed" };
    }

    if (record.currentPhase !== LCM_PHASE.STOPPING) {
      const stopping = applyTransition(lifecycleId, LCM_PHASE.STOPPING, {
        actor: meta.actor || "operator",
        authorized: meta.authorized,
        reason: meta.reason || "shutdown"
      });
      if (!stopping.ok) return stopping;
    }

    const cleanupOk = meta.cleanup === false ? false : true;
    if (!cleanupOk) {
      return { ok: false, error: "resource_cleanup_failed", phase: LCM_PHASE.STOPPING };
    }

    set(lifecycleId, { cleanedUp: true });
    return applyTransition(lifecycleId, LCM_PHASE.STOPPED, {
      actor: meta.actor || "lifecycle_manager",
      authorized: true,
      cleanupCompleted: true,
      reason: "shutdown_cleanup_complete"
    });
  }

  function destroy(lifecycleId, meta = {}) {
    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };

    if (record.currentPhase === LCM_PHASE.DESTROYED) {
      return { ok: true, lifecycle: record, alreadyDestroyed: true };
    }

    if (record.currentPhase !== LCM_PHASE.STOPPED && meta.safeDestroy !== true) {
      return { ok: false, error: "destroy_requires_stopped" };
    }

    return applyTransition(lifecycleId, LCM_PHASE.DESTROYED, {
      actor: meta.actor || "lifecycle_manager",
      authorized: meta.authorized,
      safeDestroy: meta.safeDestroy === true,
      reason: meta.reason || (meta.safeDestroy ? "failed_recovery_safe_destroy" : "destroy")
    });
  }

  function recover(lifecycleId, meta = {}) {
    const record = get(lifecycleId);
    if (!record) return { ok: false, error: "unknown_lifecycle" };
    if (record.currentPhase !== LCM_PHASE.FAILED) {
      return { ok: false, error: "recover_requires_failed" };
    }

    if (meta.recoveryFailed === true) {
      appendAudit({
        action: "recovery_failed",
        lifecycleId,
        objectId: record.objectId,
        result: "cleanup_recovery_failure",
        actor: meta.actor || "recovery-manager",
        reason: meta.reason || "recovery_failed"
      });
      const destroyed = destroy(lifecycleId, {
        actor: meta.actor || "recovery-manager",
        authorized: true,
        safeDestroy: true,
        reason: "failed_recovery_safe_destroy"
      });
      return {
        ok: false,
        error: "recovery_failed",
        destroyed: destroyed.ok === true,
        lifecycle: destroyed.lifecycle || get(lifecycleId)
      };
    }

    const ready = applyTransition(lifecycleId, LCM_PHASE.READY, {
      actor: meta.actor || "recovery-manager",
      authorized: meta.authorized,
      reason: meta.reason || "recovery_ready"
    });
    if (!ready.ok) return ready;

    if (meta.activate === false) {
      return { ok: true, lifecycle: ready.lifecycle, recovered: true };
    }

    return applyTransition(lifecycleId, LCM_PHASE.ACTIVE, {
      actor: meta.actor || "recovery-manager",
      authorized: true,
      reason: "recovery_active"
    });
  }

  function runtimeTransition(lifecycleId, nextPhase, meta = {}) {
    if (meta.directMutation === true || meta.activity === "runtime_bypass") {
      return assertDirectPhaseMutationForbidden("runtime_bypass");
    }
    return applyTransition(lifecycleId, nextPhase, {
      ...meta,
      actor: meta.actor || "runtime-manager",
      activity: "runtime_bridge",
      reason: meta.reason || "runtime_transition"
    });
  }

  function registerBattle(input = {}, meta = {}) {
    return register(
      {
        ...input,
        objectType: LCM_OBJECT_TYPE.BATTLE,
        machine: LCM_BATTLE_TRANSITIONS,
        currentPhase: LCM_BATTLE_PHASE.CREATED
      },
      meta
    );
  }

  function registerKojnozrout(input = {}, meta = {}) {
    return register(
      {
        ...input,
        objectType: LCM_OBJECT_TYPE.KOJNOZROUT,
        machine: LCM_KOJ_TRANSITIONS,
        currentPhase: LCM_KOJ_PHASE.CREATED,
        platformOwner: input.platformOwner || input.owner || null
      },
      meta
    );
  }

  function transition(lifecycleId, nextPhase, meta = {}) {
    return applyTransition(lifecycleId, nextPhase, meta);
  }

  function metrics() {
    let active = 0;
    let paused = 0;
    let totalDuration = 0;
    let durationSamples = 0;

    for (const record of objects.values()) {
      if (
        record.currentPhase === LCM_PHASE.ACTIVE ||
        record.currentPhase === LCM_BATTLE_PHASE.ACTIVE ||
        record.currentPhase === LCM_KOJ_PHASE.ACTIVE
      ) {
        active += 1;
      }
      if (
        record.currentPhase === LCM_PHASE.PAUSED ||
        record.currentPhase === LCM_KOJ_PHASE.SLEEPING
      ) {
        paused += 1;
      }
      if (record.destroyed != null) {
        totalDuration += Math.max(0, record.destroyed - record.created);
        durationSamples += 1;
      }
    }

    return Object.freeze({
      objects: objects.size,
      active,
      paused,
      completed: destroyedCount,
      destroyed: destroyedCount,
      failedTransitions,
      averageLifecycleDuration:
        durationSamples > 0 ? totalDuration / durationSamples : 0
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleLifecycleAuthority: true,
      objects: objects.size,
      active: activeLifecycleManager != null
    });
  }

  const manager = Object.freeze({
    ok: true,
    register,
    initialize,
    activate,
    transition,
    pause,
    resume,
    shutdown,
    destroy,
    recover,
    runtimeTransition,
    registerBattle,
    registerKojnozrout,
    get,
    findByObjectId,
    metrics,
    status,
    history() {
      return Object.freeze([...history]);
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    publishedEvents() {
      return Object.freeze([...publishedEvents]);
    },
    isActive() {
      return true;
    }
  });

  activeLifecycleManager = {
    isActive: manager.isActive
  };

  if (options.seedKernel !== false) {
    register({
      objectId: "lifecycle-kernel",
      objectType: LCM_OBJECT_TYPE.RUNTIME,
      owner: "kernel",
      protected: true,
      currentPhase: LCM_PHASE.READY
    });
  }

  return manager;
}

function clearLifecycleSingletonForTest() {
  activeLifecycleManager = null;
}

module.exports = {
  LCM_COMPONENT,
  LCM_COMPONENT_ORDER,
  LCM_OBJECT_TYPE,
  LCM_PHASE,
  LCM_DEFAULT_PHASES,
  LCM_DEFAULT_TRANSITIONS,
  LCM_BATTLE_PHASE,
  LCM_BATTLE_TRANSITIONS,
  LCM_KOJ_PHASE,
  LCM_KOJ_TRANSITIONS,
  LCM_EVENT,
  LCM_PUBLIC_API,
  LCM_RUNTIME_ANCHORS,
  LCM_AUTHORIZED_ACTORS,
  LCM_KERNEL_PROTECTED,
  validateLifecycleTransition,
  assertDirectPhaseMutationForbidden,
  createLifecycleDescriptor,
  createLifecycleManager,
  clearLifecycleSingletonForTest
};
