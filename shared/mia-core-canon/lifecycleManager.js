"use strict";

/**
 * Master Canon 0009 — Platform Lifecycle Manager state model, transitions, audit.
 * Does NOT apply to business entities (Viewer, Gift) — see entityLifecycle.js (0002).
 */

const crypto = require("crypto");

const MANAGED_OBJECT_KIND = Object.freeze({
  SYSTEM: "system",
  SUBSYSTEM: "subsystem",
  MODULE: "module",
  ENGINE: "engine",
  SERVICE: "service",
  COMPONENT: "component",
  PLUGIN: "plugin",
  RUNTIME_PROCESS: "runtime_process",
  LONG_RUNNING_TASK: "long_running_task"
});

const PLATFORM_LIFECYCLE = Object.freeze({
  REGISTERED: "registered",
  CREATED: "created",
  INITIALIZED: "initialized",
  READY: "ready",
  STARTING: "starting",
  RUNNING: "running",
  PAUSING: "pausing",
  PAUSED: "paused",
  RESUMING: "resuming",
  STOPPING: "stopping",
  STOPPED: "stopped",
  ARCHIVED: "archived",
  FAILED: "failed"
});

const PLATFORM_LIFECYCLE_ORDER = Object.freeze([
  PLATFORM_LIFECYCLE.REGISTERED,
  PLATFORM_LIFECYCLE.CREATED,
  PLATFORM_LIFECYCLE.INITIALIZED,
  PLATFORM_LIFECYCLE.READY,
  PLATFORM_LIFECYCLE.STARTING,
  PLATFORM_LIFECYCLE.RUNNING,
  PLATFORM_LIFECYCLE.PAUSING,
  PLATFORM_LIFECYCLE.PAUSED,
  PLATFORM_LIFECYCLE.RESUMING,
  PLATFORM_LIFECYCLE.STOPPING,
  PLATFORM_LIFECYCLE.STOPPED,
  PLATFORM_LIFECYCLE.ARCHIVED,
  PLATFORM_LIFECYCLE.FAILED
]);

/** Standard transitions (0009 §4–§6). Skipping states is forbidden unless short-path exception. */
const PLATFORM_LIFECYCLE_TRANSITIONS = Object.freeze({
  [PLATFORM_LIFECYCLE.REGISTERED]: [PLATFORM_LIFECYCLE.CREATED],
  [PLATFORM_LIFECYCLE.CREATED]: [PLATFORM_LIFECYCLE.INITIALIZED],
  [PLATFORM_LIFECYCLE.INITIALIZED]: [PLATFORM_LIFECYCLE.READY],
  [PLATFORM_LIFECYCLE.READY]: [PLATFORM_LIFECYCLE.STARTING],
  [PLATFORM_LIFECYCLE.STARTING]: [PLATFORM_LIFECYCLE.RUNNING, PLATFORM_LIFECYCLE.FAILED],
  [PLATFORM_LIFECYCLE.RUNNING]: [
    PLATFORM_LIFECYCLE.PAUSING,
    PLATFORM_LIFECYCLE.STOPPING,
    PLATFORM_LIFECYCLE.FAILED
  ],
  [PLATFORM_LIFECYCLE.PAUSING]: [PLATFORM_LIFECYCLE.PAUSED, PLATFORM_LIFECYCLE.FAILED],
  [PLATFORM_LIFECYCLE.PAUSED]: [
    PLATFORM_LIFECYCLE.RESUMING,
    PLATFORM_LIFECYCLE.STOPPING,
    PLATFORM_LIFECYCLE.FAILED
  ],
  [PLATFORM_LIFECYCLE.RESUMING]: [PLATFORM_LIFECYCLE.RUNNING, PLATFORM_LIFECYCLE.FAILED],
  [PLATFORM_LIFECYCLE.STOPPING]: [PLATFORM_LIFECYCLE.STOPPED, PLATFORM_LIFECYCLE.FAILED],
  [PLATFORM_LIFECYCLE.STOPPED]: [PLATFORM_LIFECYCLE.STARTING, PLATFORM_LIFECYCLE.ARCHIVED],
  [PLATFORM_LIFECYCLE.ARCHIVED]: [],
  [PLATFORM_LIFECYCLE.FAILED]: [PLATFORM_LIFECYCLE.STOPPING, PLATFORM_LIFECYCLE.STOPPED]
});

/** Short-path exception (0009 §17): CREATED → RUNNING → STOPPED only. */
const SHORT_PATH_LIFECYCLE_TRANSITIONS = Object.freeze({
  [PLATFORM_LIFECYCLE.CREATED]: [PLATFORM_LIFECYCLE.RUNNING],
  [PLATFORM_LIFECYCLE.RUNNING]: [PLATFORM_LIFECYCLE.STOPPED],
  [PLATFORM_LIFECYCLE.STOPPED]: [PLATFORM_LIFECYCLE.ARCHIVED]
});

const REGISTRATION_FIELDS = Object.freeze([
  "objectId",
  "name",
  "type",
  "version",
  "owner",
  "dependencies",
  "requiredServices",
  "supportedEvents"
]);

const LIFECYCLE_EVENT_FIELDS = Object.freeze([
  "lifecycleId",
  "objectId",
  "previousState",
  "newState",
  "changedAt",
  "invokedBy",
  "reason"
]);

/** Documented forbidden direct mutations (0009 §18). */
const LIFECYCLE_FORBIDDEN_BEHAVIOR = Object.freeze([
  "direct_state_mutation",
  "skip_undefined_transition",
  "state_change_without_audit",
  "start_without_registration"
]);

