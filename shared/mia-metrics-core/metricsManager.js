"use strict";

/**
 * Master Canon 0072 — Metrics Manager.
 * Kernel Layer 0 sole central ingress for numeric metrics collection,
 * aggregation, time series, thresholds, and read-only feeds.
 * Does NOT store logs or run diagnostics/fault analysis.
 */

const crypto = require("crypto");

const MM_COMPONENT = Object.freeze({
  METRICS_MANAGER: "metrics_manager",
  INTAKE_GATE: "intake_gate",
  TYPE_REGISTRY: "type_registry",
  CATEGORY_REGISTRY: "category_registry",
  AGGREGATION_ENGINE: "aggregation_engine",
  TIME_SERIES_STORE: "time_series_store",
  THRESHOLD_ENGINE: "threshold_engine",
  REPORT_ENGINE: "report_engine",
  MONITORING_FEED: "monitoring_feed",
  DIAGNOSTICS_FEED: "diagnostics_feed",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const MM_COMPONENT_ORDER = Object.freeze(Object.values(MM_COMPONENT));

const MM_TYPE = Object.freeze({
  COUNTER: "counter",
  GAUGE: "gauge",
  HISTOGRAM: "histogram",
  TIMER: "timer"
});

const MM_TYPE_ORDER = Object.freeze([
  MM_TYPE.COUNTER,
  MM_TYPE.GAUGE,
  MM_TYPE.HISTOGRAM,
  MM_TYPE.TIMER
]);

const MM_CATEGORY = Object.freeze({
  RUNTIME: "runtime",
  CPU: "cpu",
  MEMORY: "memory",
  GPU: "gpu",
  AI: "ai",
  BATTLE: "battle",
  NETWORK: "network",
  OBS: "obs",
  PLATFORM_CONNECTORS: "platform_connectors",
  USER_ACTIVITY: "user_activity"
});

const MM_CATEGORY_ORDER = Object.freeze(Object.values(MM_CATEGORY));

const MM_DESCRIPTOR_FIELDS = Object.freeze([
  "metricId",
  "name",
  "category",
  "unit",
  "value",
  "timestamp",
  "source",
  "runtimeId"
]);

const MM_THRESHOLD_SEVERITY = Object.freeze({
  WARNING: "warning",
  CRITICAL: "critical"
});

const MM_THRESHOLD_SEVERITY_ORDER = Object.freeze([
  MM_THRESHOLD_SEVERITY.WARNING,
  MM_THRESHOLD_SEVERITY.CRITICAL
]);

const MM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "runtime",
  "runtime_manager",
  "runtime-manager",
  "monitoring",
  "diagnostics_manager",
  "diagnostics-manager",
  "logging_manager",
  "logging-manager",
  "metrics_manager",
  "metrics-manager",
  "health_manager",
  "health-manager",
  "ai",
  "recovery_manager",
  "recovery-manager"
]);

const MM_PRIVILEGED_SOURCES = Object.freeze([
  "kernel",
  "operator",
  "admin",
  "system",
  "metrics_manager",
  "metrics-manager"
]);

const MM_FLAGS = Object.freeze({
  soleMetricsAuthority: true,
  storesLogs: false,
  runsDiagnostics: false,
  centralMetricsIngress: true,
  historicalImmutable: true
});

const MM_PUBLIC_API = Object.freeze([
  "record",
  "inc",
  "set",
  "observe",
  "timing",
  "aggregate",
  "getSeries",
  "setThreshold",
  "evaluateThresholds",
  "createReport",
  "exportReport",
  "forMonitoring",
  "forDiagnostics",
  "forAi",
  "registerCategory",
  "metrics",
  "auditTrail",
  "reportArchive",
  "status"
]);

const MM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-metrics-core/metricsManager.js",
  "shared/mia-health-core/healthManager.js",
  "shared/mia-diagnostics-core/diagnosticsManager.js",
  "shared/mia-logging-core/loggingManager.js",
  "docs/master-canon/0072-metrics-manager.md"
]);

const MM_MUTATING_VERBS = Object.freeze([
  "mutate",
  "update",
  "delete",
  "rewrite",
  "clear",
  "edit",
  "patch",
  "rewriteHistory"
]);

let activeMetricsManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function isValidType(type) {
  return MM_TYPE_ORDER.includes(type);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const w = rank - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function aggregateValues(samples) {
  const values = (samples || [])
    .map((s) => (typeof s === "number" ? s : s && s.v != null ? s.v : s && s.value != null ? s.value : null))
    .filter((v) => typeof v === "number" && Number.isFinite(v));

  if (!values.length) {
    return Object.freeze({
      min: null,
      max: null,
      avg: null,
      median: null,
      percentiles: Object.freeze({
        p50: null,
        p90: null,
        p95: null,
        p99: null
      }),
      sum: 0,
      count: 0
    });
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const median = percentile(sorted, 50);

  return Object.freeze({
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    median,
    percentiles: Object.freeze({
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99)
    }),
    sum,
    count: values.length
  });
}

function createMetricDescriptor(input = {}) {
  const name = String(input.name || "").trim();
  if (!name) return { ok: false, error: "missing_name" };

  const category = String(input.category || "").trim();
  if (!category) return { ok: false, error: "missing_category" };

  const source = String(input.source || "").trim();
  if (!source) return { ok: false, error: "missing_source" };

  const runtimeId = String(input.runtimeId || "").trim();
  if (!runtimeId) return { ok: false, error: "missing_runtimeId" };

  const value = input.value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: "invalid_value" };
  }

  const timestamp =
    typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
      ? input.timestamp
      : Date.now();

  const metricId = input.metricId || makeId("mm");
  const unit = input.unit == null ? "" : String(input.unit);

  return {
    ok: true,
    descriptor: Object.freeze({
      metricId,
      name,
      category,
      unit,
      value,
      timestamp,
      source,
      runtimeId
    })
  };
}

