"use strict";

/**
 * Master Canon 0008 — Runtime Manager phases, state machine, context schema.
 */

const crypto = require("crypto");

const RUNTIME_PHASE = Object.freeze({
  PROCESS_START: "process_start",
  ENVIRONMENT_CHECK: "environment_check",
  LOAD_CONFIGURATION: "load_configuration",
  INITIALIZE_CORE: "initialize_core",
  REGISTER_SYSTEMS: "register_systems",
  ACTIVATE: "activate"
});

const RUNTIME_PHASE_ORDER = Object.freeze([
  RUNTIME_PHASE.PROCESS_START,
  RUNTIME_PHASE.ENVIRONMENT_CHECK,
  RUNTIME_PHASE.LOAD_CONFIGURATION,
  RUNTIME_PHASE.INITIALIZE_CORE,
  RUNTIME_PHASE.REGISTER_SYSTEMS,
  RUNTIME_PHASE.ACTIVATE
]);

const RUNTIME_STATE = Object.freeze({
  CREATED: "created",
  INITIALIZING: "initializing",
  LOADING_CONFIGURATION: "loading_configuration",
  STARTING_CORE: "starting_core",
  STARTING_SYSTEMS: "starting_systems",
  RUNNING: "running",
  PAUSING: "pausing",
  PAUSED: "paused",
  RESUMING: "resuming",
  STOPPING: "stopping",
  STOPPED: "stopped"
});

/** Legal single-step transitions — skipping states is forbidden (0008 §6). */
const RUNTIME_STATE_TRANSITIONS = Object.freeze({
  [RUNTIME_STATE.CREATED]: [RUNTIME_STATE.INITIALIZING],
  [RUNTIME_STATE.INITIALIZING]: [RUNTIME_STATE.LOADING_CONFIGURATION],
  [RUNTIME_STATE.LOADING_CONFIGURATION]: [RUNTIME_STATE.STARTING_CORE],
  [RUNTIME_STATE.STARTING_CORE]: [RUNTIME_STATE.STARTING_SYSTEMS],
  [RUNTIME_STATE.STARTING_SYSTEMS]: [RUNTIME_STATE.RUNNING],
  [RUNTIME_STATE.RUNNING]: [RUNTIME_STATE.PAUSING, RUNTIME_STATE.STOPPING],
  [RUNTIME_STATE.PAUSING]: [RUNTIME_STATE.PAUSED],
  [RUNTIME_STATE.PAUSED]: [RUNTIME_STATE.RESUMING, RUNTIME_STATE.STOPPING],
  [RUNTIME_STATE.RESUMING]: [RUNTIME_STATE.RUNNING],
  [RUNTIME_STATE.STOPPING]: [RUNTIME_STATE.STOPPED],
  [RUNTIME_STATE.STOPPED]: []
});

const RUNTIME_MODE = Object.freeze({
  DEVELOPMENT: "development",
  TESTING: "testing",
  PRODUCTION: "production",
  SAFE_MODE: "safe_mode"
});

/** Activities Runtime Manager must never perform (0008 §14). */
const RUNTIME_FORBIDDEN_ACTIVITIES = Object.freeze([
  "communicate_with_tiktok_directly",
  "generate_ai_responses",
  "render_graphics",
  "mutate_game_logic",
  "persist_business_data"
]);

const RUNTIME_CONTEXT_FIELDS = Object.freeze([
  "runtimeId",
  "platformVersion",
  "startedAt",
  "configuration",
  "activeSystems",
  "platformState",
  "sessionId"
]);

const SYSTEM_REGISTRY_FIELDS = Object.freeze([
  "systemId",
  "name",
  "version",
  "state",
  "startedAt",
  "health",
  "lastActivityAt",
  "errorCount"
]);

/** Canon bootstrap phase → runtime file anchors. */
const RUNTIME_PHASE_ANCHORS = Object.freeze({
  [RUNTIME_PHASE.PROCESS_START]: Object.freeze(["server.js", "scripts/MIA_ENV.js"]),
  [RUNTIME_PHASE.ENVIRONMENT_CHECK]: Object.freeze(["scripts/MIA_PORT_GUARD.js"]),
  [RUNTIME_PHASE.LOAD_CONFIGURATION]: Object.freeze(["scripts/MIA_CONFIG.js", "scripts/MIA_RUNTIME_SECURITY.js"]),
  [RUNTIME_PHASE.INITIALIZE_CORE]: Object.freeze([
    "scripts/MIA_INGEST_QUEUE.js",
    "scripts/MIA_RUNTIME_LOOPS.js",
    "scripts/MIA_LOG_ROTATION.js"
  ]),
  [RUNTIME_PHASE.REGISTER_SYSTEMS]: Object.freeze([
    "routes/index.js",
    "shared/mia-architecture-core/platformSystems.js"
  ]),
  [RUNTIME_PHASE.ACTIVATE]: Object.freeze(["scripts/MIA_SERVER_BOOTSTRAP.js", "index.js"])
});