const LIFECYCLE_MANAGER_ANCHORS = Object.freeze([
  "shared/mia-core-canon/lifecycleManager.js",
  "shared/mia-component-core/componentLifecycle.js",
  "shared/mia-core-canon/coreLifecycle.js",
  "shared/mia-entity-core/entityLifecycle.js",
  "scripts/MIA_STREAM_SESSION.js"
]);

function isPlatformLifecycleState(value) {
  return typeof value === "string" && PLATFORM_LIFECYCLE_ORDER.includes(value);
}

function isManagedObjectKind(value) {
  return typeof value === "string" && Object.values(MANAGED_OBJECT_KIND).includes(value);
}

function canTransitionPlatformLifecycle(from, to, options = {}) {
  const result = validateLifecycleTransition(from, to, options);
  return result.ok;
}

function validateLifecycleTransition(from, to, options = {}) {
  if (!isPlatformLifecycleState(from) || !isPlatformLifecycleState(to)) {
    return { ok: false, reason: "invalid_state" };
  }
  if (from === to) {
    return { ok: false, reason: "same_state" };
  }

  const map = options.shortPath ? SHORT_PATH_LIFECYCLE_TRANSITIONS : PLATFORM_LIFECYCLE_TRANSITIONS;
  const allowed = map[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: "transition_not_allowed" };
  }
  return { ok: true, reason: null };
}

function createManagedObjectRegistration(input = {}) {
  const objectId = String(input.objectId || "").trim();
  if (!objectId) {
    throw new Error("objectId is required");
  }
  const type = String(input.type || "").trim();
  if (!isManagedObjectKind(type)) {
    throw new Error(`type must be a MANAGED_OBJECT_KIND: ${type}`);
  }

  return Object.freeze({
    objectId,
    name: String(input.name || objectId),
    type,
    version: String(input.version || "0.0.0"),
    owner: String(input.owner || "mia.platform"),
    dependencies: Object.freeze(Array.isArray(input.dependencies) ? input.dependencies : []),
    requiredServices: Object.freeze(
      Array.isArray(input.requiredServices) ? input.requiredServices : []
    ),
    supportedEvents: Object.freeze(
      Array.isArray(input.supportedEvents) ? input.supportedEvents : []
    ),
    state: PLATFORM_LIFECYCLE.REGISTERED,
    registeredAt: input.registeredAt != null ? Number(input.registeredAt) : Date.now()
  });
}

function createLifecycleEventRecord(input = {}) {
  const objectId = String(input.objectId || "").trim();
  if (!objectId) {
    throw new Error("objectId is required");
  }
  const previousState = input.previousState;
  const newState = input.newState;
  if (!isPlatformLifecycleState(previousState) || !isPlatformLifecycleState(newState)) {
    throw new Error("previousState and newState must be platform lifecycle states");
  }

  const lifecycleId =
    typeof input.lifecycleId === "string" && input.lifecycleId.trim()
      ? input.lifecycleId.trim()
      : `lifecycle-${crypto.randomUUID()}`;

  return Object.freeze({
    lifecycleId,
    objectId,
    previousState,
    newState,
    changedAt: input.changedAt != null ? Number(input.changedAt) : Date.now(),
    invokedBy: String(input.invokedBy || "core.lifecycle_manager"),
    reason: String(input.reason || "")
  });
}

function createRestartRecord(input = {}) {
  const objectId = String(input.objectId || "").trim();
  if (!objectId) {
    throw new Error("objectId is required");
  }
  const restartId =
    typeof input.restartId === "string" && input.restartId.trim()
      ? input.restartId.trim()
      : `restart-${crypto.randomUUID()}`;

  return Object.freeze({
    restartId,
    objectId,
    reason: String(input.reason || ""),
    startedAt: input.startedAt != null ? Number(input.startedAt) : Date.now(),
    path: Object.freeze([
      PLATFORM_LIFECYCLE.STOPPING,
      PLATFORM_LIFECYCLE.STOPPED,
      PLATFORM_LIFECYCLE.STARTING,
      PLATFORM_LIFECYCLE.RUNNING
    ])
  });
}

/**
 * Apply a lifecycle transition with audit event (0009 §6, §16).
 * Returns { registration, event } or throws on invalid transition.
 */
function applyLifecycleTransition(registration, newState, options = {}) {
  if (!registration || typeof registration !== "object") {
    throw new Error("registration is required");
  }
  const from = registration.state;
  const shortPath = Boolean(options.shortPath);
  const validation = validateLifecycleTransition(from, newState, { shortPath });
  if (!validation.ok) {
    const err = new Error(`Lifecycle transition rejected: ${from} -> ${newState} (${validation.reason})`);
    err.code = "LIFECYCLE_TRANSITION_REJECTED";
    err.from = from;
    err.to = newState;
    throw err;
  }

  const event = createLifecycleEventRecord({
    objectId: registration.objectId,
    previousState: from,
    newState,
    invokedBy: options.invokedBy,
    reason: options.reason
  });

  const next = Object.freeze({
    ...registration,
    state: newState,
    lastTransitionAt: event.changedAt
  });

  return Object.freeze({ registration: next, event });
}

module.exports = {
  MANAGED_OBJECT_KIND,
  PLATFORM_LIFECYCLE,
  PLATFORM_LIFECYCLE_ORDER,
  PLATFORM_LIFECYCLE_TRANSITIONS,
  SHORT_PATH_LIFECYCLE_TRANSITIONS,
  REGISTRATION_FIELDS,
  LIFECYCLE_EVENT_FIELDS,
  LIFECYCLE_FORBIDDEN_BEHAVIOR,
  LIFECYCLE_MANAGER_ANCHORS,
  isPlatformLifecycleState,
  isManagedObjectKind,
  canTransitionPlatformLifecycle,
  validateLifecycleTransition,
  createManagedObjectRegistration,
  createLifecycleEventRecord,
  createRestartRecord,
  applyLifecycleTransition
};
