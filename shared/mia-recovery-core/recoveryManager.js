"use strict";

/**
 * Master Canon 0065 — Recovery Manager.
 * Kernel Layer 0 sole authority for automatic recovery decisions.
 * Uses injected strategy executor + verifier only — never spawns/kills OS processes.
 */

const crypto = require("crypto");

const RM_COMPONENT = Object.freeze({
  RECOVERY_MANAGER: "recovery_manager",
  INCIDENT_INTAKE: "incident_intake",
  INCIDENT_VALIDATOR: "incident_validator",
  INCIDENT_CLASSIFIER: "incident_classifier",
  STRATEGY_SELECTOR: "strategy_selector",
  ISOLATION_CONTROLLER: "isolation_controller",
  STRATEGY_EXECUTOR: "strategy_executor",
  VERIFIER: "verifier",
  ESCALATION_CONTROLLER: "escalation_controller",
  REPORT_ENGINE: "report_engine",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const RM_COMPONENT_ORDER = Object.freeze(Object.values(RM_COMPONENT));

const RM_WORKFLOW = Object.freeze([
  "detect",
  "validate",
  "classify",
  "choose_strategy",
  "recover",
  "verify",
  "report"
]);

const RM_LEVEL = Object.freeze({
  TASK_RESTART: 1,
  PROCESS_RESTART: 2,
  SERVICE_RESTART: 3,
  MODULE_RESTART: 4,
  RUNTIME_RECOVERY: 5
});

const RM_LEVEL_NAME = Object.freeze({
  1: "task_restart",
  2: "process_restart",
  3: "service_restart",
  4: "module_restart",
  5: "runtime_recovery"
});

const RM_LEVEL_ORDER = Object.freeze([1, 2, 3, 4, 5]);

const RM_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const RM_SEVERITY_ORDER = Object.freeze([
  RM_SEVERITY.INFO,
  RM_SEVERITY.WARNING,
  RM_SEVERITY.ERROR,
  RM_SEVERITY.CRITICAL,
  RM_SEVERITY.FATAL
]);

const RM_RESULT = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  NO_ACTION: "NO_ACTION",
  REJECTED: "REJECTED",
  ESCALATED: "ESCALATED",
  LOOP_CAP: "LOOP_CAP",
  KERNEL_PROTECTED: "KERNEL_PROTECTED"
});

const RM_STRATEGY_ALLOWLIST = Object.freeze([
  "no_action",
  "isolate_observe",
  "task_restart",
  "process_restart",
  "service_restart",
  "module_restart",
  "runtime_recovery",
  "reconnect",
  "reconnect_then_connector_restart",
  "restart_connector"
]);

const RM_STRATEGY_LEVEL = Object.freeze({
  no_action: 0,
  isolate_observe: 0,
  task_restart: 1,
  process_restart: 2,
  service_restart: 3,
  module_restart: 4,
  runtime_recovery: 5,
  reconnect: 2,
  reconnect_then_connector_restart: 3,
  restart_connector: 3
});

/** Default per-component strategies (configurable). */
const RM_DEFAULT_COMPONENT_STRATEGIES = Object.freeze({
  battle: Object.freeze({
    strategy: "service_restart",
    level: 3,
    steps: Object.freeze(["service_restart"])
  }),
  obs: Object.freeze({
    strategy: "reconnect_then_connector_restart",
    level: 3,
    steps: Object.freeze(["reconnect", "restart_connector"])
  }),
  "obs-connector": Object.freeze({
    strategy: "reconnect_then_connector_restart",
    level: 3,
    steps: Object.freeze(["reconnect", "restart_connector"])
  }),
  overlay: Object.freeze({
    strategy: "task_restart",
    level: 1,
    steps: Object.freeze(["task_restart"])
  }),
  "ai-response": Object.freeze({
    strategy: "task_restart",
    level: 1,
    steps: Object.freeze(["task_restart"])
  }),
  "speech-worker": Object.freeze({
    strategy: "process_restart",
    level: 2,
    steps: Object.freeze(["process_restart"])
  }),
  "obs-worker": Object.freeze({
    strategy: "process_restart",
    level: 2,
    steps: Object.freeze(["process_restart"])
  }),
  "ai-module": Object.freeze({
    strategy: "module_restart",
    level: 4,
    steps: Object.freeze(["module_restart"])
  }),
  "tiktok-connector": Object.freeze({
    strategy: "module_restart",
    level: 4,
    steps: Object.freeze(["module_restart"])
  }),
  runtime: Object.freeze({
    strategy: "runtime_recovery",
    level: 5,
    steps: Object.freeze(["runtime_recovery"])
  }),
  kernel: Object.freeze({
    strategy: "runtime_recovery",
    level: 5,
    steps: Object.freeze(["runtime_recovery"]),
    protected: true
  })
});

const RM_DEFAULT_RETRY = Object.freeze({
  maxAttempts: 3,
  delayMs: 100,
  backoffFactor: 2,
  stopOnSuccess: true,
  stopOnMaxAttempts: true
});

const RM_DEFAULT_WARNING_POLICY = Object.freeze({
  action: "isolate_observe" // or "task_restart" / "no_action"
});

