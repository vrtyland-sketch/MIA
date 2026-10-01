"use strict";

/**
 * Master Canon 0018 — Monitoring System: metrics, health, alerts, diagnostics.
 */

const crypto = require("crypto");

const MONITORING_COMPONENT = Object.freeze({
  METRICS_COLLECTOR: "metrics_collector",
  HEALTH_MONITOR: "health_monitor",
  ALERT_MANAGER: "alert_manager",
  DASHBOARD_ENGINE: "dashboard_engine",
  PERFORMANCE_ANALYZER: "performance_analyzer",
  TREND_ANALYZER: "trend_analyzer",
  DIAGNOSTIC_ENGINE: "diagnostic_engine",
  AUDIT_MONITOR: "audit_monitor",
  RESOURCE_MONITOR: "resource_monitor",
  EVENT_MONITOR: "event_monitor",
  LOG_AGGREGATOR: "log_aggregator",
  MONITORING_API: "monitoring_api"
});

const MONITORING_COMPONENT_ORDER = Object.freeze(Object.values(MONITORING_COMPONENT));

const MONITORING_HEALTH = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  WARNING: "warning",
  CRITICAL: "critical",
  OFFLINE: "offline"
});

const MONITORING_HEALTH_RANK = Object.freeze({
  [MONITORING_HEALTH.HEALTHY]: 0,
  [MONITORING_HEALTH.DEGRADED]: 1,
  [MONITORING_HEALTH.WARNING]: 2,
  [MONITORING_HEALTH.CRITICAL]: 3,
  [MONITORING_HEALTH.OFFLINE]: 4
});

const METRIC_KIND = Object.freeze({
  CPU: "cpu",
  RAM: "ram",
  GPU: "gpu",
  DISK: "disk",
  FPS: "fps",
  LATENCY: "latency",
  EVENTS_PER_SEC: "events_per_sec",
  PROCESSING_MS: "processing_ms",
  WORKER_UTILIZATION: "worker_utilization",
  NETWORK: "network",
  QUEUE_DEPTH: "queue_depth",
  AI_RESPONSE_MS: "ai_response_ms",
  AI_TOKENS: "ai_tokens"
});

const ALERT_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical"
});

const LOG_LEVEL = Object.freeze({
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error"
});

const DASHBOARD_PANEL = Object.freeze({
  CORE: "core",
  RUNTIME: "runtime",
  EVENT_BUS: "event_bus",
  QUEUE: "queue",
  STREAM: "stream",
  TIKTOK: "tiktok",
  KICK: "kick",
  OBS: "obs",
  AI: "ai",
  GAME: "game",
  ECONOMY: "economy",
  PERFORMANCE: "performance"
});

const MONITORING_TARGET = Object.freeze({
  RUNTIME: "runtime",
  EVENT_BUS: "event_bus",
  QUEUE_MANAGER: "queue_manager",
  DISPATCHER: "dispatcher",
  AI: "ai",
  GRAPHICS: "graphics",
  KOJNOZROUT: "kojnozout",
  OBS: "obs",
  DATABASE: "database",
  NETWORK: "network",
  PLUGINS: "plugins",
  MEMORY: "memory"
});

const MONITORING_FORBIDDEN_ACTIVITIES = Object.freeze([
  "mutate_business_logic",
  "mutate_event_payload",
  "route_events",
  "ai_decision",
  "auto_heal_without_policy"
]);

const DEFAULT_ALERT_THRESHOLDS = Object.freeze({
  [METRIC_KIND.CPU]: { warning: 80, critical: 90 },
  [METRIC_KIND.RAM]: { warning: 85, critical: 95 },
  [METRIC_KIND.QUEUE_DEPTH]: { warning: 5000, critical: 9000 },
  [METRIC_KIND.AI_RESPONSE_MS]: { warning: 15000, critical: 25000 },
  [METRIC_KIND.LATENCY]: { warning: 500, critical: 2000 }
});

const MONITORING_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-monitoring-core/monitoringSystem.js",
  "scripts/MIA_HEALTH_RUNTIME.js",
  "routes/health",
  "mia-output-overlay/mia-streamer-dashboard.html",
  "logs/"
]);

function isMonitoringHealth(value) {
  return typeof value === "string" && Object.values(MONITORING_HEALTH).includes(value);
}

