"use strict";

/**
 * Master Canon 0070 — Diagnostics Manager.
 * Kernel Layer 0 sole read-only authority for diagnostic collection, analysis, and reports.
 * Never mutates system behavior; never computes Health (reads from health bridge only).
 */

const crypto = require("crypto");

const DM_COMPONENT = Object.freeze({
  DIAGNOSTICS_MANAGER: "diagnostics_manager",
  SOURCE_COLLECTOR: "source_collector",
  DESCRIPTOR_FACTORY: "descriptor_factory",
  SNAPSHOT_ENGINE: "snapshot_engine",
  TREND_ANALYZER: "trend_analyzer",
  ROOT_CAUSE_ANALYZER: "root_cause_analyzer",
  QUERY_ENGINE: "query_engine",
  REPORT_ENGINE: "report_engine",
  HEALTH_READER: "health_reader",
  FAULT_READER: "fault_reader",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const DM_COMPONENT_ORDER = Object.freeze(Object.values(DM_COMPONENT));

const DM_SOURCES = Object.freeze({
  RUNTIME_MANAGER: "runtime_manager",
  HEALTH_MANAGER: "health_manager",
  FAULT_MANAGER: "fault_manager",
  RECOVERY_MANAGER: "recovery_manager",
  WATCHDOG_ENGINE: "watchdog_engine",
  EVENT_BUS: "event_bus",
  RESOURCE_MANAGER: "resource_manager",
  MONITORING_SYSTEM: "monitoring_system"
});

const DM_SOURCE_ORDER = Object.freeze(Object.values(DM_SOURCES));

const DM_DESCRIPTOR_FIELDS = Object.freeze([
  "diagnosticId",
  "runtimeId",
  "component",
  "category",
  "timestamp",
  "severity",
  "source",
  "correlationId"
]);

const DM_CATEGORY = Object.freeze({
  RUNTIME: "runtime",
  PERFORMANCE: "performance",
  MEMORY: "memory",
  NETWORK: "network",
  STORAGE: "storage",
  AI: "ai",
  BATTLE: "battle",
  OBS: "obs",
  PLATFORM_CONNECTORS: "platform_connectors",
  SECURITY: "security"
});

const DM_CATEGORY_ORDER = Object.freeze(Object.values(DM_CATEGORY));

const DM_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
  FATAL: "fatal"
});

const DM_SEVERITY_ORDER = Object.freeze([
  DM_SEVERITY.INFO,
  DM_SEVERITY.WARNING,
  DM_SEVERITY.ERROR,
  DM_SEVERITY.CRITICAL,
  DM_SEVERITY.FATAL
]);

const DM_QUERY_TYPE = Object.freeze({
  RUNTIME: "runtime",
  FAULTS: "faults",
  MEMORY: "memory",
  BATTLE: "battle",
  AI: "ai",
  PLUGINS: "plugins"
});

const DM_QUERY_TYPE_ORDER = Object.freeze(Object.values(DM_QUERY_TYPE));

const DM_QUERY_ALIASES = Object.freeze({
  "show runtime": DM_QUERY_TYPE.RUNTIME,
  show_runtime: DM_QUERY_TYPE.RUNTIME,
  runtime: DM_QUERY_TYPE.RUNTIME,
  "show faults": DM_QUERY_TYPE.FAULTS,
  show_faults: DM_QUERY_TYPE.FAULTS,
  faults: DM_QUERY_TYPE.FAULTS,
  "show memory": DM_QUERY_TYPE.MEMORY,
  show_memory: DM_QUERY_TYPE.MEMORY,
  memory: DM_QUERY_TYPE.MEMORY,
  "show battle": DM_QUERY_TYPE.BATTLE,
  show_battle: DM_QUERY_TYPE.BATTLE,
  battle: DM_QUERY_TYPE.BATTLE,
  "show ai": DM_QUERY_TYPE.AI,
  show_ai: DM_QUERY_TYPE.AI,
  ai: DM_QUERY_TYPE.AI,
  "show plugins": DM_QUERY_TYPE.PLUGINS,
  show_plugins: DM_QUERY_TYPE.PLUGINS,
  plugins: DM_QUERY_TYPE.PLUGINS
});

const DM_MUTATING_VERBS = Object.freeze([
  "mutate",
  "write",
  "delete",
  "repair",
  "set",
  "update",
  "fix",
  "restart",
  "clear"
]);

const DM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "recovery_manager",
  "recovery-manager",
  "health_manager",
  "health-manager",
  "ai",
  "monitoring",
  "system",
  "diagnostics_manager",
  "diagnostics-manager"
]);

const DM_PRIVILEGED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "diagnostics_manager",
  "diagnostics-manager",
  "system"
]);

const DM_FLAGS = Object.freeze({
  soleDiagnosticsAuthority: true,
  readOnly: true,
  neverMutatesSystem: true,
  neverComputesHealth: true
});