const RM_PUBLIC_API = Object.freeze([
  "recover",
  "fromHealth",
  "fromWatchdog",
  "evaluateRetry",
  "escalate",
  "registerStrategy",
  "metrics",
  "reportArchive"
]);

const RM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "shared/mia-lifecycle-core/lifecycleManager.js",
  "docs/master-canon/0065-recovery-manager.md"
]);

const RM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "recovery_manager",
  "health_manager",
  "health-manager",
  "watchdog",
  "watchdog_engine",
  "runtime-manager",
  "runtime_manager",
  "lifecycle_manager",
  "operator",
  "system"
]);

const RM_PROTECTED_COMPONENTS = Object.freeze(["kernel"]);

const RM_FLAGS = Object.freeze({
  soleRecoveryAuthority: true,
  spawnsOsProcesses: false,
  killsOsProcesses: false,
  restartsOsServices: false,
  allowsOsRestart: false,
  executorInjectedOnly: true,
  verificationRequired: true
});

let activeRecoveryManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidSeverity(severity) {
  return RM_SEVERITY_ORDER.includes(severity);
}

function isValidLevel(level) {
  return RM_LEVEL_ORDER.includes(level);
}

function assertNoOsRestart(strategy) {
  if (
    strategy === "os_restart" ||
    strategy === "reboot" ||
    strategy === "system_reboot" ||
    strategy === "restart_os"
  ) {
    return { ok: false, error: "os_restart_forbidden" };
  }
  return { ok: true };
}

function validateStrategyDefinition(def = {}) {
  if (!def || typeof def !== "object") {
    return { ok: false, error: "invalid_strategy_definition" };
  }
  const strategy = String(def.strategy || "").trim();
  if (!strategy) return { ok: false, error: "missing_strategy" };

  const osCheck = assertNoOsRestart(strategy);
  if (!osCheck.ok) return osCheck;

  if (!RM_STRATEGY_ALLOWLIST.includes(strategy)) {
    return { ok: false, error: "strategy_not_allowlisted", strategy };
  }

  const mappedLevel = RM_STRATEGY_LEVEL[strategy];
  const level =
    typeof def.level === "number" ? def.level : mappedLevel != null ? mappedLevel : null;
  if (level != null && level !== 0 && !isValidLevel(level)) {
    return { ok: false, error: "invalid_strategy_level", level };
  }
  if (mappedLevel != null && level != null && level !== 0 && level !== mappedLevel) {
    return {
      ok: false,
      error: "strategy_level_mismatch",
      strategy,
      expected: mappedLevel,
      level
    };
  }

  if (def.allowLevelSkip === true) {
    const target = Number(def.skipToLevel);
    if (!isValidLevel(target)) {
      return { ok: false, error: "invalid_skip_target" };
    }
    if (target > 5) {
      return { ok: false, error: "skip_above_level_5" };
    }
  }

  const steps = Array.isArray(def.steps) ? def.steps : [strategy];
  for (const step of steps) {
    const stepOs = assertNoOsRestart(step);
    if (!stepOs.ok) return stepOs;
    if (!RM_STRATEGY_ALLOWLIST.includes(step)) {
      return { ok: false, error: "strategy_step_not_allowlisted", step };
    }
  }

  return {
    ok: true,
    definition: Object.freeze({
      strategy,
      level: level == null ? mappedLevel : level,
      steps: Object.freeze([...steps]),
      allowLevelSkip: def.allowLevelSkip === true,
      skipToLevel: def.allowLevelSkip === true ? Number(def.skipToLevel) : null,
      protected: def.protected === true
    })
  };
}

/**
 * Deterministic retry evaluation — no timers/sleeps.
 * Returns whether another attempt is allowed and the next delay.
 */
function evaluateRetry(state = {}, policy = RM_DEFAULT_RETRY) {
  const maxAttempts = Number(policy.maxAttempts) > 0 ? Number(policy.maxAttempts) : 3;
  const delayMs = Number(policy.delayMs) >= 0 ? Number(policy.delayMs) : 100;
  const backoffFactor =
    Number(policy.backoffFactor) > 0 ? Number(policy.backoffFactor) : 2;
  const attempt = Number(state.attempt) || 0;
  const succeeded = state.succeeded === true;
  const stopCondition = state.stopCondition === true;

  if (succeeded && policy.stopOnSuccess !== false) {
    return Object.freeze({
      ok: true,
      shouldRetry: false,
      reason: "success",
      nextDelayMs: 0,
      attempt,
      maxAttempts
    });
  }
  if (stopCondition) {
    return Object.freeze({
      ok: true,
      shouldRetry: false,
      reason: "stop_condition",
      nextDelayMs: 0,
      attempt,
      maxAttempts
    });
  }
  if (attempt >= maxAttempts) {
    return Object.freeze({
      ok: true,
      shouldRetry: false,
      reason: "max_attempts",
      nextDelayMs: 0,
      attempt,
      maxAttempts
    });
  }

  const nextDelayMs = delayMs * Math.pow(backoffFactor, Math.max(0, attempt));
  return Object.freeze({
    ok: true,
    shouldRetry: true,
    reason: "retry",
    nextDelayMs,
    attempt,
    maxAttempts,
    infiniteLoopPrevented: true
  });
}