function worstMonitoringHealth(a, b) {
  const ra = MONITORING_HEALTH_RANK[isMonitoringHealth(a) ? a : MONITORING_HEALTH.HEALTHY] || 0;
  const rb = MONITORING_HEALTH_RANK[isMonitoringHealth(b) ? b : MONITORING_HEALTH.HEALTHY] || 0;
  return ra >= rb ? a : b;
}

function createMetricSample(input = {}) {
  const name = String(input.name || input.kind || "").trim();
  if (!name) throw new Error("metric name is required");

  return Object.freeze({
    sampleId:
      typeof input.sampleId === "string" && input.sampleId.trim()
        ? input.sampleId.trim()
        : `metric-${crypto.randomUUID()}`,
    name,
    kind: input.kind || name,
    value: Number(input.value),
    unit: String(input.unit || ""),
    target: String(input.target || MONITORING_TARGET.RUNTIME),
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now()
  });
}

function createHealthReport(input = {}) {
  const componentId = String(input.componentId || "").trim();
  if (!componentId) throw new Error("componentId is required");

  const state = isMonitoringHealth(input.state) ? input.state : MONITORING_HEALTH.HEALTHY;

  return Object.freeze({
    componentId,
    state,
    message: String(input.message || ""),
    reportedAt: input.reportedAt != null ? Number(input.reportedAt) : Date.now(),
    target: String(input.target || componentId)
  });
}

function computePlatformHealth(reports = []) {
  let overall = MONITORING_HEALTH.HEALTHY;
  for (const report of reports) {
    overall = worstMonitoringHealth(overall, report?.state || MONITORING_HEALTH.HEALTHY);
  }
  return Object.freeze({
    state: overall,
    componentCount: reports.length,
    capturedAt: Date.now()
  });
}

function evaluateAlertThreshold(sample = {}, thresholds = DEFAULT_ALERT_THRESHOLDS) {
  const kind = sample.kind || sample.name;
  const limit = thresholds[kind];
  if (!limit || !Number.isFinite(sample.value)) {
    return Object.freeze({ triggered: false });
  }

  if (sample.value >= limit.critical) {
    return Object.freeze({
      triggered: true,
      severity: ALERT_SEVERITY.CRITICAL,
      threshold: limit.critical
    });
  }
  if (sample.value >= limit.warning) {
    return Object.freeze({
      triggered: true,
      severity: ALERT_SEVERITY.WARNING,
      threshold: limit.warning
    });
  }
  return Object.freeze({ triggered: false });
}

function createAlert(input = {}) {
  const metric = String(input.metric || "").trim();
  if (!metric) throw new Error("metric is required");

  return Object.freeze({
    alertId:
      typeof input.alertId === "string" && input.alertId.trim()
        ? input.alertId.trim()
        : `alert-${crypto.randomUUID()}`,
    metric,
    severity: Object.values(ALERT_SEVERITY).includes(input.severity)
      ? input.severity
      : ALERT_SEVERITY.WARNING,
    message: String(input.message || ""),
    value: input.value != null ? Number(input.value) : null,
    threshold: input.threshold != null ? Number(input.threshold) : null,
    createdAt: input.createdAt != null ? Number(input.createdAt) : Date.now(),
    component: MONITORING_COMPONENT.ALERT_MANAGER,
    resolved: false
  });
}

function createDashboardSnapshot(input = {}) {
  const panels = input.panels || Object.values(DASHBOARD_PANEL);
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    panels: Object.freeze(
      panels.map((panel) =>
        Object.freeze({
          panel,
          data: Object.freeze(input.data?.[panel] || {})
        })
      )
    )
  });
}

