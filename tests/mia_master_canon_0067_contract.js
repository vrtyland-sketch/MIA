"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const fm = require("../shared/mia-fault-core");
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
  const docPath = path.join(MASTER, "0067-fault-manager.md");
  const alignPath = path.join(MASTER, "0067-alignment.md");

  assert.ok(fs.existsSync(docPath), "0067-fault-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0067-alignment.md exists");
  pass("0067 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0067 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0067 kernel layer");
  assert.ok(doc.includes("0068"), "0067 points to 0068");
  assert.ok(/Safe Mode/i.test(doc), "0067 mentions Safe Mode");
  assert.ok(doc.includes("0069"), "0067 points to 0069");
  assert.ok(/Shutdown Manager/i.test(doc), "0067 mentions Shutdown Manager");
  assert.ok(doc.includes("0070"), "0067 points to 0070");
  assert.ok(
    /Diagnostic Engine/i.test(doc),
    "0067 mentions Diagnostic Engine"
  );
  pass("0067 structure (20 sections → 0068/0069/0070)");

  assert.equal(fm.FM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...fm.FM_COMPONENT_ORDER],
    [
      "fault_manager",
      "fault_intake",
      "fault_validator",
      "fault_classifier",
      "dedup_engine",
      "correlation_engine",
      "routing_engine",
      "escalation_controller",
      "report_engine",
      "registry_guard",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("fault components (12)");

  assert.equal(fm.FM_FLAGS.repairsDirectly, false);
  assert.equal(fm.FM_FLAGS.soleFaultAuthority, true);
  assert.equal(fm.FM_FLAGS.centralFaultIngress, true);
  pass("fault flags (no repair / sole authority / central ingress)");

  assert.deepEqual(
    [...fm.FM_DESCRIPTOR_FIELDS],
    [
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
    ]
  );

  const d1 = fm.createFaultDescriptor({
    componentId: "obs",
    componentType: "connector",
    severity: "error",
    category: "network",
    message: "disconnect",
    timestamp: 1000,
    runtimeId: "rt-1"
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.faultId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of fm.FM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = fm.createFaultDescriptor({
    componentId: "obs",
    componentType: "connector",
    severity: "error",
    category: "network",
    message: "disconnect",
    timestamp: 1001,
    runtimeId: "rt-1"
  });
  assert.notEqual(d1.descriptor.faultId, d2.descriptor.faultId);
  assert.equal(fm.createFaultDescriptor({ componentId: "x" }).ok, false);
  pass("descriptor 10 fields + unique IDs");

  assert.equal(fm.FM_CATEGORY_ORDER.length, 10);
  for (const cat of [
    "runtime",
    "service",
    "module",
    "plugin",
    "ai",
    "network",
    "configuration",
    "resource",
    "security",
    "external_platform"
  ]) {
    assert.ok(fm.FM_CATEGORY_ORDER.includes(cat), `category ${cat}`);
  }
  assert.deepEqual(
    [...fm.FM_SEVERITY_ORDER],
    ["info", "warning", "error", "critical", "fatal"]
  );
  pass("all 10 categories + severities");

  assert.deepEqual(
    [...fm.FM_STATUS_ORDER],
    [
      "detected",
      "validated",
      "classified",
      "assigned",
      "resolved",
      "closed",
      "escalated"
    ]
  );
  assert.equal(
    fm.validateStatusTransition("detected", "validated").ok,
    true
  );
  assert.equal(
    fm.validateStatusTransition("validated", "classified").ok,
    true
  );
  assert.equal(
    fm.validateStatusTransition("classified", "assigned").ok,
    true
  );
  assert.equal(fm.validateStatusTransition("assigned", "resolved").ok, true);
  assert.equal(fm.validateStatusTransition("resolved", "closed").ok, true);
  assert.equal(fm.validateStatusTransition("assigned", "escalated").ok, true);
  assert.equal(
    fm.validateStatusTransition("detected", "closed").ok,
    false
  );
  pass("status FSM");

  fm.clearFaultSingletonForTest();
  const mgr = fm.createFaultManager({
    dedupeWindowMs: 5000,
    escalateAfterMs: { error: 1000, critical: 2000 }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleFaultAuthority, true);
  assert.equal(mgr.status().repairsDirectly, false);
  assert.equal(mgr.status().centralFaultIngress, true);
  pass("central fault manager singleton");

  const duplicate = fm.createFaultManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "fault_manager_already_active");
  pass("duplicate manager blocked");

  const unauth = mgr.report(
    {
      componentId: "obs",
      componentType: "connector",
      category: "network",
      severity: "error",
      message: "socket closed",
      runtimeId: "rt-1",
      timestamp: 1000
    },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_fault");
  pass("unauthorized report blocked");

  const forged = mgr.report(
    {
      componentId: "obs",
      componentType: "connector",
      category: "network",
      severity: "error",
      message: "socket closed",
      runtimeId: "rt-1",
      timestamp: 1000
    },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_fault_blocked");
  pass("forged fault blocked");

  const r1 = mgr.report(
    {
      componentId: "obs",
      componentType: "connector",
      category: "network",
      severity: "error",
      message: "OBS disconnect",
      runtimeId: "rt-1",
      timestamp: 2000
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(r1.ok, true);
  assert.equal(r1.dedup, false);
  assert.ok(r1.faultId);
  assert.equal(r1.fault.status, "assigned");
  assert.ok(r1.phases.includes("detect") || r1.fault.phases.includes("detect"));
  pass("report creates record");

  const r2 = mgr.report(
    {
      componentId: "obs",
      componentType: "connector",
      category: "network",
      severity: "error",
      message: "OBS disconnect",
      runtimeId: "rt-1",
      timestamp: 2500
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(r2.ok, true);
  assert.equal(r2.dedup, true);
  assert.equal(r2.faultId, r1.faultId);
  assert.ok(r2.fault.counter >= 2);
  pass("dedup increments counter without new ID");

  const pureDedup = fm.evaluateDedup(
    [
      {
        faultId: "f1",
        fingerprint: fm.fingerprintFor({
          componentId: "a",
          category: "runtime",
          message: "x"
        }),
        status: "assigned",
        timestamp: 1000,
        counter: 1
      }
    ],
    {
      componentId: "a",
      category: "runtime",
      message: "x",
      timestamp: 2000
    },
    { dedupeWindowMs: 5000 }
  );
  assert.equal(pureDedup.hit, true);
  assert.equal(pureDedup.existingFaultId, "f1");
  pass("evaluateDedup pure helper");

  const overlay = mgr.report(
    {
      componentId: "overlay",
      componentType: "ui",
      category: "module",
      severity: "error",
      message: "overlay render fail",
      runtimeId: "rt-1",
      timestamp: 3000
    },
    { source: "system", authorized: true }
  );
  const speech = mgr.report(
    {
      componentId: "speech",
      componentType: "service",
      category: "service",
      severity: "warning",
      message: "speech queue stall",
      runtimeId: "rt-1",
      timestamp: 3100
    },
    { source: "system", authorized: true }
  );
  const corr = mgr.correlate(
    [r1.faultId, overlay.faultId, speech.faultId],
    { source: "kernel", authorized: true, correlationId: "corr-obs-chain" }
  );
  assert.equal(corr.ok, true);
  assert.equal(corr.correlationId, "corr-obs-chain");
  const linked = mgr.getByCorrelation("corr-obs-chain");
  assert.equal(linked.length, 3);
  assert.ok(linked.every((f) => f.correlationId === "corr-obs-chain"));
  pass("correlation links related faults");

  const netRoute = mgr.routeFault("network");
  assert.equal(netRoute.ok, true);
  assert.ok(netRoute.targets.includes("recovery_manager"));
  assert.ok(netRoute.targets.includes("audit_logger"));
  assert.equal(netRoute.invoked, false);

  const secRoute = mgr.routeFault("security");
  assert.equal(secRoute.ok, true);
  assert.ok(secRoute.targets.includes("security_layer"));
  assert.ok(secRoute.targets.includes("audit_logger"));
  assert.deepEqual(
    [...fm.FM_DEFAULT_ROUTES.network],
    ["recovery_manager", "audit_logger"]
  );
  pass("routing by category (network→recovery, security→security_layer)");

  fm.clearFaultSingletonForTest();
  const escMgr = fm.createFaultManager({
    allowParallelForTest: true,
    singleton: false,
    escalateAfterMs: { error: 1000, critical: 2000 }
  });
  const er = escMgr.report(
    {
      componentId: "battle",
      componentType: "service",
      category: "service",
      severity: "error",
      message: "battle stall",
      runtimeId: "rt",
      timestamp: 0
    },
    { source: "kernel", authorized: true }
  );
  const e1 = escMgr.escalate(er.faultId, {
    source: "kernel",
    authorized: true,
    nowMs: 1500,
    force: true
  });
  assert.equal(e1.ok, true);
  assert.equal(e1.escalated, true);
  assert.equal(e1.fromSeverity, "error");
  assert.equal(e1.toSeverity, "critical");
  assert.equal(e1.fault.status, "escalated");

  const e2 = escMgr.escalate(er.faultId, {
    source: "kernel",
    authorized: true,
    nowMs: 4000,
    force: true
  });
  assert.equal(e2.ok, true);
  assert.equal(e2.toSeverity, "fatal");

  const trail = escMgr.auditTrail();
  assert.ok(trail.some((a) => a.action === "escalate"));
  assert.ok(trail.every((a) => a.immutable === true));
  pass("escalation ERROR→CRITICAL→FATAL audited");

  const impact = escMgr.toHealthImpact(er.faultId);
  assert.equal(impact.ok, true);
  assert.equal(impact.diagnosticOnly, true);
  assert.ok(typeof impact.scoreDelta === "number");
  assert.ok(impact.scoreDelta < 0);
  assert.equal(impact.applied, false);
  pass("Health impact diagnostic-only");

  const recoveryOk = escMgr.toRecovery(er.faultId);
  assert.equal(recoveryOk.ok, true);
  assert.equal(recoveryOk.recoverable, true);
  assert.equal(recoveryOk.executed, false);
  assert.ok(recoveryOk.recovery);

  const secFault = escMgr.report(
    {
      componentId: "auth",
      componentType: "security",
      category: "security",
      severity: "critical",
      message: "forged token",
      runtimeId: "rt",
      timestamp: 5000,
      recoverable: false
    },
    { source: "kernel", authorized: true }
  );
  const recoveryNo = escMgr.toRecovery(secFault.faultId);
  assert.equal(recoveryNo.recoverable, false);
  assert.equal(recoveryNo.executed, false);
  assert.ok(
    recoveryNo.suggestion === "safe_mode" ||
      recoveryNo.suggestion === "shutdown"
  );
  pass("Recovery only when recoverable");

  assert.equal(escMgr.repair().ok, false);
  assert.equal(escMgr.restart().ok, false);
  assert.equal(escMgr.recover().ok, false);
  assert.equal(escMgr.spawnProcess().ok, false);
  assert.equal(escMgr.killProcess().ok, false);
  pass("repair/spawn/kill stubs reject");

  assert.equal(escMgr.deleteHistory().ok, false);
  assert.equal(escMgr.clearHistory().ok, false);
  assert.equal(escMgr.purge().ok, false);
  assert.equal(escMgr.deleteHistory().error, "history_mutation_blocked");
  pass("no delete history");

  const closed = escMgr.close(er.faultId, {
    source: "operator",
    authorized: true,
    nowMs: 9000,
    resolution: "manual fix",
    result: "RESOLVED"
  });
  assert.equal(closed.ok, true);
  assert.equal(closed.fault.status, "closed");
  const archived = escMgr.reportArchive();
  assert.ok(archived.length >= 1);
  const rep = archived.find((a) => a.faultId === er.faultId);
  assert.ok(rep);
  assert.equal(rep.component, "battle");
  assert.equal(rep.category, "service");
  assert.ok(rep.severity);
  assert.ok(rep.cause);
  assert.ok(rep.resolution);
  assert.ok(typeof rep.duration === "number");
  assert.ok(rep.result);
  pass("Fault Report archived");

  const m = escMgr.metrics();
  assert.ok(typeof m.faultCount === "number");
  assert.ok(m.byCategory);
  assert.ok(m.bySeverity);
  assert.ok(typeof m.openCount === "number");
  assert.ok(typeof m.closedCount === "number");
  assert.ok(typeof m.dedupHits === "number");
  assert.ok(typeof m.escalations === "number");
  assert.ok(m.trends);
  pass("metrics");

  for (const name of fm.FM_PUBLIC_API) {
    assert.equal(typeof escMgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  fm.clearFaultSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-fault-core/faultManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0067-fault-manager.md")
  );
  const watchdogIdx = coreSys.runtime.indexOf(
    "shared/mia-watchdog-core/watchdogEngine.js"
  );
  const faultIdx = coreSys.runtime.indexOf(
    "shared/mia-fault-core/faultManager.js"
  );
  assert.ok(watchdogIdx >= 0 && faultIdx === watchdogIdx + 1);
  pass("platformSystems nextDocId 0082; fault after watchdog in CORE");

  for (const rel of fm.FM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0067"), "README 0067");
  assert.ok(readme.includes("Fault Manager"), "README Fault Manager");
  assert.ok(
    /0067.*Platný|Platný.*0067/s.test(readme) ||
      readme.includes("[Fault Manager")
  );
  assert.ok(readme.includes("0068"), "README 0068");
  assert.ok(
    /Safe Mode Manager/i.test(readme),
    "README Safe Mode Manager"
  );
  assert.ok(
    /0068.*Platný|Platný.*0068/s.test(readme) ||
      readme.includes("[Safe Mode Manager"),
    "README 0068 platný"
  );
  assert.ok(readme.includes("0069"), "README 0069");
  assert.ok(
    /Shutdown Manager/i.test(readme),
    "README Shutdown Manager"
  );
  assert.ok(readme.includes("0070"), "README 0070");
  assert.ok(
    /Diagnostics Manager/i.test(readme),
    "README Diagnostics Manager"
  );
  assert.ok(
    /0070.*Platný|Platný.*0070/s.test(readme) ||
      readme.includes("[Diagnostics Manager"),
    "README 0070 platný"
  );
  assert.ok(readme.includes("0071"), "README 0071");
  assert.ok(
    /Logging Manager/i.test(readme),
    "README Logging Manager"
  );
  assert.ok(
    /0071.*Platný|Platný.*0071/s.test(readme) ||
      readme.includes("[Logging Manager"),
    "README 0071 platný"
  );
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
    readme.includes("shared/mia-fault-core/"),
    "README Fault technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0067_contract.js"));
  pass("README + anchors");

  const align66 = read("docs/master-canon/0066-alignment.md");
  assert.ok(
    align66.includes("**0067**") && /Fault/i.test(align66),
    "0066-alignment marks 0067 Fault"
  );
  assert.ok(
    align66.includes("0068") && /Safe Mode/i.test(align66),
    "0066-alignment marks 0068 Safe Mode"
  );
  assert.ok(
    align66.includes("0069") && /Shutdown/i.test(align66),
    "0066-alignment marks 0069 Shutdown"
  );
  assert.ok(
    align66.includes("0070") && /Diagnostic/i.test(align66),
    "0066-alignment marks 0070 Diagnostic planned"
  );
  pass("0066-alignment marks 0067 done / 0068 Safe Mode / 0069 Shutdown / 0070 Diagnostic");

  const align67 = read("docs/master-canon/0067-alignment.md");
  assert.ok(align67.includes("Live wiring") || align67.includes("bridge"));
  assert.ok(align67.includes("🟡"));
  assert.ok(
    align67.includes("0068") && /Safe Mode/i.test(align67),
    "0067-alignment marks 0068 Safe Mode"
  );
  assert.ok(
    align67.includes("0069") && /Shutdown/i.test(align67),
    "0067-alignment marks 0069 Shutdown"
  );
  assert.ok(
    align67.includes("0070") && /Diagnostic/i.test(align67),
    "0067-alignment marks 0070 Diagnostic"
  );
  pass("0067-alignment marks live Health/Recovery bridge wiring partial + 0068/0069/0070");

  console.log("\nMaster Canon 0067 contract: ALL PASS");
}

run();