function createRecoveryDescriptor(input = {}) {
  const component = String(input.component || "").trim();
  if (!component) return { ok: false, error: "missing_component" };

  const severity = input.severity || RM_SEVERITY.ERROR;
  if (!isValidSeverity(severity)) {
    return { ok: false, error: "invalid_severity", severity };
  }

  const recoveryId = input.recoveryId || makeId("rm");
  const now = Date.now();

  return {
    ok: true,
    descriptor: Object.freeze({
      recoveryId,
      component,
      severity,
      strategy: input.strategy || null,
      attempts: typeof input.attempts === "number" ? input.attempts : 0,
      result: input.result || null,
      started: input.started != null ? input.started : now,
      finished: input.finished != null ? input.finished : null
    })
  };
}

function createRecoveryManager(options = {}) {
  if (
    activeRecoveryManager &&
    activeRecoveryManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "recovery_manager_already_active",
      soleRecoveryAuthority: true
    });
  }

  const strategies = new Map();
  for (const [comp, def] of Object.entries(
    options.componentStrategies || RM_DEFAULT_COMPONENT_STRATEGIES
  )) {
    const checked = validateStrategyDefinition(def);
    if (!checked.ok) {
      return Object.freeze({ ok: false, error: checked.error, component: comp });
    }
    strategies.set(comp, checked.definition);
  }

  const retryPolicy = {
    ...RM_DEFAULT_RETRY,
    ...(options.retryPolicy || {})
  };
  const warningPolicy = {
    ...RM_DEFAULT_WARNING_POLICY,
    ...(options.warningPolicy || {})
  };
  const maxTotalCycles =
    typeof options.maxTotalCycles === "number" && options.maxTotalCycles > 0
      ? options.maxTotalCycles
      : 12;

  const authorized = new Set(options.authorizedSources || RM_AUTHORIZED_SOURCES);
  const protectedComponents = new Set([
    ...RM_PROTECTED_COMPONENTS,
    ...(options.protectedComponents || [])
  ]);

  const executor =
    typeof options.executor === "function"
      ? options.executor
      : function defaultExecutor() {
          return {
            ok: false,
            error: "executor_not_wired",
            outcome: "not_executed"
          };
        };

  const verifier =
    typeof options.verifier === "function"
      ? options.verifier
      : function defaultVerifier() {
          return { ok: false, verified: false, error: "verifier_not_wired" };
        };

  const hasRuntimeBridge = !!options.runtimeBridge;
  const runtimeBridge =
    options.runtimeBridge ||
    Object.freeze({
      restartProcess() {
        return null;
      },
      restartService() {
        return null;
      },
      restartModule() {
        return null;
      },
      recoverRuntime() {
        return null;
      },
      diagnosticSnapshot() {
        return { ok: true, diagnosticOnly: true, snapshot: null };
      }
    });

  const healthBridge =
    options.healthBridge ||
    Object.freeze({
      check() {
        return { ok: true, healthy: true };
      }
    });

  const registry = new Map();
  const reportArchive = [];
  const audit = [];
  const isolationLog = [];
  const phaseHistories = new Map();
  const errorCounts = new Map();
  const componentCounts = new Map();

  let actionCount = 0;
  let successCount = 0;
  let escalationCountTotal = 0;
  let durationSum = 0;
  let rejectedCount = 0;
  let criticalIgnoredBlocked = 0;

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

  function isPrivilegedStrategySource(meta = {}) {
    return (
      meta.source === "kernel" ||
      meta.actor === "kernel" ||
      meta.source === "recovery_manager" ||
      meta.actor === "recovery_manager" ||
      meta.source === "operator" ||
      meta.actor === "operator"
    );
  }

  function isKernelRecoveryAuthorized(meta = {}, severity) {
    const privileged =
      meta.source === "kernel" ||
      meta.actor === "kernel" ||
      meta.source === "recovery_manager" ||
      meta.actor === "recovery_manager";
    return (
      meta.allowKernelRecovery === true &&
      privileged &&
      (severity === RM_SEVERITY.CRITICAL || severity === RM_SEVERITY.FATAL)
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

  function pushPhase(recoveryId, phase, detail) {
    const list = phaseHistories.get(recoveryId) || [];
    list.push(
      Object.freeze({
        phase,
        at: Date.now(),
        ...(detail || {})
      })
    );
    phaseHistories.set(recoveryId, list);
  }

  function registerStrategy(component, definition, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_strategy_registration" };
    }
    const checked = validateStrategyDefinition(definition);
    if (!checked.ok) {
      rejectedCount += 1;
      return checked;
    }
    strategies.set(String(component), checked.definition);
    appendAudit({
      action: "register_strategy",
      component,
      strategy: checked.definition.strategy,
      actor: meta.actor || meta.source || "system"
    });
    return { ok: true, definition: checked.definition };
  }

  function classifyIncident(incident = {}) {
    const severity = incident.severity || RM_SEVERITY.ERROR;
    if (!isValidSeverity(severity)) {
      return { ok: false, error: "invalid_severity", severity };
    }

    if (
      (severity === RM_SEVERITY.CRITICAL || severity === RM_SEVERITY.FATAL) &&
      incident.ignore === true
    ) {
      criticalIgnoredBlocked += 1;
      return {
        ok: false,
        error: "critical_fatal_cannot_be_ignored",
        severity
      };
    }

    let action = "recover";
    if (severity === RM_SEVERITY.INFO) {
      action = "record_no_action";
    } else if (severity === RM_SEVERITY.WARNING) {
      action = warningPolicy.action || "isolate_observe";
    }

    return Object.freeze({
      ok: true,
      severity,
      action,
      requiresRecovery:
        severity === RM_SEVERITY.ERROR ||
        severity === RM_SEVERITY.CRITICAL ||
        severity === RM_SEVERITY.FATAL ||
        action === "task_restart"
    });
  }

  function chooseStrategy(
    component,
    severity,
    classification,
    incident = {},
    meta = {}
  ) {
    if (incident.forcedStrategy) {
      if (
        meta.allowForcedStrategy !== true ||
        !isPrivilegedStrategySource(meta)
      ) {
        return { ok: false, error: "forced_strategy_not_authorized" };
      }
      const forced = validateStrategyDefinition({
        strategy: incident.forcedStrategy,
        level: incident.forcedLevel,
        steps: incident.forcedSteps,
        allowLevelSkip: incident.allowLevelSkip,
        skipToLevel: incident.skipToLevel
      });
      if (!forced.ok) return forced;
      return { ok: true, definition: forced.definition, source: "forced" };
    }

    // Watchdog may request immediate recovery but cannot choose concrete strategy.
    if (incident.watchdogStrategy || incident.chosenStrategy) {
      return {
        ok: false,
        error: "watchdog_cannot_choose_strategy",
        note: "Recovery Manager selects strategy after validation/classification"
      };
    }

    if (classification.action === "record_no_action") {
      return {
        ok: true,
        definition: Object.freeze({
          strategy: "no_action",
          level: 0,
          steps: Object.freeze(["no_action"]),
          allowLevelSkip: false,
          skipToLevel: null,
          protected: false
        }),
        source: "severity_info"
      };
    }

    if (classification.action === "isolate_observe") {
      return {
        ok: true,
        definition: Object.freeze({
          strategy: "isolate_observe",
          level: 0,
          steps: Object.freeze(["isolate_observe"]),
          allowLevelSkip: false,
          skipToLevel: null,
          protected: false
        }),
        source: "warning_policy"
      };
    }

    if (classification.action === "task_restart") {
      return {
        ok: true,
        definition: Object.freeze({
          strategy: "task_restart",
          level: 1,
          steps: Object.freeze(["task_restart"]),
          allowLevelSkip: false,
          skipToLevel: null,
          protected: false
        }),
        source: "warning_policy"
      };
    }

    const configured = strategies.get(component);
    if (configured) {
      return { ok: true, definition: configured, source: "component_config" };
    }

    // Severity-based default when no component strategy is registered.
    let level = RM_LEVEL.SERVICE_RESTART;
    if (severity === RM_SEVERITY.FATAL) level = RM_LEVEL.RUNTIME_RECOVERY;
    else if (severity === RM_SEVERITY.CRITICAL) level = RM_LEVEL.MODULE_RESTART;
    else if (severity === RM_SEVERITY.ERROR) level = RM_LEVEL.SERVICE_RESTART;

    const strategy = RM_LEVEL_NAME[level];
    return {
      ok: true,
      definition: Object.freeze({
        strategy,
        level,
        steps: Object.freeze([strategy]),
        allowLevelSkip: false,
        skipToLevel: null,
        protected: false
      }),
      source: "severity_default"
    };
  }

  function isolate(component, level, recoveryId) {
    const record = Object.freeze({
      recoveryId,
      component,
      level,
      isolated: true,
      kernelPreserved: true,
      runtimePreserved: level < RM_LEVEL.RUNTIME_RECOVERY,
      at: Date.now(),
      immutable: true
    });
    isolationLog.push(record);
    appendAudit({
      action: "isolate",
      recoveryId,
      component,
      level,
      result: "isolated"
    });
    return { ok: true, isolation: record };
  }

  function callRuntimeBridge(step, context) {
    if (step === "process_restart" && typeof runtimeBridge.restartProcess === "function") {
      return runtimeBridge.restartProcess(context);
    }
    if (step === "service_restart" && typeof runtimeBridge.restartService === "function") {
      return runtimeBridge.restartService(context);
    }
    if (step === "module_restart" && typeof runtimeBridge.restartModule === "function") {
      return runtimeBridge.restartModule(context);
    }
    if (
      step === "runtime_recovery" &&
      typeof runtimeBridge.recoverRuntime === "function"
    ) {
      return runtimeBridge.recoverRuntime(context);
    }
    return null;
  }

  function escalate(currentLevel, strategyDef = {}) {
    if (strategyDef.allowLevelSkip === true && strategyDef.skipToLevel != null) {
      const target = Number(strategyDef.skipToLevel);
      if (!isValidLevel(target)) {
        return { ok: false, error: "invalid_skip_target" };
      }
      if (target > 5) {
        return { ok: false, error: "cannot_escalate_above_5" };
      }
      if (target <= currentLevel) {
        return { ok: false, error: "skip_must_increase_level" };
      }
      return Object.freeze({
        ok: true,
        from: currentLevel,
        to: target,
        skipped: true,
        strategy: RM_LEVEL_NAME[target]
      });
    }

    if (currentLevel >= 5) {
      return { ok: false, error: "cannot_escalate_above_5", level: currentLevel };
    }
    const next = currentLevel + 1;
    if (!isValidLevel(next)) {
      return { ok: false, error: "invalid_escalation_target" };
    }
    return Object.freeze({
      ok: true,
      from: currentLevel,
      to: next,
      skipped: false,
      strategy: RM_LEVEL_NAME[next]
    });
  }

  function buildReport(input) {
    const report = Object.freeze({
      recoveryId: input.recoveryId,
      cause: input.cause,
      component: input.component,
      severity: input.severity,
      strategy: input.strategy,
      attempts: input.attempts,
      duration: input.duration,
      result: input.result,
      verification: input.verification,
      escalations: input.escalations,
      phases: Object.freeze([...(input.phases || [])]),
      isolation: input.isolation || null,
      immutable: true,
      at: Date.now()
    });
    reportArchive.push(report);
    appendAudit({
      action: "report",
      recoveryId: report.recoveryId,
      result: report.result,
      immutable: true
    });
    return report;
  }

  function runVerification(context) {
    let healthResult = null;
    try {
      if (typeof healthBridge.check === "function") {
        healthResult = healthBridge.check(context);
      }
    } catch (err) {
      healthResult = { ok: false, error: String(err && err.message) };
    }

    let verifyResult;
    try {
      verifyResult = verifier({
        ...context,
        health: healthResult
      });
    } catch (err) {
      verifyResult = {
        ok: false,
        verified: false,
        error: String(err && err.message)
      };
    }

    const verified =
      !!(verifyResult && (verifyResult.verified === true || verifyResult.ok === true));
    return Object.freeze({
      verified,
      verifier: verifyResult || null,
      health: healthResult,
      at: Date.now()
    });
  }

  function recover(incident = {}, meta = {}) {
    const started = Date.now();
    actionCount += 1;

    // DETECT
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      appendAudit({
        action: "denied",
        result: "unauthorized_or_unverified",
        actor: meta.actor || meta.source || "unknown"
      });
      return { ok: false, error: "unauthorized_recovery" };
    }

    const component = String(incident.component || "").trim();
    if (!component) {
      return { ok: false, error: "missing_component" };
    }

    const built = createRecoveryDescriptor({
      component,
      severity: incident.severity,
      started
    });
    if (!built.ok) return built;

    const descriptor = { ...built.descriptor };
    const recoveryId = descriptor.recoveryId;
    registry.set(recoveryId, descriptor);
    phaseHistories.set(recoveryId, []);
    pushPhase(recoveryId, "detect", {
      source: meta.source || meta.actor || "system",
      cause: incident.cause || incident.reason || null
    });

    componentCounts.set(component, (componentCounts.get(component) || 0) + 1);

    // VALIDATE
    pushPhase(recoveryId, "validate");
    if (incident.invalid === true) {
      pushPhase(recoveryId, "report", { result: RM_RESULT.REJECTED });
      const report = buildReport({
        recoveryId,
        cause: incident.cause || "invalid_incident",
        component,
        severity: descriptor.severity,
        strategy: null,
        attempts: 0,
        duration: Date.now() - started,
        result: RM_RESULT.REJECTED,
        verification: null,
        escalations: 0,
        phases: phaseHistories.get(recoveryId)
      });
      return { ok: false, error: "invalid_incident", recoveryId, report };
    }

    // Runtime snapshot is diagnostic-only optional input — never assumed complete recovery state.
    const diagnosticSnapshot =
      incident.runtimeSnapshot != null
        ? {
            diagnosticOnly: true,
            assumedCompleteRecoveryState: false,
            snapshot: incident.runtimeSnapshot
          }
        : runtimeBridge.diagnosticSnapshot
          ? {
              diagnosticOnly: true,
              assumedCompleteRecoveryState: false,
              snapshot: runtimeBridge.diagnosticSnapshot(component)
            }
          : null;

    // CLASSIFY
    pushPhase(recoveryId, "classify");
    const classification = classifyIncident(incident);
    if (!classification.ok) {
      errorCounts.set(classification.error, (errorCounts.get(classification.error) || 0) + 1);
      pushPhase(recoveryId, "report", { result: RM_RESULT.REJECTED });
      const report = buildReport({
        recoveryId,
        cause: classification.error,
        component,
        severity: descriptor.severity,
        strategy: null,
        attempts: 0,
        duration: Date.now() - started,
        result: RM_RESULT.REJECTED,
        verification: null,
        escalations: 0,
        phases: phaseHistories.get(recoveryId)
      });
      return {
        ok: false,
        error: classification.error,
        recoveryId,
        report,
        criticalIgnoredBlocked: true
      };
    }
    descriptor.severity = classification.severity;

    // CHOOSE STRATEGY
    pushPhase(recoveryId, "choose_strategy");
    const chosen = chooseStrategy(
      component,
      classification.severity,
      classification,
      incident,
      meta
    );
    if (!chosen.ok) {
      rejectedCount += 1;
      errorCounts.set(chosen.error, (errorCounts.get(chosen.error) || 0) + 1);
      pushPhase(recoveryId, "report", { result: RM_RESULT.REJECTED });
      const report = buildReport({
        recoveryId,
        cause: chosen.error,
        component,
        severity: descriptor.severity,
        strategy: null,
        attempts: 0,
        duration: Date.now() - started,
        result: RM_RESULT.REJECTED,
        verification: null,
        escalations: 0,
        phases: phaseHistories.get(recoveryId)
      });
      return { ok: false, error: chosen.error, recoveryId, report };
    }

    let strategyDef = chosen.definition;
    descriptor.strategy = strategyDef.strategy;

    // INFO → recorded no-action report
    if (strategyDef.strategy === "no_action") {
      pushPhase(recoveryId, "recover", { skipped: true, reason: "info_no_action" });
      pushPhase(recoveryId, "verify", { skipped: true, reason: "no_action" });
      pushPhase(recoveryId, "report", { result: RM_RESULT.NO_ACTION });
      const report = buildReport({
        recoveryId,
        cause: incident.cause || "info",
        component,
        severity: descriptor.severity,
        strategy: "no_action",
        attempts: 0,
        duration: Date.now() - started,
        result: RM_RESULT.NO_ACTION,
        verification: Object.freeze({ verified: true, skipped: true, reason: "no_action" }),
        escalations: 0,
        phases: phaseHistories.get(recoveryId),
        isolation: null
      });
      descriptor.attempts = 0;
      descriptor.result = RM_RESULT.NO_ACTION;
      descriptor.finished = Date.now();
      registry.set(recoveryId, Object.freeze({ ...descriptor }));
      durationSum += descriptor.finished - started;
      return {
        ok: true,
        recoveryId,
        result: RM_RESULT.NO_ACTION,
        report,
        descriptor: registry.get(recoveryId),
        phases: phaseHistories.get(recoveryId)
      };
    }

    // Kernel protection — non-authorized kernel recovery blocked at all levels
    if (
      protectedComponents.has(component) &&
      !isKernelRecoveryAuthorized(meta, descriptor.severity)
    ) {
      pushPhase(recoveryId, "report", { result: RM_RESULT.KERNEL_PROTECTED });
      const report = buildReport({
        recoveryId,
        cause: "kernel_protected",
        component,
        severity: descriptor.severity,
        strategy: strategyDef.strategy,
        attempts: 0,
        duration: Date.now() - started,
        result: RM_RESULT.KERNEL_PROTECTED,
        verification: null,
        escalations: 0,
        phases: phaseHistories.get(recoveryId)
      });
      return {
        ok: false,
        error: "kernel_protected",
        recoveryId,
        report
      };
    }

    let currentLevel = strategyDef.level > 0 ? strategyDef.level : 1;
    let escalations = 0;
    let attempts = 0;
    let lastVerification = null;
    let lastIsolation = null;
    let success = false;
    let finalResult = RM_RESULT.FAILED;
    let cyclesUsed = 0;
    let loopCapReached = false;

    // WARNING isolate_observe path
    if (strategyDef.strategy === "isolate_observe") {
      pushPhase(recoveryId, "recover", { mode: "isolate_observe" });
      lastIsolation = isolate(component, 0, recoveryId).isolation;
      pushPhase(recoveryId, "verify", { skipped: false });
      lastVerification = runVerification({
        recoveryId,
        component,
        strategy: "isolate_observe",
        level: 0,
        diagnosticSnapshot
      });
      const observeOk = lastVerification.verified;
      finalResult = observeOk ? RM_RESULT.SUCCESS : RM_RESULT.FAILED;
      if (observeOk) successCount += 1;
      pushPhase(recoveryId, "report", { result: finalResult });
      const report = buildReport({
        recoveryId,
        cause: incident.cause || "warning",
        component,
        severity: descriptor.severity,
        strategy: "isolate_observe",
        attempts: 1,
        duration: Date.now() - started,
        result: finalResult,
        verification: lastVerification,
        escalations: 0,
        phases: phaseHistories.get(recoveryId),
        isolation: lastIsolation
      });
      descriptor.attempts = 1;
      descriptor.result = finalResult;
      descriptor.finished = Date.now();
      registry.set(recoveryId, Object.freeze({ ...descriptor }));
      durationSum += descriptor.finished - started;
      return {
        ok: observeOk,
        recoveryId,
        result: finalResult,
        report,
        descriptor: registry.get(recoveryId),
        phases: phaseHistories.get(recoveryId),
        isolation: lastIsolation,
        verification: lastVerification
      };
    }

    // Recover / verify / escalate loop
    while (currentLevel <= 5) {
      const levelStrategy = RM_LEVEL_NAME[currentLevel];
      const activeSteps =
        strategyDef.level === currentLevel && strategyDef.steps
          ? strategyDef.steps
          : [levelStrategy];

      let levelAttempt = 0;
      let levelSucceeded = false;

      while (true) {
        const retryEval = evaluateRetry(
          {
            attempt: levelAttempt,
            succeeded: levelSucceeded,
            stopCondition: false
          },
          retryPolicy
        );
        if (!retryEval.shouldRetry) break;
        if (cyclesUsed >= maxTotalCycles) {
          loopCapReached = true;
          finalResult = RM_RESULT.LOOP_CAP;
          break;
        }
        cyclesUsed += 1;

        // ISOLATION always before executor for recoverable incidents
        pushPhase(recoveryId, "recover", {
          level: currentLevel,
          attempt: levelAttempt + 1,
          isolationFirst: true
        });
        lastIsolation = isolate(component, currentLevel, recoveryId).isolation;

        attempts += 1;
        levelAttempt += 1;
        descriptor.attempts = attempts;

        const execContext = Object.freeze({
          recoveryId,
          component,
          severity: descriptor.severity,
          level: currentLevel,
          strategy: strategyDef.strategy,
          steps: activeSteps,
          attempt: levelAttempt,
          diagnosticSnapshot,
          runtimeSnapshotDiagnosticOnly: true
        });

        const stepOutcomes = [];
        let execOk = true;
        for (const step of activeSteps) {
          const bridgeResult = hasRuntimeBridge
            ? callRuntimeBridge(step, execContext)
            : null;
          let outcome;
          if (bridgeResult != null) {
            outcome = bridgeResult;
          } else {
            outcome = executor({
              ...execContext,
              step
            });
          }
          stepOutcomes.push(
            Object.freeze({
              step,
              outcome: Object.freeze({ ...(outcome || {}) })
            })
          );
          if (!outcome || outcome.ok !== true) {
            execOk = false;
            break;
          }
        }

        // VERIFY after every execution attempt — no success without verification
        pushPhase(recoveryId, "verify", {
          level: currentLevel,
          attempt: levelAttempt
        });
        lastVerification = runVerification({
          recoveryId,
          component,
          level: currentLevel,
          strategy: strategyDef.strategy,
          execOk,
          stepOutcomes,
          diagnosticSnapshot
        });

        if (execOk && lastVerification.verified) {
          levelSucceeded = true;
          success = true;
          finalResult = RM_RESULT.SUCCESS;
          successCount += 1;
          break;
        }

        // Failed verification is failure → retry/escalation
        levelSucceeded = false;
      }

      if (loopCapReached) break;
      if (success) break;

      const esc = escalate(currentLevel, strategyDef);
      if (!esc.ok) {
        finalResult = RM_RESULT.FAILED;
        break;
      }
      escalations += 1;
      escalationCountTotal += 1;
      currentLevel = esc.to;
      strategyDef = Object.freeze({
        strategy: esc.strategy,
        level: esc.to,
        steps: Object.freeze([esc.strategy]),
        allowLevelSkip: false,
        skipToLevel: null,
        protected: strategyDef.protected === true
      });
      descriptor.strategy = strategyDef.strategy;
      pushPhase(recoveryId, "choose_strategy", {
        escalated: true,
        from: esc.from,
        to: esc.to,
        skipped: esc.skipped === true
      });
      finalResult = RM_RESULT.ESCALATED;
    }

    if (!success && finalResult === RM_RESULT.ESCALATED) {
      finalResult = RM_RESULT.FAILED;
    }

    pushPhase(recoveryId, "report", { result: finalResult });
    const finished = Date.now();
    durationSum += finished - started;
    descriptor.result = finalResult;
    descriptor.finished = finished;
    descriptor.strategy = strategyDef.strategy;
    registry.set(recoveryId, Object.freeze({ ...descriptor }));

    if (!success) {
      errorCounts.set(
        incident.cause || "recovery_failed",
        (errorCounts.get(incident.cause || "recovery_failed") || 0) + 1
      );
    }

    const report = buildReport({
      recoveryId,
      cause: incident.cause || incident.reason || "incident",
      component,
      severity: descriptor.severity,
      strategy: strategyDef.strategy,
      attempts,
      duration: finished - started,
      result: finalResult,
      verification: lastVerification,
      escalations,
      phases: phaseHistories.get(recoveryId),
      isolation: lastIsolation
    });

    // Successful completion requires verification before SUCCESS report
    if (finalResult === RM_RESULT.SUCCESS && (!lastVerification || !lastVerification.verified)) {
      return {
        ok: false,
        error: "verification_required_before_success",
        recoveryId,
        report,
        phases: phaseHistories.get(recoveryId)
      };
    }

    return {
      ok: success,
      error: loopCapReached ? "max_total_cycles_exceeded" : undefined,
      recoveryId,
      result: finalResult,
      report,
      descriptor: registry.get(recoveryId),
      phases: phaseHistories.get(recoveryId),
      isolation: lastIsolation,
      verification: lastVerification,
      escalations,
      attempts,
      diagnosticSnapshot
    };
  }

  function fromHealth(feedOrReport = {}, meta = {}) {
    // Health only reports; Recovery decides.
    const objects = feedOrReport.objects || feedOrReport.failed || [];
    const list = Array.isArray(objects) ? objects : [feedOrReport];
    const results = [];
    for (const item of list) {
      if (!item || !item.component) continue;
      const severity =
        item.currentHealth === "failed" || item.health === "failed"
          ? RM_SEVERITY.ERROR
          : item.currentHealth === "critical" || item.health === "critical"
            ? RM_SEVERITY.CRITICAL
            : item.severity || RM_SEVERITY.ERROR;
      results.push(
        recover(
          {
            component: item.component,
            severity,
            cause: item.cause || "health_feed",
            healthDiagnostic: true,
            healthReport: feedOrReport
          },
          {
            source: meta.source || "health_manager",
            authorized: meta.authorized !== false,
            sourceVerified: meta.sourceVerified !== false,
            ...meta
          }
        )
      );
    }
    return Object.freeze({
      ok: true,
      healthDecides: false,
      recoveryDecides: true,
      diagnosticInputOnly: true,
      results: Object.freeze(results)
    });
  }

  function fromWatchdog(request = {}, meta = {}) {
    // Watchdog may request immediate recovery but cannot choose/execute concrete strategy.
    if (request.strategy || request.chosenStrategy || request.executeStrategy) {
      return {
        ok: false,
        error: "watchdog_cannot_choose_or_execute_strategy",
        recoveryDecides: true
      };
    }
    return recover(
      {
        component: request.component,
        severity: request.severity || RM_SEVERITY.CRITICAL,
        cause: request.cause || request.reason || "watchdog_request",
        immediate: true,
        watchdogRequest: true,
        runtimeSnapshot: request.runtimeSnapshot
      },
      {
        source: meta.source || "watchdog",
        authorized: meta.authorized !== false,
        sourceVerified: meta.sourceVerified !== false,
        ...meta
      }
    );
  }

  function metrics() {
    const frequentErrors = [...errorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => Object.freeze({ error, count }));
    const frequentComponents = [...componentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([component, count]) => Object.freeze({ component, count }));

    return Object.freeze({
      actions: actionCount,
      successRate: actionCount > 0 ? successCount / actionCount : 0,
      averageDuration: actionCount > 0 ? durationSum / actionCount : 0,
      frequentErrors: Object.freeze(frequentErrors),
      frequentComponents: Object.freeze(frequentComponents),
      escalations: escalationCountTotal,
      rejected: rejectedCount,
      criticalIgnoredBlocked,
      reports: reportArchive.length
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      ...RM_FLAGS,
      maxTotalCycles,
      strategyCount: strategies.size,
      active: activeRecoveryManager != null
    });
  }

  const manager = Object.freeze({
    ok: true,
    recover,
    fromHealth,
    fromWatchdog,
    evaluateRetry: (state, policy) =>
      evaluateRetry(state, policy || retryPolicy),
    escalate,
    registerStrategy,
    metrics,
    status,
    get(recoveryId) {
      return registry.get(recoveryId) || null;
    },
    phaseHistory(recoveryId) {
      return Object.freeze([...(phaseHistories.get(recoveryId) || [])]);
    },
    reportArchive() {
      return Object.freeze([...reportArchive]);
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    isolationLog() {
      return Object.freeze([...isolationLog]);
    },
    getStrategy(component) {
      return strategies.get(component) || null;
    },
    isActive() {
      return true;
    },
    // Explicit non-operations — anchor must not directly control OS
    spawnProcess() {
      return {
        ok: false,
        error: "recovery_manager_does_not_spawn_processes",
        executorInjectedOnly: true
      };
    },
    killProcess() {
      return {
        ok: false,
        error: "recovery_manager_does_not_kill_processes",
        executorInjectedOnly: true
      };
    },
    restartOsService() {
      return {
        ok: false,
        error: "recovery_manager_does_not_restart_os_services",
        executorInjectedOnly: true
      };
    },
    restartOs() {
      return {
        ok: false,
        error: "os_restart_forbidden",
        allowsOsRestart: false
      };
    }
  });

  activeRecoveryManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearRecoverySingletonForTest() {
  activeRecoveryManager = null;
}

module.exports = {
  RM_COMPONENT,
  RM_COMPONENT_ORDER,
  RM_WORKFLOW,
  RM_LEVEL,
  RM_LEVEL_NAME,
  RM_LEVEL_ORDER,
  RM_SEVERITY,
  RM_SEVERITY_ORDER,
  RM_RESULT,
  RM_STRATEGY_ALLOWLIST,
  RM_STRATEGY_LEVEL,
  RM_DEFAULT_COMPONENT_STRATEGIES,
  RM_DEFAULT_RETRY,
  RM_DEFAULT_WARNING_POLICY,
  RM_PUBLIC_API,
  RM_RUNTIME_ANCHORS,
  RM_AUTHORIZED_SOURCES,
  RM_PROTECTED_COMPONENTS,
  RM_FLAGS,
  validateStrategyDefinition,
  evaluateRetry,
  createRecoveryDescriptor,
  assertNoOsRestart,
  createRecoveryManager,
  clearRecoverySingletonForTest
};
