"use strict";

/**
 * Master Canon 0069 — Shutdown Manager.
 * Kernel Layer 0 sole authority for controlled platform shutdown.
 * Never calls process.exit / OS kill — uses injected bridges only.
 */

const crypto = require("crypto");

const SDM_COMPONENT = Object.freeze({
  SHUTDOWN_MANAGER: "shutdown_manager",
  REQUEST_INTAKE: "request_intake",
  VALIDATION_GATE: "validation_gate",
  NOTIFICATION_DISPATCHER: "notification_dispatcher",
  STOP_SEQUENCER: "stop_sequencer",
  STATE_PERSISTER: "state_persister",
  RESOURCE_RELEASER: "resource_releaser",
  RUNTIME_CLOSER: "runtime_closer",
  RECOVERY_COORDINATOR: "recovery_coordinator",
  REPORT_ENGINE: "report_engine",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const SDM_COMPONENT_ORDER = Object.freeze(Object.values(SDM_COMPONENT));

const SDM_MODE = Object.freeze({
  GRACEFUL: "graceful",
  MAINTENANCE: "maintenance",
  EMERGENCY: "emergency",
  RESTART: "restart"
});

const SDM_MODE_ORDER = Object.freeze([
  SDM_MODE.GRACEFUL,
  SDM_MODE.MAINTENANCE,
  SDM_MODE.EMERGENCY,
  SDM_MODE.RESTART
]);

const SDM_RESULT = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  DEFERRED: "DEFERRED",
  REJECTED: "REJECTED",
  ABORTED: "ABORTED"
});

const SDM_DESCRIPTOR_FIELDS = Object.freeze([
  "shutdownId",
  "runtimeId",
  "reason",
  "requestedBy",
  "started",
  "finished",
  "mode",
  "result"
]);

const SDM_WORKFLOW = Object.freeze([
  "shutdown_request",
  "validation",
  "notify_components",
  "stop_services",
  "save_state",
  "release_resources",
  "close_runtime",
  "exit"
]);

const SDM_STOP_ORDER = Object.freeze([
  "plugins",
  "battle",
  "ai",
  "platform_connectors",
  "obs",
  "core_services",
  "kernel"
]);

const SDM_PERSISTENCE_TARGETS = Object.freeze([
  "config",
  "runtime",
  "stats",
  "inventories",
  "battle",
  "ai_memory",
  "audit"
]);

const SDM_RESOURCE_KINDS = Object.freeze([
  "ram",
  "files",
  "databases",
  "sockets",
  "apis",
  "threads"
]);

const SDM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "runtime_manager",
  "runtime-manager",
  "recovery_manager",
  "recovery-manager",
  "safe_mode_manager",
  "safe-mode-manager",
  "lifecycle_manager",
  "lifecycle-manager",
  "system"
]);

const SDM_FLAGS = Object.freeze({
  soleShutdownAuthority: true,
  phasesMustNotSkip: true,
  kernelStopsLast: true,
  blocksParallelShutdown: true
});

const SDM_PUBLIC_API = Object.freeze([
  "shutdown",
  "validateRequest",
  "emergencyShutdown",
  "status",
  "current",
  "metrics",
  "auditTrail",
  "reportArchive",
  "getStopOrder",
  "getWorkflow"
]);

const SDM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-shutdown-core/shutdownManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "shared/mia-lifecycle-core/lifecycleManager.js",
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-safe-mode-core/safeModeManager.js",
  "docs/master-canon/0069-shutdown-manager.md"
]);

let activeShutdownManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidMode(mode) {
  return SDM_MODE_ORDER.includes(mode);
}

function createShutdownDescriptor(input = {}) {
  const mode = input.mode || SDM_MODE.GRACEFUL;
  if (!isValidMode(mode)) {
    return { ok: false, error: "invalid_mode", mode };
  }

  const reason = String(input.reason || "").trim();
  if (!reason) return { ok: false, error: "missing_reason" };

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const requestedBy = String(input.requestedBy || "").trim();
  if (!requestedBy) return { ok: false, error: "missing_requestedBy" };

  const started =
    typeof input.started === "number" && Number.isFinite(input.started)
      ? input.started
      : Date.now();

  const finished =
    input.finished == null
      ? null
      : typeof input.finished === "number" && Number.isFinite(input.finished)
        ? input.finished
        : null;

  const result = input.result != null ? String(input.result) : null;
  const shutdownId = input.shutdownId || makeId("sdm");

  return {
    ok: true,
    descriptor: Object.freeze({
      shutdownId,
      runtimeId,
      reason,
      requestedBy,
      started,
      finished,
      mode,
      result
    })
  };
}

