"use strict";

/**
 * Master Canon 0073 — Alert Manager.
 * Kernel Layer 0 sole central ingress for creating, classifying, deduplicating,
 * escalating, and distributing alerts. Does NOT repair/recover/fix faults.
 */

const crypto = require("crypto");

const AM_COMPONENT = Object.freeze({
  ALERT_MANAGER: "alert_manager",
  RULE_ENGINE: "rule_engine",
  INTAKE_GATE: "intake_gate",
  CLASSIFIER: "classifier",
  PRIORITY_MAPPER: "priority_mapper",
  DEDUP_ENGINE: "dedup_engine",
  ESCALATION_CONTROLLER: "escalation_controller",
  NOTIFICATION_DISPATCHER: "notification_dispatcher",
  LIFECYCLE_CONTROLLER: "lifecycle_controller",
  REPORT_ENGINE: "report_engine",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const AM_COMPONENT_ORDER = Object.freeze(Object.values(AM_COMPONENT));

const AM_CATEGORY = Object.freeze({
  RUNTIME: "runtime",
  PERFORMANCE: "performance",
  HEALTH: "health",
  FAULT: "fault",
  SECURITY: "security",
  AI: "ai",
  BATTLE: "battle",
  OBS: "obs",
  PLATFORM_CONNECTOR: "platform_connector"
});

const AM_CATEGORY_ORDER = Object.freeze(Object.values(AM_CATEGORY));

const AM_PRIORITY = Object.freeze({
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  CRITICAL: "critical",
  EMERGENCY: "emergency"
});

const AM_PRIORITY_ORDER = Object.freeze([
  AM_PRIORITY.LOW,
  AM_PRIORITY.NORMAL,
  AM_PRIORITY.HIGH,
  AM_PRIORITY.CRITICAL,
  AM_PRIORITY.EMERGENCY
]);

const AM_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const AM_SEVERITY_ORDER = Object.freeze([
  AM_SEVERITY.INFO,
  AM_SEVERITY.WARNING,
  AM_SEVERITY.ERROR,
  AM_SEVERITY.CRITICAL,
  AM_SEVERITY.FATAL
]);

const AM_SEVERITY_TO_PRIORITY = Object.freeze({
  [AM_SEVERITY.INFO]: AM_PRIORITY.LOW,
  [AM_SEVERITY.WARNING]: AM_PRIORITY.NORMAL,
  [AM_SEVERITY.ERROR]: AM_PRIORITY.HIGH,
  [AM_SEVERITY.CRITICAL]: AM_PRIORITY.CRITICAL,
  [AM_SEVERITY.FATAL]: AM_PRIORITY.EMERGENCY
});

const AM_STATUS = Object.freeze({
  CREATED: "created",
  ACTIVE: "active",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
  CLOSED: "closed"
});

const AM_STATUS_ORDER = Object.freeze([
  AM_STATUS.CREATED,
  AM_STATUS.ACTIVE,
  AM_STATUS.ACKNOWLEDGED,
  AM_STATUS.RESOLVED,
  AM_STATUS.CLOSED
]);

const AM_TRANSITIONS = Object.freeze({
  [AM_STATUS.CREATED]: Object.freeze([AM_STATUS.ACTIVE]),
  [AM_STATUS.ACTIVE]: Object.freeze([AM_STATUS.ACKNOWLEDGED, AM_STATUS.RESOLVED]),
  [AM_STATUS.ACKNOWLEDGED]: Object.freeze([AM_STATUS.RESOLVED]),
  [AM_STATUS.RESOLVED]: Object.freeze([AM_STATUS.CLOSED]),
  [AM_STATUS.CLOSED]: Object.freeze([])
});

const AM_OPEN_STATUSES = Object.freeze([
  AM_STATUS.CREATED,
  AM_STATUS.ACTIVE,
  AM_STATUS.ACKNOWLEDGED
]);

const AM_CHANNEL = Object.freeze({
  DASHBOARD: "dashboard",
  ADMIN_UI: "admin_ui",
  LOGGING: "logging",
  API: "api",
  EXTERNAL: "external"
});

const AM_CHANNEL_ORDER = Object.freeze(Object.values(AM_CHANNEL));

/** Default channels by priority (higher priority includes more channels). */
const AM_PRIORITY_CHANNELS = Object.freeze({
  [AM_PRIORITY.LOW]: Object.freeze([AM_CHANNEL.LOGGING]),
  [AM_PRIORITY.NORMAL]: Object.freeze([AM_CHANNEL.LOGGING, AM_CHANNEL.DASHBOARD]),
  [AM_PRIORITY.HIGH]: Object.freeze([
    AM_CHANNEL.LOGGING,
    AM_CHANNEL.DASHBOARD,
    AM_CHANNEL.ADMIN_UI
  ]),
  [AM_PRIORITY.CRITICAL]: Object.freeze([
    AM_CHANNEL.LOGGING,
    AM_CHANNEL.DASHBOARD,
    AM_CHANNEL.ADMIN_UI,
    AM_CHANNEL.API
  ]),
  [AM_PRIORITY.EMERGENCY]: Object.freeze([
    AM_CHANNEL.LOGGING,
    AM_CHANNEL.DASHBOARD,
    AM_CHANNEL.ADMIN_UI,
    AM_CHANNEL.API,
    AM_CHANNEL.EXTERNAL
  ])
});

const AM_DESCRIPTOR_FIELDS = Object.freeze([
  "alertId",
  "runtimeId",
  "category",
  "severity",
  "priority",
  "source",
  "created",
  "resolved",
  "status",
  "correlationId"
]);

const AM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "monitoring",
  "alert_manager",
  "alert-manager",
  "metrics_manager",
  "metrics-manager",
  "health_manager",
  "health-manager",
  "fault_manager",
  "fault-manager",
  "diagnostics_manager",
  "diagnostics-manager",
  "watchdog",
  "watchdog_engine",
  "logging_manager",
  "logging-manager"
]);