function createMetricsManager(options = {}) {
  if (
    activeMetricsManager &&
    activeMetricsManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "metrics_manager_already_active",
      soleMetricsAuthority: true
    });
  }

  const authorized = new Set(options.authorizedSources || MM_AUTHORIZED_SOURCES);
  const privileged = new Set(options.privilegedSources || MM_PRIVILEGED_SOURCES);

  const categories = new Set(MM_CATEGORY_ORDER);
  if (Array.isArray(options.extraCategories)) {
    for (const c of options.extraCategories) {
      if (c) categories.add(String(c));
    }
  }

  const maxPoints =
    typeof options.maxPoints === "number" && options.maxPoints > 0
      ? options.maxPoints
      : 10000;
  const retentionMs =
    typeof options.retentionMs === "number" && options.retentionMs > 0
      ? options.retentionMs
      : 24 * 60 * 60 * 1000;
  const approxBytesPerPoint =
    typeof options.approxBytesPerPoint === "number"
      ? options.approxBytesPerPoint
      : 64;
  const collectRateWindowMs =
    typeof options.collectRateWindowMs === "number"
      ? options.collectRateWindowMs
      : 60000;

  const storageBridge =
    options.storageBridge && typeof options.storageBridge === "object"
      ? options.storageBridge
      : null;

  // name -> { type, category, unit, value, samples: [{t,v,metricId}], buckets? }
  const seriesStore = new Map();
  const thresholds = new Map();
  const alerts = [];
  const audit = [];
  const reportArchiveStore = [];
  const knownMetricIds = new Set();

  let activeMetricCount = 0;
  let aggregationCount = 0;
  let thresholdAlertCount = 0;
  let collectTimestamps = [];

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
        metricId: record.metricId || null,
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

  function collectRate() {
    const now = Date.now();
    collectTimestamps = collectTimestamps.filter(
      (t) => now - t <= collectRateWindowMs
    );
    return collectTimestamps.length;
  }

  function storageSize() {
    if (storageBridge && typeof storageBridge.byteSize === "function") {
      try {
        const n = storageBridge.byteSize();
        if (typeof n === "number" && Number.isFinite(n)) return n;
      } catch (_err) {
        /* fall through */
      }
    }
    let points = 0;
    for (const entry of seriesStore.values()) {
      points += entry.samples.length;
    }
    return points * approxBytesPerPoint;
  }

  function trimSeries(entry, nowMs) {
    const cutoff = nowMs - retentionMs;
    while (entry.samples.length && entry.samples[0].t < cutoff) {
      entry.samples.shift();
    }
    while (entry.samples.length > maxPoints) {
      entry.samples.shift();
    }
  }

  function persistPoint(name, point) {
    if (storageBridge && typeof storageBridge.write === "function") {
      try {
        storageBridge.write(name, point);
      } catch (_err) {
        /* memory remains source of truth */
      }
    }
  }

  function ensureSeries(name, type, category, unit) {
    if (!seriesStore.has(name)) {
      seriesStore.set(name, {
        type,
        category,
        unit: unit || "",
        value: 0,
        samples: [],
        buckets: type === MM_TYPE.HISTOGRAM ? [] : null,
        counterResetAuthorized: false
      });
      activeMetricCount += 1;
    }
    return seriesStore.get(name);
  }

  function gateWrite(meta, operation) {
    if (!isAuthorized(meta)) {
      appendAudit({
        operation,
        result: "unauthorized_metrics",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "unauthorized_metrics" });
    }
    if (!isSourceVerified(meta)) {
      appendAudit({
        operation,
        result: "forged_metrics_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({ ok: false, error: "forged_metrics_blocked" });
    }
    if (meta.rewriteHistory === true) {
      appendAudit({
        operation,
        result: "rewrite_history_blocked",
        actor: meta.source || meta.actor || "unknown",
        time: Date.now()
      });
      return Object.freeze({
        ok: false,
        error: "rewrite_history_blocked",
        historicalImmutable: true
      });
    }
    return null;
  }

  function writeSample(type, input = {}, meta = {}) {
    const blocked = gateWrite(meta, type);
    if (blocked) return blocked;

    const nowMs =
      typeof meta.nowMs === "number" && Number.isFinite(meta.nowMs)
        ? meta.nowMs
        : typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
          ? input.timestamp
          : Date.now();

    const name = String(input.name || "").trim();
    if (!name) {
      return Object.freeze({ ok: false, error: "missing_name" });
    }

    const category = String(input.category || MM_CATEGORY.RUNTIME).trim();
    if (!categories.has(category)) {
      return Object.freeze({ ok: false, error: "unknown_category", category });
    }

    if (!isValidType(type)) {
      return Object.freeze({ ok: false, error: "invalid_type", type });
    }

    let value = input.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return Object.freeze({ ok: false, error: "invalid_value" });
    }

    const entry = ensureSeries(name, type, category, input.unit);

    if (entry.type !== type && entry.samples.length > 0) {
      return Object.freeze({
        ok: false,
        error: "type_mismatch",
        expected: entry.type,
        got: type
      });
    }
    entry.type = type;
    entry.category = category;
    if (input.unit != null) entry.unit = String(input.unit);

    if (type === MM_TYPE.COUNTER) {
      const reset =
        meta.reset === true ||
        input.reset === true ||
        meta.counterReset === true;
      if (reset) {
        if (!isPrivileged(meta) && meta.resetAuthorized !== true) {
          appendAudit({
            operation: "counter_reset",
            result: "unauthorized_metrics",
            actor: meta.source || "unknown",
            time: nowMs,
            name
          });
          return Object.freeze({
            ok: false,
            error: "unauthorized_counter_reset"
          });
        }
        entry.value = value;
      } else if (value < entry.value) {
        appendAudit({
          operation: "inc",
          result: "counter_decrease_rejected",
          actor: meta.source || "unknown",
          time: nowMs,
          name,
          previous: entry.value,
          attempted: value
        });
        return Object.freeze({
          ok: false,
          error: "counter_decrease_rejected",
          previous: entry.value,
          attempted: value
        });
      } else {
        entry.value = value;
      }
    } else if (type === MM_TYPE.GAUGE) {
      entry.value = value;
    } else if (type === MM_TYPE.HISTOGRAM) {
      entry.value = value;
      if (!entry.buckets) entry.buckets = [];
      if (Array.isArray(input.buckets)) {
        entry.buckets = [...input.buckets];
      }
      entry.buckets.push(value);
    } else if (type === MM_TYPE.TIMER) {
      if (value < 0) {
        return Object.freeze({ ok: false, error: "invalid_duration" });
      }
      entry.value = value;
    }

    const descResult = createMetricDescriptor({
      metricId: input.metricId,
      name,
      category,
      unit: entry.unit,
      value: entry.value,
      timestamp: nowMs,
      source: meta.source || input.source || "system",
      runtimeId: input.runtimeId || meta.runtimeId || "runtime-unknown"
    });

    if (!descResult.ok) {
      return Object.freeze({ ok: false, error: descResult.error });
    }

    const descriptor = descResult.descriptor;
    if (knownMetricIds.has(descriptor.metricId)) {
      return Object.freeze({ ok: false, error: "duplicate_metricId" });
    }
    knownMetricIds.add(descriptor.metricId);

    const point = Object.freeze({
      t: nowMs,
      v: entry.value,
      metricId: descriptor.metricId,
      type,
      sample: type === MM_TYPE.HISTOGRAM || type === MM_TYPE.TIMER ? value : entry.value
    });

    entry.samples.push(point);
    trimSeries(entry, nowMs);
    persistPoint(name, point);
    collectTimestamps.push(nowMs);

    appendAudit({
      metricId: descriptor.metricId,
      runtimeId: descriptor.runtimeId,
      actor: descriptor.source,
      operation: type,
      time: nowMs,
      result: "ok",
      name,
      value: entry.value
    });

    return Object.freeze({
      ok: true,
      metric: descriptor,
      metricId: descriptor.metricId,
      name,
      type,
      value: entry.value,
      storesLogs: false,
      runsDiagnostics: false
    });
  }

  function record(input = {}, meta = {}) {
    const type = String(input.type || MM_TYPE.GAUGE).trim();
    if (!isValidType(type)) {
      return Object.freeze({ ok: false, error: "invalid_type", type });
    }
    return writeSample(type, input, meta);
  }

  function inc(input = {}, meta = {}) {
    const name = String(input.name || "").trim();
    const existing = seriesStore.get(name);
    let nextValue;
    if (
      typeof input.value === "number" &&
      Number.isFinite(input.value) &&
      input.absolute === true
    ) {
      nextValue = input.value;
    } else {
      const d =
        typeof input.delta === "number" && Number.isFinite(input.delta)
          ? input.delta
          : typeof input.value === "number" && Number.isFinite(input.value)
            ? input.value
            : 1;
      const prev =
        existing && existing.type === MM_TYPE.COUNTER ? existing.value : 0;
      nextValue = prev + d;
    }

    return writeSample(
      MM_TYPE.COUNTER,
      {
        ...input,
        name,
        value: nextValue,
        category: input.category || (existing && existing.category) || MM_CATEGORY.RUNTIME,
        unit: input.unit || (existing && existing.unit) || "count"
      },
      meta
    );
  }

  function set(input = {}, meta = {}) {
    return writeSample(MM_TYPE.GAUGE, input, meta);
  }

  function observe(input = {}, meta = {}) {
    return writeSample(MM_TYPE.HISTOGRAM, input, meta);
  }

  function timing(input = {}, meta = {}) {
    const duration =
      typeof input.durationMs === "number"
        ? input.durationMs
        : typeof input.ms === "number"
          ? input.ms
          : input.value;
    return writeSample(
      MM_TYPE.TIMER,
      {
        ...input,
        value: duration,
        unit: input.unit || "ms"
      },
      meta
    );
  }

  function aggregate(nameOrSamples, meta = {}) {
    aggregationCount += 1;
    let samples;
    let name = null;

    if (typeof nameOrSamples === "string") {
      name = nameOrSamples;
      const entry = seriesStore.get(name);
      samples = entry ? entry.samples : [];
    } else if (Array.isArray(nameOrSamples)) {
      samples = nameOrSamples;
    } else if (nameOrSamples && typeof nameOrSamples === "object") {
      name = nameOrSamples.name || null;
      if (Array.isArray(nameOrSamples.samples)) {
        samples = nameOrSamples.samples;
      } else if (name && seriesStore.has(name)) {
        samples = seriesStore.get(name).samples;
      } else {
        samples = [];
      }
    } else {
      samples = [];
    }

    const result = aggregateValues(samples);
    appendAudit({
      operation: "aggregate",
      result: "ok",
      actor: (meta && meta.source) || "system",
      time: Date.now(),
      name,
      count: result.count
    });

    return Object.freeze({
      ok: true,
      name,
      ...result
    });
  }

  function getSeries(name, meta = {}) {
    const key = String(name || "").trim();
    if (!key) return Object.freeze({ ok: false, error: "missing_name" });
    const entry = seriesStore.get(key);
    if (!entry) {
      return Object.freeze({
        ok: true,
        name: key,
        series: Object.freeze([]),
        type: null,
        readOnly: true,
        historicalImmutable: true
      });
    }
    const series = entry.samples.map((p) =>
      Object.freeze({ t: p.t, v: p.v, metricId: p.metricId })
    );
    return Object.freeze({
      ok: true,
      name: key,
      type: entry.type,
      category: entry.category,
      unit: entry.unit,
      value: entry.value,
      series: Object.freeze(series),
      readOnly: true,
      historicalImmutable: true
    });
  }

  function setThreshold(name, config = {}, meta = {}) {
    const blocked = gateWrite(meta, "setThreshold");
    if (blocked) return blocked;
    if (!isPrivileged(meta) && meta.authorized !== true) {
      // still require auth via gateWrite; privileged preferred for config
    }
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_metrics" });
    }

    const key = String(name || "").trim();
    if (!key) return Object.freeze({ ok: false, error: "missing_name" });

    const op = String(config.op || ">").trim();
    const value = config.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return Object.freeze({ ok: false, error: "invalid_threshold_value" });
    }
    const severity = String(config.severity || MM_THRESHOLD_SEVERITY.WARNING).toLowerCase();
    if (!MM_THRESHOLD_SEVERITY_ORDER.includes(severity)) {
      return Object.freeze({ ok: false, error: "invalid_severity", severity });
    }

    const threshold = Object.freeze({
      name: key,
      op,
      value,
      severity,
      configuredAt: Date.now()
    });
    thresholds.set(key, threshold);

    appendAudit({
      operation: "setThreshold",
      result: "ok",
      actor: meta.source || "admin",
      time: Date.now(),
      name: key,
      op,
      value,
      severity
    });

    return Object.freeze({ ok: true, threshold });
  }

  function compare(op, left, right) {
    switch (op) {
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case "==":
      case "=":
        return left === right;
      case "!=":
        return left !== right;
      default:
        return left > right;
    }
  }

  function evaluateThresholds(meta = {}) {
    const produced = [];
    for (const [name, threshold] of thresholds.entries()) {
      const entry = seriesStore.get(name);
      if (!entry) continue;
      const current = entry.value;
      if (compare(threshold.op, current, threshold.value)) {
        const alert = Object.freeze({
          name,
          op: threshold.op,
          threshold: threshold.value,
          current,
          severity: threshold.severity,
          time: Date.now()
        });
        produced.push(alert);
        alerts.push(alert);
        thresholdAlertCount += 1;
      }
    }

    appendAudit({
      operation: "evaluateThresholds",
      result: "ok",
      actor: (meta && meta.source) || "metrics_manager",
      time: Date.now(),
      alertCount: produced.length
    });

    return Object.freeze({
      ok: true,
      alerts: Object.freeze([...produced]),
      count: produced.length
    });
  }

  function buildFeed(kind, query = {}, meta = {}) {
    if (!isAuthorized(meta)) {
      return Object.freeze({
        ok: false,
        error: "unauthorized_metrics",
        readOnly: true
      });
    }
    if (meta.forged === true) {
      return Object.freeze({
        ok: false,
        error: "forged_metrics_blocked",
        readOnly: true
      });
    }

    const mutateRequested =
      meta.mutateRequested === true ||
      query.mutateRequested === true ||
      query.deleteRequested === true ||
      query.rewriteRequested === true ||
      query.rewriteHistory === true ||
      meta.rewriteHistory === true ||
      MM_MUTATING_VERBS.some(
        (v) =>
          query[v] === true ||
          meta[v] === true ||
          String(query.action || "").toLowerCase() === v
      );

    if (mutateRequested) {
      const err =
        kind === "ai"
          ? "ai_cannot_mutate_metrics"
          : kind === "monitoring"
            ? "monitoring_cannot_mutate_metrics"
            : "diagnostics_cannot_mutate_metrics";
      appendAudit({
        operation: `for${kind[0].toUpperCase()}${kind.slice(1)}`,
        result: err,
        actor: meta.source || kind,
        time: Date.now()
      });
      return Object.freeze({
        ok: false,
        error: err,
        readOnly: true,
        historicalImmutable: true
      });
    }

    const names = query.names
      ? query.names
      : query.name
        ? [query.name]
        : [...seriesStore.keys()];

    const metricsView = [];
    for (const name of names) {
      const entry = seriesStore.get(name);
      if (!entry) continue;
      let samples = entry.samples;
      if (typeof query.from === "number") {
        samples = samples.filter((p) => p.t >= query.from);
      }
      if (typeof query.to === "number") {
        samples = samples.filter((p) => p.t <= query.to);
      }
      metricsView.push(
        Object.freeze({
          name,
          type: entry.type,
          category: entry.category,
          unit: entry.unit,
          value: entry.value,
          series: Object.freeze(
            samples.map((p) => Object.freeze({ t: p.t, v: p.v, metricId: p.metricId }))
          )
        })
      );
    }

    appendAudit({
      operation: `for${kind[0].toUpperCase()}${kind.slice(1)}`,
      result: "ok",
      actor: meta.source || kind,
      time: Date.now(),
      count: metricsView.length
    });

    return Object.freeze({
      ok: true,
      readOnly: true,
      storesLogs: false,
      runsDiagnostics: false,
      historicalImmutable: true,
      displayOnly: kind === "monitoring",
      metrics: Object.freeze(metricsView),
      count: metricsView.length,
      self: metrics()
    });
  }

  function forMonitoring(query = {}, meta = {}) {
    return buildFeed("monitoring", query, {
      source: meta.source || "monitoring",
      ...meta
    });
  }

  function forDiagnostics(query = {}, meta = {}) {
    return buildFeed("diagnostics", query, {
      source: meta.source || "diagnostics_manager",
      ...meta
    });
  }

  function forAi(query = {}, meta = {}) {
    return buildFeed("ai", query, {
      source: meta.source || "ai",
      ...meta
    });
  }

  function createReport(optionsIn = {}, meta = {}) {
    const blocked = gateWrite(meta, "createReport");
    if (blocked) return blocked;

    const names = Array.isArray(optionsIn.names)
      ? optionsIn.names
      : optionsIn.name
        ? [optionsIn.name]
        : [...seriesStore.keys()];
    const from = typeof optionsIn.from === "number" ? optionsIn.from : null;
    const to = typeof optionsIn.to === "number" ? optionsIn.to : null;

    const metricIds = [];
    const metricsList = [];
    const aggregates = {};
    const trends = {};
    const recommendations = [];

    for (const name of names) {
      const entry = seriesStore.get(name);
      if (!entry) continue;
      let samples = entry.samples;
      if (from != null) samples = samples.filter((p) => p.t >= from);
      if (to != null) samples = samples.filter((p) => p.t <= to);
      for (const p of samples) metricIds.push(p.metricId);

      metricsList.push(
        Object.freeze({
          name,
          type: entry.type,
          category: entry.category,
          unit: entry.unit,
          value: entry.value,
          points: samples.length
        })
      );

      const agg = aggregateValues(samples);
      aggregates[name] = agg;

      if (samples.length >= 2) {
        const first = samples[0].v;
        const last = samples[samples.length - 1].v;
        const delta = last - first;
        trends[name] = Object.freeze({
          direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
          delta,
          first,
          last
        });
        if (delta > 0 && entry.type === MM_TYPE.GAUGE) {
          recommendations.push(`Review rising metric ${name}`);
        }
      } else {
        trends[name] = Object.freeze({
          direction: "flat",
          delta: 0,
          first: entry.value,
          last: entry.value
        });
      }
    }

    for (const [name, threshold] of thresholds.entries()) {
      const entry = seriesStore.get(name);
      if (!entry) continue;
      if (compare(threshold.op, entry.value, threshold.value)) {
        recommendations.push(
          `Threshold ${threshold.severity}: ${name} ${threshold.op} ${threshold.value} (current ${entry.value})`
        );
      }
    }

    const reportId = makeId("mmr");
    const report = Object.freeze({
      reportId,
      metricIds: Object.freeze([...metricIds]),
      period: Object.freeze({ from, to }),
      metrics: Object.freeze(metricsList),
      aggregates: Object.freeze({ ...aggregates }),
      trends: Object.freeze({ ...trends }),
      recommendations: Object.freeze(recommendations),
      createdAt: Date.now(),
      immutable: true
    });

    reportArchiveStore.push(report);

    appendAudit({
      operation: "createReport",
      result: "ok",
      actor: meta.source || "system",
      time: Date.now(),
      reportId
    });

    return Object.freeze({ ok: true, report });
  }

  function exportReport(reportIdOrReport, meta = {}) {
    if (!isAuthorized(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_metrics" });
    }
    let report = null;
    if (typeof reportIdOrReport === "string") {
      report = reportArchiveStore.find((r) => r.reportId === reportIdOrReport) || null;
    } else if (reportIdOrReport && reportIdOrReport.report) {
      report = reportIdOrReport.report;
    } else if (reportIdOrReport && reportIdOrReport.reportId) {
      report = reportIdOrReport;
    }
    if (!report) {
      return Object.freeze({ ok: false, error: "report_not_found" });
    }

    const exported = Object.freeze({
      format: "json",
      exportedAt: Date.now(),
      report: Object.freeze({ ...report }),
      immutable: true
    });

    appendAudit({
      operation: "exportReport",
      result: "ok",
      actor: meta.source || "system",
      time: Date.now(),
      reportId: report.reportId
    });

    return Object.freeze({ ok: true, export: exported });
  }

  function registerCategory(name, meta = {}) {
    if (!isAuthorized(meta) || !isPrivileged(meta)) {
      return Object.freeze({ ok: false, error: "unauthorized_metrics" });
    }
    if (meta.forged === true) {
      return Object.freeze({ ok: false, error: "forged_metrics_blocked" });
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

  function metrics() {
    return Object.freeze({
      activeMetricCount: seriesStore.size,
      collectRate: collectRate(),
      storageSize: storageSize(),
      aggregationCount,
      thresholdAlertCount,
      seriesCount: seriesStore.size,
      alertCount: alerts.length,
      reportCount: reportArchiveStore.length,
      storesLogs: false,
      runsDiagnostics: false
    });
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleMetricsAuthority: true,
      storesLogs: false,
      runsDiagnostics: false,
      centralMetricsIngress: true,
      historicalImmutable: true,
      activeMetricCount: seriesStore.size,
      categories: Object.freeze([...categories]),
      components: MM_COMPONENT_ORDER,
      types: MM_TYPE_ORDER,
      maxPoints,
      retentionMs
    });
  }

  function rejectHistoryMutation(op) {
    appendAudit({
      operation: op,
      result: "historical_immutable",
      actor: "metrics_manager",
      time: Date.now()
    });
    return Object.freeze({
      ok: false,
      error: "historical_immutable",
      operation: op,
      historicalImmutable: true
    });
  }

  const manager = Object.freeze({
    ok: true,
    record,
    inc,
    set,
    observe,
    timing,
    aggregate,
    getSeries,
    setThreshold,
    evaluateThresholds,
    createReport,
    exportReport,
    forMonitoring,
    forDiagnostics,
    forAi,
    registerCategory,
    metrics,
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...reportArchiveStore]);
    },
    status,
    alerts() {
      return Object.freeze([...alerts]);
    },
    getCategories() {
      return Object.freeze([...categories]);
    },
    isActive() {
      return true;
    },
    update() {
      return rejectHistoryMutation("update");
    },
    delete() {
      return rejectHistoryMutation("delete");
    },
    rewrite() {
      return rejectHistoryMutation("rewrite");
    },
    mutate() {
      return rejectHistoryMutation("mutate");
    },
    clear() {
      return rejectHistoryMutation("clear");
    },
    rewriteHistory() {
      return rejectHistoryMutation("rewriteHistory");
    }
  });

  activeMetricsManager = {
    isActive: manager.isActive
  };

  return manager;
}

function clearMetricsSingletonForTest() {
  activeMetricsManager = null;
}

module.exports = {
  MM_COMPONENT,
  MM_COMPONENT_ORDER,
  MM_TYPE,
  MM_TYPE_ORDER,
  MM_CATEGORY,
  MM_CATEGORY_ORDER,
  MM_DESCRIPTOR_FIELDS,
  MM_THRESHOLD_SEVERITY,
  MM_THRESHOLD_SEVERITY_ORDER,
  MM_AUTHORIZED_SOURCES,
  MM_FLAGS,
  MM_PUBLIC_API,
  MM_RUNTIME_ANCHORS,
  createMetricDescriptor,
  aggregateValues,
  createMetricsManager,
  clearMetricsSingletonForTest
};