function analyzePerformance(samples = []) {
  const byTarget = {};
  for (const sample of samples) {
    const key = sample.target || "unknown";
    if (!byTarget[key]) byTarget[key] = [];
    byTarget[key].push(sample.value);
  }

  const slowest = Object.entries(byTarget)
    .map(([target, values]) => ({
      target,
      average: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => b.average - a.average)[0];

  return Object.freeze({
    analyzedAt: Date.now(),
    sampleCount: samples.length,
    slowestComponent: slowest?.target || null,
    slowestAverage: slowest?.average || 0
  });
}

function analyzeTrend(samples = [], options = {}) {
  const window = options.window || 5;
  if (!Array.isArray(samples) || samples.length < window) {
    return Object.freeze({ trend: "insufficient_data", slope: 0 });
  }

  const recent = samples.slice(-window).map((s) => Number(s.value)).filter(Number.isFinite);
  if (recent.length < 2) {
    return Object.freeze({ trend: "insufficient_data", slope: 0 });
  }

  const slope = recent[recent.length - 1] - recent[0];
  let trend = "stable";
  if (slope > 0) trend = "rising";
  if (slope < 0) trend = "falling";

  return Object.freeze({ trend, slope, window: recent.length });
}

function runDiagnostic(snapshot = {}) {
  const recommendations = [];

  const queueDepth = snapshot.eventBus?.queueDepth || snapshot.queueDepth || 0;
  const aiLatency = snapshot.ai?.responseMs || snapshot.aiResponseMs || 0;

  if (queueDepth > 1000 && aiLatency > 15000) {
    recommendations.push({
      code: "increase_ai_workers",
      reason: "queue_growing_ai_slow",
      component: MONITORING_COMPONENT.DIAGNOSTIC_ENGINE
    });
  }

  if (snapshot.obs?.connected === false) {
    recommendations.push({
      code: "restart_obs_bridge",
      reason: "obs_disconnected",
      component: MONITORING_COMPONENT.DIAGNOSTIC_ENGINE
    });
  }

  if (snapshot.kojnozout?.bowlPercent != null && snapshot.kojnozout.bowlPercent < 5) {
    recommendations.push({
      code: "inspect_kojnozout_feed",
      reason: "bowl_critically_low",
      component: MONITORING_COMPONENT.DIAGNOSTIC_ENGINE
    });
  }

  return Object.freeze({
    analyzedAt: Date.now(),
    recommendations: Object.freeze(recommendations),
    autoApply: false
  });
}

function createAuditMonitorCheck(input = {}) {
  const events = Array.isArray(input.auditEvents) ? input.auditEvents : [];
  const missing = events.filter((e) => !e?.eventId || !e?.at);
  const outOfOrder = events.some((e, i) => i > 0 && e.at < events[i - 1].at);

  return Object.freeze({
    ok: missing.length === 0 && !outOfOrder,
    missingCount: missing.length,
    outOfOrder,
    checkedAt: Date.now(),
    component: MONITORING_COMPONENT.AUDIT_MONITOR
  });
}

function createResourceSnapshot(input = {}) {
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    cpuPercent: input.cpuPercent != null ? Number(input.cpuPercent) : null,
    ramPercent: input.ramPercent != null ? Number(input.ramPercent) : null,
    gpuPercent: input.gpuPercent != null ? Number(input.gpuPercent) : null,
    diskPercent: input.diskPercent != null ? Number(input.diskPercent) : null,
    networkMbps: input.networkMbps != null ? Number(input.networkMbps) : null,
    temperatureC: input.temperatureC != null ? Number(input.temperatureC) : null
  });
}

function createEventBusMonitorSnapshot(input = {}) {
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    eventsPerSec: input.eventsPerSec != null ? Number(input.eventsPerSec) : 0,
    queueDepth: input.queueDepth != null ? Number(input.queueDepth) : 0,
    retryCount: input.retryCount != null ? Number(input.retryCount) : 0,
    timeoutCount: input.timeoutCount != null ? Number(input.timeoutCount) : 0,
    deadLetterCount: input.deadLetterCount != null ? Number(input.deadLetterCount) : 0,
    overflowCount: input.overflowCount != null ? Number(input.overflowCount) : 0
  });
}

function createKojnozoutMonitorSnapshot(input = {}) {
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    bowlPercent: input.bowlPercent != null ? Number(input.bowlPercent) : null,
    mood: input.mood != null ? String(input.mood) : null,
    energy: input.energy != null ? Number(input.energy) : null,
    interactionCount: input.interactionCount != null ? Number(input.interactionCount) : 0,
    activeAnimation: input.activeAnimation != null ? String(input.activeAnimation) : null,
    actionQueueDepth: input.actionQueueDepth != null ? Number(input.actionQueueDepth) : 0
  });
}

function createAiMonitorSnapshot(input = {}) {
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    model: input.model != null ? String(input.model) : null,
    responseMs: input.responseMs != null ? Number(input.responseMs) : null,
    tokenCount: input.tokenCount != null ? Number(input.tokenCount) : null,
    successRate: input.successRate != null ? Number(input.successRate) : null,
    errorCount: input.errorCount != null ? Number(input.errorCount) : 0,
    activeConversations: input.activeConversations != null ? Number(input.activeConversations) : 0
  });
}

