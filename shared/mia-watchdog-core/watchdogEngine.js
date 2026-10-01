"use strict";

/**
 * Master Canon 0066 — Watchdog Engine.
 * Kernel Layer 0 sole authority for freeze/deadlock/heartbeat oversight.
 * Never repairs/restarts — notifies Recovery Manager only (injected bridge).
 */

const crypto = require("crypto");

const WDE_COMPONENT = Object.freeze({
  WATCHDOG_ENGINE: "watchdog_engine",
  HEARTBEAT_INTAKE: "heartbeat_intake",
  HEARTBEAT_VERIFIER: "heartbeat_verifier",
  FREEZE_DETECTOR: "freeze_detector",
  DEADLOCK_DETECTOR: "deadlock_detector",
  RESOURCE_SIGNAL_INTAKE: "resource_signal_intake",
  PROBLEM_CLASSIFIER: "problem_classifier",
  TIMEOUT_REGISTRY: "timeout_registry",
  RECOVERY_NOTIFIER: "recovery_notifier",
  CYCLE_CONTROLLER: "cycle_controller",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const WDE_COMPONENT_ORDER = Object.freeze(Object.values(WDE_COMPONENT));

const WDE_CYCLE = Object.freeze([
  "receive_heartbeats",
  "verify",
  "detect_problems",
  "classify",
  "notify_recovery"
]);

const WDE_HEARTBEAT_FIELDS = Object.freeze([
  "componentId",
  "timestamp",
  "health",
  "runtimeId",
  "sequence",
  "status"
]);

const WDE_SCOPE = Object.freeze({
  KERNEL: "kernel",
  SERVICE: "service",
  RESOURCE: "resource",
  PLATFORM: "platform",
  AI: "ai"
});

const WDE_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const WDE_SEVERITY_ORDER = Object.freeze([
  WDE_SEVERITY.INFO,
  WDE_SEVERITY.WARNING,
  WDE_SEVERITY.ERROR,
  WDE_SEVERITY.CRITICAL,
  WDE_SEVERITY.FATAL
]);

const WDE_PROBLEM_KIND = Object.freeze({
  HEARTBEAT_LOSS: "heartbeat_loss",
  FREEZE: "freeze",
  DEADLOCK: "deadlock",
  QUEUE_OVERFLOW: "queue_overflow",
  CPU_OVERLOAD: "cpu_overload",
  MEMORY_LEAK: "memory_leak",
  SLOW_RESPONSE: "slow_response",
  PLATFORM_DISCONNECT: "platform_disconnect"
});

const WDE_PROBLEM_KIND_ORDER = Object.freeze(Object.values(WDE_PROBLEM_KIND));

/** Default timeouts (ms) — canon table. */
const WDE_DEFAULT_TIMEOUTS_MS = Object.freeze({
  kernel: 1000,
  "event-bus": 2000,
  battle: 3000,
  obs: 5000,
  plugin: 10000
});

const WDE_PLATFORM_IDS = Object.freeze([
  "tiktok",
  "kick",
  "twitch",
  "discord",
  "obs"
]);

const WDE_PUBLIC_API = Object.freeze([
  "heartbeat",
  "runCycle",
  "detectFreeze",
  "detectDeadlock",
  "ingestResourceSignal",
  "notifyRecovery",
  "setTimeoutMs",
  "registerComponent",
  "metrics",
  "auditTrail",
  "status"
]);

const WDE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-watchdog-core/watchdogEngine.js",
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "docs/master-canon/0066-watchdog-engine.md"
]);

const WDE_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "watchdog",
  "watchdog_engine",
  "health_manager",
  "health-manager",
  "recovery_manager",
  "runtime_manager",
  "runtime-manager",
  "resource_manager",
  "resource-manager",
  "operator",
  "system"
]);

const WDE_FLAGS = Object.freeze({
  repairsDirectly: false,
  soleWatchdogAuthority: true,
  notifiesRecoveryOnly: true,
  spawnsOsProcesses: false,
  killsOsProcesses: false,
  allocatesResources: false,
  freesResources: false
});

