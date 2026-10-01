"use strict";

/**
 * Master Canon 0064 — Health Manager.
 * Kernel Layer 0 diagnostic authority for platform health scoring.
 * Does not repair, restart, enter safe mode, or shut down — Recovery/Watchdog decide.
 * Distinct from State Manager (healthIsState: false).
 */

const crypto = require("crypto");

const HM_COMPONENT = Object.freeze({
  HEALTH_MANAGER: "health_manager",
  HEALTH_REGISTRY: "health_registry",
  SCORE_ENGINE: "score_engine",
  RULE_ENGINE: "rule_engine",
  INTERVAL_SCHEDULER: "interval_scheduler",
  EVENT_PUBLISHER: "event_publisher",
  REPORT_ENGINE: "report_engine",
  TREND_ANALYZER: "trend_analyzer",
  RECOVERY_FEED: "recovery_feed",
  WATCHDOG_FEED: "watchdog_feed",
  SECURITY_GATE: "security_gate",
  METRICS_AUDIT: "metrics_audit"
});

const HM_COMPONENT_ORDER = Object.freeze(Object.values(HM_COMPONENT));

const HM_SCOPE = Object.freeze({
  SYSTEM: "system",
  SERVICE: "service",
  MODULE: "module",
  PLATFORM: "platform",
  AI: "ai",
  BATTLE: "battle",
  OBS: "obs"
});

const HM_HEALTH = Object.freeze({
  EXCELLENT: "excellent",
  GOOD: "good",
  DEGRADED: "degraded",
  CRITICAL: "critical",
  FAILED: "failed"
});

const HM_HEALTH_ORDER = Object.freeze([
  HM_HEALTH.EXCELLENT,
  HM_HEALTH.GOOD,
  HM_HEALTH.DEGRADED,
  HM_HEALTH.CRITICAL,
  HM_HEALTH.FAILED
]);

/** Default configurable thresholds (inclusive bounds). */
const HM_DEFAULT_THRESHOLDS = Object.freeze({
  excellent: Object.freeze({ min: 95, max: 100 }),
  good: Object.freeze({ min: 80, max: 94 }),
  degraded: Object.freeze({ min: 50, max: 79 }),
  critical: Object.freeze({ min: 20, max: 49 }),
  failed: Object.freeze({ min: 0, max: 19 })
});

/** Seed interval examples (ms). */
const HM_DEFAULT_INTERVALS_MS = Object.freeze({
  kernel: 1000,
  "event-bus": 1000,
  ai: 5000,
  battle: 2000,
  obs: 3000,
  plugins: 10000
});

const HM_EVENT = Object.freeze({
  HEALTH_CHANGED: "HealthChanged"
});

const HM_PUBLIC_API = Object.freeze([
  "register",
  "recordMeasurement",
  "setIntervalMs",
  "addRule",
  "evaluateRules",
  "createReport",
  "trend",
  "recoveryFeed",
  "watchdogFeed",
  "monitoringSnapshot",
  "metrics",
  "subscribe"
]);

const HM_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-health-core/healthManager.js",
  "shared/mia-resource-core/resourceManager.js",
  "shared/mia-state-core/stateManager.js",
  "shared/mia-runtime-core/runtimeManager.js",
  "docs/master-canon/0064-health-manager.md"
]);

const HM_AUTHORIZED_SOURCES = Object.freeze([
  "kernel",
  "health_manager",
  "health-probe",
  "resource-manager",
  "runtime-manager",
  "service_manager",
  "monitoring",
  "operator",
  "system"
]);

const HM_DIAGNOSTIC_FLAGS = Object.freeze({
  healthIsState: false,
  diagnosticOnly: true,
  performsRecovery: false,
  performsRestart: false,
  performsSafeMode: false,
  performsShutdown: false
});

let activeHealthManager = null;