const AM_PRIVILEGED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "alert_manager",
  "alert-manager"
]);

const AM_FLAGS = Object.freeze({
  soleAlertAuthority: true,
  repairsDirectly: false,
  centralAlertIngress: true,
  historyImmutable: true
});

const AM_PUBLIC_API = Object.freeze([
  "addRule",
  "evaluate",
  "fromMetrics",
  "fromFault",
  "acknowledge",
  "resolve",
  "close",
  "escalate",
  "escalateUnresolved",
  "notify",
  "getAlert",
  "createReport",
  "metrics",
  "auditTrail",
  "reportArchive",
  "status",
  "registerCategory"
]);

const AM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-alert-core/alertManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-watchdog-core/watchdogEngine.js",
  "shared/mia-fault-core/faultManager.js",
  "shared/mia-diagnostics-core/diagnosticsManager.js",
  "shared/mia-metrics-core/metricsManager.js",
  "docs/master-canon/0073-alert-manager.md"
]);

const AM_DEFAULT_ESCALATE_AFTER_MS = 60000;
const AM_REPAIR_VERBS = Object.freeze([
  "repair",
  "recover",
  "fix",
  "restart",
  "heal"
]);

let activeAlertManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidCategory(category, categories) {
  if (categories) return categories.has(category);
  return AM_CATEGORY_ORDER.includes(category);
}

function isValidSeverity(severity) {
  return AM_SEVERITY_ORDER.includes(severity);
}

function isValidPriority(priority) {
  return AM_PRIORITY_ORDER.includes(priority);
}

function isValidStatus(status) {
  return AM_STATUS_ORDER.includes(status);
}

function priorityIndex(priority) {
  return AM_PRIORITY_ORDER.indexOf(priority);
}

function severityToPriority(severity) {
  return AM_SEVERITY_TO_PRIORITY[severity] || AM_PRIORITY.NORMAL;
}

function nextEscalatedPriority(priority, allowEmergency) {
  const idx = priorityIndex(priority);
  if (idx < 0) return AM_PRIORITY.NORMAL;
  if (priority === AM_PRIORITY.CRITICAL) {
    return allowEmergency ? AM_PRIORITY.EMERGENCY : AM_PRIORITY.CRITICAL;
  }
  if (priority === AM_PRIORITY.EMERGENCY) return AM_PRIORITY.EMERGENCY;
  return AM_PRIORITY_ORDER[idx + 1];
}

function validateStatusTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return { ok: false, error: "invalid_status", from, to };
  }
  const allowed = AM_TRANSITIONS[from] || [];
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
  const category = String(input.category || "").trim();
  const source = String(input.source || "").trim();
  const key =
    input.ruleId != null && String(input.ruleId).trim()
      ? `rule:${String(input.ruleId).trim()}`
      : `msg:${normalizeMessageKey(input.messageKey || input.message || input.reason)}`;
  return `${category}|${source}|${key}`;
}

function compareOp(actual, op, expected) {
  if (typeof actual !== "number" || !Number.isFinite(actual)) return false;
  if (typeof expected !== "number" || !Number.isFinite(expected)) return false;
  switch (op) {
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case "==":
    case "=":
      return actual === expected;
    case "!=":
      return actual !== expected;
    default:
      return false;
  }
}

function createAlertDescriptor(input = {}) {
  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const category = String(input.category || "").trim();
  if (!category) return { ok: false, error: "missing_category" };

  const severity = input.severity || AM_SEVERITY.WARNING;
  if (!isValidSeverity(severity)) {
    return { ok: false, error: "invalid_severity", severity };
  }

  const priority =
    input.priority || severityToPriority(severity);
  if (!isValidPriority(priority)) {
    return { ok: false, error: "invalid_priority", priority };
  }

  const source = String(input.source || "").trim();
  if (!source) return { ok: false, error: "missing_source" };

  const created =
    typeof input.created === "number" && Number.isFinite(input.created)
      ? input.created
      : Date.now();

  const resolved =
    input.resolved == null
      ? null
      : typeof input.resolved === "number" && Number.isFinite(input.resolved)
        ? input.resolved
        : null;

  const status = input.status || AM_STATUS.CREATED;
  if (!isValidStatus(status)) {
    return { ok: false, error: "invalid_status", status };
  }

  const correlationId =
    input.correlationId != null && String(input.correlationId).trim()
      ? String(input.correlationId).trim()
      : makeId("corr");

  const alertId = input.alertId || makeId("alert");

  return {
    ok: true,
    descriptor: Object.freeze({
      alertId,
      runtimeId,
      category,
      severity,
      priority,
      source,
      created,
      resolved,
      status,
      correlationId
    })
  };
}