const WDE_DEFAULT_CYCLE_MS = 1000;
const WDE_DEFAULT_MAX_RECOVERY_NOTIFIES = 3;
const WDE_CPU_OVERLOAD_THRESHOLD = 99;

let activeWatchdogEngine = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidSeverity(severity) {
  return WDE_SEVERITY_ORDER.includes(severity);
}

function isValidScope(scope) {
  return Object.values(WDE_SCOPE).includes(scope);
}

function isValidProblemKind(kind) {
  return WDE_PROBLEM_KIND_ORDER.includes(kind);
}

function isPlatformComponent(componentId) {
  const id = String(componentId || "").toLowerCase();
  return WDE_PLATFORM_IDS.some(
    (p) => id === p || id.startsWith(`${p}-`) || id.includes(`-${p}`)
  );
}

function isBattleComponent(componentId) {
  const id = String(componentId || "").toLowerCase();
  return id === "battle" || id.startsWith("battle-") || id.includes("-battle");
}

function defaultSeverityForKind(kind) {
  switch (kind) {
    case WDE_PROBLEM_KIND.HEARTBEAT_LOSS:
      return WDE_SEVERITY.ERROR;
    case WDE_PROBLEM_KIND.FREEZE:
      return WDE_SEVERITY.CRITICAL;
    case WDE_PROBLEM_KIND.DEADLOCK:
      return WDE_SEVERITY.CRITICAL;
    case WDE_PROBLEM_KIND.QUEUE_OVERFLOW:
      return WDE_SEVERITY.WARNING;
    case WDE_PROBLEM_KIND.CPU_OVERLOAD:
      return WDE_SEVERITY.CRITICAL;
    case WDE_PROBLEM_KIND.MEMORY_LEAK:
      return WDE_SEVERITY.ERROR;
    case WDE_PROBLEM_KIND.SLOW_RESPONSE:
      return WDE_SEVERITY.WARNING;
    case WDE_PROBLEM_KIND.PLATFORM_DISCONNECT:
      return WDE_SEVERITY.ERROR;
    default:
      return WDE_SEVERITY.ERROR;
  }
}

function classifyProblem(problem = {}) {
  const kind = problem.kind || problem.problemKind;
  if (!isValidProblemKind(kind)) {
    return { ok: false, error: "invalid_problem_kind", kind };
  }
  const severity =
    problem.severity && isValidSeverity(problem.severity)
      ? problem.severity
      : defaultSeverityForKind(kind);
  const componentId = String(problem.componentId || problem.component || "").trim();
  const kernelPreserved =
    problem.kernelPreserved === true ||
    isPlatformComponent(componentId) ||
    kind === WDE_PROBLEM_KIND.PLATFORM_DISCONNECT;

  return {
    ok: true,
    classification: Object.freeze({
      kind,
      severity,
      componentId: componentId || null,
      kernelPreserved,
      reason: problem.reason || problem.cause || kind
    })
  };
}