function makeId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${crypto.randomBytes(16).toString("hex")}`;
}

function assertDirectHealthMutationForbidden(activity) {
  if (
    activity === "direct_health_write" ||
    activity === "forge_score" ||
    activity === "mutate_without_manager" ||
    activity === "bypass_measurement"
  ) {
    return { ok: false, error: "direct_health_mutation_forbidden" };
  }
  return { ok: true };
}

function validateScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return { ok: false, error: "invalid_score" };
  }
  if (score < 0 || score > 100) {
    return { ok: false, error: "score_out_of_range" };
  }
  return { ok: true, score };
}

function validateThresholds(thresholds) {
  const t = thresholds || HM_DEFAULT_THRESHOLDS;
  const levels = [
    "failed",
    "critical",
    "degraded",
    "good",
    "excellent"
  ];
  let expectedMin = 0;
  for (const level of levels) {
    const band = t[level];
    if (!band || typeof band.min !== "number" || typeof band.max !== "number") {
      return { ok: false, error: "invalid_thresholds" };
    }
    if (band.min > band.max || band.min < 0 || band.max > 100) {
      return { ok: false, error: "invalid_thresholds" };
    }
    if (band.min !== expectedMin) {
      return { ok: false, error: "invalid_thresholds" };
    }
    expectedMin = band.max + 1;
  }
  if (t.excellent.max !== 100) {
    return { ok: false, error: "invalid_thresholds" };
  }
  return { ok: true, thresholds: t };
}

function scoreToHealth(score, thresholds = HM_DEFAULT_THRESHOLDS) {
  const checked = validateScore(score);
  if (!checked.ok) return checked;
  const thr = validateThresholds(thresholds);
  if (!thr.ok) return thr;
  const t = thr.thresholds;
  if (score >= t.excellent.min) return { ok: true, health: HM_HEALTH.EXCELLENT };
  if (score >= t.good.min) return { ok: true, health: HM_HEALTH.GOOD };
  if (score >= t.degraded.min) return { ok: true, health: HM_HEALTH.DEGRADED };
  if (score >= t.critical.min) return { ok: true, health: HM_HEALTH.CRITICAL };
  return { ok: true, health: HM_HEALTH.FAILED };
}

/**
 * Deterministic rule evaluation.
 * Built-ins: cpu>90 → -10; noResponse → force failed.
 * Custom: { type: "deduction", when, amount } | { type: "force_level", when, level }
 */
function evaluateRules(measurement = {}, rules = []) {
  let score = typeof measurement.baseScore === "number" ? measurement.baseScore : 100;
  let forcedLevel = null;
  const applied = [];

  const cpu = Number(measurement.cpu);
  if (Number.isFinite(cpu) && cpu > 90) {
    score -= 10;
    applied.push({ rule: "cpu_gt_90", effect: "deduction", amount: 10 });
  }
  if (measurement.noResponse === true || measurement.responding === false) {
    forcedLevel = HM_HEALTH.FAILED;
    score = 0;
    applied.push({ rule: "no_response", effect: "force_level", level: HM_HEALTH.FAILED });
  }

  for (const rule of rules) {
    if (!rule || typeof rule !== "object") continue;
    const when = rule.when;
    let match = false;
    if (typeof when === "function") {
      match = !!when(measurement);
    } else if (when && typeof when === "object") {
      match = Object.keys(when).every((k) => measurement[k] === when[k]);
    } else if (typeof when === "string") {
      match = measurement[when] === true;
    }
    if (!match) continue;

    if (rule.type === "force_level" && rule.level) {
      forcedLevel = rule.level;
      if (rule.level === HM_HEALTH.FAILED) score = 0;
      applied.push({ rule: rule.id || "custom_force", effect: "force_level", level: rule.level });
    } else if (rule.type === "deduction") {
      const amount = Number(rule.amount) || 0;
      score -= amount;
      applied.push({
        rule: rule.id || "custom_deduction",
        effect: "deduction",
        amount
      });
    }
  }

  score = Math.max(0, Math.min(100, score));
  return Object.freeze({
    ok: true,
    score,
    forcedLevel,
    applied: Object.freeze([...applied])
  });
}

function analyzeTrend(historyScores = []) {
  const scores = historyScores
    .map((h) => (typeof h === "number" ? h : h && h.score))
    .filter((s) => typeof s === "number" && Number.isFinite(s));

  if (scores.length < 2) {
    return Object.freeze({
      direction: "stable",
      delta: 0,
      slope: 0,
      gradualDegradation: false,
      samples: scores.length
    });
  }

  const first = scores[0];
  const last = scores[scores.length - 1];
  const delta = last - first;
  const n = scores.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += scores[i];
    sumXY += i * scores[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

  let direction = "stable";
  if (slope <= -0.5 || delta <= -5) direction = "degrading";
  else if (slope >= 0.5 || delta >= 5) direction = "improving";

  let gradualDegradation = false;
  if (scores.length >= 3) {
    let risingPressure = 0;
    for (let i = 1; i < scores.length; i += 1) {
      if (scores[i] < scores[i - 1]) risingPressure += 1;
    }
    gradualDegradation =
      direction === "degrading" &&
      risingPressure >= Math.ceil((scores.length - 1) * 0.6);
  }

  return Object.freeze({
    direction,
    delta,
    slope,
    gradualDegradation,
    samples: scores.length
  });
}

function createHealthDescriptor(input = {}, intervals = HM_DEFAULT_INTERVALS_MS) {
  const component = String(input.component || input.componentId || "").trim();
  if (!component) return { ok: false, error: "missing_component" };
  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const scope = input.scope || HM_SCOPE.SERVICE;
  if (!Object.values(HM_SCOPE).includes(scope)) {
    return { ok: false, error: "unknown_scope" };
  }

  const score = typeof input.score === "number" ? input.score : 100;
  const scoreCheck = validateScore(score);
  if (!scoreCheck.ok) return scoreCheck;

  const mapped = scoreToHealth(score, input.thresholds);
  if (!mapped.ok) return mapped;

  const intervalKey = input.intervalKey || component;
  const intervalMs =
    typeof input.intervalMs === "number"
      ? input.intervalMs
      : intervals[intervalKey] != null
        ? intervals[intervalKey]
        : intervals.plugins || 10000;

  const now = Date.now();
  return {
    ok: true,
    descriptor: Object.freeze({
      healthId: input.healthId || makeId("hm"),
      owner,
      component,
      scope,
      currentHealth: input.currentHealth || mapped.health,
      previousHealth: null,
      score,
      lastCheck: null,
      nextCheck: now + intervalMs,
      intervalMs,
      intervalKey,
      healthIsState: false,
      protected: input.protected === true
    })
  };
}

function createHealthManager(options = {}) {
  if (
    activeHealthManager &&
    activeHealthManager.isActive() &&
    options.allowParallelForTest !== true &&
    options.singleton !== false
  ) {
    return Object.freeze({
      ok: false,
      error: "health_manager_already_active",
      soleHealthAuthority: true
    });
  }

  const thrCheck = validateThresholds(options.thresholds || HM_DEFAULT_THRESHOLDS);
  if (!thrCheck.ok) {
    return Object.freeze({ ok: false, error: thrCheck.error });
  }
  let thresholds = thrCheck.thresholds;

  const intervals = {
    ...HM_DEFAULT_INTERVALS_MS,
    ...(options.intervals || {})
  };

  const registry = new Map();
  const componentIndex = new Map();
  const rulesByComponent = new Map();
  const history = [];
  const audit = [];
  const reportArchive = [];
  const publishedEvents = [];
  const subscribers = [];
  let checkCount = 0;
  let invalidWrites = 0;
  let eventCount = 0;
  let reportCount = 0;

  const eventBus =
    options.eventBus ||
    ({
      publish(event) {
        return { ok: true, event };
      }
    });
  const authorized = new Set(
    options.authorizedSources || HM_AUTHORIZED_SOURCES
  );

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

  function get(healthId) {
    return registry.get(healthId) || null;
  }

  function findByComponent(component) {
    const id = componentIndex.get(component);
    return id ? get(id) : null;
  }

  function set(healthId, patch) {
    const prev = get(healthId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    registry.set(healthId, next);
    return next;
  }

  function publishHealthChanged(payload) {
    const event = Object.freeze({
      type: HM_EVENT.HEALTH_CHANGED,
      ...payload,
      at: Date.now()
    });
    publishedEvents.push(event);
    eventCount += 1;
    let busOk = true;
    try {
      const published = eventBus.publish(event);
      busOk = !!(published && published.ok);
    } catch (_) {
      busOk = false;
    }
    for (const sub of subscribers) {
      try {
        sub(event);
      } catch (_) {
        /* isolate subscriber failures */
      }
    }
    return { ok: busOk, event };
  }

  function register(input = {}, meta = {}) {
    const forbidden = assertDirectHealthMutationForbidden(meta.activity);
    if (!forbidden.ok) {
      invalidWrites += 1;
      return forbidden;
    }
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      invalidWrites += 1;
      return { ok: false, error: "unauthorized_registry_write" };
    }

    const built = createHealthDescriptor(input, intervals);
    if (!built.ok) return built;

    if (componentIndex.has(built.descriptor.component)) {
      return {
        ok: false,
        error: "duplicate_component",
        component: built.descriptor.component
      };
    }
    if (registry.has(built.descriptor.healthId)) {
      return {
        ok: false,
        error: "duplicate_health_id",
        healthId: built.descriptor.healthId
      };
    }

    registry.set(built.descriptor.healthId, built.descriptor);
    componentIndex.set(built.descriptor.component, built.descriptor.healthId);
    appendAudit({
      action: "registered",
      healthId: built.descriptor.healthId,
      component: built.descriptor.component,
      result: built.descriptor.currentHealth,
      actor: meta.actor || meta.source || "system"
    });
    return { ok: true, health: built.descriptor };
  }

  function addRule(component, rule, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      invalidWrites += 1;
      return { ok: false, error: "unauthorized_health_configuration" };
    }
    if (!componentIndex.has(component)) {
      return { ok: false, error: "unknown_component" };
    }
    const list = rulesByComponent.get(component) || [];
    list.push(Object.freeze({ ...rule }));
    rulesByComponent.set(component, list);
    return { ok: true, count: list.length };
  }

  function setIntervalMs(component, intervalMs, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      invalidWrites += 1;
      return { ok: false, error: "unauthorized_health_configuration" };
    }
    const record = findByComponent(component);
    if (!record) return { ok: false, error: "unknown_component" };
    const ms = Number(intervalMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      return { ok: false, error: "invalid_interval" };
    }
    intervals[record.intervalKey || component] = ms;
    const now = Date.now();
    const updated = set(record.healthId, {
      intervalMs: ms,
      nextCheck: (record.lastCheck || now) + ms
    });
    return { ok: true, health: updated, intervalMs: ms };
  }

  function setThresholds(nextThresholds, meta = {}) {
    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      invalidWrites += 1;
      return { ok: false, error: "unauthorized_health_configuration" };
    }
    const checked = validateThresholds(nextThresholds);
    if (!checked.ok) return checked;
    thresholds = checked.thresholds;
    return { ok: true, thresholds };
  }

  function recordMeasurement(healthIdOrComponent, measurement = {}, meta = {}) {
    const forbidden = assertDirectHealthMutationForbidden(meta.activity);
    if (!forbidden.ok) {
      invalidWrites += 1;
      appendAudit({
        action: "denied",
        result: forbidden.error,
        actor: meta.actor || meta.source || "unknown"
      });
      return forbidden;
    }

    if (!isAuthorized(meta) || !isSourceVerified(meta)) {
      invalidWrites += 1;
      appendAudit({
        action: "denied",
        result: "unauthorized_or_unverified",
        actor: meta.actor || meta.source || "unknown"
      });
      return { ok: false, error: "unauthorized_measurement" };
    }

    let record =
      get(healthIdOrComponent) || findByComponent(healthIdOrComponent);
    if (!record) return { ok: false, error: "unknown_health" };

    if (meta.directScoreWrite === true || meta.forgeScore === true) {
      invalidWrites += 1;
      return { ok: false, error: "forged_score_write_rejected" };
    }

    const componentRules = rulesByComponent.get(record.component) || [];
    const evaluated = evaluateRules(measurement, componentRules);
    const scoreCheck = validateScore(evaluated.score);
    if (!scoreCheck.ok) {
      invalidWrites += 1;
      return scoreCheck;
    }

    let nextScore = evaluated.score;
    let healthResult = scoreToHealth(nextScore, thresholds);
    if (!healthResult.ok) return healthResult;
    let nextHealth = healthResult.health;
    if (evaluated.forcedLevel) {
      if (!Object.values(HM_HEALTH).includes(evaluated.forcedLevel)) {
        return { ok: false, error: "invalid_forced_level" };
      }
      nextHealth = evaluated.forcedLevel;
      const forcedBand = thresholds[nextHealth];
      nextScore = Math.max(
        forcedBand.min,
        Math.min(forcedBand.max, nextScore)
      );
    }

    const previousHealth = record.currentHealth;
    const previousScore = record.score;
    const now = Date.now();
    const intervalMs = record.intervalMs || intervals[record.intervalKey] || 10000;

    const updated = set(record.healthId, {
      previousHealth,
      currentHealth: nextHealth,
      score: nextScore,
      lastCheck: now,
      nextCheck: now + intervalMs
    });

    const hist = Object.freeze({
      healthId: record.healthId,
      component: record.component,
      previousHealth,
      currentHealth: nextHealth,
      previousScore,
      score: nextScore,
      applied: evaluated.applied,
      at: now,
      source: meta.source || meta.actor || "health_manager",
      immutable: true
    });
    history.push(hist);
    checkCount += 1;

    appendAudit({
      action: "measurement",
      healthId: record.healthId,
      component: record.component,
      result: `${previousHealth}->${nextHealth}`,
      score: nextScore,
      actor: meta.source || meta.actor || "health_manager"
    });

    let eventPublished = false;
    if (previousHealth !== nextHealth) {
      const published = publishHealthChanged({
        healthId: record.healthId,
        component: record.component,
        owner: record.owner,
        scope: record.scope,
        previousHealth,
        currentHealth: nextHealth,
        score: nextScore,
        reason: meta.reason || "measurement"
      });
      eventPublished = published.ok;
    }

    return {
      ok: true,
      health: updated,
      levelChanged: previousHealth !== nextHealth,
      eventPublished,
      eventType: previousHealth !== nextHealth ? HM_EVENT.HEALTH_CHANGED : null,
      applied: evaluated.applied
    };
  }

  function createReport(meta = {}) {
    const components = [...registry.values()];
    let scoreSum = 0;
    let failedCount = 0;
    let criticalCount = 0;
    const moduleScores = {};
    const componentScores = {};

    for (const r of components) {
      scoreSum += r.score;
      componentScores[r.component] = r.score;
      const key = r.scope || "service";
      if (!moduleScores[key]) moduleScores[key] = { sum: 0, count: 0 };
      moduleScores[key].sum += r.score;
      moduleScores[key].count += 1;
      if (r.currentHealth === HM_HEALTH.FAILED) failedCount += 1;
      if (r.currentHealth === HM_HEALTH.CRITICAL) criticalCount += 1;
    }

    const overall =
      components.length > 0 ? scoreSum / components.length : 100;

    const byScopeTrends = {};
    for (const scope of Object.values(HM_SCOPE)) {
      const scopedHist = history
        .filter((h) => {
          const rec = get(h.healthId);
          return rec && rec.scope === scope;
        })
        .map((h) => h.score);
      byScopeTrends[scope] = analyzeTrend(scopedHist);
    }

    const report = Object.freeze({
      reportId: makeId("hmr"),
      at: Date.now(),
      overallSystemScore: overall,
      moduleScores: Object.freeze(
        Object.fromEntries(
          Object.entries(moduleScores).map(([k, v]) => [
            k,
            v.count ? v.sum / v.count : 100
          ])
        )
      ),
      componentScores: Object.freeze({ ...componentScores }),
      failedCount,
      criticalCount,
      trends: Object.freeze(byScopeTrends),
      immutable: true,
      actor: meta.actor || "health_manager"
    });

    reportArchive.push(report);
    reportCount += 1;
    appendAudit({
      action: "report",
      result: report.reportId,
      actor: meta.actor || "health_manager"
    });
    return { ok: true, report };
  }

  function trend(componentOrHealthId) {
    const record =
      get(componentOrHealthId) || findByComponent(componentOrHealthId);
    if (!record) return { ok: false, error: "unknown_health" };
    const scores = history
      .filter((h) => h.healthId === record.healthId)
      .map((h) => h.score);
    return {
      ok: true,
      component: record.component,
      healthId: record.healthId,
      ...analyzeTrend(scores)
    };
  }

  function recoveryFeed() {
    const failed = [...registry.values()].filter(
      (r) =>
        r.currentHealth === HM_HEALTH.FAILED ||
        r.currentHealth === HM_HEALTH.CRITICAL
    );
    return Object.freeze({
      diagnosticOnly: true,
      performsRecovery: false,
      performsRestart: false,
      performsSafeMode: false,
      performsShutdown: false,
      source: "health_manager",
      objects: Object.freeze(
        failed.map((r) =>
          Object.freeze({
            healthId: r.healthId,
            component: r.component,
            scope: r.scope,
            currentHealth: r.currentHealth,
            score: r.score
          })
        )
      )
    });
  }

  function watchdogFeed() {
    return Object.freeze({
      diagnosticOnly: true,
      performsRecovery: false,
      performsRestart: false,
      source: "health_manager",
      registryCount: registry.size,
      failedCount: [...registry.values()].filter(
        (r) => r.currentHealth === HM_HEALTH.FAILED
      ).length,
      criticalCount: [...registry.values()].filter(
        (r) => r.currentHealth === HM_HEALTH.CRITICAL
      ).length,
      overall:
        registry.size > 0
          ? [...registry.values()].reduce((s, r) => s + r.score, 0) /
            registry.size
          : 100,
      objects: Object.freeze(
        [...registry.values()].map((r) =>
          Object.freeze({
            healthId: r.healthId,
            component: r.component,
            scope: r.scope,
            currentHealth: r.currentHealth,
            score: r.score,
            lastCheck: r.lastCheck,
            nextCheck: r.nextCheck
          })
        )
      )
    });
  }

  function monitoringSnapshot() {
    const byScope = {};
    for (const scope of [
      HM_SCOPE.SYSTEM,
      HM_SCOPE.SERVICE,
      HM_SCOPE.AI,
      HM_SCOPE.BATTLE,
      HM_SCOPE.OBS,
      HM_SCOPE.PLATFORM
    ]) {
      const items = [...registry.values()].filter((r) => r.scope === scope);
      const avg =
        items.length > 0
          ? items.reduce((s, r) => s + r.score, 0) / items.length
          : null;
      byScope[scope] = Object.freeze({
        count: items.length,
        averageScore: avg,
        levels: Object.freeze(
          items.map((r) =>
            Object.freeze({
              component: r.component,
              currentHealth: r.currentHealth,
              score: r.score
            })
          )
        )
      });
    }
    return Object.freeze({
      at: Date.now(),
      system: byScope.system,
      service: byScope.service,
      ai: byScope.ai,
      battle: byScope.battle,
      obs: byScope.obs,
      platform: byScope.platform,
      healthIsState: false
    });
  }

  function metrics() {
    let failedObjects = 0;
    let criticalObjects = 0;
    for (const r of registry.values()) {
      if (r.currentHealth === HM_HEALTH.FAILED) failedObjects += 1;
      if (r.currentHealth === HM_HEALTH.CRITICAL) criticalObjects += 1;
    }
    return Object.freeze({
      registryCount: registry.size,
      checks: checkCount,
      invalidWrites,
      events: eventCount,
      reports: reportCount,
      failedObjects,
      criticalObjects
    });
  }

  function subscribe(handler) {
    if (typeof handler !== "function") {
      return { ok: false, error: "invalid_subscriber" };
    }
    subscribers.push(handler);
    return { ok: true, count: subscribers.length };
  }

  function status() {
    return Object.freeze({
      ok: true,
      singleton: true,
      soleHealthAuthority: true,
      ...HM_DIAGNOSTIC_FLAGS,
      registryCount: registry.size,
      active: activeHealthManager != null,
      thresholds: Object.freeze({ ...thresholds }),
      intervals: Object.freeze({ ...intervals })
    });
  }

  const manager = Object.freeze({
    ok: true,
    register,
    recordMeasurement,
    setIntervalMs,
    setThresholds,
    addRule,
    evaluateRules: (measurement, rules) =>
      evaluateRules(measurement, rules || []),
    createReport,
    trend,
    recoveryFeed,
    watchdogFeed,
    monitoringSnapshot,
    metrics,
    subscribe,
    get,
    findByComponent,
    status,
    history() {
      return Object.freeze([...history]);
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    reportArchive() {
      return Object.freeze([...reportArchive]);
    },
    publishedEvents() {
      return Object.freeze([...publishedEvents]);
    },
    getIntervals() {
      return Object.freeze({ ...intervals });
    },
    getThresholds() {
      return Object.freeze({ ...thresholds });
    },
    isActive() {
      return true;
    },
    // Explicit non-operations — never implement restart/repair
    restart() {
      return {
        ok: false,
        error: "health_manager_does_not_restart",
        diagnosticOnly: true,
        performsRestart: false
      };
    },
    repair() {
      return {
        ok: false,
        error: "health_manager_does_not_repair",
        diagnosticOnly: true,
        performsRecovery: false
      };
    },
    enterSafeMode() {
      return {
        ok: false,
        error: "health_manager_does_not_safe_mode",
        diagnosticOnly: true,
        performsSafeMode: false
      };
    },
    shutdown() {
      return {
        ok: false,
        error: "health_manager_does_not_shutdown",
        diagnosticOnly: true,
        performsShutdown: false
      };
    }
  });

  activeHealthManager = {
    isActive: manager.isActive
  };

  if (options.seedDefaults !== false) {
    const seeds = [
      {
        component: "kernel",
        owner: "kernel",
        scope: HM_SCOPE.SYSTEM,
        intervalKey: "kernel",
        protected: true
      },
      {
        component: "event-bus",
        owner: "kernel",
        scope: HM_SCOPE.SYSTEM,
        intervalKey: "event-bus"
      },
      {
        component: "ai-core",
        owner: "ai",
        scope: HM_SCOPE.AI,
        intervalKey: "ai"
      },
      {
        component: "battle-engine",
        owner: "battle",
        scope: HM_SCOPE.BATTLE,
        intervalKey: "battle"
      },
      {
        component: "obs-bridge",
        owner: "obs",
        scope: HM_SCOPE.OBS,
        intervalKey: "obs"
      },
      {
        component: "plugin-host",
        owner: "modules",
        scope: HM_SCOPE.MODULE,
        intervalKey: "plugins"
      }
    ];
    for (const seed of seeds) {
      register(seed, { actor: "system", authorized: true });
    }
  }

  return manager;
}

function clearHealthSingletonForTest() {
  activeHealthManager = null;
}

module.exports = {
  HM_COMPONENT,
  HM_COMPONENT_ORDER,
  HM_SCOPE,
  HM_HEALTH,
  HM_HEALTH_ORDER,
  HM_DEFAULT_THRESHOLDS,
  HM_DEFAULT_INTERVALS_MS,
  HM_EVENT,
  HM_PUBLIC_API,
  HM_RUNTIME_ANCHORS,
  HM_AUTHORIZED_SOURCES,
  HM_DIAGNOSTIC_FLAGS,
  validateScore,
  validateThresholds,
  scoreToHealth,
  evaluateRules,
  analyzeTrend,
  assertDirectHealthMutationForbidden,
  createHealthDescriptor,
  createHealthManager,
  clearHealthSingletonForTest
};