const DM_PUBLIC_API = Object.freeze([
  "ingest",
  "snapshot",
  "analyzeTrend",
  "analyzeRootCause",
  "query",
  "createReport",
  "exportReport",
  "forRecovery",
  "forAi",
  "metrics",
  "auditTrail",
  "reportArchive",
  "registerCategory",
  "status"
]);

const DM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-diagnostics-core/diagnosticsManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-fault-core/faultManager.js",
  "shared/mia-recovery-core/recoveryManager.js",
  "shared/mia-watchdog-core/watchdogEngine.js",
  "shared/mia-shutdown-core/shutdownManager.js",
  "docs/master-canon/0070-diagnostics-manager.md"
]);

let activeDiagnosticsManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidSeverity(severity) {
  return DM_SEVERITY_ORDER.includes(severity);
}

function createDiagnosticDescriptor(input = {}) {
  const severity = input.severity || DM_SEVERITY.INFO;
  if (!isValidSeverity(severity)) {
    return { ok: false, error: "invalid_severity", severity };
  }

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const component = String(input.component || "").trim();
  if (!component) return { ok: false, error: "missing_component" };

  const category = String(input.category || "").trim();
  if (!category) return { ok: false, error: "missing_category" };

  const source = String(input.source || "").trim();
  if (!source) return { ok: false, error: "missing_source" };

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const diagnosticId = input.diagnosticId || makeId("dm");
  const correlationId =
    input.correlationId == null || input.correlationId === ""
      ? diagnosticId
      : String(input.correlationId);

  return {
    ok: true,
    descriptor: Object.freeze({
      diagnosticId,
      runtimeId,
      component,
      category,
      timestamp,
      severity,
      source,
      correlationId
    })
  };
}

function normalizeQueryType(type) {
  if (type == null) return null;
  const key = String(type)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const compact = key.replace(/\s+/g, "_");
  if (DM_QUERY_ALIASES[key]) return DM_QUERY_ALIASES[key];
  if (DM_QUERY_ALIASES[compact]) return DM_QUERY_ALIASES[compact];
  if (DM_QUERY_TYPE_ORDER.includes(key)) return key;
  if (DM_QUERY_TYPE_ORDER.includes(compact)) return compact;
  return null;
}

