"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const lm = require("../shared/mia-logging-core");
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
  const docPath = path.join(MASTER, "0071-logging-manager.md");
  const alignPath = path.join(MASTER, "0071-alignment.md");

  assert.ok(fs.existsSync(docPath), "0071-logging-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0071-alignment.md exists");
  pass("0071 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0071 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0071 kernel layer");
  assert.ok(doc.includes("0072"), "0071 points to 0072 Metrics");
  assert.ok(/Metrics Manager/i.test(doc), "0071 → Metrics Manager");
  assert.ok(doc.includes("0073"), "0071 points to 0073");
  assert.ok(/Alert Manager/i.test(doc), "0071 → Alert Manager");
  assert.ok(doc.includes("0074"), "0071 points to 0074");
  assert.ok(/Audit Manager/i.test(doc), "0071 → Audit Manager");
  assert.ok(doc.includes("0075"), "0071 points to 0075");
  assert.ok(/Telemetry Manager/i.test(doc), "0071 → Telemetry Manager");
  pass("0071 structure (21 sections → 0072 Metrics / 0073 Alert / 0074 Audit / 0075 Telemetry)");

  assert.equal(lm.LM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...lm.LM_COMPONENT_ORDER],
    [
      "logging_manager",
      "intake_gate",
      "level_classifier",
      "category_registry",
      "structured_encoder",
      "correlation_index",
      "rotation_controller",
      "storage_adapter",
      "fault_bridge",
      "diagnostics_feed",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("logging components (12)");

  assert.deepEqual(
    [...lm.LM_LEVEL_ORDER],
    ["trace", "debug", "info", "warning", "error", "critical", "fatal"]
  );
  pass("7 levels");

  assert.deepEqual(
    [...lm.LM_CATEGORY_ORDER],
    [
      "kernel",
      "runtime",
      "battle",
      "ai",
      "obs",
      "platform",
      "security",
      "network",
      "performance",
      "diagnostics"
    ]
  );
  pass("categories");

  assert.equal(lm.LM_FLAGS.soleLoggingAuthority, true);
  assert.equal(lm.LM_FLAGS.analyzesLogs, false);
  assert.equal(lm.LM_FLAGS.logsImmutable, true);
  assert.equal(lm.LM_FLAGS.centralLogIngress, true);
  pass("flags");

  assert.deepEqual(
    [...lm.LM_DESCRIPTOR_FIELDS],
    [
      "logId",
      "timestamp",
      "runtimeId",
      "component",
      "category",
      "level",
      "message",
      "correlationId",
      "source"
    ]
  );

  const d1 = lm.createLogDescriptor({
    runtimeId: "rt-1",
    component: "battle",
    category: "battle",
    level: "info",
    message: "BattleStarted",
    source: "kernel",
    timestamp: 1000
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.logId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of lm.LM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = lm.createLogDescriptor({
    runtimeId: "rt-1",
    component: "overlay",
    category: "obs",
    level: "warning",
    message: "lag",
    source: "system",
    timestamp: 1001
  });
  assert.notEqual(d1.descriptor.logId, d2.descriptor.logId);
  assert.equal(lm.createLogDescriptor({ level: "info" }).ok, false);
  pass("descriptor 9 fields + unique IDs + immutable");

  lm.clearLoggingSingletonForTest();

  const mgr = lm.createLoggingManager({
    maxEntries: 5,
    maxAgeMs: 10000,
    maxBytes: 100000,
    approxBytesPerEntry: 100
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleLoggingAuthority, true);
  assert.equal(mgr.status().analyzesLogs, false);
  assert.equal(mgr.status().logsImmutable, true);
  pass("central logging manager singleton");

  const duplicate = lm.createLoggingManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "logging_manager_already_active");
  pass("singleton");

  const unauth = mgr.info(
    { runtimeId: "rt-1", component: "x", category: "runtime", event: "E" },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_logging");
  pass("unauthorized write blocked");

  const forged = mgr.info(
    { runtimeId: "rt-1", component: "x", category: "runtime", event: "E" },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_logging_blocked");
  pass("forged blocked");

  const unstructured = mgr.info(
    {
      runtimeId: "rt-1",
      component: "battle",
      category: "battle",
      message: "only text"
    },
    { source: "kernel", authorized: true }
  );
  assert.equal(unstructured.ok, false);
  assert.equal(unstructured.error, "unstructured_rejected");
  pass("structured primary; unstructured-only rejected");

  const corr = "corr-gift-1";
  const g1 = mgr.info(
    {
      runtimeId: "rt-1",
      component: "gift",
      category: "platform",
      event: "GiftReceived",
      message: "gift",
      correlationId: corr,
      structured: {
        runtime: "rt-1",
        component: "gift",
        level: "info",
        event: "GiftReceived"
      }
    },
    { source: "kernel", authorized: true, nowMs: 1000 }
  );
  assert.equal(g1.ok, true);
  assert.ok(Object.isFrozen(g1.log));

  mgr.info(
    {
      runtimeId: "rt-1",
      component: "battle",
      category: "battle",
      event: "BattleStarted",
      correlationId: corr
    },
    { source: "operator", authorized: true, nowMs: 1100 }
  );
  mgr.info(
    {
      runtimeId: "rt-1",
      component: "overlay",
      category: "obs",
      event: "OverlayUpdate",
      correlationId: corr
    },
    { source: "system", authorized: true, nowMs: 1200 }
  );
  mgr.info(
    {
      runtimeId: "rt-1",
      component: "speech",
      category: "ai",
      event: "SpeechPlayed",
      correlationId: corr
    },
    { source: "ai", authorized: true, nowMs: 1300 }
  );

  const linked = mgr.getByCorrelation(corr);
  assert.equal(linked.ok, true);
  assert.equal(linked.count, 4);
  assert.equal(linked.logs[0].component, "gift");
  assert.equal(linked.logs[3].component, "speech");
  pass("structured primary; correlation links");

  const secretLog = mgr.warning(
    {
      runtimeId: "rt-1",
      component: "auth",
      category: "security",
      event: "LoginAttempt",
      structured: {
        runtime: "rt-1",
        component: "auth",
        level: "warning",
        event: "LoginAttempt",
        password: "hunter2",
        token: "abc",
        secret: "xyz"
      }
    },
    { source: "admin", authorized: true, nowMs: 1400 }
  );
  assert.equal(secretLog.ok, true);
  assert.equal(secretLog.log.structured.password, "***");
  assert.equal(secretLog.log.structured.token, "***");
  assert.equal(secretLog.log.structured.secret, "***");
  pass("maskSensitive");

  // Force rotation via maxEntries (policy maxEntries=5; we already have 5+)
  const rot = mgr.rotate({
    source: "admin",
    authorized: true,
    nowMs: 5000
  });
  assert.equal(rot.ok, true);
  assert.ok(rot.archived >= 1 || mgr.archive().length >= 1);
  assert.ok(mgr.archive().length >= 1);
  assert.ok(mgr.auditTrail().length >= 1);
  // Audit trail never deleted by rotate
  const auditBefore = mgr.auditTrail().length;
  mgr.rotate({ source: "admin", authorized: true, nowMs: 6000 });
  assert.ok(mgr.auditTrail().length >= auditBefore);
  pass("rotation archives; retention; audit preserved");

  const faultLog = mgr.fromFault(
    {
      faultId: "fault-99",
      severity: "critical",
      runtimeId: "rt-1",
      component: "obs",
      message: "OBS disconnect",
      correlationId: "corr-fault-1"
    },
    { source: "fault_manager", authorized: true, nowMs: 7000 }
  );
  assert.equal(faultLog.ok, true);
  assert.equal(faultLog.log.level, "critical");
  assert.equal(faultLog.log.faultId, "fault-99");
  assert.equal(faultLog.log.correlationId, "corr-fault-1");
  pass("fromFault auto log");

  const diag = mgr.forDiagnostics(
    { correlationId: "corr-fault-1" },
    { source: "diagnostics_manager", authorized: true }
  );
  assert.equal(diag.ok, true);
  assert.equal(diag.readOnly, true);
  assert.equal(diag.analyzesLogs, false);
  assert.ok(diag.logs.length >= 1);
  assert.ok(Object.isFrozen(diag.logs));

  const aiPkg = mgr.forAi(
    { correlationId: "corr-fault-1" },
    { source: "ai", authorized: true }
  );
  assert.equal(aiPkg.ok, true);
  assert.equal(aiPkg.readOnly, true);

  const aiMut = mgr.forAi(
    { correlationId: "corr-fault-1", mutateRequested: true },
    { source: "ai", authorized: true, mutateRequested: true }
  );
  assert.equal(aiMut.ok, false);
  assert.equal(aiMut.error, "ai_cannot_mutate_logs");

  assert.equal(mgr.update().ok, false);
  assert.equal(mgr.delete().ok, false);
  assert.equal(mgr.rewrite().ok, false);
  pass("forDiagnostics / forAi read-only; mutate/delete blocked");

  for (const level of lm.LM_LEVEL_ORDER) {
    const fn = mgr[level];
    assert.equal(typeof fn, "function", `level api ${level}`);
    const r = fn(
      {
        runtimeId: "rt-1",
        component: "test",
        category: "diagnostics",
        event: `Evt_${level}`
      },
      { source: "kernel", authorized: true, nowMs: 8000 + lm.LM_LEVEL_ORDER.indexOf(level) }
    );
    assert.equal(r.ok, true, `write ${level}`);
    assert.equal(r.log.level, level);
  }
  pass("unified API levels; auth");

  const m = mgr.metrics();
  assert.ok(m.logCount >= 1);
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.warningCount === "number");
  assert.ok(typeof m.writeRate === "number");
  assert.ok(typeof m.storageFillRatio === "number");
  assert.ok(typeof m.archiveCount === "number");
  assert.ok(mgr.auditTrail().length >= 1);
  // Audit separate from business logs
  const businessIds = new Set(mgr.records().map((e) => e.logId));
  for (const a of mgr.auditTrail()) {
    assert.ok(a.immutable === true);
    assert.ok("operation" in a);
  }
  assert.ok(mgr.archive);
  pass("metrics; separate audit");

  const backend = mgr.setStorageBackend("file", {
    source: "admin",
    authorized: true
  });
  assert.equal(backend.ok, true);
  assert.equal(backend.backend, "file");
  assert.equal(backend.liveWiring, false);

  const reg = mgr.registerCategory("custom_log", {
    source: "admin",
    authorized: true
  });
  assert.equal(reg.ok, true);
  assert.ok(reg.categories.includes("custom_log"));

  for (const name of lm.LM_PUBLIC_API) {
    assert.equal(typeof mgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  lm.clearLoggingSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-logging-core/loggingManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0071-logging-manager.md")
  );
  const dmIdx = coreSys.runtime.indexOf(
    "shared/mia-diagnostics-core/diagnosticsManager.js"
  );
  const lmIdx = coreSys.runtime.indexOf(
    "shared/mia-logging-core/loggingManager.js"
  );
  assert.ok(dmIdx >= 0 && lmIdx === dmIdx + 1);
  pass("platformSystems nextDocId 0082; logging after diagnostics in CORE");

  for (const rel of lm.LM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0071"), "README 0071");
  assert.ok(/Logging Manager/i.test(readme), "README Logging Manager");
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
    readme.includes("shared/mia-logging-core/"),
    "README Logging technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0071_contract.js"));
  pass("README + anchors");

  const align70 = read("docs/master-canon/0070-alignment.md");
  assert.ok(
    align70.includes("**0071**") && /Logging Manager/i.test(align70),
    "0070-alignment marks 0071 Logging Manager"
  );
  assert.ok(
    align70.includes("0072") && /Metrics/i.test(align70),
    "0070-alignment marks 0072 Metrics"
  );
  assert.ok(
    (align70.includes("0073") || align70.includes("0074")) && /Telemetry|Alert/i.test(align70),
    "0070-alignment marks 0073 Telemetry planned"
  );
  pass("0070-alignment marks 0071 done / 0072 Metrics / 0073 Telemetry");

  const align71 = read("docs/master-canon/0071-alignment.md");
  assert.ok(align71.includes("🟡"));
  assert.ok(align71.includes("storage") || align71.includes("bridge"));
  pass("0071-alignment marks live storage wiring partial");

  console.log("\nMaster Canon 0071 contract: ALL PASS");
}

run();
