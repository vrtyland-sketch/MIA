"use strict";

/**
 * Master Canon 0067 — Fault Manager.
 * Kernel Layer 0 sole authority for fault intake, classification, routing, and audit.
 * Never repairs — flags/routes only (injected bridges notify Health/Recovery).
 */

const crypto = require("crypto");

const FM_COMPONENT = Object.freeze({
  FAULT_MANAGER: "fault_manager",
  FAULT_INTAKE: "fault_intake",
  FAULT_VALIDATOR: "fault_validator",
  FAULT_CLASSIFIER: "fault_classifier",
  DEDUP_ENGINE: "dedup_engine",
  CORRELATION_ENGINE: "correlation_engine",
  ROUTING_ENGINE: "routing_engine",
  ESCALATION_CONTROLLER: "escalation_controller",
  REPORT_ENGINE: "report_engine",
  REGISTRY_GUARD: "registry_guard",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const FM_COMPONENT_ORDER = Object.freeze(Object.values(FM_COMPONENT));

const FM_WORKFLOW = Object.freeze([
  "detect",
  "validate",
  "classify",
  "assign",
  "escalate",
  "report"
]);

const FM_DESCRIPTOR_FIELDS = Object.freeze([
  "faultId",
  "componentId",
  "componentType",
  "severity",
  "category",
  "message",
  "timestamp",
  "runtimeId",
  "correlationId",
  "status"
]);

const FM_CATEGORY = Object.freeze({
  RUNTIME: "runtime",
  SERVICE: "service",
  MODULE: "module",
  PLUGIN: "plugin",
  AI: "ai",
  NETWORK: "network",
  CONFIGURATION: "configuration",
  RESOURCE: "resource",
  SECURITY: "security",
  EXTERNAL_PLATFORM: "external_platform"
});

const FM_CATEGORY_ORDER = Object.freeze(Object.values(FM_CATEGORY));

const FM_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const FM_SEVERITY_ORDER = Object.freeze([
  FM_SEVERITY.INFO,
  FM_SEVERITY.WARNING,
  FM_SEVERITY.ERROR,
  FM_SEVERITY.CRITICAL,
  FM_SEVERITY.FATAL
]);

const FM_STATUS = Object.freeze({
  DETECTED: "detected",
  VALIDATED: "validated",
  CLASSIFIED: "classified",
  ASSIGNED: "assigned",
  RESOLVED: "resolved",
  CLOSED: "closed",
  ESCALATED: "escalated"
});

const FM_STATUS_ORDER = Object.freeze([
  FM_STATUS.DETECTED,
  FM_STATUS.VALIDATED,
  FM_STATUS.CLASSIFIED,
  FM_STATUS.ASSIGNED,
  FM_STATUS.RESOLVED,
  FM_STATUS.CLOSED,
  FM_STATUS.ESCALATED
]);

/** Strict status FSM — linear lifecycle plus escalated side-path. */
const FM_TRANSITIONS = Object.freeze({
  [FM_STATUS.DETECTED]: Object.freeze([
    FM_STATUS.VALIDATED,
    FM_STATUS.ESCALATED
  ]),
  [FM_STATUS.VALIDATED]: Object.freeze([
    FM_STATUS.CLASSIFIED,
    FM_STATUS.ESCALATED
  ]),
  [FM_STATUS.CLASSIFIED]: Object.freeze([
    FM_STATUS.ASSIGNED,
    FM_STATUS.ESCALATED
  ]),
  [FM_STATUS.ASSIGNED]: Object.freeze([
    FM_STATUS.RESOLVED,
    FM_STATUS.ESCALATED
  ]),
  [FM_STATUS.ESCALATED]: Object.freeze([
    FM_STATUS.ASSIGNED,
    FM_STATUS.RESOLVED,
    FM_STATUS.ESCALATED
  ]),
  [FM_STATUS.RESOLVED]: Object.freeze([FM_STATUS.CLOSED]),
  [FM_STATUS.CLOSED]: Object.freeze([])
});

const FM_DEFAULT_ROUTES = Object.freeze({
  [FM_CATEGORY.NETWORK]: Object.freeze(["recovery_manager", "audit_logger"]),
  [FM_CATEGORY.RESOURCE]: Object.freeze([
    "recovery_manager",
    "health_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.SECURITY]: Object.freeze(["security_layer", "audit_logger"]),
  [FM_CATEGORY.CONFIGURATION]: Object.freeze([
    "health_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.AI]: Object.freeze([
    "health_manager",
    "recovery_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.SERVICE]: Object.freeze([
    "health_manager",
    "recovery_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.MODULE]: Object.freeze([
    "health_manager",
    "recovery_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.PLUGIN]: Object.freeze([
    "health_manager",
    "recovery_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.RUNTIME]: Object.freeze([
    "health_manager",
    "recovery_manager",
    "audit_logger"
  ]),
  [FM_CATEGORY.EXTERNAL_PLATFORM]: Object.freeze([
    "recovery_manager",
    "audit_logger"
  ])
});

/** Categories recoverable by default (override via report.recoverable). */
const FM_DEFAULT_RECOVERABLE = Object.freeze({
  [FM_CATEGORY.RUNTIME]: true,
  [FM_CATEGORY.SERVICE]: true,
  [FM_CATEGORY.MODULE]: true,
  [FM_CATEGORY.PLUGIN]: true,
  [FM_CATEGORY.AI]: true,
  [FM_CATEGORY.NETWORK]: true,
  [FM_CATEGORY.CONFIGURATION]: false,
  [FM_CATEGORY.RESOURCE]: true,
  [FM_CATEGORY.SECURITY]: false,
  [FM_CATEGORY.EXTERNAL_PLATFORM]: true
});

const FM_DEFAULT_ESCALATE_AFTER_MS = Object.freeze({
  [FM_SEVERITY.ERROR]: 30000,
  [FM_SEVERITY.CRITICAL]: 60000
});

const FM_DEFAULT_DEDUPE_WINDOW_MS = 5000;

const FM_PUBLIC_API = Object.freeze([
  "report",
  "classify",
  "routeFault",
  "escalate",
  "correlate",
  "resolve",
  "close",
  "transition",
  "getFault",
  "getByCorrelation",
  "toHealthImpact",
  "toRecovery",
  "metrics",
  "auditTrail",
  "reportArchive",
  "status"
]);

const FM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-fault-core/faultManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-watchdog-core/watchdogEngine.js",
  "docs/master-canon/0067-fault-manager.md"
]);

const FM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "fault_manager",
  "fault-manager",
  "health_manager",
  "health-manager",
  "recovery_manager",
  "recovery-manager",
  "watchdog",
  "watchdog_engine",
  "runtime_manager",
  "runtime-manager",
  "operator",
  "system"
]);