function isMutatingQueryVerb(type) {
  const raw = String(type || "")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  for (const verb of DM_MUTATING_VERBS) {
    if (raw === verb || raw.startsWith(`${verb} `) || raw.includes(`_${verb}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Pure / deterministic trend analysis.
 * Detects progressive degradation (e.g. CPU 35→52→68→91).
 */
function analyzeTrend(metric, series = [], options = {}) {
  const name = String(metric || "metric");
  const values = Array.isArray(series)
    ? series
        .map((v) => {
          if (typeof v === "number" && Number.isFinite(v)) return v;
          if (v && typeof v.value === "number" && Number.isFinite(v.value)) {
            return v.value;
          }
          return null;
        })
        .filter((v) => v != null)
    : [];

  if (values.length < 2) {
    return Object.freeze({
      ok: true,
      metric: name,
      direction: "stable",
      slope: 0,
      delta: 0,
      samples: values.length,
      values: Object.freeze([...values]),
      degrading: false,
      progressive: false
    });
  }

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const slope = delta / (values.length - 1);

  let progressiveUp = true;
  let progressiveDown = true;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] < values[i - 1]) progressiveUp = false;
    if (values[i] > values[i - 1]) progressiveDown = false;
  }

  const threshold =
    typeof options.degradeThreshold === "number"
      ? options.degradeThreshold
      : 0;

  let direction = "stable";
  if (slope > threshold && (progressiveUp || delta > 0)) {
    direction = options.higherIsWorse === false ? "improving" : "degrading";
  } else if (slope < -threshold && (progressiveDown || delta < 0)) {
    direction = options.higherIsWorse === false ? "degrading" : "improving";
  }

  // Default: higher metric = worse (CPU, memory, latency)
  if (options.higherIsWorse !== false) {
    if (progressiveUp && delta > 0) direction = "degrading";
    else if (progressiveDown && delta < 0) direction = "improving";
    else if (Math.abs(delta) <= threshold) direction = "stable";
    else direction = delta > 0 ? "degrading" : "improving";
  }

  return Object.freeze({
    ok: true,
    metric: name,
    direction,
    slope,
    delta,
    samples: values.length,
    values: Object.freeze([...values]),
    degrading: direction === "degrading",
    progressive:
      (direction === "degrading" && progressiveUp) ||
      (direction === "improving" && progressiveDown)
  });
}

/**
 * Pure root-cause chain analysis via correlationId / event order.
 */
function analyzeRootCause(eventsOrId, options = {}) {
  let events = [];
  let correlationId = null;

  if (typeof eventsOrId === "string") {
    correlationId = eventsOrId;
    events = Array.isArray(options.events) ? options.events : [];
  } else if (Array.isArray(eventsOrId)) {
    events = eventsOrId;
  } else if (eventsOrId && typeof eventsOrId === "object") {
    correlationId = eventsOrId.correlationId || null;
    events = Array.isArray(eventsOrId.events)
      ? eventsOrId.events
      : Array.isArray(options.events)
        ? options.events
        : [];
  }

  let chain = events.map((e, idx) => {
    if (typeof e === "string") {
      return Object.freeze({
        order: idx,
        name: e,
        correlationId: correlationId || null
      });
    }
    return Object.freeze({
      order: idx,
      name: e.name || e.component || e.message || e.event || `event_${idx}`,
      component: e.component || null,
      message: e.message || null,
      timestamp: e.timestamp != null ? e.timestamp : null,
      correlationId: e.correlationId || correlationId || null,
      severity: e.severity || null
    });
  });

  if (correlationId) {
    const linked = chain.filter(
      (e) => !e.correlationId || e.correlationId === correlationId
    );
    if (linked.length) chain = linked;
  }

  // Sort by timestamp when available
  const sortable = chain.every((e) => typeof e.timestamp === "number");
  if (sortable) {
    chain = [...chain].sort((a, b) => a.timestamp - b.timestamp);
    chain = chain.map((e, idx) => Object.freeze({ ...e, order: idx }));
  }

  const probableRoot = chain.length ? chain[0] : null;

  return Object.freeze({
    ok: true,
    correlationId: correlationId || (probableRoot && probableRoot.correlationId) || null,
    chain: Object.freeze(chain.map((c) => Object.freeze({ ...c }))),
    probableRoot: probableRoot
      ? Object.freeze({ ...probableRoot })
      : null,
    readOnly: true
  });
}

function safeCall(fn, fallback) {
  if (typeof fn !== "function") return fallback;
  try {
    const result = fn();
    return result == null ? fallback : result;
  } catch (_err) {
    return fallback;
  }
}

function emptyContribution(source) {
  return Object.freeze({
    source,
    ok: true,
    empty: true,
    data: null
  });
}

function createDiagnosticsManager(options = {}) {
  if (
    activeDiagnosticsManager &&
    activeDiagnosticsManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "diagnostics_manager_already_active",
      soleDiagnosticsAuthority: true
    });
  }

  const authorized = new Set(
    options.authorizedSources || DM_AUTHORIZED_SOURCES
  );
  const privileged = new Set(
    options.privilegedSources || DM_PRIVILEGED_SOURCES
  );

  const sourceBridges =
    options.sourceBridges && typeof options.sourceBridges === "object"
      ? options.sourceBridges
      : {};

  const healthBridge =
    options.healthBridge ||
    sourceBridges[DM_SOURCES.HEALTH_MANAGER] ||
    null;
  const faultBridge =
    options.faultBridge ||
    sourceBridges[DM_SOURCES.FAULT_MANAGER] ||
    null;
  const recoveryBridge =
    options.recoveryBridge ||
    sourceBridges[DM_SOURCES.RECOVERY_MANAGER] ||
    null;
  const runtimeBridge =
    options.runtimeBridge ||
    sourceBridges[DM_SOURCES.RUNTIME_MANAGER] ||
    null;
  const resourceBridge =
    options.resourceBridge ||
    sourceBridges[DM_SOURCES.RESOURCE_MANAGER] ||
    null;

  const categories = new Set(DM_CATEGORY_ORDER);
  if (Array.isArray(options.extraCategories)) {
    for (const c of options.extraCategories) {
      if (c) categories.add(String(c));
    }
  }

  const records = [];
  const history = [];
  const audit = [];
  const archive = [];
  const performanceHistory = [];

  let reportCount = 0;
  let snapshotCount = 0;
  let queryCount = 0;
  let findingsCount = 0;
  let totalAnalysisMs = 0;
  let analysisOps = 0;

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
        diagnosticId: record.diagnosticId || null,
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

  function rejectMutation(op) {
    appendAudit({
      operation: op,
      result: "rejected_mutation",
      actor: "diagnostics_manager"
    });
    return Object.freeze({
      ok: false,
      error: "diagnostics_readonly",
      operation: op,
      readOnly: true,
      neverMutatesSystem: true
    });
  }

  function collectFromSource(sourceName) {
    const bridge = sourceBridges[sourceName];
    if (!bridge) return emptyContribution(sourceName);

    if (typeof bridge.collect === "function") {
      return Object.freeze({
        source: sourceName,
        ok: true,
        empty: false,
        data: safeCall(() => bridge.collect(), null)
      });
    }
    if (typeof bridge.read === "function") {
      return Object.freeze({
        source: sourceName,
        ok: true,
        empty: false,
        data: safeCall(() => bridge.read(), null)
      });
    }
    if (typeof bridge.getState === "function") {
      return Object.freeze({
        source: sourceName,
        ok: true,
        empty: false,
        data: safeCall(() => bridge.getState(), null)
      });
    }
    // Plain object contribution
    if (typeof bridge === "object") {
      const { collect, read, getState, ...rest } = bridge;
      return Object.freeze({
        source: sourceName,
        ok: true,
        empty: false,
        data: Object.freeze({ ...rest })
      });
    }
    return emptyContribution(sourceName);
  }

  function collectAllSources() {
    const out = {};
    for (const src of DM_SOURCE_ORDER) {
      out[src] = collectFromSource(src);
    }
    return Object.freeze(out);
  }

  function readHealthScore(runtimeId) {
    if (!healthBridge) return null;
    if (typeof healthBridge.healthScore === "function") {
      return safeCall(() => healthBridge.healthScore(runtimeId), null);
    }
    if (typeof healthBridge.getHealthScore === "function") {
      return safeCall(() => healthBridge.getHealthScore(runtimeId), null);
    }
    if (typeof healthBridge.score === "number") return healthBridge.score;
    if (healthBridge.healthScore != null) return healthBridge.healthScore;
    return null;
  }

  function readHealthHistory() {
    if (!healthBridge) return Object.freeze([]);
    if (typeof healthBridge.history === "function") {
      return Object.freeze([
        ...(safeCall(() => healthBridge.history(), []) || [])
      ]);
    }
    if (Array.isArray(healthBridge.history)) {
      return Object.freeze([...healthBridge.history]);
    }
    return Object.freeze([]);
  }

  function readHealthTrends() {
    if (!healthBridge) return Object.freeze([]);
    if (typeof healthBridge.trends === "function") {
      return Object.freeze([
        ...(safeCall(() => healthBridge.trends(), []) || [])
      ]);
    }
    if (Array.isArray(healthBridge.trends)) {
      return Object.freeze([...healthBridge.trends]);
    }
    return Object.freeze([]);
  }

  function readHealthDegradations() {
    if (!healthBridge) return Object.freeze([]);
    if (typeof healthBridge.degradations === "function") {
      return Object.freeze([
        ...(safeCall(() => healthBridge.degradations(), []) || [])
      ]);
    }
    if (Array.isArray(healthBridge.degradations)) {
      return Object.freeze([...healthBridge.degradations]);
    }
    return Object.freeze([]);
  }

  function readFaultHistory(runtimeId) {
    if (!faultBridge) return Object.freeze([]);
    if (typeof faultBridge.faultHistory === "function") {
      return Object.freeze([
        ...(safeCall(() => faultBridge.faultHistory(runtimeId), []) || [])
      ]);
    }
    if (typeof faultBridge.history === "function") {
      return Object.freeze([
        ...(safeCall(() => faultBridge.history(runtimeId), []) || [])
      ]);
    }
    if (Array.isArray(faultBridge.history)) {
      return Object.freeze([...faultBridge.history]);
    }
    return Object.freeze([]);
  }

  function readRuntimeState(runtimeId) {
    if (!runtimeBridge) return null;
    if (typeof runtimeBridge.state === "function") {
      return safeCall(() => runtimeBridge.state(runtimeId), null);
    }
    if (runtimeBridge.state != null) return runtimeBridge.state;
    if (typeof runtimeBridge.getState === "function") {
      return safeCall(() => runtimeBridge.getState(runtimeId), null);
    }
    return null;
  }

  function readActiveServices() {
    if (!runtimeBridge) return Object.freeze([]);
    if (typeof runtimeBridge.activeServices === "function") {
      return Object.freeze([
        ...(safeCall(() => runtimeBridge.activeServices(), []) || [])
      ]);
    }
    if (Array.isArray(runtimeBridge.activeServices)) {
      return Object.freeze([...runtimeBridge.activeServices]);
    }
    return Object.freeze([]);
  }

  function readResources() {
    const defaults = { cpu: null, ram: null, gpu: null };
    if (!resourceBridge) return Object.freeze({ ...defaults });
    if (typeof resourceBridge.usage === "function") {
      const u = safeCall(() => resourceBridge.usage(), {}) || {};
      return Object.freeze({
        cpu: u.cpu != null ? u.cpu : null,
        ram: u.ram != null ? u.ram : null,
        gpu: u.gpu != null ? u.gpu : null
      });
    }
    return Object.freeze({
      cpu: resourceBridge.cpu != null ? resourceBridge.cpu : null,
      ram: resourceBridge.ram != null ? resourceBridge.ram : null,
      gpu: resourceBridge.gpu != null ? resourceBridge.gpu : null
    });
  }

  function readActiveBattle() {
    const contrib = collectFromSource(DM_SOURCES.RUNTIME_MANAGER);
    if (contrib.data && contrib.data.activeBattle != null) {
      return contrib.data.activeBattle;
    }
    if (runtimeBridge && runtimeBridge.activeBattle != null) {
      return runtimeBridge.activeBattle;
    }
    if (runtimeBridge && typeof runtimeBridge.activeBattle === "function") {
      return safeCall(() => runtimeBridge.activeBattle(), null);
    }
    return null;
  }

  function readConnectedPlatforms() {
    if (runtimeBridge && typeof runtimeBridge.connectedPlatforms === "function") {
      return Object.freeze([
        ...(safeCall(() => runtimeBridge.connectedPlatforms(), []) || [])
      ]);
    }
    if (runtimeBridge && Array.isArray(runtimeBridge.connectedPlatforms)) {
      return Object.freeze([...runtimeBridge.connectedPlatforms]);
    }
    return Object.freeze([]);
  }

  function redactSensitive(obj, meta) {
    if (isPrivileged(meta)) return obj;
    if (obj == null || typeof obj !== "object") return obj;
    const SENSITIVE = /secret|password|token|key|credential/i;
    function walk(value) {
      if (Array.isArray(value)) return value.map(walk);
      if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
          out[k] = SENSITIVE.test(k) ? "[REDACTED]" : walk(v);
        }
        return out;
      }
      return value;
    }
    return walk(obj);
  }

  function ingest(input = {}, meta = {}) {
    if (meta.forged === true) {
      appendAudit({
        operation: "ingest",
        result: "forged_blocked",
        actor: meta.source
      });
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      appendAudit({
        operation: "ingest",
        result: "unauthorized",
        actor: meta.source
      });
      return { ok: false, error: "unauthorized_diagnostics" };
    }

    const created = createDiagnosticDescriptor({
      ...input,
      source: input.source || meta.source || "system"
    });
    if (!created.ok) return created;

    if (!categories.has(created.descriptor.category)) {
      return { ok: false, error: "unknown_category", category: created.descriptor.category };
    }

    const record = Object.freeze({
      ...created.descriptor,
      payload: input.payload != null ? Object.freeze({ ...input.payload }) : null,
      diagnosticOnly: true,
      immutable: true
    });
    records.push(record);
    history.push(record);

    appendAudit({
      diagnosticId: record.diagnosticId,
      runtimeId: record.runtimeId,
      actor: meta.source || meta.actor || "system",
      operation: "ingest",
      time: record.timestamp,
      result: "ok"
    });

    return Object.freeze({
      ok: true,
      diagnosticId: record.diagnosticId,
      record,
      readOnly: true
    });
  }

  function snapshot(runtimeIdOrMeta, maybeMeta) {
    let runtimeId = null;
    let meta = {};
    if (typeof runtimeIdOrMeta === "string" || runtimeIdOrMeta == null) {
      runtimeId = runtimeIdOrMeta || null;
      meta = maybeMeta || {};
    } else if (typeof runtimeIdOrMeta === "object") {
      // snapshot(meta) or snapshot({ runtimeId }, meta)
      if (
        runtimeIdOrMeta.runtimeId != null ||
        runtimeIdOrMeta.authorized != null ||
        runtimeIdOrMeta.source != null
      ) {
        if (
          maybeMeta == null &&
          (runtimeIdOrMeta.authorized != null ||
            runtimeIdOrMeta.source != null ||
            runtimeIdOrMeta.forged != null)
        ) {
          meta = runtimeIdOrMeta;
          runtimeId = runtimeIdOrMeta.runtimeId || null;
        } else {
          runtimeId = runtimeIdOrMeta.runtimeId || null;
          meta = maybeMeta || {};
        }
      } else {
        meta = maybeMeta || runtimeIdOrMeta;
      }
    }

    if (meta.forged === true) {
      appendAudit({ operation: "snapshot", result: "forged_blocked" });
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      appendAudit({
        operation: "snapshot",
        result: "unauthorized",
        actor: meta.source
      });
      return { ok: false, error: "unauthorized_diagnostics" };
    }

    const started = Date.now();
    const rid =
      runtimeId ||
      (meta.runtimeId != null ? String(meta.runtimeId) : null) ||
      "default";

    const resources = readResources();
    const healthScore = readHealthScore(rid);
    const snap = Object.freeze({
      diagnosticId: makeId("dm-snap"),
      runtimeId: rid,
      time: meta.nowMs != null ? meta.nowMs : Date.now(),
      runtimeState: readRuntimeState(rid),
      activeServices: readActiveServices(),
      healthScore,
      faults: readFaultHistory(rid),
      cpu: resources.cpu,
      ram: resources.ram,
      gpu: resources.gpu,
      activeBattle: readActiveBattle(),
      connectedPlatforms: readConnectedPlatforms(),
      sources: collectAllSources(),
      diagnosticOnly: true,
      neverComputesHealth: true,
      readOnly: true
    });

    snapshotCount += 1;
    const elapsed = Date.now() - started;
    totalAnalysisMs += elapsed;
    analysisOps += 1;

    history.push(
      Object.freeze({
        type: "snapshot",
        diagnosticId: snap.diagnosticId,
        runtimeId: rid,
        healthScore,
        time: snap.time
      })
    );

    if (resources.cpu != null) {
      performanceHistory.push(
        Object.freeze({ metric: "cpu", value: resources.cpu, at: snap.time })
      );
    }

    appendAudit({
      diagnosticId: snap.diagnosticId,
      runtimeId: rid,
      actor: meta.source || meta.actor || "system",
      operation: "snapshot",
      time: snap.time,
      result: "ok"
    });

    return Object.freeze({
      ok: true,
      snapshot: snap,
      diagnosticOnly: true
    });
  }

  function analyzeTrendOp(metric, seriesOrOpts, maybeOpts) {
    const started = Date.now();
    let series = seriesOrOpts;
    let opts = maybeOpts || {};
    if (
      seriesOrOpts &&
      typeof seriesOrOpts === "object" &&
      !Array.isArray(seriesOrOpts) &&
      maybeOpts == null
    ) {
      opts = seriesOrOpts;
      series = opts.series;
    }

    if (!Array.isArray(series)) {
      const fromHistory = performanceHistory
        .filter((p) => p.metric === metric)
        .map((p) => p.value);
      series = fromHistory;
      if (opts.fromHistory === false) series = [];
    }

    const result = analyzeTrend(metric, series, opts);
    const elapsed = Date.now() - started;
    totalAnalysisMs += elapsed;
    analysisOps += 1;

    appendAudit({
      operation: "analyzeTrend",
      actor: (opts.meta && (opts.meta.source || opts.meta.actor)) || "system",
      result: result.direction,
      time: Date.now()
    });

    return result;
  }

  function analyzeRootCauseOp(eventsOrId, options = {}) {
    const started = Date.now();
    let opts = options || {};
    if (
      typeof eventsOrId === "string" &&
      (!opts.events || !opts.events.length)
    ) {
      const linked = records.filter((r) => r.correlationId === eventsOrId);
      opts = {
        ...opts,
        events: linked.map((r) => ({
          name: r.component,
          component: r.component,
          message: r.category,
          timestamp: r.timestamp,
          correlationId: r.correlationId,
          severity: r.severity
        }))
      };
    }

    const result = analyzeRootCause(eventsOrId, opts);
    const elapsed = Date.now() - started;
    totalAnalysisMs += elapsed;
    analysisOps += 1;

    appendAudit({
      operation: "analyzeRootCause",
      actor: (opts.meta && (opts.meta.source || opts.meta.actor)) || "system",
      result: result.probableRoot ? result.probableRoot.name : "none",
      time: Date.now(),
      correlationId: result.correlationId
    });

    return result;
  }

  function query(type, options = {}, meta = {}) {
    let opts = options;
    let m = meta;
    if (
      options &&
      typeof options === "object" &&
      (options.authorized != null ||
        options.source != null ||
        options.forged != null) &&
      meta == null
    ) {
      m = options;
      opts = {};
    }
    // query(type, meta) when second arg looks like meta
    if (
      options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      (options.authorized != null || options.source != null) &&
      Object.keys(meta || {}).length === 0 &&
      options.runtimeId == null &&
      options.limit == null
    ) {
      // keep as options if it has query opts; else treat as meta
      const queryKeys = ["runtimeId", "limit", "filter", "category"];
      const hasQueryOpts = queryKeys.some((k) => options[k] != null);
      if (!hasQueryOpts) {
        m = options;
        opts = {};
      }
    }

    if (m.forged === true) {
      appendAudit({ operation: "query", result: "forged_blocked" });
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(m) || !isSourceVerified(m)) {
      appendAudit({
        operation: "query",
        result: "unauthorized",
        actor: m.source
      });
      return { ok: false, error: "unauthorized_diagnostics" };
    }

    if (isMutatingQueryVerb(type)) {
      appendAudit({
        operation: "query",
        result: "mutating_query_blocked",
        actor: m.source
      });
      return {
        ok: false,
        error: "mutating_query_blocked",
        readOnly: true
      };
    }

    const normalized = normalizeQueryType(type);
    if (!normalized) {
      appendAudit({
        operation: "query",
        result: "unknown_query",
        actor: m.source
      });
      return { ok: false, error: "unknown_query_type", type };
    }

    queryCount += 1;
    const rid = opts.runtimeId || m.runtimeId || null;
    let data = null;

    switch (normalized) {
      case DM_QUERY_TYPE.RUNTIME:
        data = Object.freeze({
          runtimeState: readRuntimeState(rid),
          activeServices: readActiveServices(),
          connectedPlatforms: readConnectedPlatforms()
        });
        break;
      case DM_QUERY_TYPE.FAULTS:
        data = Object.freeze({ faults: readFaultHistory(rid) });
        break;
      case DM_QUERY_TYPE.MEMORY: {
        const resources = readResources();
        data = Object.freeze({
          ram: resources.ram,
          memoryRecords: Object.freeze(
            records.filter((r) => r.category === DM_CATEGORY.MEMORY)
          )
        });
        break;
      }
      case DM_QUERY_TYPE.BATTLE:
        data = Object.freeze({
          activeBattle: readActiveBattle(),
          battleRecords: Object.freeze(
            records.filter((r) => r.category === DM_CATEGORY.BATTLE)
          )
        });
        break;
      case DM_QUERY_TYPE.AI:
        data = Object.freeze({
          aiRecords: Object.freeze(
            records.filter((r) => r.category === DM_CATEGORY.AI)
          ),
          healthTrends: readHealthTrends()
        });
        break;
      case DM_QUERY_TYPE.PLUGINS:
        data = Object.freeze({
          plugins: Object.freeze(
            records.filter(
              (r) =>
                r.category === DM_CATEGORY.PLATFORM_CONNECTORS ||
                r.component === "plugins" ||
                (r.payload && r.payload.plugin)
            )
          ),
          activeServices: readActiveServices()
        });
        break;
      default:
        return { ok: false, error: "unknown_query_type", type };
    }

    appendAudit({
      operation: "query",
      actor: m.source || m.actor || "system",
      result: "ok",
      time: Date.now(),
      queryType: normalized,
      runtimeId: rid
    });

    return Object.freeze({
      ok: true,
      type: normalized,
      readOnly: true,
      data: redactSensitive(data, m)
    });
  }

  function createReport(input = {}, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_diagnostics" };
    }

    const diagnosticId = input.diagnosticId || makeId("dm-rpt");
    const runtimeId = String(input.runtimeId || "default");
    const time = input.time != null ? input.time : Date.now();
    const findings = Array.isArray(input.findings)
      ? [...input.findings]
      : [];
    const recommendations = Array.isArray(input.recommendations)
      ? [...input.recommendations]
      : [];
    const analyzedComponents = Array.isArray(input.analyzedComponents)
      ? [...input.analyzedComponents]
      : [];
    const relatedFaults =
      input.relatedFaults != null
        ? input.relatedFaults
        : readFaultHistory(runtimeId);
    const relatedRecovery =
      input.relatedRecovery != null
        ? input.relatedRecovery
        : recoveryBridge && typeof recoveryBridge.status === "function"
          ? safeCall(() => recoveryBridge.status(), null)
          : null;

    findingsCount += findings.length;
    reportCount += 1;

    const report = Object.freeze({
      diagnosticId,
      time,
      runtimeId,
      analyzedComponents: Object.freeze(analyzedComponents),
      findings: Object.freeze(findings),
      recommendations: Object.freeze(recommendations),
      relatedFaults: Object.freeze(
        Array.isArray(relatedFaults) ? [...relatedFaults] : [relatedFaults]
      ),
      relatedRecovery,
      immutable: true,
      diagnosticOnly: true
    });

    archive.push(report);

    appendAudit({
      diagnosticId,
      runtimeId,
      actor: meta.source || meta.actor || "system",
      operation: "createReport",
      time,
      result: "ok"
    });

    return Object.freeze({ ok: true, report });
  }

  function exportReport(diagnosticIdOrReport, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_diagnostics" };
    }

    let report = null;
    if (typeof diagnosticIdOrReport === "string") {
      report = archive.find((r) => r.diagnosticId === diagnosticIdOrReport);
    } else if (diagnosticIdOrReport && diagnosticIdOrReport.diagnosticId) {
      report = diagnosticIdOrReport;
    } else if (
      diagnosticIdOrReport &&
      diagnosticIdOrReport.report &&
      diagnosticIdOrReport.report.diagnosticId
    ) {
      report = diagnosticIdOrReport.report;
    }

    if (!report) {
      return { ok: false, error: "report_not_found" };
    }

    const exported = redactSensitive(
      JSON.parse(JSON.stringify(report)),
      meta
    );

    appendAudit({
      diagnosticId: report.diagnosticId,
      runtimeId: report.runtimeId,
      actor: meta.source || meta.actor || "system",
      operation: "exportReport",
      time: Date.now(),
      result: "ok"
    });

    return Object.freeze({
      ok: true,
      export: Object.freeze(exported),
      immutable: true
    });
  }

  function forRecovery(request = {}, meta = {}) {
    const m = meta.source || meta.actor ? meta : request.meta || request;
    const req = request.request || request;
    if (m.forged === true) {
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    // recovery_manager is authorized by default
    const authMeta = {
      ...m,
      source: m.source || "recovery_manager",
      authorized: m.authorized != null ? m.authorized : true
    };

    const rid = req.runtimeId || m.runtimeId || "default";
    const snapRes = snapshot(rid, authMeta);
    const feed = Object.freeze({
      snapshot: snapRes.ok ? snapRes.snapshot : null,
      faultHistory: readFaultHistory(rid),
      runtimeState: readRuntimeState(rid),
      performanceHistory: Object.freeze([...performanceHistory]),
      healthScore: readHealthScore(rid),
      healthHistory: readHealthHistory(),
      diagnosticOnly: true,
      readOnly: true,
      choosesStrategy: false
    });

    appendAudit({
      operation: "forRecovery",
      actor: authMeta.source,
      runtimeId: rid,
      result: "ok",
      time: Date.now()
    });

    return Object.freeze({ ok: true, feed, choosesStrategy: false });
  }

  function forAi(request = {}, meta = {}) {
    const m =
      meta && (meta.source || meta.actor || meta.authorized != null)
        ? meta
        : request.meta || {};
    const req = request.request || request;

    if (m.mutateRequested === true || req.mutateRequested === true) {
      appendAudit({
        operation: "forAi",
        result: "ai_mutate_blocked",
        actor: m.source || "ai"
      });
      return {
        ok: false,
        error: "ai_cannot_mutate_diagnostics",
        readOnly: true
      };
    }
    if (m.forged === true) {
      return { ok: false, error: "forged_diagnostics_blocked" };
    }

    const authMeta = {
      ...m,
      source: m.source || "ai",
      authorized: m.authorized != null ? m.authorized : true
    };
    const rid = req.runtimeId || m.runtimeId || "default";

    const pkg = Object.freeze({
      runtimeId: rid,
      healthScore: readHealthScore(rid),
      healthHistory: readHealthHistory(),
      healthTrends: readHealthTrends(),
      degradations: readHealthDegradations(),
      faults: readFaultHistory(rid),
      recentDiagnostics: Object.freeze(records.slice(-50)),
      performanceHistory: Object.freeze([...performanceHistory]),
      diagnosticOnly: true,
      readOnly: true,
      neverMutatesSystem: true
    });

    appendAudit({
      operation: "forAi",
      actor: authMeta.source,
      runtimeId: rid,
      result: "ok",
      time: Date.now()
    });

    return Object.freeze({
      ok: true,
      package: redactSensitive(pkg, authMeta),
      readOnly: true
    });
  }

  function registerCategory(name, meta = {}) {
    if (meta.forged === true) {
      return { ok: false, error: "forged_diagnostics_blocked" };
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      return { ok: false, error: "unauthorized_diagnostics" };
    }
    const cat = String(name || "").trim();
    if (!cat) return { ok: false, error: "missing_category" };
    categories.add(cat);
    appendAudit({
      operation: "registerCategory",
      actor: meta.source || meta.actor || "system",
      result: "ok",
      category: cat,
      time: Date.now()
    });
    return Object.freeze({
      ok: true,
      category: cat,
      categories: Object.freeze([...categories])
    });
  }

  function metrics() {
    return Object.freeze({
      reportCount,
      snapshotCount,
      queryCount,
      averageAnalysisMs:
        analysisOps > 0 ? totalAnalysisMs / analysisOps : 0,
      findingsCount,
      recordCount: records.length,
      archiveCount: archive.length
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      ...DM_FLAGS,
      components: DM_COMPONENT_ORDER,
      sources: DM_SOURCE_ORDER,
      categories: Object.freeze([...categories]),
      active: activeDiagnosticsManager != null,
      metrics: metrics()
    });
  }

  const manager = Object.freeze({
    ok: true,
    ingest,
    snapshot,
    analyzeTrend: analyzeTrendOp,
    analyzeRootCause: analyzeRootCauseOp,
    query,
    createReport,
    report: createReport,
    exportReport,
    forRecovery,
    forAi,
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...archive]);
    },
    registerCategory,
    status,
    records() {
      return Object.freeze([...records]);
    },
    history() {
      return Object.freeze([...history]);
    },
    getCategories() {
      return Object.freeze([...categories]);
    },
    isActive() {
      return true;
    },
    // Explicit non-operations — Diagnostics NEVER mutates the system
    mutate() {
      return rejectMutation("mutate");
    },
    write() {
      return rejectMutation("write");
    },
    delete() {
      return rejectMutation("delete");
    },
    repair() {
      return rejectMutation("repair");
    },
    setHealth() {
      return rejectMutation("setHealth");
    },
    updateFault() {
      return rejectMutation("updateFault");
    },
    update() {
      return rejectMutation("update");
    },
    clear() {
      return rejectMutation("clear");
    },
    restart() {
      return rejectMutation("restart");
    }
  });

  activeDiagnosticsManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearDiagnosticsSingletonForTest() {
  activeDiagnosticsManager = null;
}

module.exports = {
  DM_COMPONENT,
  DM_COMPONENT_ORDER,
  DM_SOURCES,
  DM_SOURCE_ORDER,
  DM_DESCRIPTOR_FIELDS,
  DM_CATEGORY,
  DM_CATEGORY_ORDER,
  DM_SEVERITY,
  DM_SEVERITY_ORDER,
  DM_QUERY_TYPE,
  DM_QUERY_TYPE_ORDER,
  DM_AUTHORIZED_SOURCES,
  DM_FLAGS,
  DM_PUBLIC_API,
  DM_RUNTIME_ANCHORS,
  createDiagnosticDescriptor,
  analyzeTrend,
  analyzeRootCause,
  normalizeQueryType,
  createDiagnosticsManager,
  clearDiagnosticsSingletonForTest
};