const RUNTIME_MANAGER_ANCHORS = Object.freeze([
  "server.js",
  "index.js",
  "scripts/MIA_SERVER_BOOTSTRAP.js",
  "scripts/MIA_SERVER_BOOTSTRAP_CTX.js",
  "scripts/MIA_RUNTIME_LOOPS.js",
  "scripts/MIA_OBS_WATCHDOG.js",
  "scripts/mia_stop.js",
  "scripts/mia_restart.js"
]);

function isRuntimePhase(value) {
  return typeof value === "string" && RUNTIME_PHASE_ORDER.includes(value);
}

function isRuntimeState(value) {
  return typeof value === "string" && Object.values(RUNTIME_STATE).includes(value);
}

function canTransitionRuntimeState(from, to) {
  if (!isRuntimeState(from) || !isRuntimeState(to)) return false;
  const allowed = RUNTIME_STATE_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function resolveRuntimeMode(env = process.env) {
  const raw = String(env.MIA_RUNTIME_MODE || env.NODE_ENV || "production").toLowerCase();
  if (raw === "development" || raw === "dev") return RUNTIME_MODE.DEVELOPMENT;
  if (raw === "test" || raw === "testing") return RUNTIME_MODE.TESTING;
  if (raw === "safe" || raw === "safe_mode") return RUNTIME_MODE.SAFE_MODE;
  return RUNTIME_MODE.PRODUCTION;
}

/**
 * Canonical Runtime Context record (0008 §4).
 * Runtime wiring in index.js provides partial fields today.
 */
function createRuntimeContextRecord(input = {}) {
  const now = input.startedAt != null ? Number(input.startedAt) : Date.now();
  const runtimeId =
    typeof input.runtimeId === "string" && input.runtimeId.trim()
      ? input.runtimeId.trim()
      : `mia-runtime-${crypto.randomUUID()}`;

  return Object.freeze({
    runtimeId,
    platformVersion: String(input.platformVersion || "1.0.0"),
    startedAt: now,
    configuration: input.configuration != null ? input.configuration : null,
    activeSystems: Object.freeze(Array.isArray(input.activeSystems) ? input.activeSystems : []),
    platformState: isRuntimeState(input.platformState)
      ? input.platformState
      : RUNTIME_STATE.CREATED,
    sessionId:
      typeof input.sessionId === "string" && input.sessionId.trim()
        ? input.sessionId.trim()
        : runtimeId,
    mode: Object.values(RUNTIME_MODE).includes(input.mode) ? input.mode : resolveRuntimeMode()
  });
}

function createSystemRegistryRecord(input = {}) {
  const systemId = String(input.systemId || "").trim();
  if (!systemId) {
    throw new Error("systemId is required");
  }
  return Object.freeze({
    systemId,
    name: String(input.name || systemId),
    version: String(input.version || "0.0.0"),
    state: String(input.state || "unknown"),
    startedAt: input.startedAt != null ? Number(input.startedAt) : null,
    health: String(input.health || "unknown"),
    lastActivityAt: input.lastActivityAt != null ? Number(input.lastActivityAt) : null,
    errorCount: Number.isFinite(input.errorCount) ? input.errorCount : 0
  });
}

function describeRuntimeBootstrapPhases() {
  return RUNTIME_PHASE_ORDER.map((phase, index) => ({
    phase,
    order: index + 1,
    anchors: RUNTIME_PHASE_ANCHORS[phase] || []
  }));
}

function assertRuntimeForbiddenActivity(activity) {
  const key = String(activity || "");
  return {
    ok: !RUNTIME_FORBIDDEN_ACTIVITIES.includes(key),
    activity: key
  };
}

module.exports = {
  RUNTIME_PHASE,
  RUNTIME_PHASE_ORDER,
  RUNTIME_STATE,
  RUNTIME_STATE_TRANSITIONS,
  RUNTIME_MODE,
  RUNTIME_FORBIDDEN_ACTIVITIES,
  RUNTIME_CONTEXT_FIELDS,
  SYSTEM_REGISTRY_FIELDS,
  RUNTIME_PHASE_ANCHORS,
  RUNTIME_MANAGER_ANCHORS,
  isRuntimePhase,
  isRuntimeState,
  canTransitionRuntimeState,
  resolveRuntimeMode,
  createRuntimeContextRecord,
  createSystemRegistryRecord,
  describeRuntimeBootstrapPhases,
  assertRuntimeForbiddenActivity
};