function createAlertManager(options = {}) {
  if (
    activeAlertManager &&
    activeAlertManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "alert_manager_already_active",
      soleAlertAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || AM_AUTHORIZED_SOURCES);
  const privileged = new Set(options.privilegedSources || AM_PRIVILEGED_SOURCES);

  const categories = new Set(AM_CATEGORY_ORDER);
  if (Array.isArray(options.extraCategories)) {
    for (const c of options.extraCategories) {
      if (c) categories.add(String(c));
    }
  }

  const escalateAfterMs =
    typeof options.escalateAfterMs === "number" && options.escalateAfterMs >= 0
      ? options.escalateAfterMs
      : AM_DEFAULT_ESCALATE_AFTER_MS;

  const allowEmergencyEscalation = options.allowEmergencyEscalation === true;

  const channelMap = {
    ...AM_PRIORITY_CHANNELS,
    ...(options.channelsByPriority || {})
  };

  const notificationBridge =
    options.notificationBridge && typeof options.notificationBridge === "object"
      ? options.notificationBridge
      : Object.freeze({
          deliver(channel, payload) {
            return Object.freeze({
              ok: true,
              channel,
              stub: channel === AM_CHANNEL.EXTERNAL,
              delivered: channel !== AM_CHANNEL.EXTERNAL,
              payload
            });
          }
        });

  const alerts = new Map();
  const openByFingerprint = new Map();
  const rules = new Map();
  const audit = [];
  const reportArchiveStore = [];
  const deliveries = [];

  let escalationCount = 0;
  let dedupHits = 0;
  let resolveDurations = [];

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

  function isPrivileged(meta = {}) {
    const actor = meta.source || meta.actor || "";
    return privileged.has(actor) || meta.privileged === true;
  }

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        alertId: record.alertId || null,
        runtimeId: record.runtimeId || null,
        actor: record.actor || record.source || "system",
        operation: record.operation || record.action || "unknown",
        time: record.time != null ? record.time : Date.now(),
        result: record.result || null,
        immutable: true,
        ...record
      })
    );
  }

  function gate(meta, operation) {
    if (!isAuthorized(meta)) {
      appendAudit({
        operation,
        result: "unauthorized_alert",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "unauthorized_alert" });
    }
    if (!isSourceVerified(meta)) {
      appendAudit({
        operation,
        result: "forged_alert_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "forged_alert_blocked" });
    }
    return null;
  }

  function snapshot(rec) {
    return Object.freeze({
      alertId: rec.alertId,
      runtimeId: rec.runtimeId,
      category: rec.category,
      severity: rec.severity,
      priority: rec.priority,
      source: rec.source,
      created: rec.created,
      resolved: rec.resolved,
      status: rec.status,
      correlationId: rec.correlationId,
      counter: rec.counter,
      fingerprint: rec.fingerprint,
      reason: rec.reason || null,
      message: rec.message || null,
      ruleId: rec.ruleId || null,
      faultId: rec.faultId || null,
      diagnosticsRef: rec.diagnosticsRef || null,
      relatedEvents: Object.freeze([...(rec.relatedEvents || [])]),
      relatedFaults: Object.freeze([...(rec.relatedFaults || [])]),
      recommendedAction: rec.recommendedAction || null,
      escalatedAt: rec.escalatedAt || null,
      acknowledgedAt: rec.acknowledgedAt || null,
      closedAt: rec.closedAt || null,
      lastNotifiedAt: rec.lastNotifiedAt || null,
      deliveries: Object.freeze([...(rec.deliveries || [])])
    });
  }

  function channelsForPriority(priority) {
    const list = channelMap[priority] || AM_PRIORITY_CHANNELS[AM_PRIORITY.NORMAL];
    return Object.freeze([...(list || [])]);
  }

  function transitionStatus(rec, to, meta = {}, nowMs) {
    const check = validateStatusTransition(rec.status, to);
    if (!check.ok) {
      appendAudit({
        alertId: rec.alertId,
        operation: "status_transition",
        result: check.error,
        from: rec.status,
        to,
        actor: meta.source || "system",
        time: nowMs
      });
      return check;
    }
    const from = rec.status;
    rec.status = to;
    appendAudit({
      alertId: rec.alertId,
      runtimeId: rec.runtimeId,
      operation: "status_transition",
      result: "ok",
      from,
      to,
      actor: meta.source || "system",
      time: nowMs
    });
    return { ok: true, from, to };
  }

  function activateIfCreated(rec, meta, nowMs) {
    if (rec.status === AM_STATUS.CREATED) {
      transitionStatus(rec, AM_STATUS.ACTIVE, meta, nowMs);
    }
  }

  function createInternal(input = {}, meta = {}) {
    const blocked = gate(meta, "create");
    if (blocked) return blocked;

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : typeof input.created === "number" && Number.isFinite(input.created)
          ? input.created
          : Date.now();

    const category = String(input.category || AM_CATEGORY.RUNTIME).trim();
    if (!categories.has(category)) {
      return Object.freeze({ ok: false, error: "unknown_category", category });
    }

    const severity = input.severity || AM_SEVERITY.WARNING;
    if (!isValidSeverity(severity)) {
      return Object.freeze({ ok: false, error: "invalid_severity", severity });
    }

    const priority = input.priority || severityToPriority(severity);
    if (!isValidPriority(priority)) {
      return Object.freeze({ ok: false, error: "invalid_priority", priority });
    }

    const source = String(meta.source || input.source || "system").trim();
    const reason = String(input.reason || input.message || "").trim();
    const ruleId = input.ruleId != null ? String(input.ruleId) : null;
    const fp = fingerprintFor({
      category,
      source,
      ruleId,
      message: reason,
      messageKey: input.messageKey
    });

    const existingId = openByFingerprint.get(fp);
    if (existingId && alerts.has(existingId)) {
      const existing = alerts.get(existingId);
      if (AM_OPEN_STATUSES.includes(existing.status)) {
        existing.counter += 1;
        dedupHits += 1;
        appendAudit({
          alertId: existing.alertId,
          operation: "dedup",
          result: "ok",
          counter: existing.counter,
          fingerprint: fp,
          actor: source,
          time: nowMs
        });
        return Object.freeze({
          ok: true,
          dedup: true,
          alertId: existing.alertId,
          counter: existing.counter,
          alert: snapshot(existing)
        });
      }
    }

    const descResult = createAlertDescriptor({
      alertId: input.alertId,
      runtimeId: input.runtimeId || meta.runtimeId || "runtime-unknown",
      category,
      severity,
      priority,
      source,
      created: nowMs,
      resolved: null,
      status: AM_STATUS.CREATED,
      correlationId: input.correlationId
    });

    if (!descResult.ok) {
      return Object.freeze({ ok: false, error: descResult.error });
    }

    const d = descResult.descriptor;
    if (alerts.has(d.alertId)) {
      return Object.freeze({ ok: false, error: "duplicate_alertId" });
    }

    const rec = {
      alertId: d.alertId,
      runtimeId: d.runtimeId,
      category: d.category,
      severity: d.severity,
      priority: d.priority,
      source: d.source,
      created: d.created,
      resolved: null,
      status: d.status,
      correlationId: d.correlationId,
      counter: 1,
      fingerprint: fp,
      reason: reason || null,
      message: reason || null,
      ruleId,
      faultId: input.faultId || null,
      diagnosticsRef: input.diagnosticsRef || null,
      relatedEvents: Array.isArray(input.relatedEvents)
        ? [...input.relatedEvents]
        : [],
      relatedFaults: Array.isArray(input.relatedFaults)
        ? [...input.relatedFaults]
        : input.faultId
          ? [input.faultId]
          : [],
      recommendedAction: input.recommendedAction || null,
      escalatedAt: null,
      acknowledgedAt: null,
      closedAt: null,
      lastNotifiedAt: null,
      deliveries: []
    };

    alerts.set(rec.alertId, rec);
    openByFingerprint.set(fp, rec.alertId);

    appendAudit({
      alertId: rec.alertId,
      runtimeId: rec.runtimeId,
      operation: "create",
      result: "ok",
      actor: source,
      time: nowMs,
      category,
      priority,
      severity
    });

    activateIfCreated(rec, meta, nowMs);

    if (meta.autoNotify !== false) {
      notify(rec.alertId, { ...meta, nowMs, source });
    }

    return Object.freeze({
      ok: true,
      dedup: false,
      alertId: rec.alertId,
      counter: 1,
      alert: snapshot(rec)
    });
  }

  function addRule(ruleInput = {}, meta = {}) {
    const blocked = gate(meta, "addRule");
    if (blocked) return blocked;
    if (!isPrivileged(meta) && meta.authorized !== true) {
      return Object.freeze({ ok: false, error: "unauthorized_alert" });
    }

    const id = String(ruleInput.id || "").trim();
    if (!id) return Object.freeze({ ok: false, error: "missing_rule_id" });

    const category = String(ruleInput.category || "").trim();
    if (!categories.has(category)) {
      return Object.freeze({ ok: false, error: "unknown_category", category });
    }

    const condition = ruleInput.condition;
    if (!condition || typeof condition !== "object") {
      return Object.freeze({ ok: false, error: "missing_condition" });
    }

    const severity = ruleInput.severity || AM_SEVERITY.WARNING;
    if (!isValidSeverity(severity)) {
      return Object.freeze({ ok: false, error: "invalid_severity", severity });
    }

    const priority = ruleInput.priority || severityToPriority(severity);
    if (!isValidPriority(priority)) {
      return Object.freeze({ ok: false, error: "invalid_priority", priority });
    }

    const rule = Object.freeze({
      id,
      category,
      condition: Object.freeze({ ...condition }),
      priority,
      severity,
      message: ruleInput.message || null
    });

    rules.set(id, rule);
    appendAudit({
      operation: "addRule",
      result: "ok",
      actor: meta.source || "admin",
      ruleId: id,
      time: Date.now()
    });

    return Object.freeze({ ok: true, rule });
  }

  function matchRule(rule, event = {}) {
    const cond = rule.condition || {};

    if (cond.healthBelow != null) {
      const health =
        typeof event.health === "number"
          ? event.health
          : typeof event.value === "number"
            ? event.value
            : null;
      if (health == null) return false;
      return health < cond.healthBelow;
    }

    if (cond.faultSeverity != null) {
      const sev = String(event.faultSeverity || event.severity || "").toLowerCase();
      const want = String(cond.faultSeverity).toLowerCase();
      if (!sev) return false;
      const sevIdx = AM_SEVERITY_ORDER.indexOf(sev);
      const wantIdx = AM_SEVERITY_ORDER.indexOf(want);
      if (sevIdx < 0 || wantIdx < 0) return sev === want;
      return sevIdx >= wantIdx;
    }

    if (cond.op != null && cond.value != null) {
      const metricName = cond.metric || null;
      let actual = null;
      if (metricName && event.metrics && typeof event.metrics === "object") {
        actual = event.metrics[metricName];
      }
      if (actual == null && event.name && metricName && event.name === metricName) {
        actual = event.value;
      }
      if (actual == null && event.value != null && (!metricName || !event.name)) {
        actual = event.value;
      }
      if (actual == null && metricName && event[metricName] != null) {
        actual = event[metricName];
      }
      return compareOp(actual, cond.op, cond.value);
    }

    return false;
  }

  function evaluate(event = {}, meta = {}) {
    const blocked = gate(meta, "evaluate");
    if (blocked) return blocked;

    const created = [];
    for (const rule of rules.values()) {
      if (event.category && event.category !== rule.category) {
        // allow cross-match when event has matching metric/health fields
      }
      if (!matchRule(rule, event)) continue;

      const result = createInternal(
        {
          category: rule.category,
          severity: rule.severity,
          priority: rule.priority,
          runtimeId: event.runtimeId || meta.runtimeId || "runtime-unknown",
          reason:
            rule.message ||
            event.message ||
            event.reason ||
            `rule:${rule.id}`,
          ruleId: rule.id,
          messageKey: `rule:${rule.id}`,
          correlationId: event.correlationId,
          diagnosticsRef: event.diagnosticsRef,
          relatedEvents: event.relatedEvents,
          source: meta.source || event.source || "system"
        },
        meta
      );
      if (result.ok) created.push(result);
    }

    return Object.freeze({
      ok: true,
      matched: created.length,
      alerts: Object.freeze(created.map((c) => c.alert || null).filter(Boolean)),
      results: Object.freeze(created)
    });
  }

  function fromMetrics(sample = {}, meta = {}) {
    const blocked = gate(meta, "fromMetrics");
    if (blocked) return blocked;

    const value =
      typeof sample.value === "number"
        ? sample.value
        : typeof sample.metricSample === "number"
          ? sample.metricSample
          : sample.thresholdAlert && typeof sample.thresholdAlert.value === "number"
            ? sample.thresholdAlert.value
            : null;

    const limit =
      typeof sample.limit === "number"
        ? sample.limit
        : typeof sample.threshold === "number"
          ? sample.threshold
          : sample.thresholdAlert && typeof sample.thresholdAlert.threshold === "number"
            ? sample.thresholdAlert.threshold
            : null;

    const op = sample.op || (sample.thresholdAlert && sample.thresholdAlert.op) || ">";

    if (value == null || limit == null) {
      return Object.freeze({ ok: false, error: "missing_metric_threshold" });
    }

    if (!compareOp(value, op, limit)) {
      return Object.freeze({
        ok: true,
        alerted: false,
        reason: "within_limit",
        value,
        limit
      });
    }

    const severity =
      sample.severity ||
      (sample.thresholdAlert && sample.thresholdAlert.severity) ||
      AM_SEVERITY.WARNING;
    const priority = sample.priority || severityToPriority(severity);
    const name = sample.name || (sample.thresholdAlert && sample.thresholdAlert.name) || "metric";

    const result = createInternal(
      {
        category: sample.category || AM_CATEGORY.PERFORMANCE,
        severity,
        priority,
        runtimeId: sample.runtimeId || meta.runtimeId || "runtime-unknown",
        reason: sample.reason || `${name} ${op} ${limit} (value=${value})`,
        messageKey: `metric:${name}:${op}:${limit}`,
        correlationId: sample.correlationId,
        diagnosticsRef: sample.diagnosticsRef,
        source: meta.source || sample.source || "metrics_manager",
        recommendedAction: sample.recommendedAction || "investigate_performance"
      },
      meta
    );

    return Object.freeze({
      ok: result.ok,
      alerted: result.ok === true,
      dedup: result.dedup || false,
      alertId: result.alertId || null,
      alert: result.alert || null,
      error: result.error || null,
      value,
      limit
    });
  }

  function fromFault(fault = {}, meta = {}) {
    const blocked = gate(meta, "fromFault");
    if (blocked) return blocked;

    const severity = String(fault.severity || "").toLowerCase();
    const ruleMatch =
      fault.ruleMatched === true ||
      (Array.isArray(fault.matchedRules) && fault.matchedRules.length > 0);

    const criticalEnough =
      severity === AM_SEVERITY.CRITICAL || severity === AM_SEVERITY.FATAL;

    if (!criticalEnough && !ruleMatch) {
      appendAudit({
        operation: "fromFault",
        result: "skipped_non_critical_fault",
        faultId: fault.faultId || null,
        severity,
        actor: meta.source || "fault_manager",
        time: Date.now()
      });
      return Object.freeze({
        ok: true,
        alerted: false,
        reason: "not_every_fault_creates_alert",
        severity
      });
    }

    const result = createInternal(
      {
        category: fault.category || AM_CATEGORY.FAULT,
        severity:
          severity === AM_SEVERITY.FATAL
            ? AM_SEVERITY.FATAL
            : severity === AM_SEVERITY.CRITICAL
              ? AM_SEVERITY.CRITICAL
              : fault.alertSeverity || AM_SEVERITY.CRITICAL,
        priority: fault.priority || severityToPriority(severity || AM_SEVERITY.CRITICAL),
        runtimeId: fault.runtimeId || meta.runtimeId || "runtime-unknown",
        reason: fault.message || fault.reason || `fault:${fault.faultId || "unknown"}`,
        messageKey: fault.messageKey || `fault:${fault.faultId || fault.fingerprint || "x"}`,
        correlationId: fault.correlationId,
        faultId: fault.faultId || null,
        diagnosticsRef: fault.diagnosticsRef || null,
        relatedFaults: fault.faultId ? [fault.faultId] : [],
        relatedEvents: fault.relatedEvents,
        recommendedAction: fault.recommendedAction || "investigate_fault",
        source: meta.source || fault.source || "fault_manager"
      },
      meta
    );

    return Object.freeze({
      ok: result.ok,
      alerted: result.ok === true,
      dedup: result.dedup || false,
      alertId: result.alertId || null,
      alert: result.alert || null,
      error: result.error || null,
      faultId: fault.faultId || null
    });
  }

  function getAlert(alertId) {
    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });
    return Object.freeze({ ok: true, alert: snapshot(rec) });
  }

  function acknowledge(alertId, meta = {}) {
    const blocked = gate(meta, "acknowledge");
    if (blocked) return blocked;

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    activateIfCreated(rec, meta, nowMs);
    const tr = transitionStatus(rec, AM_STATUS.ACKNOWLEDGED, meta, nowMs);
    if (!tr.ok) return Object.freeze(tr);

    rec.acknowledgedAt = nowMs;
    return Object.freeze({ ok: true, alert: snapshot(rec) });
  }

  function resolve(alertId, meta = {}) {
    const blocked = gate(meta, "resolve");
    if (blocked) return blocked;

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    if (rec.status === AM_STATUS.CREATED) {
      activateIfCreated(rec, meta, nowMs);
    }

    // allow active → resolved or acknowledged → resolved
    if (rec.status === AM_STATUS.ACTIVE || rec.status === AM_STATUS.ACKNOWLEDGED) {
      const tr = transitionStatus(rec, AM_STATUS.RESOLVED, meta, nowMs);
      if (!tr.ok) return Object.freeze(tr);
    } else if (rec.status !== AM_STATUS.RESOLVED) {
      return Object.freeze({
        ok: false,
        error: "invalid_status_transition",
        from: rec.status,
        to: AM_STATUS.RESOLVED
      });
    }

    rec.resolved = nowMs;
    resolveDurations.push(nowMs - rec.created);
    if (openByFingerprint.get(rec.fingerprint) === rec.alertId) {
      openByFingerprint.delete(rec.fingerprint);
    }

    return Object.freeze({ ok: true, alert: snapshot(rec) });
  }

  function close(alertId, meta = {}) {
    const blocked = gate(meta, "close");
    if (blocked) {
      return Object.freeze({
        ok: false,
        error:
          blocked.error === "unauthorized_alert"
            ? "unauthorized_close"
            : blocked.error
      });
    }
    if (!isPrivileged(meta) && meta.authorized !== true) {
      appendAudit({
        operation: "close",
        result: "unauthorized_close",
        alertId: String(alertId || ""),
        actor: meta.source || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "unauthorized_close" });
    }

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    if (rec.status !== AM_STATUS.RESOLVED) {
      // must be resolved first
      if (
        rec.status === AM_STATUS.ACTIVE ||
        rec.status === AM_STATUS.ACKNOWLEDGED ||
        rec.status === AM_STATUS.CREATED
      ) {
        return Object.freeze({
          ok: false,
          error: "invalid_status_transition",
          from: rec.status,
          to: AM_STATUS.CLOSED
        });
      }
    }

    const tr = transitionStatus(rec, AM_STATUS.CLOSED, meta, nowMs);
    if (!tr.ok) return Object.freeze(tr);

    rec.closedAt = nowMs;
    if (rec.resolved == null) rec.resolved = nowMs;
    if (openByFingerprint.get(rec.fingerprint) === rec.alertId) {
      openByFingerprint.delete(rec.fingerprint);
    }

    return Object.freeze({ ok: true, alert: snapshot(rec) });
  }

  function escalate(alertId, meta = {}) {
    const blocked = gate(meta, "escalate");
    if (blocked) return blocked;

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    if (!AM_OPEN_STATUSES.includes(rec.status) && rec.status !== AM_STATUS.CREATED) {
      return Object.freeze({ ok: false, error: "alert_not_open", status: rec.status });
    }

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const next = nextEscalatedPriority(rec.priority, allowEmergencyEscalation);
    if (next === rec.priority) {
      return Object.freeze({
        ok: true,
        escalated: false,
        alert: snapshot(rec),
        reason: "already_at_max_priority"
      });
    }

    const from = rec.priority;
    rec.priority = next;
    rec.escalatedAt = nowMs;
    escalationCount += 1;

    appendAudit({
      alertId: rec.alertId,
      operation: "escalate",
      result: "ok",
      from,
      to: next,
      actor: meta.source || "system",
      time: nowMs
    });

    if (meta.autoNotify !== false) {
      notify(rec.alertId, { ...meta, nowMs, source: meta.source || "system" });
    }

    return Object.freeze({
      ok: true,
      escalated: true,
      from,
      to: next,
      alert: snapshot(rec)
    });
  }

  function escalateUnresolved(nowMsInput, meta = {}) {
    const nowMs =
      typeof nowMsInput === "number" && Number.isFinite(nowMsInput)
        ? nowMsInput
        : typeof meta.nowMs === "number"
          ? meta.nowMs
          : Date.now();

    const blocked = gate({ ...meta, source: meta.source || "system", authorized: meta.authorized !== false }, "escalateUnresolved");
    if (blocked && meta.authorized !== true && !isAuthorized(meta)) {
      // allow system tick with authorized true default for internal
    }

    const authMeta = {
      source: meta.source || "system",
      authorized: meta.authorized !== false,
      nowMs,
      ...meta
    };

    const escalated = [];
    for (const rec of alerts.values()) {
      if (!AM_OPEN_STATUSES.includes(rec.status)) continue;
      const age = nowMs - rec.created;
      if (age < escalateAfterMs) continue;
      const sinceEscalation =
        rec.escalatedAt != null ? nowMs - rec.escalatedAt : age;
      if (rec.escalatedAt != null && sinceEscalation < escalateAfterMs) continue;

      const result = escalate(rec.alertId, authMeta);
      if (result.ok && result.escalated) {
        escalated.push(result);
      }
    }

    return Object.freeze({
      ok: true,
      count: escalated.length,
      escalated: Object.freeze(escalated.map((e) => e.alert)),
      nowMs
    });
  }

  function notify(alertId, meta = {}) {
    const blocked = gate(meta, "notify");
    if (blocked) return blocked;

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : Date.now();

    const channels =
      Array.isArray(meta.channels) && meta.channels.length
        ? meta.channels
        : channelsForPriority(rec.priority);

    const recorded = [];
    for (const channel of channels) {
      let delivery;
      try {
        if (typeof notificationBridge.deliver === "function") {
          delivery = notificationBridge.deliver(channel, {
            alertId: rec.alertId,
            priority: rec.priority,
            category: rec.category,
            severity: rec.severity,
            reason: rec.reason,
            status: rec.status
          });
        } else {
          delivery = {
            ok: true,
            channel,
            stub: channel === AM_CHANNEL.EXTERNAL,
            delivered: channel !== AM_CHANNEL.EXTERNAL
          };
        }
      } catch (err) {
        delivery = {
          ok: false,
          channel,
          error: err && err.message ? err.message : "deliver_failed"
        };
      }

      const entry = Object.freeze({
        channel,
        at: nowMs,
        ok: delivery && delivery.ok !== false,
        stub: !!(delivery && delivery.stub),
        delivered: !!(delivery && delivery.delivered !== false && delivery.ok !== false)
      });
      rec.deliveries.push(entry);
      deliveries.push(
        Object.freeze({
          alertId: rec.alertId,
          ...entry
        })
      );
      recorded.push(entry);
    }

    rec.lastNotifiedAt = nowMs;
    appendAudit({
      alertId: rec.alertId,
      operation: "notify",
      result: "ok",
      channels: Object.freeze([...channels]),
      actor: meta.source || "system",
      time: nowMs
    });

    return Object.freeze({
      ok: true,
      alertId: rec.alertId,
      channels: Object.freeze([...channels]),
      deliveries: Object.freeze(recorded)
    });
  }

  function createReport(alertId, meta = {}) {
    const blocked = gate(meta, "createReport");
    if (blocked) return blocked;

    const rec = alerts.get(String(alertId || ""));
    if (!rec) return Object.freeze({ ok: false, error: "alert_not_found" });

    const report = Object.freeze({
      alertId: rec.alertId,
      reason: rec.reason || rec.message || null,
      created: rec.created,
      resolved: rec.resolved,
      source: rec.source,
      priority: rec.priority,
      relatedFaults: Object.freeze([...(rec.relatedFaults || [])]),
      recommendedAction: rec.recommendedAction || null,
      immutable: true,
      archivedAt: Date.now()
    });

    reportArchiveStore.push(report);
    appendAudit({
      alertId: rec.alertId,
      operation: "createReport",
      result: "ok",
      actor: meta.source || "system",
      time: Date.now()
    });

    return Object.freeze({ ok: true, report });
  }

  function forDiagnostics(query = {}, meta = {}) {
    const blocked = gate(meta, "forDiagnostics");
    if (blocked) return blocked;

    const alertId = query.alertId || query.id;
    if (alertId) {
      const got = getAlert(alertId);
      if (!got.ok) return got;
      return Object.freeze({
        ok: true,
        readOnly: true,
        alert: got.alert,
        diagnosticsRef: got.alert.diagnosticsRef,
        relatedEvents: got.alert.relatedEvents
      });
    }

    const related = [];
    for (const rec of alerts.values()) {
      if (
        query.correlationId &&
        rec.correlationId === query.correlationId
      ) {
        related.push(snapshot(rec));
      } else if (
        query.diagnosticsRef &&
        rec.diagnosticsRef === query.diagnosticsRef
      ) {
        related.push(snapshot(rec));
      } else if (
        query.faultId &&
        (rec.faultId === query.faultId ||
          (rec.relatedFaults || []).includes(query.faultId))
      ) {
        related.push(snapshot(rec));
      }
    }

    return Object.freeze({
      ok: true,
      readOnly: true,
      alerts: Object.freeze(related)
    });
  }

  function registerCategory(name, meta = {}) {
    if (!isAuthorized(meta) || !isPrivileged(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_alert" });
    }
    if (meta.forged === true) {
      return Object.freeze({ ok: false, error: "forged_alert_blocked" });
    }
    const cat = String(name || "").trim();
    if (!cat) return Object.freeze({ ok: false, error: "missing_category" });
    categories.add(cat);
    appendAudit({
      operation: "registerCategory",
      result: "ok",
      actor: meta.source || "admin",
      category: cat,
      time: Date.now()
    });
    return Object.freeze({
      ok: true,
      category: cat,
      categories: Object.freeze([...categories])
    });
  }

  function activeCount() {
    let n = 0;
    for (const rec of alerts.values()) {
      if (AM_OPEN_STATUSES.includes(rec.status)) n += 1;
    }
    return n;
  }

  function criticalCount() {
    let n = 0;
    for (const rec of alerts.values()) {
      if (
        AM_OPEN_STATUSES.includes(rec.status) &&
        (rec.priority === AM_PRIORITY.CRITICAL ||
          rec.priority === AM_PRIORITY.EMERGENCY ||
          rec.severity === AM_SEVERITY.CRITICAL ||
          rec.severity === AM_SEVERITY.FATAL)
      ) {
        n += 1;
      }
    }
    return n;
  }

  function averageResolveMs() {
    if (!resolveDurations.length) return 0;
    const sum = resolveDurations.reduce((a, b) => a + b, 0);
    return sum / resolveDurations.length;
  }

  function metrics() {
    return Object.freeze({
      activeCount: activeCount(),
      criticalCount: criticalCount(),
      averageResolveMs: averageResolveMs(),
      escalationCount,
      dedupHits,
      alertCount: alerts.size,
      ruleCount: rules.size,
      reportCount: reportArchiveStore.length,
      repairsDirectly: false
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleAlertAuthority: true,
      repairsDirectly: false,
      centralAlertIngress: true,
      historyImmutable: true,
      activeCount: activeCount(),
      categories: Object.freeze([...categories]),
      components: AM_COMPONENT_ORDER,
      priorities: AM_PRIORITY_ORDER,
      statuses: AM_STATUS_ORDER,
      escalateAfterMs
    });
  }

  function rejectRepair(op) {
    appendAudit({
      operation: op,
      result: "repairs_not_supported",
      actor: "alert_manager",
      time: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "repairs_not_supported",
      operation: op,
      repairsDirectly: false
    });
  }

  const manager = Object.freeze({
    ok: true,
    addRule,
    evaluate,
    fromMetrics,
    fromFault,
    acknowledge,
    resolve,
    close,
    escalate,
    escalateUnresolved,
    notify,
    getAlert,
    createReport,
    forDiagnostics,
    registerCategory,
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...reportArchiveStore]);
    },
    status,
    create: createInternal,
    isActive() {
      return true;
    },
    repair() {
      return rejectRepair("repair");
    },
    recover() {
      return rejectRepair("recover");
    },
    fix() {
      return rejectRepair("fix");
    },
    restart() {
      return rejectRepair("restart");
    },
    heal() {
      return rejectRepair("heal");
    }
  });

  activeAlertManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearAlertSingletonForTest() {
  activeAlertManager = null;
}

module.exports = {
  AM_COMPONENT,
  AM_COMPONENT_ORDER,
  AM_CATEGORY,
  AM_CATEGORY_ORDER,
  AM_PRIORITY,
  AM_PRIORITY_ORDER,
  AM_SEVERITY,
  AM_SEVERITY_ORDER,
  AM_SEVERITY_TO_PRIORITY,
  AM_STATUS,
  AM_STATUS_ORDER,
  AM_TRANSITIONS,
  AM_CHANNEL,
  AM_CHANNEL_ORDER,
  AM_PRIORITY_CHANNELS,
  AM_DESCRIPTOR_FIELDS,
  AM_AUTHORIZED_SOURCES,
  AM_FLAGS,
  AM_PUBLIC_API,
  AM_RUNTIME_ANCHORS,
  AM_REPAIR_VERBS,
  createAlertDescriptor,
  validateStatusTransition,
  fingerprintFor,
  severityToPriority,
  createAlertManager,
  clearAlertSingletonForTest
};