function createObsMonitorSnapshot(input = {}) {
  return Object.freeze({
    capturedAt: input.capturedAt != null ? Number(input.capturedAt) : Date.now(),
    connected: Boolean(input.connected),
    activeScene: input.activeScene != null ? String(input.activeScene) : null,
    mediaSourceOk: input.mediaSourceOk != null ? Boolean(input.mediaSourceOk) : null,
    overlayRuntimeOk: input.overlayRuntimeOk != null ? Boolean(input.overlayRuntimeOk) : null,
    fps: input.fps != null ? Number(input.fps) : null,
    websocketErrors: input.websocketErrors != null ? Number(input.websocketErrors) : 0
  });
}

function aggregateLogEntry(input = {}) {
  const component = String(input.component || "").trim();
  const message = String(input.message || "").trim();
  if (!component || !message) throw new Error("component and message are required");

  return Object.freeze({
    logId:
      typeof input.logId === "string" && input.logId.trim()
        ? input.logId.trim()
        : `log-${crypto.randomUUID()}`,
    at: input.at != null ? Number(input.at) : Date.now(),
    component,
    level: Object.values(LOG_LEVEL).includes(input.level) ? input.level : LOG_LEVEL.INFO,
    correlationId: String(input.correlationId || ""),
    runtimeId: String(input.runtimeId || ""),
    sessionId: String(input.sessionId || ""),
    message
  });
}

function collectMonitoringSnapshot(input = {}) {
  const metrics = (input.metrics || []).map((m) =>
    typeof m.name === "string" ? m : createMetricSample(m)
  );
  const healthReports = (input.healthReports || []).map((r) =>
    r.componentId ? r : createHealthReport(r)
  );

  const alerts = [];
  for (const sample of metrics) {
    const evalResult = evaluateAlertThreshold(sample, input.thresholds);
    if (evalResult.triggered) {
      alerts.push(
        createAlert({
          metric: sample.name,
          severity: evalResult.severity,
          value: sample.value,
          threshold: evalResult.threshold,
          message: `${sample.name} exceeded ${evalResult.threshold}`
        })
      );
    }
  }

  const eventBus = createEventBusMonitorSnapshot(input.eventBus || {});
  const resources = createResourceSnapshot(input.resources || {});
  const kojnozout = createKojnozoutMonitorSnapshot(input.kojnozout || {});
  const ai = createAiMonitorSnapshot(input.ai || {});
  const obs = createObsMonitorSnapshot(input.obs || {});

  const snapshot = Object.freeze({
    capturedAt: Date.now(),
    platformHealth: computePlatformHealth(healthReports),
    metrics: Object.freeze(metrics),
    healthReports: Object.freeze(healthReports),
    alerts: Object.freeze(alerts),
    performance: analyzePerformance(metrics),
    eventBus,
    resources,
    kojnozout,
    ai,
    obs,
    diagnostic: runDiagnostic({
      eventBus,
      queueDepth: eventBus.queueDepth,
      ai,
      aiResponseMs: ai.responseMs,
      obs,
      kojnozout
    })
  });

  return snapshot;
}

function createMonitoringApiResponse(snapshot, options = {}) {
  const readOnly = options.readOnly !== false;
  return Object.freeze({
    ok: true,
    readOnly,
    capturedAt: snapshot.capturedAt || Date.now(),
    data: snapshot,
    component: MONITORING_COMPONENT.MONITORING_API
  });
}

function assertMonitoringForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !MONITORING_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

module.exports = {
  MONITORING_COMPONENT,
  MONITORING_COMPONENT_ORDER,
  MONITORING_HEALTH,
  METRIC_KIND,
  ALERT_SEVERITY,
  LOG_LEVEL,
  DASHBOARD_PANEL,
  MONITORING_TARGET,
  MONITORING_FORBIDDEN_ACTIVITIES,
  DEFAULT_ALERT_THRESHOLDS,
  MONITORING_RUNTIME_ANCHORS,
  isMonitoringHealth,
  worstMonitoringHealth,
  createMetricSample,
  createHealthReport,
  computePlatformHealth,
  evaluateAlertThreshold,
  createAlert,
  createDashboardSnapshot,
  analyzePerformance,
  analyzeTrend,
  runDiagnostic,
  createAuditMonitorCheck,
  createResourceSnapshot,
  createEventBusMonitorSnapshot,
  createKojnozoutMonitorSnapshot,
  createAiMonitorSnapshot,
  createObsMonitorSnapshot,
  aggregateLogEntry,
  collectMonitoringSnapshot,
  createMonitoringApiResponse,
  assertMonitoringForbiddenActivity
};
