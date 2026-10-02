"use strict";

const assert = require("assert");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ensureRuntimeLogsDir } = require("../scripts/MIA_LOG_ROTATION");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const monitoring = require("../shared/mia-monitoring-core");
const architecture = require("../shared/mia-architecture-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pathExists(rel) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) return true;
  return fs.existsSync(path.join(ROOT, rel.split("/")[0]));
}

function assertGitignoredLogsAnchor() {
  const ignored = execFileSync("git", ["check-ignore", "--", "logs/"], {
    cwd: ROOT,
    encoding: "utf8"
  }).trim();
  assert.equal(ignored, "logs/");

  const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  assert.ok(
    indexSrc.includes("ensureRuntimeLogsDir(__dirname)"),
    "index.js boots logs through ensureRuntimeLogsDir"
  );

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mia-logs-anchor-"));
  const project = path.join(scratch, "missing", "runtime");
  const repoLogs = path.join(ROOT, "logs");
  const repoLogsExisted = fs.existsSync(repoLogs);
  assert.equal(fs.existsSync(project), false);

  try {
    const created = ensureRuntimeLogsDir(project);
    assert.equal(created, path.join(project, "logs"));
    assert.equal(fs.statSync(created).isDirectory(), true);
    assert.equal(fs.existsSync(path.join(scratch, "missing")), true);
    assert.equal(fs.existsSync(repoLogs), repoLogsExisted);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0018-monitoring-system.md");
  const alignPath = path.join(MASTER, "0018-alignment.md");

  assert.ok(fs.existsSync(docPath), "0018-monitoring-system.md exists");
  assert.ok(fs.existsSync(alignPath), "0018-alignment.md exists");
  pass("0018 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0018 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0018 critical priority");
  assert.ok(doc.includes("0017"), "0018 links to 0017");
  assert.ok(doc.includes("0019"), "0018 points to 0019");
  pass("0018 structure (23 sections)");

  assert.equal(monitoring.MONITORING_COMPONENT_ORDER.length, 12);
  assert.equal(Object.keys(monitoring.MONITORING_HEALTH).length, 5);
  assert.equal(Object.keys(monitoring.DASHBOARD_PANEL).length, 12);
  pass("monitoring components and health states");

  const cpuAlert = monitoring.evaluateAlertThreshold(
    monitoring.createMetricSample({ kind: monitoring.METRIC_KIND.CPU, value: 95 }),
    monitoring.DEFAULT_ALERT_THRESHOLDS
  );
  assert.equal(cpuAlert.triggered, true);
  assert.equal(cpuAlert.severity, monitoring.ALERT_SEVERITY.CRITICAL);
  pass("alert manager thresholds");

  const health = monitoring.computePlatformHealth([
    monitoring.createHealthReport({ componentId: "runtime", state: monitoring.MONITORING_HEALTH.HEALTHY }),
    monitoring.createHealthReport({ componentId: "ai", state: monitoring.MONITORING_HEALTH.WARNING })
  ]);
  assert.equal(health.state, monitoring.MONITORING_HEALTH.WARNING);
  pass("health monitor platform overview");

  const trend = monitoring.analyzeTrend(
    [10, 12, 15, 18, 22].map((value, i) =>
      monitoring.createMetricSample({ kind: monitoring.METRIC_KIND.RAM, value, capturedAt: i })
    )
  );
  assert.equal(trend.trend, "rising");
  pass("trend analyzer");

  const diagnostic = monitoring.runDiagnostic({
    eventBus: { queueDepth: 5000 },
    ai: { responseMs: 20000 },
    obs: { connected: false }
  });
  assert.ok(diagnostic.recommendations.length >= 2);
  assert.equal(diagnostic.autoApply, false);
  pass("diagnostic engine");

  const audit = monitoring.createAuditMonitorCheck({
    auditEvents: [
      { eventId: "a1", at: 100 },
      { eventId: "a2", at: 200 }
    ]
  });
  assert.equal(audit.ok, true);
  pass("audit monitor");

  const snapshot = monitoring.collectMonitoringSnapshot({
    metrics: [
      { kind: monitoring.METRIC_KIND.CPU, value: 92, name: "cpu" },
      { kind: monitoring.METRIC_KIND.QUEUE_DEPTH, value: 1200, name: "queue_depth" }
    ],
    healthReports: [
      { componentId: "event_bus", state: monitoring.MONITORING_HEALTH.DEGRADED }
    ],
    eventBus: { eventsPerSec: 1200, queueDepth: 1200, retryCount: 3 },
    kojnozout: { bowlPercent: 3, mood: "hungry" },
    ai: { model: "gpt-test", responseMs: 1800 },
    obs: { connected: true, fps: 60 }
  });
  assert.ok(snapshot.alerts.length >= 1);
  assert.equal(snapshot.eventBus.eventsPerSec, 1200);
  assert.equal(snapshot.kojnozout.bowlPercent, 3);
  pass("collect monitoring snapshot");

  const api = monitoring.createMonitoringApiResponse(snapshot);
  assert.equal(api.readOnly, true);
  assert.equal(api.ok, true);
  pass("monitoring API read-only");

  const log = monitoring.aggregateLogEntry({
    component: "event_dispatcher",
    message: "delivery complete",
    correlationId: "corr-1",
    sessionId: "sess-1"
  });
  assert.equal(log.level, monitoring.LOG_LEVEL.INFO);
  pass("log aggregator");

  assert.equal(monitoring.assertMonitoringForbiddenActivity("mutate_business_logic").ok, false);
  pass("forbidden activities");

  const monSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MONITORING);
  assert.equal(monSys.nextDocId, "0019");
  assert.ok(monSys.runtime.includes("shared/mia-monitoring-core/monitoringSystem.js"));
  pass("monitoring system next doc 0019");

  for (const rel of monitoring.MONITORING_RUNTIME_ANCHORS) {
    if (rel === "logs/") {
      assertGitignoredLogsAnchor();
      continue;
    }
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0018"), "README 0018");
  pass("README registry");

  console.log("\nMaster Canon 0018 contract: ALL PASS");
}

run();