const FM_FLAGS = Object.freeze({
  repairsDirectly: false,
  soleFaultAuthority: true,
  centralFaultIngress: true,
  spawnsOsProcesses: false,
  killsOsProcesses: false,
  restartsServices: false
});

let activeFaultManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidCategory(category) {
  return FM_CATEGORY_ORDER.includes(category);
}

function isValidSeverity(severity) {
  return FM_SEVERITY_ORDER.includes(severity);
}

function isValidStatus(status) {
  return FM_STATUS_ORDER.includes(status);
}

function severityIndex(severity) {
  return FM_SEVERITY_ORDER.indexOf(severity);
}

function nextEscalatedSeverity(severity) {
  const idx = severityIndex(severity);
  if (idx < 0) return FM_SEVERITY.ERROR;
  if (severity === FM_SEVERITY.INFO || severity === FM_SEVERITY.WARNING) {
    return FM_SEVERITY.ERROR;
  }
  if (severity === FM_SEVERITY.ERROR) return FM_SEVERITY.CRITICAL;
  if (severity === FM_SEVERITY.CRITICAL) return FM_SEVERITY.FATAL;
  return FM_SEVERITY.FATAL;
}

function validateStatusTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return { ok: false, error: "invalid_status", from, to };
  }
  const allowed = FM_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: "invalid_status_transition", from, to };
  }
  return { ok: true, from, to };
}

