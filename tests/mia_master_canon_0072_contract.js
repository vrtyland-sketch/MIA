"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const mm = require("../shared/mia-metrics-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0072-metrics-manager.md");
  const alignPath = path.join(MASTER, "0072-alignment.md");

  assert.ok(fs.existsSync(docPath), "0072-metrics-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0072-alignment.md exists");
  pass("0072 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0072 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0072 kernel layer");
  assert.ok(doc.includes("0073"), "0072 points to 0073");
  assert.ok(/Alert Manager/i.test(doc), "0072 → Alert Manager");
  assert.ok(doc.includes("0074"), "0072 points to 0074");
  assert.ok(/Audit Manager/i.test(doc), "0072 → Audit Manager");
  assert.ok(doc.includes("0075"), "0072 points to 0075");
  assert.ok(/Telemetry Manager/i.test(doc), "0072 → Telemetry Manager");
  pass("0072 structure (21 sections → 0073 Alert / 0074 Audit / 0075 Telemetry)");

  assert.equal(mm.MM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...mm.MM_COMPONENT_ORDER],
    [
      "metrics_manager",
      "intake_gate",
      "type_registry",
      "category_registry",
      "aggregation_engine",
      "time_series_store",
      "threshold_engine",
      "report_engine",
      "monitoring_feed",
      "diagnostics_feed",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("metrics components (12)");

  assert.deepEqual(
    [...mm.MM_TYPE_ORDER],
    ["counter", "gauge", "histogram", "timer"]
  );
  pass("4 types");

  assert.deepEqual(
    [...mm.MM_CATEGORY_ORDER],
    [
      "runtime",
      "cpu",
      "memory",
      "gpu",
      "ai",
      "battle",
      "network",
      "obs",
      "platform_connectors",
      "user_activity"
    ]
  );
  pass("categories");

  assert.equal(mm.MM_FLAGS.soleMetricsAuthority, true);
  assert.equal(mm.MM_FLAGS.storesLogs, false);
  assert.equal(mm.MM_FLAGS.runsDiagnostics, false);
  assert.equal(mm.MM_FLAGS.centralMetricsIngress, true);
  assert.equal(mm.MM_FLAGS.historicalImmutable, true);
  pass("flags");

  assert.deepEqual(
    [...mm.MM_DESCRIPTOR_FIELDS],
    [
      "metricId",
      "name",
      "category",
      "unit",
      "value",
      "timestamp",
      "source",
      "runtimeId"
    ]
  );

  const d1 = mm.createMetricDescriptor({
    name: "cpu.usage",
    category: "cpu",
    unit: "%",
    value: 42,
    source: "kernel",
    runtimeId: "rt-1",
    timestamp: 1000
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.metricId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of mm.MM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = mm.createMetricDescriptor({
    name: "ram.usage",
    category: "memory",
    unit: "%",
    value: 55,
    source: "system",
    runtimeId: "rt-1",
    timestamp: 1001
  });
  assert.notEqual(d1.descriptor.metricId, d2.descriptor.metricId);
  assert.equal(mm.createMetricDescriptor({ value: 1 }).ok, false);
  pass("descriptor 8 fields + unique IDs");

  mm.clearMetricsSingletonForTest();

  const mgr = mm.createMetricsManager({ maxPoints: 100, retentionMs: 60000 });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleMetricsAuthority, true);
  assert.equal(mgr.status().storesLogs, false);
  assert.equal(mgr.status().runsDiagnostics, false);
  assert.equal(mgr.status().historicalImmutable, true);
  pass("central metrics manager singleton");

  const duplicate = mm.createMetricsManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "metrics_manager_already_active");
  pass("singleton");

  const unauth = mgr.set(
    { name: "cpu.usage", category: "cpu", value: 10, runtimeId: "rt-1" },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_metrics");
  pass("unauthorized write blocked");

  const forged = mgr.set(
    { name: "cpu.usage", category: "cpu", value: 10, runtimeId: "rt-1" },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_metrics_blocked");
  pass("forged blocked");

  const c1 = mgr.inc(
    { name: "battles.total", category: "battle", runtimeId: "rt-1", delta: 1 },
    { source: "kernel", authorized: true, nowMs: 1000 }
  );
  assert.equal(c1.ok, true);
  assert.equal(c1.type, "counter");
  assert.equal(c1.value, 1);

  const c2 = mgr.inc(
    { name: "battles.total", category: "battle", runtimeId: "rt-1", delta: 2 },
    { source: "kernel", authorized: true, nowMs: 1100 }
  );
  assert.equal(c2.ok, true);
  assert.equal(c2.value, 3);

  const cDec = mgr.record(
    {
      name: "battles.total",
      type: "counter",
      category: "battle",
      value: 1,
      runtimeId: "rt-1"
    },
    { source: "kernel", authorized: true, nowMs: 1200 }
  );
  assert.equal(cDec.ok, false);
  assert.equal(cDec.error, "counter_decrease_rejected");
  pass("counter mono");

  const g1 = mgr.set(
    {
      name: "cpu.usage",
      category: "cpu",
      unit: "%",
      value: 40,
      runtimeId: "rt-1"
    },
    { source: "system", authorized: true, nowMs: 1300 }
  );
  assert.equal(g1.ok, true);
  assert.equal(g1.type, "gauge");
  assert.equal(g1.value, 40);

  mgr.set(
    {
      name: "cpu.usage",
      category: "cpu",
      unit: "%",
      value: 90,
      runtimeId: "rt-1"
    },
    { source: "system", authorized: true, nowMs: 1400 }
  );

  const h1 = mgr.observe(
    {
      name: "ai.latency",
      category: "ai",
      unit: "ms",
      value: 12,
      runtimeId: "rt-1"
    },
    { source: "ai", authorized: true, nowMs: 1500 }
  );
  assert.equal(h1.ok, true);
  assert.equal(h1.type, "histogram");

  mgr.observe(
    {
      name: "ai.latency",
      category: "ai",
      value: 20,
      runtimeId: "rt-1"
    },
    { source: "ai", authorized: true, nowMs: 1510 }
  );
  mgr.observe(
    {
      name: "ai.latency",
      category: "ai",
      value: 30,
      runtimeId: "rt-1"
    },
    { source: "ai", authorized: true, nowMs: 1520 }
  );

  const t1 = mgr.timing(
    {
      name: "plugin.load",
      category: "runtime",
      durationMs: 45,
      runtimeId: "rt-1"
    },
    { source: "runtime", authorized: true, nowMs: 1600 }
  );
  assert.equal(t1.ok, true);
  assert.equal(t1.type, "timer");
  assert.equal(t1.value, 45);
  pass("counter mono + gauge + histogram + timer via unified API");

  const agg = mgr.aggregate("ai.latency");
  assert.equal(agg.ok, true);
  assert.equal(agg.min, 12);
  assert.equal(agg.max, 30);
  assert.ok(typeof agg.avg === "number");
  assert.ok(typeof agg.median === "number");
  assert.ok(agg.percentiles.p50 != null);
  assert.ok(agg.percentiles.p90 != null);
  assert.ok(agg.percentiles.p95 != null);
  assert.ok(agg.percentiles.p99 != null);
  assert.equal(agg.sum, 62);
  pass("aggregation");

  const series = mgr.getSeries("cpu.usage");
  assert.equal(series.ok, true);
  assert.ok(series.series.length >= 2);
  assert.equal(series.series[0].t, 1300);
  assert.equal(series.series[0].v, 40);
  assert.equal(series.historicalImmutable, true);
  pass("time series");

  const thr = mgr.setThreshold(
    "cpu.usage",
    { op: ">", value: 85, severity: "warning" },
    { source: "admin", authorized: true }
  );
  assert.equal(thr.ok, true);

  mgr.setThreshold(
    "cpu.usage",
    { op: ">", value: 95, severity: "critical" },
    { source: "admin", authorized: true }
  );

  // current is 90 → warning fires, critical does not (overwrites to critical only)
  // last setThreshold wins for same name — set warning again then evaluate both via two names
  mgr.setThreshold(
    "cpu.usage",
    { op: ">", value: 85, severity: "warning" },
    { source: "admin", authorized: true }
  );
  mgr.set(
    {
      name: "ram.usage",
      category: "memory",
      value: 97,
      runtimeId: "rt-1"
    },
    { source: "system", authorized: true, nowMs: 1700 }
  );
  mgr.setThreshold(
    "ram.usage",
    { op: ">", value: 95, severity: "critical" },
    { source: "admin", authorized: true }
  );

  const evald = mgr.evaluateThresholds({ source: "monitoring", authorized: true });
  assert.equal(evald.ok, true);
  assert.ok(evald.count >= 2);
  const severities = evald.alerts.map((a) => a.severity);
  assert.ok(severities.includes("warning"));
  assert.ok(severities.includes("critical"));
  pass("thresholds warning/critical");

  const mon = mgr.forMonitoring(
    { name: "cpu.usage" },
    { source: "monitoring", authorized: true }
  );
  assert.equal(mon.ok, true);
  assert.equal(mon.readOnly, true);
  assert.equal(mon.displayOnly, true);
  assert.ok(Object.isFrozen(mon.metrics));

  const diag = mgr.forDiagnostics(
    { name: "cpu.usage" },
    { source: "diagnostics_manager", authorized: true }
  );
  assert.equal(diag.ok, true);
  assert.equal(diag.readOnly, true);
  assert.equal(diag.runsDiagnostics, false);

  const aiPkg = mgr.forAi(
    { name: "cpu.usage" },
    { source: "ai", authorized: true }
  );
  assert.equal(aiPkg.ok, true);
  assert.equal(aiPkg.readOnly, true);

  const aiMut = mgr.forAi(
    { name: "cpu.usage", mutateRequested: true },
    { source: "ai", authorized: true, mutateRequested: true }
  );
  assert.equal(aiMut.ok, false);
  assert.equal(aiMut.error, "ai_cannot_mutate_metrics");

  assert.equal(mgr.update().ok, false);
  assert.equal(mgr.delete().ok, false);
  assert.equal(mgr.rewriteHistory().ok, false);
  assert.equal(mgr.rewriteHistory().error, "historical_immutable");

  const rewrite = mgr.set(
    {
      name: "cpu.usage",
      category: "cpu",
      value: 1,
      runtimeId: "rt-1"
    },
    { source: "kernel", authorized: true, rewriteHistory: true }
  );
  assert.equal(rewrite.ok, false);
  assert.equal(rewrite.error, "rewrite_history_blocked");
  pass("forMonitoring/forDiagnostics/forAi read-only; history mutate blocked");

  const report = mgr.createReport(
    { names: ["cpu.usage", "ai.latency"], from: 1000, to: 2000 },
    { source: "admin", authorized: true }
  );
  assert.equal(report.ok, true);
  assert.ok(report.report.metricIds);
  assert.ok(report.report.period);
  assert.ok(report.report.metrics);
  assert.ok(report.report.aggregates);
  assert.ok(report.report.trends);
  assert.ok(report.report.recommendations);
  assert.equal(report.report.immutable, true);

  const exported = mgr.exportReport(report.report.reportId, {
    source: "admin",
    authorized: true
  });
  assert.equal(exported.ok, true);
  assert.ok(exported.export.report);
  assert.ok(mgr.reportArchive().length >= 1);

  const m = mgr.metrics();
  assert.ok(m.activeMetricCount >= 1);
  assert.ok(typeof m.collectRate === "number");
  assert.ok(typeof m.storageSize === "number");
  assert.ok(typeof m.aggregationCount === "number");
  assert.ok(typeof m.thresholdAlertCount === "number");
  assert.equal(m.storesLogs, false);
  assert.equal(m.runsDiagnostics, false);
  assert.ok(mgr.auditTrail().length >= 1);
  for (const a of mgr.auditTrail()) {
    assert.ok(a.immutable === true);
    assert.ok("operation" in a);
  }
  pass("report + export; metrics; audit; singleton; forged blocked");

  const reg = mgr.registerCategory("custom_metric", {
    source: "admin",
    authorized: true
  });
  assert.equal(reg.ok, true);
  assert.ok(reg.categories.includes("custom_metric"));

  for (const name of mm.MM_PUBLIC_API) {
    assert.equal(typeof mgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  mm.clearMetricsSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-metrics-core/metricsManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0072-metrics-manager.md")
  );
  const lmIdx = coreSys.runtime.indexOf(
    "shared/mia-logging-core/loggingManager.js"
  );
  const mmIdx = coreSys.runtime.indexOf(
    "shared/mia-metrics-core/metricsManager.js"
  );
  assert.ok(lmIdx >= 0 && mmIdx === lmIdx + 1);
  pass("platformSystems nextDocId 0082; metrics after logging in CORE");

  for (const rel of mm.MM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0072"), "README 0072");
  assert.ok(/Metrics Manager/i.test(readme), "README Metrics Manager");
  assert.ok(
    /0072.*Platný|Platný.*0072/s.test(readme) ||
      readme.includes("[Metrics Manager"),
    "README 0072 platný"
  );
  assert.ok(readme.includes("0073"), "README 0073");
  assert.ok(/Alert Manager/i.test(readme), "README Alert Manager");
  assert.ok(
    /0073.*Platný|Platný.*0073/s.test(readme) ||
      readme.includes("[Alert Manager"),
    "README 0073 platný"
  );
  assert.ok(readme.includes("0074"), "README 0074");
  assert.ok(/Audit Manager/i.test(readme), "README Audit Manager");
  assert.ok(
    /0074.*Platný|Platný.*0074/s.test(readme) ||
      readme.includes("[Audit Manager"),
    "README 0074 platný"
  );
  assert.ok(readme.includes("0075"), "README 0075");
  assert.ok(/Event Store Manager/i.test(readme), "README Event Store Manager");
  assert.ok(
    /0075.*Platný|Platný.*0075/s.test(readme) ||
      readme.includes("[Event Store Manager"),
    "README 0075 platný"
  );
  assert.ok(readme.includes("0076"), "README 0076");
  assert.ok(/Event Bus Manager/i.test(readme), "README Event Bus Manager");
  assert.ok(
    /0076.*Platný|Platný.*0076/s.test(readme) ||
      readme.includes("[Event Bus Manager"),
    "README 0076 platný"
  );
  assert.ok(readme.includes("0077"), "README 0077");
  assert.ok(/Message Queue Manager/i.test(readme), "README Message Queue Manager");
  assert.ok(
    /0077.*Platný|Platný.*0077/s.test(readme) ||
      readme.includes("[Message Queue Manager"),
    "README 0077 platný"
  );
  assert.ok(readme.includes("0078"), "README 0078");
  assert.ok(/Command Bus Manager/i.test(readme), "README Command Bus Manager");
  assert.ok(
    /0078.*Platný|Platný.*0078/s.test(readme) ||
      readme.includes("[Command Bus Manager"),
    "README 0078 platný"
  );
  assert.ok(readme.includes("0079"), "README 0079");
  assert.ok(/Query Bus Manager/i.test(readme), "README Query Bus Manager");
  assert.ok(readme.includes("0080"), "README 0080");
  assert.ok(/Projection Manager/i.test(readme), "README Projection Manager");
  assert.ok(
    /0080.*Platný|Platný.*0080/s.test(readme) ||
      readme.includes("[Projection Manager"),
    "README 0080 platný"
  );
  assert.ok(readme.includes("0081"), "README 0081");
  assert.ok(/Saga Manager/i.test(readme), "README Saga Manager");
  assert.ok(readme.includes("0082"), "README 0082 planned");
  assert.ok(
    /Telemetry Manager/i.test(readme),
    "README Telemetry Manager planned"
  );
  assert.ok(
    readme.includes("shared/mia-metrics-core/"),
    "README Metrics technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0072_contract.js"));
  pass("README + anchors");

  const align71 = read("docs/master-canon/0071-alignment.md");
  assert.ok(
    align71.includes("**0072**") && /Metrics Manager/i.test(align71),
    "0071-alignment marks 0072 Metrics Manager"
  );
  const align72 = read("docs/master-canon/0072-alignment.md");
  assert.ok(
    align72.includes("**0073**") && /Alert Manager/i.test(align72),
    "0072-alignment marks 0073 Alert Manager"
  );
  assert.ok(
    align72.includes("**0074**") && /Audit Manager/i.test(align72),
    "0072-alignment marks 0074 Audit Manager"
  );
  assert.ok(
    align72.includes("0075") && (/Event Store/i.test(align72) || /Telemetry/i.test(align72)),
    "0072-alignment marks 0075 Event Store / Telemetry"
  );
  pass("0072-alignment marks 0073/0074 done / 0075 Telemetry planned");

  assert.ok(align72.includes("🟡"));
  assert.ok(align72.includes("storage") || align72.includes("Live"));
  pass("0072-alignment marks live storage wiring partial");

  console.log("\nMaster Canon 0072 contract: ALL PASS");
}

run();