function createHeartbeatDescriptor(input = {}) {
  const componentId = String(input.componentId || "").trim();
  if (!componentId) return { ok: false, error: "missing_componentId" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : null;
  if (timestamp == null) return { ok: false, error: "missing_timestamp" };

  const health = input.health;
  if (health == null || health === "") {
    return { ok: false, error: "missing_health" };
  }

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const sequence =
    typeof input.sequence === "number" && Number.isFinite(input.sequence)
      ? input.sequence
      : null;
  if (sequence == null) return { ok: false, error: "missing_sequence" };

  const status = input.status;
  if (status == null || status === "") {
    return { ok: false, error: "missing_status" };
  }

  const heartbeatId = input.heartbeatId || makeId("hb");

  return {
    ok: true,
    descriptor: Object.freeze({
      heartbeatId,
      componentId,
      timestamp,
      health,
      runtimeId,
      sequence,
      status
    })
  };
}

function validateHeartbeatIntegrity(descriptor, meta = {}) {
  if (!descriptor || typeof descriptor !== "object") {
    return { ok: false, error: "invalid_heartbeat" };
  }
  for (const field of WDE_HEARTBEAT_FIELDS) {
    if (!(field in descriptor) || descriptor[field] == null || descriptor[field] === "") {
      return { ok: false, error: "missing_heartbeat_field", field };
    }
  }
  if (meta.forged === true) {
    return { ok: false, error: "forged_heartbeat_blocked" };
  }
  if (meta.sourceVerified === false) {
    return { ok: false, error: "heartbeat_integrity_failed" };
  }
  if (meta.authorized === false) {
    return { ok: false, error: "unauthorized_heartbeat" };
  }
  return { ok: true };
}

function createWatchdogEngine(options = {}) {
  if (
    activeWatchdogEngine &&
    activeWatchdogEngine.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "watchdog_engine_already_active",
      soleWatchdogAuthority: true
    });
  }

  const timeouts = {
    ...WDE_DEFAULT_TIMEOUTS_MS,
    ...(options.timeoutsMs || {})
  };
  const cycleLengthMs =
    typeof options.cycleLengthMs === "number" && options.cycleLengthMs > 0
      ? options.cycleLengthMs
      : WDE_DEFAULT_CYCLE_MS;
  const maxRecoveryNotifies =
    typeof options.maxRecoveryNotifies === "number" &&
    options.maxRecoveryNotifies > 0
      ? options.maxRecoveryNotifies
      : WDE_DEFAULT_MAX_RECOVERY_NOTIFIES;
  const cpuOverloadThreshold =
    typeof options.cpuOverloadThreshold === "number"
      ? options.cpuOverloadThreshold
      : WDE_CPU_OVERLOAD_THRESHOLD;

  const authorized = new Set(
    options.authorizedSources || WDE_AUTHORIZED_SOURCES
  );

  const recoveryBridge =
    options.recoveryBridge ||
    Object.freeze({
      fromWatchdog() {
        return { ok: false, error: "recovery_bridge_not_wired" };
      }
    });

  const components = new Map();
  const lastHeartbeats = new Map();
  const lastSequences = new Map();
  const lastStates = new Map();
  const pendingHeartbeats = [];
  const problems = [];
  const classified = [];
  const phaseHistory = [];
  const audit = [];
  const recoveryNotifyCounts = new Map();

  let cycleCount = 0;
  let lastCycleAt = null;
  let heartbeatCount = 0;
  let timeoutCount = 0;
  let freezeCount = 0;
  let deadlockCount = 0;
  let recoveryNotifyCount = 0;
  let reactionSumMs = 0;
  let reactionSamples = 0;
  let rejectedCount = 0;

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.sourceVerified === false) return false;
    if (meta.forged === true) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
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

  function resolveTimeoutMs(componentId) {
    const reg = components.get(componentId);
    if (reg && typeof reg.timeoutMs === "number") return reg.timeoutMs;
    if (timeouts[componentId] != null) return timeouts[componentId];
    const id = String(componentId || "").toLowerCase();
    for (const [key, ms] of Object.entries(timeouts)) {
      if (id === key || id.startsWith(`${key}-`) || id.includes(`-${key}`)) {
        return ms;
      }
    }
    if (reg && reg.scope === WDE_SCOPE.KERNEL) return timeouts.kernel || 1000;
    if (reg && reg.scope === WDE_SCOPE.PLATFORM) return timeouts.obs || 5000;
    return cycleLengthMs;
  }

  function registerComponent(componentId, config = {}, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_register_component" };
    }
    const id = String(componentId || "").trim();
    if (!id) return { ok: false, error: "missing_componentId" };

    const scope = config.scope || WDE_SCOPE.SERVICE;
    if (!isValidScope(scope)) {
      return { ok: false, error: "invalid_scope", scope };
    }

    const timeoutMs =
      typeof config.timeoutMs === "number" && config.timeoutMs > 0
        ? config.timeoutMs
        : resolveTimeoutMs(id);

    const entry = Object.freeze({
      componentId: id,
      scope,
      timeoutMs,
      registeredAt: Date.now()
    });
    components.set(id, entry);
    appendAudit({
      action: "register_component",
      componentId: id,
      scope,
      timeoutMs,
      actor: meta.actor || meta.source || "system"
    });
    return { ok: true, component: entry };
  }

  function setTimeoutMs(componentKey, timeoutMs, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_timeout_change" };
    }
    const key = String(componentKey || "").trim();
    if (!key) return { ok: false, error: "missing_component_key" };
    const ms = Number(timeoutMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      return { ok: false, error: "invalid_timeout_ms" };
    }
    timeouts[key] = ms;
    const reg = components.get(key);
    if (reg) {
      components.set(
        key,
        Object.freeze({
          ...reg,
          timeoutMs: ms
        })
      );
    }
    appendAudit({
      action: "set_timeout",
      componentKey: key,
      timeoutMs: ms,
      actor: meta.actor || meta.source || "system"
    });
    return { ok: true, componentKey: key, timeoutMs: ms };
  }

  function heartbeat(input = {}, meta = {}) {
    if (meta.forged === true) {
      rejectedCount += 1;
      appendAudit({ action: "heartbeat_rejected", reason: "forged_heartbeat_blocked" });
      return { ok: false, error: "forged_heartbeat_blocked" };
    }

    if (!isAuthorized(meta)) {
      rejectedCount += 1;
      appendAudit({ action: "heartbeat_rejected", reason: "unauthorized" });
      return { ok: false, error: "unauthorized_heartbeat" };
    }

    const built = createHeartbeatDescriptor(input);
    if (!built.ok) {
      rejectedCount += 1;
      return built;
    }

    const integrity = validateHeartbeatIntegrity(built.descriptor, meta);
    if (!integrity.ok) {
      rejectedCount += 1;
      appendAudit({
        action: "heartbeat_rejected",
        reason: integrity.error,
        componentId: built.descriptor.componentId
      });
      return integrity;
    }

    const { componentId, sequence } = built.descriptor;
    const prevSeq = lastSequences.get(componentId);
    if (prevSeq != null && sequence <= prevSeq) {
      rejectedCount += 1;
      appendAudit({
        action: "heartbeat_rejected",
        reason: "out_of_order_sequence",
        componentId,
        sequence,
        prevSeq
      });
      return {
        ok: false,
        error: "out_of_order_sequence",
        componentId,
        sequence,
        prevSeq
      };
    }

    lastSequences.set(componentId, sequence);
    lastHeartbeats.set(componentId, built.descriptor);
    if (input.state !== undefined) {
      lastStates.set(componentId, input.state);
    }
    pendingHeartbeats.push(built.descriptor);
    heartbeatCount += 1;

    appendAudit({
      action: "heartbeat_accepted",
      componentId,
      sequence,
      heartbeatId: built.descriptor.heartbeatId
    });

    return { ok: true, descriptor: built.descriptor };
  }

  function detectFreeze(input = {}, nowMs = Date.now()) {
    const componentId = String(input.componentId || input.component || "").trim();
    if (!componentId) return { ok: false, error: "missing_componentId" };

    const timeoutMs =
      typeof input.timeoutMs === "number"
        ? input.timeoutMs
        : resolveTimeoutMs(componentId);
    const last = lastHeartbeats.get(componentId);
    const reasons = [];

    if (!last) {
      if (input.requireHeartbeat !== false) {
        reasons.push("missing_heartbeat");
      }
    } else if (nowMs - last.timestamp > timeoutMs) {
      reasons.push("heartbeat_timeout");
      timeoutCount += 1;
    }

    if (input.unresponsive === true || input.status === "unresponsive") {
      reasons.push("unresponsive");
    }

    if (input.stateUnchanged === true) {
      reasons.push("state_not_changing");
    } else if (
      input.previousState !== undefined &&
      input.currentState !== undefined &&
      Object.is(input.previousState, input.currentState)
    ) {
      reasons.push("state_not_changing");
    } else if (
      input.state !== undefined &&
      lastStates.has(componentId) &&
      Object.is(lastStates.get(componentId), input.state) &&
      input.expectStateChange === true
    ) {
      reasons.push("state_not_changing");
    }

    const frozen = reasons.length > 0;
    if (frozen) freezeCount += 1;

    const result = Object.freeze({
      ok: true,
      frozen,
      componentId,
      reasons: Object.freeze([...reasons]),
      timeoutMs,
      lastHeartbeat: last || null
    });

    if (frozen) {
      appendAudit({
        action: "freeze_detected",
        componentId,
        reasons: result.reasons
      });
    }
    return result;
  }

  function detectDeadlock(input = {}) {
    const blockedThreads = Array.isArray(input.blockedThreads)
      ? input.blockedThreads
      : [];
    const lockWaits = Array.isArray(input.lockWaits) ? input.lockWaits : [];
    const cyclicDeps = Array.isArray(input.cyclicDeps)
      ? input.cyclicDeps
      : Array.isArray(input.cyclicDependencies)
        ? input.cyclicDependencies
        : [];
    const inactiveProcesses = Array.isArray(input.inactiveProcesses)
      ? input.inactiveProcesses
      : [];

    const signals = [];
    if (blockedThreads.length > 0) signals.push("blocked_threads");
    if (lockWaits.length > 0) signals.push("lock_waits");
    if (cyclicDeps.length > 0) signals.push("cyclic_deps");
    if (inactiveProcesses.length > 0) signals.push("inactive_processes");

    const confirmed =
      input.confirmed === true ||
      (signals.includes("cyclic_deps") && signals.length >= 2) ||
      (signals.includes("blocked_threads") && signals.includes("lock_waits")) ||
      (signals.length >= 3);

    if (confirmed) deadlockCount += 1;

    const componentId = String(
      input.componentId || input.component || "runtime"
    ).trim();

    const result = Object.freeze({
      ok: true,
      deadlock: confirmed,
      confirmed,
      componentId,
      signals: Object.freeze([...signals]),
      blockedThreads: Object.freeze([...blockedThreads]),
      lockWaits: Object.freeze([...lockWaits]),
      cyclicDeps: Object.freeze([...cyclicDeps]),
      inactiveProcesses: Object.freeze([...inactiveProcesses])
    });

    if (confirmed) {
      appendAudit({
        action: "deadlock_detected",
        componentId,
        signals: result.signals
      });
    }
    return result;
  }

  function notifyRecovery(problem = {}, meta = {}) {
    if (meta.bypassWatchdog === true || meta.bypassRecoveryGate === true) {
      rejectedCount += 1;
      return { ok: false, error: "recovery_notify_bypass_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_recovery_notify" };
    }

    if (
      problem.strategy != null ||
      problem.chosenStrategy != null ||
      problem.executeStrategy != null ||
      meta.strategy != null ||
      meta.chosenStrategy != null ||
      meta.executeStrategy != null
    ) {
      rejectedCount += 1;
      return {
        ok: false,
        error: "watchdog_cannot_choose_or_execute_strategy",
        notifiesRecoveryOnly: true
      };
    }

    const classifiedProblem = classifyProblem(problem);
    if (!classifiedProblem.ok) {
      rejectedCount += 1;
      return classifiedProblem;
    }

    const { classification } = classifiedProblem;
    const componentId = classification.componentId || "unknown";
    const count = recoveryNotifyCounts.get(componentId) || 0;
    if (count >= maxRecoveryNotifies) {
      rejectedCount += 1;
      appendAudit({
        action: "recovery_notify_rate_limited",
        componentId,
        count,
        maxRecoveryNotifies
      });
      return {
        ok: false,
        error: "recovery_notify_rate_limited",
        componentId,
        count,
        maxRecoveryNotifies
      };
    }

    const detectedAt =
      typeof problem.detectedAt === "number" ? problem.detectedAt : Date.now();
    const notifiedAt = Date.now();
    const reactionMs = Math.max(0, notifiedAt - detectedAt);
    reactionSumMs += reactionMs;
    reactionSamples += 1;

    const payload = Object.freeze({
      component: componentId,
      componentId,
      severity: classification.severity,
      cause: classification.reason,
      kind: classification.kind,
      kernelPreserved: classification.kernelPreserved === true,
      watchdogRequest: true,
      immediate: true
    });

    let bridgeResult;
    try {
      if (typeof recoveryBridge.fromWatchdog === "function") {
        bridgeResult = recoveryBridge.fromWatchdog(payload, {
          source: meta.source || "watchdog",
          authorized: true,
          sourceVerified: true
        });
      } else if (typeof recoveryBridge.notify === "function") {
        bridgeResult = recoveryBridge.notify(payload, meta);
      } else {
        bridgeResult = { ok: false, error: "recovery_bridge_missing_fromWatchdog" };
      }
    } catch (err) {
      bridgeResult = {
        ok: false,
        error: "recovery_bridge_threw",
        message: err && err.message
      };
    }

    recoveryNotifyCounts.set(componentId, count + 1);
    recoveryNotifyCount += 1;
    appendAudit({
      action: "recovery_notified",
      componentId,
      kind: classification.kind,
      severity: classification.severity,
      kernelPreserved: classification.kernelPreserved,
      reactionMs,
      bridgeOk: bridgeResult && bridgeResult.ok !== false
    });

    return Object.freeze({
      ok: true,
      notified: true,
      classification,
      kernelPreserved: classification.kernelPreserved,
      reactionMs,
      bridgeResult: bridgeResult || null,
      repairsDirectly: false,
      notifiesRecoveryOnly: true
    });
  }

  function ingestResourceSignal(signal = {}, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_resource_signal" };
    }

    const resource =
      String(signal.resource || signal.type || signal.kind || "").toLowerCase() ||
      "cpu";
    const value =
      typeof signal.value === "number"
        ? signal.value
        : typeof signal.percent === "number"
          ? signal.percent
          : typeof signal.usage === "number"
            ? signal.usage
            : null;

    appendAudit({
      action: "resource_signal",
      resource,
      value,
      diagnosticOnly: true
    });

    const problemsFound = [];

    if (
      (resource === "cpu" || resource === "cpu_usage") &&
      value != null &&
      value >= cpuOverloadThreshold
    ) {
      problemsFound.push({
        kind: WDE_PROBLEM_KIND.CPU_OVERLOAD,
        componentId: signal.componentId || "runtime",
        severity: WDE_SEVERITY.CRITICAL,
        reason: `cpu_${value}`,
        detectedAt: signal.at || Date.now()
      });
    }
    if (
      (resource === "ram" || resource === "memory") &&
      (signal.leak === true || signal.memoryLeak === true)
    ) {
      problemsFound.push({
        kind: WDE_PROBLEM_KIND.MEMORY_LEAK,
        componentId: signal.componentId || "runtime",
        severity: WDE_SEVERITY.ERROR,
        reason: "memory_leak",
        detectedAt: signal.at || Date.now()
      });
    }
    if (signal.queueOverflow === true || resource === "queue_overflow") {
      problemsFound.push({
        kind: WDE_PROBLEM_KIND.QUEUE_OVERFLOW,
        componentId: signal.componentId || "runtime",
        severity: WDE_SEVERITY.WARNING,
        reason: "queue_overflow",
        detectedAt: signal.at || Date.now()
      });
    }

    const notifications = [];
    for (const p of problemsFound) {
      const classifiedP = classifyProblem(p);
      if (classifiedP.ok) {
        classified.push(classifiedP.classification);
        problems.push(Object.freeze({ ...p }));
        notifications.push(
          notifyRecovery(p, {
            source: meta.source || "resource_manager",
            authorized: true,
            sourceVerified: true
          })
        );
      }
    }

    return Object.freeze({
      ok: true,
      diagnosticOnly: true,
      allocatesResources: false,
      freesResources: false,
      resource,
      value,
      problems: Object.freeze(problemsFound.map((p) => Object.freeze({ ...p }))),
      notifications: Object.freeze(notifications)
    });
  }

  function runCycle(nowMs = Date.now()) {
    const cycleId = makeId("wde-cycle");
    const phases = [];
    const cycleProblems = [];
    const cycleClassified = [];
    const cycleNotifies = [];

    function pushPhase(phase, detail) {
      const entry = Object.freeze({
        phase,
        at: nowMs,
        ...(detail || {})
      });
      phases.push(entry);
      phaseHistory.push(entry);
    }

    // 1. receive_heartbeats
    const received = pendingHeartbeats.splice(0, pendingHeartbeats.length);
    pushPhase("receive_heartbeats", { count: received.length });

    // 2. verify
    const verified = [];
    const invalid = [];
    for (const hb of received) {
      const integrity = validateHeartbeatIntegrity(hb, {
        sourceVerified: true,
        authorized: true
      });
      if (integrity.ok) verified.push(hb);
      else invalid.push({ heartbeat: hb, error: integrity.error });
    }
    pushPhase("verify", {
      verified: verified.length,
      invalid: invalid.length
    });

    // 3. detect_problems
    for (const [componentId] of components) {
      const freeze = detectFreeze({ componentId }, nowMs);
      if (freeze.frozen) {
        const kind = freeze.reasons.includes("heartbeat_timeout")
          ? WDE_PROBLEM_KIND.HEARTBEAT_LOSS
          : WDE_PROBLEM_KIND.FREEZE;
        cycleProblems.push({
          kind: freeze.reasons.includes("missing_heartbeat")
            ? WDE_PROBLEM_KIND.HEARTBEAT_LOSS
            : kind,
          componentId,
          severity:
            kind === WDE_PROBLEM_KIND.FREEZE
              ? WDE_SEVERITY.CRITICAL
              : WDE_SEVERITY.ERROR,
          reason: freeze.reasons.join(","),
          detectedAt: nowMs,
          kernelPreserved:
            isPlatformComponent(componentId) || isBattleComponent(componentId)
        });
      }
    }

    // Explicit freeze/deadlock/platform/battle inputs for this cycle
    if (options.cycleHooks && typeof options.cycleHooks.detectExtra === "function") {
      const extra = options.cycleHooks.detectExtra({ nowMs, components, lastHeartbeats }) || [];
      for (const p of extra) cycleProblems.push(p);
    }

    pushPhase("detect_problems", { count: cycleProblems.length });

    // 4. classify
    for (const p of cycleProblems) {
      const c = classifyProblem(p);
      if (c.ok) {
        cycleClassified.push(c.classification);
        classified.push(c.classification);
        problems.push(Object.freeze({ ...p }));
      }
    }
    pushPhase("classify", { count: cycleClassified.length });

    // 5. notify_recovery
    for (const c of cycleClassified) {
      const notify = notifyRecovery(
        {
          kind: c.kind,
          componentId: c.componentId,
          severity: c.severity,
          reason: c.reason,
          kernelPreserved: c.kernelPreserved,
          detectedAt: nowMs
        },
        { source: "watchdog", authorized: true, sourceVerified: true }
      );
      cycleNotifies.push(notify);
    }
    pushPhase("notify_recovery", { count: cycleNotifies.length });

    cycleCount += 1;
    lastCycleAt = nowMs;

    appendAudit({
      action: "cycle_complete",
      cycleId,
      phases: WDE_CYCLE.slice(),
      problems: cycleProblems.length,
      notifies: cycleNotifies.filter((n) => n.ok).length
    });

    return Object.freeze({
      ok: true,
      cycleId,
      cycleCount,
      at: nowMs,
      cycleLengthMs,
      phases: Object.freeze(phases.map((p) => p.phase)),
      phaseDetail: Object.freeze([...phases]),
      received: received.length,
      verified: verified.length,
      problems: Object.freeze(cycleProblems.map((p) => Object.freeze({ ...p }))),
      classified: Object.freeze([...cycleClassified]),
      notifies: Object.freeze([...cycleNotifies])
    });
  }

  function metrics() {
    return Object.freeze({
      heartbeatCount,
      timeoutCount,
      freezeCount,
      deadlockCount,
      recoveryNotifyCount,
      averageReactionMs:
        reactionSamples > 0 ? reactionSumMs / reactionSamples : 0,
      cycleCount,
      rejectedCount,
      componentCount: components.size
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      ...WDE_FLAGS,
      cycleLengthMs,
      maxRecoveryNotifies,
      cycleCount,
      lastCycleAt,
      active: activeWatchdogEngine != null,
      timeouts: Object.freeze({ ...timeouts })
    });
  }

  // Seed defaults if requested
  if (options.seedDefaults === true) {
    for (const [key, ms] of Object.entries(WDE_DEFAULT_TIMEOUTS_MS)) {
      const scope =
        key === "kernel" || key === "event-bus"
          ? WDE_SCOPE.KERNEL
          : key === "battle"
            ? WDE_SCOPE.SERVICE
            : key === "obs"
              ? WDE_SCOPE.PLATFORM
              : WDE_SCOPE.SERVICE;
      registerComponent(
        key,
        { scope, timeoutMs: ms },
        { source: "kernel", authorized: true, sourceVerified: true }
      );
    }
  }

  const engine = Object.freeze({
    ok: true,
    heartbeat,
    runCycle,
    detectFreeze,
    detectDeadlock,
    ingestResourceSignal,
    notifyRecovery,
    setTimeoutMs,
    registerComponent,
    classifyProblem: (p) => classifyProblem(p),
    metrics,
    status,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    phaseHistory() {
      return Object.freeze([...phaseHistory]);
    },
    getComponent(componentId) {
      return components.get(componentId) || null;
    },
    getTimeoutMs(componentKey) {
      return resolveTimeoutMs(componentKey);
    },
    lastHeartbeat(componentId) {
      return lastHeartbeats.get(componentId) || null;
    },
    isActive() {
      return true;
    },
    // Explicit non-operations — Watchdog never repairs
    repair() {
      return {
        ok: false,
        error: "watchdog_does_not_repair",
        repairsDirectly: false
      };
    },
    restart() {
      return {
        ok: false,
        error: "watchdog_does_not_restart",
        repairsDirectly: false
      };
    },
    reconnect() {
      return {
        ok: false,
        error: "watchdog_does_not_reconnect",
        repairsDirectly: false
      };
    },
    spawnProcess() {
      return {
        ok: false,
        error: "watchdog_does_not_spawn_processes",
        repairsDirectly: false
      };
    },
    killProcess() {
      return {
        ok: false,
        error: "watchdog_does_not_kill_processes",
        repairsDirectly: false
      };
    },
    exec() {
      return {
        ok: false,
        error: "watchdog_does_not_exec",
        repairsDirectly: false
      };
    },
    allocateResource() {
      return {
        ok: false,
        error: "watchdog_does_not_allocate_resources",
        allocatesResources: false
      };
    },
    freeResource() {
      return {
        ok: false,
        error: "watchdog_does_not_free_resources",
        freesResources: false
      };
    }
  });

  activeWatchdogEngine = {
    isActive: engine.isActive
  };

  return engine;
}

function clearWatchdogSingletonForTest() {
  activeWatchdogEngine = null;
}

module.exports = {
  WDE_COMPONENT,
  WDE_COMPONENT_ORDER,
  WDE_CYCLE,
  WDE_HEARTBEAT_FIELDS,
  WDE_SCOPE,
  WDE_SEVERITY,
  WDE_SEVERITY_ORDER,
  WDE_PROBLEM_KIND,
  WDE_PROBLEM_KIND_ORDER,
  WDE_DEFAULT_TIMEOUTS_MS,
  WDE_PLATFORM_IDS,
  WDE_PUBLIC_API,
  WDE_RUNTIME_ANCHORS,
  WDE_AUTHORIZED_SOURCES,
  WDE_FLAGS,
  WDE_DEFAULT_CYCLE_MS,
  WDE_DEFAULT_MAX_RECOVERY_NOTIFIES,
  WDE_CPU_OVERLOAD_THRESHOLD,
  createHeartbeatDescriptor,
  validateHeartbeatIntegrity,
  classifyProblem,
  isPlatformComponent,
  isBattleComponent,
  createWatchdogEngine,
  clearWatchdogSingletonForTest
};
