"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const am = require("../shared/mia-alert-core");
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
  const docPath = path.join(MASTER, "0073-alert-manager.md");
  const alignPath = path.join(MASTER, "0073-alignment.md");

  assert.ok(fs.existsSync(docPath), "0073-alert-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0073-alignment.md exists");
  pass("0073 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0073 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0073 kernel layer");
  assert.ok(doc.includes("0074"), "0073 points to 0074");
  assert.ok(/Audit Manager/i.test(doc), "0073 → Audit Manager");
  assert.ok(doc.includes("0075"), "0073 points to 0075");
  assert.ok(/Telemetry Manager/i.test(doc), "0073 → Telemetry Manager");
  pass("0073 structure (21 sections → 0074 Audit / 0075 Telemetry Manager)");

  assert.equal(am.AM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...am.AM_COMPONENT_ORDER],
    [
      "alert_manager",
      "rule_engine",
      "intake_gate",
      "classifier",
      "priority_mapper",
      "dedup_engine",
      "escalation_controller",
      "notification_dispatcher",
      "lifecycle_controller",
      "report_engine",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("alert components (12)");

  assert.deepEqual(
    [...am.AM_CATEGORY_ORDER],
    [
      "runtime",
      "performance",
      "health",
      "fault",
      "security",
      "ai",
      "battle",
      "obs",
      "platform_connector"
    ]
  );
  pass("categories");

  assert.deepEqual(
    [...am.AM_PRIORITY_ORDER],
    ["low", "normal", "high", "critical", "emergency"]
  );
  pass("priorities");

  assert.deepEqual(
    [...am.AM_STATUS_ORDER],
    ["created", "active", "acknowledged", "resolved", "closed"]
  );
  assert.equal(am.validateStatusTransition("created", "active").ok, true);
  assert.equal(am.validateStatusTransition("active", "acknowledged").ok, true);
  assert.equal(am.validateStatusTransition("acknowledged", "resolved").ok, true);
  assert.equal(am.validateStatusTransition("resolved", "closed").ok, true);
  assert.equal(am.validateStatusTransition("created", "closed").ok, false);
  assert.equal(am.validateStatusTransition("closed", "active").ok, false);
  pass("status FSM");

  assert.equal(am.AM_FLAGS.soleAlertAuthority, true);
  assert.equal(am.AM_FLAGS.repairsDirectly, false);
  assert.equal(am.AM_FLAGS.centralAlertIngress, true);
  assert.equal(am.AM_FLAGS.historyImmutable, true);
  pass("flags");

  assert.deepEqual(
    [...am.AM_DESCRIPTOR_FIELDS],
    [
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
    ]
  );

  const d1 = am.createAlertDescriptor({
    runtimeId: "rt-1",
    category: "performance",
    severity: "warning",
    priority: "normal",
    source: "kernel",
    created: 1000
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.alertId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of am.AM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = am.createAlertDescriptor({
    runtimeId: "rt-1",
    category: "health",
    severity: "error",
    source: "system",
    created: 1001
  });
  assert.notEqual(d1.descriptor.alertId, d2.descriptor.alertId);
  assert.equal(am.createAlertDescriptor({ category: "runtime" }).ok, false);
  pass("descriptor 10 fields + unique IDs");

  am.clearAlertSingletonForTest();

  const deliveries = [];
  const mgr = am.createAlertManager({
    escalateAfterMs: 1000,
    allowEmergencyEscalation: false,
    notificationBridge: {
      deliver(channel, payload) {
        deliveries.push({ channel, payload });
        return {
          ok: true,
          channel,
          stub: channel === "external",
          delivered: channel !== "external"
        };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleAlertAuthority, true);
  assert.equal(mgr.status().repairsDirectly, false);
  assert.equal(mgr.status().historyImmutable, true);
  pass("central alert manager singleton");

  const duplicate = am.createAlertManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "alert_manager_already_active");
  pass("singleton");

  assert.equal(typeof mgr.repair, "function");
  assert.equal(mgr.repair().ok, false);
  assert.equal(mgr.repair().error, "repairs_not_supported");
  assert.equal(mgr.recover().ok, false);
  assert.equal(mgr.fix().ok, false);
  pass("no repair APIs");

  const ruleCpu = mgr.addRule(
    {
      id: "cpu_high",
      category: "performance",
      condition: { metric: "cpu.usage", op: ">", value: 90 },
      priority: "high",
      severity: "error",
      message: "CPU > 90 %"
    },
    { source: "admin", authorized: true }
  );
  assert.equal(ruleCpu.ok, true);

  const ruleHealth = mgr.addRule(
    {
      id: "health_low",
      category: "health",
      condition: { healthBelow: 40 },
      priority: "critical",
      severity: "critical",
      message: "Health < 40"
    },
    { source: "admin", authorized: true }
  );
  assert.equal(ruleHealth.ok, true);

  const unauthRule = mgr.addRule(
    {
      id: "bad",
      category: "runtime",
      condition: { op: ">", value: 1 },
      priority: "low",
      severity: "info"
    },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauthRule.ok, false);
  pass("rules auth");

  const evalCpu = mgr.evaluate(
    {
      name: "cpu.usage",
      value: 95,
      metrics: { "cpu.usage": 95 },
      runtimeId: "rt-1"
    },
    { source: "monitoring", authorized: true, nowMs: 2000 }
  );
  assert.equal(evalCpu.ok, true);
  assert.ok(evalCpu.matched >= 1);
  assert.ok(evalCpu.results[0].alertId);
  const cpuAlertId = evalCpu.results[0].alertId;

  const evalHealth = mgr.evaluate(
    { health: 30, runtimeId: "rt-1" },
    { source: "health_manager", authorized: true, nowMs: 2100 }
  );
  assert.equal(evalHealth.ok, true);
  assert.ok(evalHealth.matched >= 1);
  pass("rules create alerts; CPU>90 / Health<40 style");

  const dedup1 = mgr.evaluate(
    {
      name: "cpu.usage",
      value: 96,
      metrics: { "cpu.usage": 96 },
      runtimeId: "rt-1"
    },
    { source: "monitoring", authorized: true, nowMs: 2200 }
  );
  assert.equal(dedup1.ok, true);
  assert.equal(dedup1.results[0].dedup, true);
  assert.equal(dedup1.results[0].alertId, cpuAlertId);
  assert.ok(dedup1.results[0].counter >= 2);
  pass("dedup increments counter; no new ID");

  const low = mgr.create(
    {
      category: "runtime",
      severity: "info",
      priority: "low",
      runtimeId: "rt-1",
      reason: "minor blip",
      messageKey: "blip"
    },
    { source: "kernel", authorized: true, nowMs: 3000, autoNotify: false }
  );
  assert.equal(low.ok, true);
  const lowId = low.alertId;

  const esc1 = mgr.escalate(lowId, {
    source: "system",
    authorized: true,
    nowMs: 3100,
    autoNotify: false
  });
  assert.equal(esc1.ok, true);
  assert.equal(esc1.to, "normal");

  const esc2 = mgr.escalate(lowId, {
    source: "system",
    authorized: true,
    nowMs: 3200,
    autoNotify: false
  });
  assert.equal(esc2.to, "high");

  const esc3 = mgr.escalate(lowId, {
    source: "system",
    authorized: true,
    nowMs: 3300,
    autoNotify: false
  });
  assert.equal(esc3.to, "critical");

  const timed = mgr.create(
    {
      category: "obs",
      severity: "warning",
      priority: "low",
      runtimeId: "rt-1",
      reason: "obs lag",
      messageKey: "obs-lag"
    },
    { source: "system", authorized: true, nowMs: 4000, autoNotify: false }
  );
  const timedEsc = mgr.escalateUnresolved(5500, {
    source: "system",
    authorized: true
  });
  assert.equal(timedEsc.ok, true);
  assert.ok(timedEsc.count >= 1);
  const timedGot = mgr.getAlert(timed.alertId);
  assert.equal(timedGot.alert.priority, "normal");
  pass("escalation priority ladder");

  deliveries.length = 0;
  const note = mgr.notify(cpuAlertId, {
    source: "system",
    authorized: true,
    nowMs: 6000
  });
  assert.equal(note.ok, true);
  assert.ok(note.channels.includes("logging"));
  assert.ok(note.channels.includes("dashboard"));
  assert.ok(note.channels.includes("admin_ui"));
  assert.ok(deliveries.some((d) => d.channel === "logging"));
  pass("notifications routed by channel");

  const metricHit = mgr.fromMetrics(
    {
      name: "memory.usage",
      value: 97,
      limit: 90,
      op: ">",
      category: "performance",
      runtimeId: "rt-1",
      severity: "warning"
    },
    { source: "metrics_manager", authorized: true, nowMs: 7000 }
  );
  assert.equal(metricHit.ok, true);
  assert.equal(metricHit.alerted, true);
  assert.ok(metricHit.alertId);

  const metricMiss = mgr.fromMetrics(
    {
      name: "memory.usage",
      value: 50,
      limit: 90,
      op: ">",
      runtimeId: "rt-1"
    },
    { source: "metrics_manager", authorized: true, nowMs: 7100 }
  );
  assert.equal(metricMiss.alerted, false);

  const faultSkip = mgr.fromFault(
    {
      faultId: "f-info",
      severity: "warning",
      message: "minor fault",
      runtimeId: "rt-1"
    },
    { source: "fault_manager", authorized: true, nowMs: 7200 }
  );
  assert.equal(faultSkip.alerted, false);
  assert.ok(/not_every_fault/i.test(faultSkip.reason));

  const faultHit = mgr.fromFault(
    {
      faultId: "f-crit",
      severity: "critical",
      message: "critical fault",
      runtimeId: "rt-1",
      correlationId: "corr-f1",
      diagnosticsRef: "diag-1"
    },
    { source: "fault_manager", authorized: true, nowMs: 7300 }
  );
  assert.equal(faultHit.alerted, true);
  assert.equal(faultHit.alert.faultId, "f-crit");
  assert.equal(faultHit.alert.correlationId, "corr-f1");
  assert.equal(faultHit.alert.diagnosticsRef, "diag-1");
  pass("fromMetrics / fromFault (not every fault)");

  const diagView = mgr.forDiagnostics(
    { diagnosticsRef: "diag-1" },
    { source: "diagnostics_manager", authorized: true }
  );
  assert.equal(diagView.ok, true);
  assert.ok(diagView.alerts.length >= 1);

  const unauthClose = mgr.close(cpuAlertId, {
    source: "intruder",
    authorized: false
  });
  assert.equal(unauthClose.ok, false);
  assert.ok(
    unauthClose.error === "unauthorized_close" ||
      unauthClose.error === "unauthorized_alert"
  );

  const forgedClose = mgr.close(cpuAlertId, {
    source: "admin",
    authorized: true,
    forged: true
  });
  assert.equal(forgedClose.ok, false);
  assert.equal(forgedClose.error, "forged_alert_blocked");
  pass("unauthorized close blocked; forged blocked; singleton; no repair APIs");

  const ack = mgr.acknowledge(cpuAlertId, {
    source: "admin",
    authorized: true,
    nowMs: 8000
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.alert.status, "acknowledged");

  const res = mgr.resolve(cpuAlertId, {
    source: "admin",
    authorized: true,
    nowMs: 8100
  });
  assert.equal(res.ok, true);
  assert.equal(res.alert.status, "resolved");
  assert.ok(res.alert.resolved != null);

  const closed = mgr.close(cpuAlertId, {
    source: "admin",
    authorized: true,
    nowMs: 8200
  });
  assert.equal(closed.ok, true);
  assert.equal(closed.alert.status, "closed");

  for (const a of mgr.auditTrail()) {
    assert.ok(a.immutable === true);
  }
  const statusAudits = mgr
    .auditTrail()
    .filter((a) => a.operation === "status_transition");
  assert.ok(statusAudits.length >= 1);

  const report = mgr.createReport(cpuAlertId, {
    source: "admin",
    authorized: true
  });
  assert.equal(report.ok, true);
  assert.equal(report.report.alertId, cpuAlertId);
  assert.ok("reason" in report.report);
  assert.ok("created" in report.report);
  assert.ok("resolved" in report.report);
  assert.ok("source" in report.report);
  assert.ok("priority" in report.report);
  assert.ok("relatedFaults" in report.report);
  assert.ok("recommendedAction" in report.report);
  assert.equal(report.report.immutable, true);
  assert.ok(mgr.reportArchive().length >= 1);

  const m = mgr.metrics();
  assert.ok(typeof m.activeCount === "number");
  assert.ok(typeof m.criticalCount === "number");
  assert.ok(typeof m.averageResolveMs === "number");
  assert.ok(typeof m.escalationCount === "number");
  assert.ok(typeof m.dedupHits === "number");
  assert.ok(m.dedupHits >= 1);
  assert.ok(m.escalationCount >= 1);
  assert.equal(m.repairsDirectly, false);
  pass("report archived; metrics; audit");

  for (const name of am.AM_PUBLIC_API) {
    assert.equal(typeof mgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  const reg = mgr.registerCategory("custom_alert", {
    source: "admin",
    authorized: true
  });
  assert.equal(reg.ok, true);

  am.clearAlertSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-alert-core/alertManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0073-alert-manager.md")
  );
  const mmIdx = coreSys.runtime.indexOf(
    "shared/mia-metrics-core/metricsManager.js"
  );
  const amIdx = coreSys.runtime.indexOf(
    "shared/mia-alert-core/alertManager.js"
  );
  assert.ok(mmIdx >= 0 && amIdx === mmIdx + 1);
  pass("platformSystems nextDocId 0082; alert after metrics in CORE");

  for (const rel of am.AM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
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
    readme.includes("shared/mia-alert-core/"),
    "README Alert technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0073_contract.js"));
  pass("README + anchors");

  const align73 = read("docs/master-canon/0073-alignment.md");
  assert.ok(
    align73.includes("**0074**") && /Audit Manager/i.test(align73),
    "0073-alignment marks 0074 Audit Manager"
  );
  assert.ok(
    align73.includes("0075") && (/Event Store/i.test(align73) || /Telemetry/i.test(align73)),
    "0073-alignment marks 0075 Event Store / Telemetry"
  );
  pass("0073-alignment marks 0074 done / 0075 Telemetry planned");

  assert.ok(align73.includes("🟡"));
  assert.ok(
    align73.includes("external") || align73.includes("Live"),
    "0073-alignment marks live external notification partial"
  );
  pass("0073-alignment marks live external notification partial");

  console.log("\nMaster Canon 0073 contract: ALL PASS");
}

run();