function defaultBridgeOk(label) {
  return Object.freeze({
    ok: true,
    stub: true,
    label
  });
}

function createShutdownManager(options = {}) {
  if (
    activeShutdownManager &&
    activeShutdownManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "shutdown_manager_already_active",
      soleShutdownAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || SDM_AUTHORIZED_SOURCES
  );

  const runtimeBridge =
    options.runtimeBridge ||
    Object.freeze({
      transition(from, to) {
        return defaultBridgeOk(`runtime:${from}->${to}`);
      },
      state: "RUNNING"
    });

  const lifecycleBridge =
    options.lifecycleBridge ||
    Object.freeze({
      transition(from, to) {
        return defaultBridgeOk(`lifecycle:${from}->${to}`);
      }
    });

  const recoveryBridge =
    options.recoveryBridge ||
    Object.freeze({
      isActive() {
        return false;
      },
      finishOrAbort() {
        return { ok: true, action: "none" };
      }
    });

  const stateBridge =
    options.stateBridge ||
    Object.freeze({
      save(target, detail) {
        return { ok: true, target, detail: detail || null };
      },
      supportsPersistence(target) {
        return SDM_PERSISTENCE_TARGETS.includes(target);
      }
    });

  const resourceBridge =
    options.resourceBridge ||
    Object.freeze({
      release(kind) {
        return { ok: true, kind };
      },
      activeResources() {
        return [];
      }
    });

  const exitBridge =
    options.exitBridge ||
    Object.freeze({
      requestExit(detail) {
        return { ok: true, scheduled: true, detail: detail || null };
      }
    });

  const restartBridge =
    options.restartBridge ||
    Object.freeze({
      scheduleRestart(detail) {
        return { ok: true, scheduled: true, detail: detail || null };
      }
    });

  const notifier =
    typeof options.notifier === "function"
      ? options.notifier
      : null;

  const subscribers = Array.isArray(options.subscribers)
    ? [...options.subscribers]
    : [];

  const components =
    Array.isArray(options.components) && options.components.length
      ? [...options.components]
      : [...SDM_STOP_ORDER];

  const audit = [];
  const archive = [];
  const phaseHistory = [];
  const notifications = [];
  const lifecycleAudit = [];

  let current = null;
  let inProgress = false;
  let shutdownCount = 0;
  let emergencyCount = 0;
  let successCount = 0;
  let totalDurationMs = 0;
  const byReason = Object.create(null);

  function isAuthorized(meta = {}) {
    return (
      meta.authorized === true ||
      authorized.has(meta.source || "") ||
      authorized.has(meta.actor || "")
    );
  }

  function isSourceVerified(meta = {}) {
    if (meta.forged === true) return false;
    if (meta.sourceVerified === false) return false;
    if (meta.sourceVerified === true) return true;
    return isAuthorized(meta);
  }

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at != null ? record.at : Date.now(),
        immutable: true
      })
    );
  }

  function pushPhase(phase, detail = {}) {
    phaseHistory.push(
      Object.freeze({
        phase,
        at: detail.at != null ? detail.at : Date.now(),
        shutdownId:
          detail.shutdownId || (current && current.shutdownId) || null,
        ...detail
      })
    );
    if (current) {
      if (!current.phases.includes(phase)) {
        current.phases.push(phase);
      }
    }
  }

  function snapshotCurrent() {
    if (!current) return null;
    return Object.freeze({
      shutdownId: current.shutdownId,
      runtimeId: current.runtimeId,
      reason: current.reason,
      requestedBy: current.requestedBy,
      started: current.started,
      finished: current.finished,
      mode: current.mode,
      result: current.result,
      phases: Object.freeze([...(current.phases || [])]),
      stoppedComponents: Object.freeze([
        ...(current.stoppedComponents || [])
      ]),
      errors: Object.freeze([...(current.errors || [])]),
      restartPending: !!current.restartPending,
      saveMode: current.saveMode || null
    });
  }

  function validateRequest(input = {}, meta = {}) {
    if (meta.forged === true) {
      return {
        ok: false,
        error: "forged_shutdown_blocked",
        deferred: false
      };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return {
        ok: false,
        error: "unauthorized_shutdown",
        deferred: false
      };
    }

    const mode = input.mode || SDM_MODE.GRACEFUL;
    if (!isValidMode(mode)) {
      return { ok: false, error: "invalid_mode", mode, deferred: false };
    }

    const reason = String(input.reason || "").trim();
    if (!reason) {
      return { ok: false, error: "missing_reason", deferred: false };
    }

    const runtimeId = String(input.runtimeId || "").trim();
    if (!runtimeId) {
      return { ok: false, error: "missing_runtimeId", deferred: false };
    }

    const runtimeState =
      input.runtimeState ||
      (runtimeBridge && runtimeBridge.state) ||
      "RUNNING";

    if (
      mode !== SDM_MODE.EMERGENCY &&
      runtimeState !== "RUNNING" &&
      runtimeState !== "STOPPING" &&
      meta.allowNonRunning !== true
    ) {
      return {
        ok: false,
        error: "unsafe_runtime_state",
        runtimeState,
        deferred: true
      };
    }

    const recoveryActive =
      input.recoveryActive === true ||
      (typeof recoveryBridge.isActive === "function" &&
        recoveryBridge.isActive() === true) ||
      meta.recoveryActive === true;

    if (recoveryActive && mode !== SDM_MODE.EMERGENCY) {
      const finish =
        typeof recoveryBridge.finishOrAbort === "function"
          ? recoveryBridge.finishOrAbort({
              mode,
              force: false,
              reason
            })
          : { ok: false, error: "recovery_bridge_missing" };

      if (!finish || finish.ok !== true) {
        return {
          ok: false,
          error: "recovery_in_progress",
          deferred: true,
          recovery: finish || null
        };
      }
    }

    if (
      mode !== SDM_MODE.EMERGENCY &&
      input.criticalOperations === true &&
      meta.forceCritical !== true
    ) {
      return {
        ok: false,
        error: "critical_operations_active",
        deferred: true
      };
    }

    if (
      mode !== SDM_MODE.EMERGENCY &&
      input.openTransactions === true &&
      meta.forceTransactions !== true
    ) {
      return {
        ok: false,
        error: "open_transactions",
        deferred: true
      };
    }

    return {
      ok: true,
      mode,
      reason,
      runtimeId,
      recoveryActive,
      authorization: "ok",
      runtimeState
    };
  }

  function notifyComponents(shutdownId, mode, nowMs) {
    const event = Object.freeze({
      type: "ShutdownRequested",
      shutdownId,
      mode,
      at: nowMs
    });

    const recorded = [];

    if (notifier) {
      try {
        const res = notifier(event);
        recorded.push(
          Object.freeze({
            target: "notifier",
            ok: !res || res.ok !== false,
            event: "ShutdownRequested"
          })
        );
      } catch (err) {
        recorded.push(
          Object.freeze({
            target: "notifier",
            ok: false,
            error: String(err && err.message ? err.message : err),
            event: "ShutdownRequested"
          })
        );
      }
    }

    for (const sub of subscribers) {
      const id = typeof sub === "string" ? sub : sub && sub.id;
      if (!id) continue;
      if (typeof sub === "object" && typeof sub.onShutdown === "function") {
        try {
          sub.onShutdown(event);
          recorded.push(
            Object.freeze({
              target: id,
              ok: true,
              event: "ShutdownRequested"
            })
          );
        } catch (err) {
          recorded.push(
            Object.freeze({
              target: id,
              ok: false,
              error: String(err && err.message ? err.message : err),
              event: "ShutdownRequested"
            })
          );
        }
      } else {
        recorded.push(
          Object.freeze({
            target: id,
            ok: true,
            event: "ShutdownRequested"
          })
        );
      }
    }

    if (!recorded.length) {
      for (const c of components) {
        recorded.push(
          Object.freeze({
            target: c,
            ok: true,
            event: "ShutdownRequested"
          })
        );
      }
    }

    for (const n of recorded) notifications.push(n);
    return recorded;
  }

  function stopServices(nowMs, errors) {
    const stopped = [];
    for (const name of SDM_STOP_ORDER) {
      stopped.push(name);
    }
    if (stopped[stopped.length - 1] !== "kernel") {
      errors.push({ phase: "stop_services", error: "kernel_not_last" });
    }
    pushPhase("stop_services", {
      at: nowMs,
      order: [...stopped],
      kernelLast: true
    });
    return stopped;
  }

  function saveState(mode, nowMs, errors) {
    const saved = [];
    const minimal = mode === SDM_MODE.EMERGENCY;
    const saveMode = minimal ? "minimal_save" : "full_save";

    const targets = minimal
      ? SDM_PERSISTENCE_TARGETS.filter(
          (t) => t === "config" || t === "runtime" || t === "audit"
        )
      : [...SDM_PERSISTENCE_TARGETS];

    for (const target of targets) {
      const supports =
        typeof stateBridge.supportsPersistence === "function"
          ? stateBridge.supportsPersistence(target)
          : true;
      if (!supports) continue;
      try {
        const res = stateBridge.save(target, { mode, saveMode, at: nowMs });
        if (res && res.ok === false) {
          errors.push({
            phase: "save_state",
            target,
            error: res.error || "save_failed"
          });
        } else {
          saved.push(target);
        }
      } catch (err) {
        errors.push({
          phase: "save_state",
          target,
          error: String(err && err.message ? err.message : err)
        });
      }
    }

    pushPhase("save_state", {
      at: nowMs,
      saveMode,
      saved: [...saved]
    });
    return { saved, saveMode };
  }

  function releaseResources(nowMs, errors) {
    const released = [];
    for (const kind of SDM_RESOURCE_KINDS) {
      try {
        const res =
          typeof resourceBridge.release === "function"
            ? resourceBridge.release(kind)
            : { ok: true };
        if (res && res.ok === false) {
          errors.push({
            phase: "release_resources",
            kind,
            error: res.error || "release_failed"
          });
        } else {
          released.push(kind);
        }
      } catch (err) {
        errors.push({
          phase: "release_resources",
          kind,
          error: String(err && err.message ? err.message : err)
        });
      }
    }

    let leftover = [];
    if (typeof resourceBridge.activeResources === "function") {
      try {
        leftover = resourceBridge.activeResources() || [];
      } catch (_err) {
        leftover = [];
      }
    }

    if (Array.isArray(leftover) && leftover.length) {
      errors.push({
        phase: "release_resources",
        error: "leftover_active_resources",
        leftover: [...leftover]
      });
    }

    pushPhase("release_resources", {
      at: nowMs,
      released: [...released],
      clean: !leftover.length
    });
    return { released, leftover, clean: !leftover.length };
  }

  function closeRuntime(nowMs, errors) {
    const runtimePath = ["RUNNING", "STOPPING", "STOPPED"];
    const lifecyclePath = ["ACTIVE", "STOPPING", "STOPPED", "DESTROYED"];

    for (let i = 0; i < runtimePath.length - 1; i += 1) {
      const from = runtimePath[i];
      const to = runtimePath[i + 1];
      try {
        const res =
          typeof runtimeBridge.transition === "function"
            ? runtimeBridge.transition(from, to)
            : { ok: true };
        if (res && res.ok === false) {
          errors.push({
            phase: "close_runtime",
            error: res.error || `runtime_${from}_to_${to}_failed`
          });
        }
      } catch (err) {
        errors.push({
          phase: "close_runtime",
          error: String(err && err.message ? err.message : err)
        });
      }
    }

    for (let i = 0; i < lifecyclePath.length - 1; i += 1) {
      const from = lifecyclePath[i];
      const to = lifecyclePath[i + 1];
      try {
        const res =
          typeof lifecycleBridge.transition === "function"
            ? lifecycleBridge.transition(from, to)
            : { ok: true };
        lifecycleAudit.push(
          Object.freeze({ from, to, at: nowMs, ok: !res || res.ok !== false })
        );
        if (res && res.ok === false) {
          errors.push({
            phase: "close_runtime",
            error: res.error || `lifecycle_${from}_to_${to}_failed`
          });
        }
      } catch (err) {
        lifecycleAudit.push(
          Object.freeze({
            from,
            to,
            at: nowMs,
            ok: false,
            error: String(err && err.message ? err.message : err)
          })
        );
        errors.push({
          phase: "close_runtime",
          error: String(err && err.message ? err.message : err)
        });
      }
    }

    pushPhase("close_runtime", {
      at: nowMs,
      runtime: runtimePath,
      lifecycle: lifecyclePath
    });

    return { runtimePath, lifecyclePath };
  }

  function performExit(mode, shutdownId, nowMs, errors) {
    try {
      const res =
        typeof exitBridge.requestExit === "function"
          ? exitBridge.requestExit({
              shutdownId,
              mode,
              at: nowMs,
              kernelLast: true
            })
          : { ok: true };
      if (res && res.ok === false) {
        errors.push({
          phase: "exit",
          error: res.error || "exit_failed"
        });
      }
    } catch (err) {
      errors.push({
        phase: "exit",
        error: String(err && err.message ? err.message : err)
      });
    }
    pushPhase("exit", { at: nowMs, via: "exitBridge" });
  }

  function coordinateRecovery(mode, reason, errors) {
    const recoveryActive =
      typeof recoveryBridge.isActive === "function" &&
      recoveryBridge.isActive() === true;

    if (!recoveryActive) {
      return { ok: true, action: "none", recoveryActive: false };
    }

    const force = mode === SDM_MODE.EMERGENCY;
    try {
      const res =
        typeof recoveryBridge.finishOrAbort === "function"
          ? recoveryBridge.finishOrAbort({ mode, force, reason })
          : { ok: false, error: "recovery_bridge_missing" };

      if (!res || res.ok !== true) {
        if (force) {
          return {
            ok: true,
            action: "force_abort_documented",
            recoveryActive: true,
            forced: true,
            detail: res || null
          };
        }
        errors.push({
          phase: "validation",
          error: (res && res.error) || "recovery_in_progress"
        });
        return {
          ok: false,
          error: (res && res.error) || "recovery_in_progress",
          recoveryActive: true
        };
      }
      return {
        ok: true,
        action: res.action || "finished",
        recoveryActive: true
      };
    } catch (err) {
      if (force) {
        return {
          ok: true,
          action: "force_abort_documented",
          recoveryActive: true,
          forced: true,
          error: String(err && err.message ? err.message : err)
        };
      }
      return {
        ok: false,
        error: String(err && err.message ? err.message : err),
        recoveryActive: true
      };
    }
  }

  function runShutdownSequence(input = {}, meta = {}) {
    if (meta.forged === true) {
      appendAudit({ action: "reject", reason: "forged", at: Date.now() });
      return { ok: false, error: "forged_shutdown_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      appendAudit({
        action: "reject",
        reason: "unauthorized",
        source: meta.source || null,
        at: Date.now()
      });
      return { ok: false, error: "unauthorized_shutdown" };
    }

    if (inProgress || (current && current.result == null && current.finished == null)) {
      return { ok: false, error: "shutdown_already_in_progress" };
    }

    const mode = input.mode || SDM_MODE.GRACEFUL;
    if (!isValidMode(mode)) {
      return { ok: false, error: "invalid_mode", mode };
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    const validation = validateRequest(input, meta);

    if (!validation.ok) {
      if (
        mode === SDM_MODE.EMERGENCY &&
        (validation.error === "recovery_in_progress" ||
          validation.error === "critical_operations_active" ||
          validation.error === "open_transactions" ||
          validation.error === "unsafe_runtime_state")
      ) {
        appendAudit({
          action: "emergency_force_documented",
          reason: validation.error,
          at: nowMs
        });
      } else {
        appendAudit({
          action: "reject",
          reason: validation.error,
          deferred: !!validation.deferred,
          at: nowMs
        });
        return {
          ok: false,
          error: validation.error,
          deferred: !!validation.deferred
        };
      }
    }

    const desc = createShutdownDescriptor({
      shutdownId: input.shutdownId,
      runtimeId: input.runtimeId || validation.runtimeId,
      reason: input.reason || validation.reason,
      requestedBy:
        input.requestedBy || meta.source || meta.actor || "system",
      started: nowMs,
      finished: null,
      mode,
      result: null
    });
    if (!desc.ok) return desc;

    inProgress = true;
    const errors = [];
    current = {
      shutdownId: desc.descriptor.shutdownId,
      runtimeId: desc.descriptor.runtimeId,
      reason: desc.descriptor.reason,
      requestedBy: desc.descriptor.requestedBy,
      started: desc.descriptor.started,
      finished: null,
      mode,
      result: null,
      phases: [],
      stoppedComponents: [],
      errors,
      restartPending: false,
      saveMode: null
    };

    // Phase 1: shutdown_request
    pushPhase("shutdown_request", { at: nowMs, mode });

    // Phase 2: validation (+ recovery gate)
    const recovery = coordinateRecovery(mode, current.reason, errors);
    if (!recovery.ok && mode !== SDM_MODE.EMERGENCY) {
      current.finished = nowMs;
      current.result = SDM_RESULT.DEFERRED;
      inProgress = false;
      appendAudit({
        action: "defer",
        reason: recovery.error || "recovery_in_progress",
        shutdownId: current.shutdownId,
        at: nowMs
      });
      const deferredSnap = snapshotCurrent();
      current = null;
      return {
        ok: false,
        error: recovery.error || "recovery_in_progress",
        deferred: true,
        shutdown: deferredSnap
      };
    }
    pushPhase("validation", {
      at: nowMs,
      recovery: recovery.action || "none",
      forced: !!recovery.forced
    });

    // Phase 3: notify
    const notified = notifyComponents(current.shutdownId, mode, nowMs);
    pushPhase("notify_components", {
      at: nowMs,
      count: notified.length,
      event: "ShutdownRequested"
    });

    // Phase 4: stop services (kernel last)
    current.stoppedComponents = stopServices(nowMs, errors);

    // Phase 5: save state
    const save = saveState(mode, nowMs, errors);
    current.saveMode = save.saveMode;

    // Phase 6: release resources
    const resources = releaseResources(nowMs, errors);

    // Phase 7: close runtime + lifecycle
    const closed = closeRuntime(nowMs, errors);

    // Phase 8: exit via bridge (never process.exit)
    performExit(mode, current.shutdownId, nowMs, errors);

    const finishedAt = meta.finishedMs != null ? meta.finishedMs : Date.now();
    const allPhases =
      SDM_WORKFLOW.every((p) => current.phases.includes(p)) &&
      current.phases.length >= SDM_WORKFLOW.length;

    let result = SDM_RESULT.SUCCESS;
    if (!allPhases || errors.length) {
      result = SDM_RESULT.FAILED;
    }

    let restartPending = false;
    let restartScheduled = null;
    if (result === SDM_RESULT.SUCCESS && mode === SDM_MODE.RESTART) {
      restartPending = true;
      current.restartPending = true;
      try {
        restartScheduled =
          typeof restartBridge.scheduleRestart === "function"
            ? restartBridge.scheduleRestart({
                shutdownId: current.shutdownId,
                at: finishedAt
              })
            : { ok: true, scheduled: true };
      } catch (err) {
        errors.push({
          phase: "exit",
          error: String(err && err.message ? err.message : err)
        });
        result = SDM_RESULT.FAILED;
        restartPending = false;
        current.restartPending = false;
      }
    }

    if (errors.length && result === SDM_RESULT.SUCCESS) {
      result = SDM_RESULT.FAILED;
    }

    current.finished = finishedAt;
    current.result = result;
    current.errors = errors;

    const duration = Math.max(0, finishedAt - current.started);
    shutdownCount += 1;
    totalDurationMs += duration;
    byReason[current.reason] = (byReason[current.reason] || 0) + 1;
    if (mode === SDM_MODE.EMERGENCY) emergencyCount += 1;
    if (result === SDM_RESULT.SUCCESS) successCount += 1;

    const report = Object.freeze({
      shutdownId: current.shutdownId,
      reason: current.reason,
      duration,
      stoppedComponents: Object.freeze([...current.stoppedComponents]),
      errors: Object.freeze(errors.map((e) => Object.freeze({ ...e }))),
      result,
      mode,
      saveMode: current.saveMode,
      resourcesClean: resources.clean,
      restartPending,
      runtimePath: Object.freeze([...(closed.runtimePath || [])]),
      lifecyclePath: Object.freeze([...(closed.lifecyclePath || [])]),
      phases: Object.freeze([...current.phases]),
      archivedAt: finishedAt,
      immutable: true
    });
    archive.push(report);

    appendAudit({
      action: "shutdown",
      shutdownId: current.shutdownId,
      mode,
      result,
      duration,
      at: finishedAt
    });

    const snap = snapshotCurrent();
    inProgress = false;
    current = null;

    return {
      ok: result === SDM_RESULT.SUCCESS,
      shutdownId: snap.shutdownId,
      shutdown: snap,
      report,
      phases: [...snap.phases],
      notified,
      restartPending,
      restartScheduled,
      kernelLast:
        snap.stoppedComponents[snap.stoppedComponents.length - 1] === "kernel",
      error: result === SDM_RESULT.SUCCESS ? undefined : "shutdown_failed"
    };
  }

  function shutdown(input = {}, meta = {}) {
    return runShutdownSequence(
      { ...input, mode: input.mode || SDM_MODE.GRACEFUL },
      meta
    );
  }

  function emergencyShutdown(input = {}, meta = {}) {
    return runShutdownSequence(
      {
        ...input,
        mode: SDM_MODE.EMERGENCY,
        reason: input.reason || "critical_failure"
      },
      meta
    );
  }

  function metrics() {
    const avg =
      shutdownCount > 0 ? totalDurationMs / shutdownCount : 0;
    const successRate =
      shutdownCount > 0 ? successCount / shutdownCount : 0;
    return Object.freeze({
      shutdownCount,
      byReason: Object.freeze({ ...byReason }),
      averageDurationMs: avg,
      emergencyCount,
      successRate,
      successCount,
      inProgress
    });
  }

  function status() {
    return Object.freeze({
      singleton: true,
      soleShutdownAuthority: SDM_FLAGS.soleShutdownAuthority,
      phasesMustNotSkip: SDM_FLAGS.phasesMustNotSkip,
      kernelStopsLast: SDM_FLAGS.kernelStopsLast,
      blocksParallelShutdown: SDM_FLAGS.blocksParallelShutdown,
      inProgress,
      current: snapshotCurrent(),
      components: SDM_COMPONENT_ORDER,
      modes: SDM_MODE_ORDER,
      workflow: SDM_WORKFLOW,
      stopOrder: SDM_STOP_ORDER,
      shutdownCount
    });
  }

  const engine = Object.freeze({
    ok: true,
    shutdown,
    validateRequest(input = {}, meta = {}) {
      return validateRequest(input, meta);
    },
    emergencyShutdown,
    status,
    current() {
      return snapshotCurrent();
    },
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...archive]);
    },
    getStopOrder() {
      return SDM_STOP_ORDER;
    },
    getWorkflow() {
      return SDM_WORKFLOW;
    },
    phaseHistory() {
      return Object.freeze([...phaseHistory]);
    },
    notifications() {
      return Object.freeze([...notifications]);
    },
    lifecycleAuditTrail() {
      return Object.freeze([...lifecycleAudit]);
    },
    isActive() {
      return true;
    },
    /** Stub — never exits the real process. */
    processExit() {
      return {
        ok: false,
        error: "process_exit_forbidden",
        hint: "use_exitBridge"
      };
    },
    /** Stub — never kills the OS process. */
    killOs() {
      return {
        ok: false,
        error: "os_kill_forbidden",
        hint: "use_exitBridge"
      };
    },
    killProcess() {
      return {
        ok: false,
        error: "os_kill_forbidden",
        hint: "use_exitBridge"
      };
    }
  });

  activeShutdownManager = {
    isActive: engine.isActive
  };

  return engine;
}

function clearShutdownSingletonForTest() {
  activeShutdownManager = null;
}

module.exports = {
  SDM_COMPONENT,
  SDM_COMPONENT_ORDER,
  SDM_MODE,
  SDM_MODE_ORDER,
  SDM_RESULT,
  SDM_DESCRIPTOR_FIELDS,
  SDM_WORKFLOW,
  SDM_STOP_ORDER,
  SDM_PERSISTENCE_TARGETS,
  SDM_RESOURCE_KINDS,
  SDM_AUTHORIZED_SOURCES,
  SDM_FLAGS,
  SDM_PUBLIC_API,
  SDM_RUNTIME_ANCHORS,
  createShutdownDescriptor,
  createShutdownManager,
  clearShutdownSingletonForTest
};