function normalizeMessageKey(message) {
  return String(message || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

function fingerprintFor(input = {}) {
  const componentId = String(input.componentId || "").trim();
  const category = String(input.category || "").trim();
  const messageKey =
    input.messageKey != null
      ? normalizeMessageKey(input.messageKey)
      : normalizeMessageKey(input.message);
  return `${componentId}|${category}|${messageKey}`;
}

/**
 * Pure dedup evaluation — does not mutate registry.
 * Returns hit + existingFaultId when an open record matches within window.
 */
function evaluateDedup(registry = [], candidate = {}, options = {}) {
  const windowMs =
    typeof options.dedupeWindowMs === "number" && options.dedupeWindowMs >= 0
      ? options.dedupeWindowMs
      : FM_DEFAULT_DEDUPE_WINDOW_MS;
  const nowMs =
    typeof candidate.timestamp === "number" && Number.isFinite(candidate.timestamp)
      ? candidate.timestamp
      : typeof options.nowMs === "number"
        ? options.nowMs
        : Date.now();
  const fp = fingerprintFor(candidate);
  const openStatuses = new Set([
    FM_STATUS.DETECTED,
    FM_STATUS.VALIDATED,
    FM_STATUS.CLASSIFIED,
    FM_STATUS.ASSIGNED,
    FM_STATUS.ESCALATED
  ]);

  for (let i = registry.length - 1; i >= 0; i -= 1) {
    const rec = registry[i];
    if (!rec || rec.fingerprint !== fp) continue;
    if (!openStatuses.has(rec.status)) continue;
    const age = nowMs - (rec.timestamp || 0);
    if (age >= 0 && age <= windowMs) {
      return Object.freeze({
        ok: true,
        hit: true,
        fingerprint: fp,
        existingFaultId: rec.faultId,
        counter: (rec.counter || 1) + 1
      });
    }
  }

  return Object.freeze({
    ok: true,
    hit: false,
    fingerprint: fp,
    existingFaultId: null,
    counter: 1
  });
}

function createFaultDescriptor(input = {}) {
  const componentId = String(input.componentId || "").trim();
  if (!componentId) return { ok: false, error: "missing_componentId" };

  const componentType = String(input.componentType || "").trim();
  if (!componentType) return { ok: false, error: "missing_componentType" };

  const severity = input.severity || FM_SEVERITY.ERROR;
  if (!isValidSeverity(severity)) {
    return { ok: false, error: "invalid_severity", severity };
  }

  const category = input.category;
  if (!isValidCategory(category)) {
    return { ok: false, error: "invalid_category", category };
  }

  const message = String(input.message || "").trim();
  if (!message) return { ok: false, error: "missing_message" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const status = input.status || FM_STATUS.DETECTED;
  if (!isValidStatus(status)) {
    return { ok: false, error: "invalid_status", status };
  }

  const faultId = input.faultId || makeId("fault");

  return {
    ok: true,
    descriptor: Object.freeze({
      faultId,
      componentId,
      componentType,
      severity,
      category,
      message,
      timestamp,
      runtimeId,
      correlationId,
      status
    })
  };
}

function resolveRouteTargets(category, routesMap, recoverable) {
  const base = routesMap[category] || ["audit_logger"];
  let targets = [...base];
  if (!targets.includes("audit_logger")) {
    targets.push("audit_logger");
  }
  // When not recoverable, drop recovery_manager from default recoverable routes
  if (recoverable === false) {
    targets = targets.filter((t) => t !== "recovery_manager");
    if (!targets.includes("audit_logger")) targets.push("audit_logger");
  }
  return Object.freeze([...new Set(targets)]);
}

function createFaultManager(options = {}) {
  if (
    activeFaultManager &&
    activeFaultManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "fault_manager_already_active",
      soleFaultAuthority: true
    });
  }

  const dedupeWindowMs =
    typeof options.dedupeWindowMs === "number" && options.dedupeWindowMs >= 0
      ? options.dedupeWindowMs
      : FM_DEFAULT_DEDUPE_WINDOW_MS;

  const escalateAfterMs = {
    ...FM_DEFAULT_ESCALATE_AFTER_MS,
    ...(options.escalateAfterMs || {})
  };

  const routesMap = {
    ...FM_DEFAULT_ROUTES,
    ...(options.routes || {})
  };
  for (const key of Object.keys(routesMap)) {
    routesMap[key] = Object.freeze([...(routesMap[key] || [])]);
  }

  const recoverablePolicy = {
    ...FM_DEFAULT_RECOVERABLE,
    ...(options.recoverableByCategory || {})
  };

  const authorized = new Set(options.authorizedSources || FM_AUTHORIZED_SOURCES);

  const healthBridge =
    options.healthBridge ||
    Object.freeze({
      applyImpact() {
        return { ok: false, error: "health_bridge_not_wired" };
      }
    });

  const recoveryBridge =
    options.recoveryBridge ||
    Object.freeze({
      fromFault() {
        return { ok: false, error: "recovery_bridge_not_wired" };
      }
    });

  const faults = new Map();
  const faultsByFingerprint = new Map();
  const correlationIndex = new Map();
  const audit = [];
  const archive = [];
  const phaseHistory = [];
  const trendBuckets = [];

  let faultCount = 0;
  let dedupHits = 0;
  let escalations = 0;
  let closedCount = 0;
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
        faultId: detail.faultId || null,
        ...detail
      })
    );
  }

  function snapshotRecord(rec) {
    return Object.freeze({
      faultId: rec.faultId,
      componentId: rec.componentId,
      componentType: rec.componentType,
      severity: rec.severity,
      category: rec.category,
      message: rec.message,
      timestamp: rec.timestamp,
      runtimeId: rec.runtimeId,
      correlationId: rec.correlationId,
      status: rec.status,
      counter: rec.counter,
      recoverable: rec.recoverable,
      fingerprint: rec.fingerprint,
      targets: Object.freeze([...(rec.targets || [])]),
      cause: rec.cause || rec.message,
      resolution: rec.resolution || null,
      result: rec.result || null,
      duration: rec.duration != null ? rec.duration : null,
      escalatedAt: rec.escalatedAt || null,
      resolvedAt: rec.resolvedAt || null,
      closedAt: rec.closedAt || null,
      phases: Object.freeze([...(rec.phases || [])])
    });
  }

  function indexCorrelation(correlationId, faultId) {
    if (!correlationId) return;
    let set = correlationIndex.get(correlationId);
    if (!set) {
      set = new Set();
      correlationIndex.set(correlationId, set);
    }
    set.add(faultId);
  }

  function reindexFingerprint(rec) {
    faultsByFingerprint.set(rec.fingerprint, rec.faultId);
  }

  function openCount() {
    let n = 0;
    for (const rec of faults.values()) {
      if (rec.status !== FM_STATUS.CLOSED) n += 1;
    }
    return n;
  }

  function classify(input = {}, meta = {}) {
    if (meta.forged === true) {
      rejectedCount += 1;
      return { ok: false, error: "forged_fault_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      return { ok: false, error: "unauthorized_fault" };
    }

    let category = input.category;
    if (!isValidCategory(category)) {
      const hint = String(input.hint || input.componentType || "").toLowerCase();
      if (hint.includes("network") || hint.includes("socket")) {
        category = FM_CATEGORY.NETWORK;
      } else if (hint.includes("security") || hint.includes("auth")) {
        category = FM_CATEGORY.SECURITY;
      } else if (hint.includes("config")) {
        category = FM_CATEGORY.CONFIGURATION;
      } else if (hint.includes("resource") || hint.includes("memory") || hint.includes("cpu")) {
        category = FM_CATEGORY.RESOURCE;
      } else if (hint.includes("plugin")) {
        category = FM_CATEGORY.PLUGIN;
      } else if (hint.includes("ai") || hint.includes("model")) {
        category = FM_CATEGORY.AI;
      } else if (hint.includes("service")) {
        category = FM_CATEGORY.SERVICE;
      } else if (hint.includes("module")) {
        category = FM_CATEGORY.MODULE;
      } else if (hint.includes("platform") || hint.includes("tiktok") || hint.includes("obs")) {
        category = FM_CATEGORY.EXTERNAL_PLATFORM;
      } else {
        category = FM_CATEGORY.RUNTIME;
      }
    }

    let severity = input.severity || FM_SEVERITY.ERROR;
    if (!isValidSeverity(severity)) {
      return { ok: false, error: "invalid_severity", severity };
    }

    const recoverable =
      typeof input.recoverable === "boolean"
        ? input.recoverable
        : recoverablePolicy[category] !== false;

    return {
      ok: true,
      classification: Object.freeze({
        category,
        severity,
        recoverable,
        reason: input.reason || input.message || category
      })
    };
  }

  function routeFault(faultOrCategory, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_fault_blocked" };
    }

    let category;
    let recoverable;
    let faultId = null;

    if (typeof faultOrCategory === "string") {
      category = faultOrCategory;
      recoverable =
        typeof meta.recoverable === "boolean"
          ? meta.recoverable
          : recoverablePolicy[category] !== false;
    } else if (faultOrCategory && typeof faultOrCategory === "object") {
      faultId = faultOrCategory.faultId || null;
      const rec = faultId ? faults.get(faultId) : null;
      category = faultOrCategory.category || (rec && rec.category);
      recoverable =
        typeof faultOrCategory.recoverable === "boolean"
          ? faultOrCategory.recoverable
          : rec
            ? rec.recoverable
            : recoverablePolicy[category] !== false;
    }

    if (!isValidCategory(category)) {
      return { ok: false, error: "invalid_category", category };
    }

    const targets = resolveRouteTargets(category, routesMap, recoverable);
    appendAudit({
      action: "route",
      faultId,
      category,
      targets: [...targets],
      at: meta.nowMs != null ? meta.nowMs : Date.now()
    });

    return Object.freeze({
      ok: true,
      category,
      targets,
      invoked: false
    });
  }

  function transition(faultId, toStatus, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_fault_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_fault" };
    }

    const rec = faults.get(faultId);
    if (!rec) return { ok: false, error: "fault_not_found", faultId };

    const check = validateStatusTransition(rec.status, toStatus);
    if (!check.ok) return check;

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    rec.status = toStatus;
    rec.phases.push(toStatus);
    if (toStatus === FM_STATUS.ESCALATED) {
      rec.escalatedAt = nowMs;
    }
    if (toStatus === FM_STATUS.RESOLVED) {
      rec.resolvedAt = nowMs;
      rec.resolution = meta.resolution || rec.resolution || "resolved";
      rec.result = meta.result || rec.result || "RESOLVED";
      rec.duration = nowMs - rec.timestamp;
    }
    if (toStatus === FM_STATUS.CLOSED) {
      rec.closedAt = nowMs;
      closedCount += 1;
      if (rec.duration == null) rec.duration = nowMs - rec.timestamp;
      archiveReport(rec);
    }

    appendAudit({
      action: "transition",
      faultId,
      from: check.from,
      to: toStatus,
      at: nowMs
    });

    return Object.freeze({
      ok: true,
      fault: snapshotRecord(rec)
    });
  }

  function archiveReport(rec) {
    archive.push(
      Object.freeze({
        faultId: rec.faultId,
        component: rec.componentId,
        category: rec.category,
        severity: rec.severity,
        cause: rec.cause || rec.message,
        resolution: rec.resolution || null,
        duration: rec.duration != null ? rec.duration : null,
        result: rec.result || null
      })
    );
  }

  function report(input = {}, meta = {}) {
    if (meta.forged === true) {
      rejectedCount += 1;
      appendAudit({ action: "reject", reason: "forged", at: Date.now() });
      return { ok: false, error: "forged_fault_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      rejectedCount += 1;
      appendAudit({
        action: "reject",
        reason: "unauthorized",
        source: meta.source || null,
        at: Date.now()
      });
      return { ok: false, error: "unauthorized_fault" };
    }

    const nowMs =
      typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
        ? input.timestamp
        : meta.nowMs != null
          ? meta.nowMs
          : Date.now();

    pushPhase("detect", { at: nowMs });

    const classified = classify(
      {
        category: input.category,
        severity: input.severity,
        recoverable: input.recoverable,
        hint: input.componentType || input.componentId,
        message: input.message,
        reason: input.cause
      },
      { ...meta, authorized: true, sourceVerified: true }
    );
    if (!classified.ok) return classified;

    const category = classified.classification.category;
    const severity = classified.classification.severity;
    const recoverable = classified.classification.recoverable;

    const desc = createFaultDescriptor({
      faultId: input.faultId,
      componentId: input.componentId,
      componentType: input.componentType || category,
      severity,
      category,
      message: input.message,
      timestamp: nowMs,
      runtimeId: input.runtimeId,
      correlationId: input.correlationId,
      status: FM_STATUS.DETECTED
    });
    if (!desc.ok) return desc;

    pushPhase("validate", { at: nowMs, faultId: desc.descriptor.faultId });

    const fp = fingerprintFor({
      componentId: desc.descriptor.componentId,
      category,
      message: desc.descriptor.message,
      messageKey: input.messageKey
    });

    const registrySnapshot = [...faults.values()].map((r) => ({
      faultId: r.faultId,
      fingerprint: r.fingerprint,
      status: r.status,
      timestamp: r.timestamp,
      counter: r.counter
    }));

    const dedup = evaluateDedup(registrySnapshot, {
      componentId: desc.descriptor.componentId,
      category,
      message: desc.descriptor.message,
      messageKey: input.messageKey,
      timestamp: nowMs
    }, { dedupeWindowMs, nowMs });

    if (dedup.hit) {
      const existing = faults.get(dedup.existingFaultId);
      if (existing) {
        existing.counter = dedup.counter;
        existing.lastSeenAt = nowMs;
        dedupHits += 1;
        appendAudit({
          action: "dedup",
          faultId: existing.faultId,
          counter: existing.counter,
          at: nowMs
        });
        pushPhase("report", {
          at: nowMs,
          faultId: existing.faultId,
          dedup: true
        });
        return Object.freeze({
          ok: true,
          dedup: true,
          fault: snapshotRecord(existing),
          faultId: existing.faultId
        });
      }
    }

    pushPhase("classify", {
      at: nowMs,
      faultId: desc.descriptor.faultId,
      category,
      severity
    });

    const targets = resolveRouteTargets(category, routesMap, recoverable);

    const rec = {
      faultId: desc.descriptor.faultId,
      componentId: desc.descriptor.componentId,
      componentType: desc.descriptor.componentType,
      severity: desc.descriptor.severity,
      category,
      message: desc.descriptor.message,
      timestamp: desc.descriptor.timestamp,
      runtimeId: desc.descriptor.runtimeId,
      correlationId: desc.descriptor.correlationId,
      status: FM_STATUS.DETECTED,
      counter: 1,
      recoverable,
      fingerprint: fp,
      targets: [...targets],
      cause: input.cause || desc.descriptor.message,
      resolution: null,
      result: null,
      duration: null,
      escalatedAt: null,
      resolvedAt: null,
      closedAt: null,
      lastSeenAt: nowMs,
      phases: ["detect", "validate", "classify"]
    };

    // Advance through validate → classify → assign as part of report workflow
    rec.status = FM_STATUS.VALIDATED;
    rec.phases.push(FM_STATUS.VALIDATED);
    rec.status = FM_STATUS.CLASSIFIED;
    rec.phases.push(FM_STATUS.CLASSIFIED);
    rec.status = FM_STATUS.ASSIGNED;
    rec.phases.push(FM_STATUS.ASSIGNED);
    rec.phases.push("assign");

    faults.set(rec.faultId, rec);
    reindexFingerprint(rec);
    indexCorrelation(rec.correlationId, rec.faultId);
    faultCount += 1;

    trendBuckets.push(
      Object.freeze({
        at: nowMs,
        category,
        severity,
        faultId: rec.faultId
      })
    );

    pushPhase("assign", {
      at: nowMs,
      faultId: rec.faultId,
      targets: [...targets]
    });

    appendAudit({
      action: "report",
      faultId: rec.faultId,
      category,
      severity,
      targets: [...targets],
      at: nowMs
    });

    // Optional auto-escalate if already past threshold at report time
    let escalated = false;
    if (meta.autoEscalate === true) {
      const esc = escalate(rec.faultId, { ...meta, nowMs, authorized: true });
      escalated = esc.ok === true && esc.escalated === true;
    }

    pushPhase("report", { at: nowMs, faultId: rec.faultId });

    // Notify bridges only when injected and appropriate — never mutate by default
    if (options.notifyBridgesOnReport === true) {
      const impact = toHealthImpact(rec);
      if (typeof healthBridge.applyImpact === "function") {
        healthBridge.applyImpact(impact, { faultId: rec.faultId });
      }
      if (rec.recoverable && typeof recoveryBridge.fromFault === "function") {
        recoveryBridge.fromFault(toRecovery(rec).recovery, {
          faultId: rec.faultId
        });
      }
    }

    return Object.freeze({
      ok: true,
      dedup: false,
      fault: snapshotRecord(rec),
      faultId: rec.faultId,
      targets,
      escalated,
      phases: Object.freeze([...rec.phases])
    });
  }

  function escalate(faultId, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_fault_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_fault" };
    }

    const rec = faults.get(faultId);
    if (!rec) return { ok: false, error: "fault_not_found", faultId };

    if (
      rec.status === FM_STATUS.RESOLVED ||
      rec.status === FM_STATUS.CLOSED
    ) {
      return { ok: false, error: "fault_already_closed", faultId };
    }

    const nowMs = meta.nowMs != null ? meta.nowMs : Date.now();
    const age = nowMs - rec.timestamp;
    const threshold =
      escalateAfterMs[rec.severity] != null
        ? escalateAfterMs[rec.severity]
        : null;

    const force = meta.force === true;
    if (!force && threshold != null && age < threshold) {
      return Object.freeze({
        ok: true,
        escalated: false,
        reason: "threshold_not_reached",
        ageMs: age,
        thresholdMs: threshold,
        fault: snapshotRecord(rec)
      });
    }

    // Only escalate ERROR→CRITICAL→FATAL (and WARNING/INFO into ERROR path when forced)
    if (
      rec.severity === FM_SEVERITY.FATAL &&
      rec.status === FM_STATUS.ESCALATED
    ) {
      return Object.freeze({
        ok: true,
        escalated: false,
        reason: "already_fatal",
        fault: snapshotRecord(rec)
      });
    }

    const prevSeverity = rec.severity;
    const nextSeverity =
      meta.toSeverity && isValidSeverity(meta.toSeverity)
        ? meta.toSeverity
        : nextEscalatedSeverity(rec.severity);

    if (severityIndex(nextSeverity) <= severityIndex(prevSeverity) && !force) {
      if (rec.status !== FM_STATUS.ESCALATED) {
        const t = transition(faultId, FM_STATUS.ESCALATED, {
          ...meta,
          nowMs,
          authorized: true,
          sourceVerified: true
        });
        if (!t.ok) return t;
      }
      return Object.freeze({
        ok: true,
        escalated: true,
        fromSeverity: prevSeverity,
        toSeverity: rec.severity,
        fault: snapshotRecord(rec)
      });
    }

    rec.severity = nextSeverity;
    if (rec.status !== FM_STATUS.ESCALATED) {
      const check = validateStatusTransition(rec.status, FM_STATUS.ESCALATED);
      if (check.ok) {
        rec.status = FM_STATUS.ESCALATED;
        rec.phases.push(FM_STATUS.ESCALATED);
      }
    } else {
      rec.phases.push(FM_STATUS.ESCALATED);
    }
    rec.escalatedAt = nowMs;
    escalations += 1;

    appendAudit({
      action: "escalate",
      faultId,
      fromSeverity: prevSeverity,
      toSeverity: nextSeverity,
      at: nowMs
    });

    pushPhase("escalate", {
      at: nowMs,
      faultId,
      fromSeverity: prevSeverity,
      toSeverity: nextSeverity
    });

    return Object.freeze({
      ok: true,
      escalated: true,
      fromSeverity: prevSeverity,
      toSeverity: nextSeverity,
      fault: snapshotRecord(rec)
    });
  }

  function correlate(faultIds = [], meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_fault_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_fault" };
    }

    const ids = Array.isArray(faultIds) ? faultIds : [];
    if (ids.length < 1) return { ok: false, error: "missing_fault_ids" };

    const correlationId =
      (meta.correlationId && String(meta.correlationId).trim()) ||
      makeId("corr");

    const linked = [];
    for (const id of ids) {
      const rec = faults.get(id);
      if (!rec) {
        return { ok: false, error: "fault_not_found", faultId: id };
      }
      const prev = rec.correlationId;
      if (prev && correlationIndex.has(prev)) {
        correlationIndex.get(prev).delete(id);
      }
      rec.correlationId = correlationId;
      indexCorrelation(correlationId, id);
      linked.push(id);
    }

    appendAudit({
      action: "correlate",
      correlationId,
      faultIds: [...linked],
      at: meta.nowMs != null ? meta.nowMs : Date.now()
    });

    return Object.freeze({
      ok: true,
      correlationId,
      faultIds: Object.freeze([...linked])
    });
  }

  function resolve(faultId, meta = {}) {
    return transition(faultId, FM_STATUS.RESOLVED, {
      ...meta,
      resolution: meta.resolution || "resolved",
      result: meta.result || "RESOLVED"
    });
  }

  function close(faultId, meta = {}) {
    const rec = faults.get(faultId);
    if (!rec) return { ok: false, error: "fault_not_found", faultId };
    if (rec.status !== FM_STATUS.RESOLVED) {
      const r = resolve(faultId, meta);
      if (!r.ok) return r;
    }
    return transition(faultId, FM_STATUS.CLOSED, meta);
  }

  function getFault(faultId) {
    const rec = faults.get(faultId);
    return rec ? snapshotRecord(rec) : null;
  }

  function getByCorrelation(correlationId) {
    const set = correlationIndex.get(correlationId);
    if (!set) return Object.freeze([]);
    return Object.freeze(
      [...set]
        .map((id) => faults.get(id))
        .filter(Boolean)
        .map((r) => snapshotRecord(r))
    );
  }

  function toHealthImpact(faultInput) {
    const rec =
      typeof faultInput === "string"
        ? faults.get(faultInput)
        : faultInput && faultInput.faultId
          ? faults.get(faultInput.faultId) || faultInput
          : faultInput;

    if (!rec) {
      return Object.freeze({
        ok: false,
        error: "fault_not_found",
        diagnosticOnly: true
      });
    }

    const counter = rec.counter || 1;
    let scoreDelta = -5;
    if (counter >= 3) scoreDelta = -15;
    else if (counter === 2) scoreDelta = -10;
    if (rec.severity === FM_SEVERITY.CRITICAL) scoreDelta -= 5;
    if (rec.severity === FM_SEVERITY.FATAL) scoreDelta -= 10;

    return Object.freeze({
      ok: true,
      diagnosticOnly: true,
      scoreDelta,
      faultId: rec.faultId || null,
      category: rec.category || null,
      severity: rec.severity || null,
      counter,
      applied: false
    });
  }

  function toRecovery(faultInput) {
    const rec =
      typeof faultInput === "string"
        ? faults.get(faultInput)
        : faultInput && faultInput.faultId
          ? faults.get(faultInput.faultId) || faultInput
          : faultInput;

    if (!rec) {
      return Object.freeze({ ok: false, error: "fault_not_found" });
    }

    const recoverable =
      typeof rec.recoverable === "boolean"
        ? rec.recoverable
        : recoverablePolicy[rec.category] !== false;

    if (!recoverable) {
      const suggestion =
        rec.severity === FM_SEVERITY.FATAL ? "shutdown" : "safe_mode";
      return Object.freeze({
        ok: true,
        recoverable: false,
        executed: false,
        suggestion,
        recovery: null
      });
    }

    const recovery = Object.freeze({
      component: rec.componentId,
      severity: rec.severity,
      category: rec.category,
      faultId: rec.faultId,
      cause: rec.cause || rec.message,
      recoverable: true
    });

    return Object.freeze({
      ok: true,
      recoverable: true,
      executed: false,
      recovery
    });
  }

  function metrics() {
    const byCategory = {};
    const bySeverity = {};
    for (const cat of FM_CATEGORY_ORDER) byCategory[cat] = 0;
    for (const sev of FM_SEVERITY_ORDER) bySeverity[sev] = 0;

    let open = 0;
    let closed = 0;
    for (const rec of faults.values()) {
      byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
      bySeverity[rec.severity] = (bySeverity[rec.severity] || 0) + 1;
      if (rec.status === FM_STATUS.CLOSED) closed += 1;
      else open += 1;
    }

    const recent = trendBuckets.slice(-50);
    const trends = Object.freeze({
      recentCount: recent.length,
      byCategoryRecent: Object.freeze(
        recent.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {})
      )
    });

    return Object.freeze({
      faultCount,
      byCategory: Object.freeze({ ...byCategory }),
      bySeverity: Object.freeze({ ...bySeverity }),
      openCount: open,
      closedCount: closed,
      dedupHits,
      escalations,
      rejectedCount,
      trends,
      archivedReports: archive.length
    });
  }

  function blockedHistoryMutation(op) {
    appendAudit({
      action: "blocked",
      operation: op,
      reason: "registry_immutable",
      at: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "history_mutation_blocked",
      operation: op
    });
  }

  const engine = Object.freeze({
    ok: true,
    report,
    classify,
    routeFault,
    escalate,
    correlate,
    resolve,
    close,
    transition,
    getFault,
    getByCorrelation,
    toHealthImpact,
    toRecovery,
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...archive]);
    },
    phaseHistory() {
      return Object.freeze([...phaseHistory]);
    },
    status() {
      return Object.freeze({
        singleton: true,
        soleFaultAuthority: FM_FLAGS.soleFaultAuthority,
        centralFaultIngress: FM_FLAGS.centralFaultIngress,
        repairsDirectly: FM_FLAGS.repairsDirectly,
        faultCount,
        openCount: openCount(),
        closedCount,
        dedupeWindowMs,
        components: FM_COMPONENT_ORDER
      });
    },
    isActive() {
      return true;
    },
    deleteHistory() {
      return blockedHistoryMutation("deleteHistory");
    },
    clearHistory() {
      return blockedHistoryMutation("clearHistory");
    },
    purge() {
      return blockedHistoryMutation("purge");
    },
    // Explicit non-operations — Fault Manager never repairs
    repair() {
      return {
        ok: false,
        error: "fault_manager_does_not_repair",
        repairsDirectly: false
      };
    },
    restart() {
      return {
        ok: false,
        error: "fault_manager_does_not_restart",
        repairsDirectly: false
      };
    },
    recover() {
      return {
        ok: false,
        error: "fault_manager_does_not_recover",
        repairsDirectly: false
      };
    },
    spawnProcess() {
      return {
        ok: false,
        error: "fault_manager_does_not_spawn_processes",
        repairsDirectly: false
      };
    },
    killProcess() {
      return {
        ok: false,
        error: "fault_manager_does_not_kill_processes",
        repairsDirectly: false
      };
    }
  });

  activeFaultManager = {
    isActive: engine.isActive
  };

  return engine;
}

function clearFaultSingletonForTest() {
  activeFaultManager = null;
}

module.exports = {
  FM_COMPONENT,
  FM_COMPONENT_ORDER,
  FM_WORKFLOW,
  FM_DESCRIPTOR_FIELDS,
  FM_CATEGORY,
  FM_CATEGORY_ORDER,
  FM_SEVERITY,
  FM_SEVERITY_ORDER,
  FM_STATUS,
  FM_STATUS_ORDER,
  FM_TRANSITIONS,
  FM_DEFAULT_ROUTES,
  FM_DEFAULT_RECOVERABLE,
  FM_DEFAULT_ESCALATE_AFTER_MS,
  FM_DEFAULT_DEDUPE_WINDOW_MS,
  FM_PUBLIC_API,
  FM_RUNTIME_ANCHORS,
  FM_AUTHORIZED_SOURCES,
  FM_FLAGS,
  createFaultDescriptor,
  validateStatusTransition,
  evaluateDedup,
  fingerprintFor,
  createFaultManager,
  clearFaultSingletonForTest
};
