"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const dm = require("../shared/mia-diagnostics-core");
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
  const docPath = path.join(MASTER, "0070-diagnostics-manager.md");
  const alignPath = path.join(MASTER, "0070-alignment.md");

  assert.ok(fs.existsSync(docPath), "0070-diagnostics-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0070-alignment.md exists");
  pass("0070 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0070 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0070 kernel layer");
  assert.ok(doc.includes("0071"), "0070 points to 0071");
  pass("0070 structure (21 sections → 0071)");

  assert.equal(dm.DM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...dm.DM_COMPONENT_ORDER],
    [
      "diagnostics_manager",
      "source_collector",
      "descriptor_factory",
      "snapshot_engine",
      "trend_analyzer",
      "root_cause_analyzer",
      "query_engine",
      "report_engine",
      "health_reader",
      "fault_reader",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("diagnostics components (12)");

  assert.deepEqual(
    [...dm.DM_SOURCE_ORDER],
    [
      "runtime_manager",
      "health_manager",
      "fault_manager",
      "recovery_manager",
      "watchdog_engine",
      "event_bus",
      "resource_manager",
      "monitoring_system"
    ]
  );
  pass("sources list");

  assert.deepEqual(
    [...dm.DM_CATEGORY_ORDER],
    [
      "runtime",
      "performance",
      "memory",
      "network",
      "storage",
      "ai",
      "battle",
      "obs",
      "platform_connectors",
      "security"
    ]
  );
  pass("categories");

  assert.equal(dm.DM_FLAGS.soleDiagnosticsAuthority, true);
  assert.equal(dm.DM_FLAGS.readOnly, true);
  assert.equal(dm.DM_FLAGS.neverMutatesSystem, true);
  assert.equal(dm.DM_FLAGS.neverComputesHealth, true);
  pass("readOnly flags");

  assert.deepEqual(
    [...dm.DM_DESCRIPTOR_FIELDS],
    [
      "diagnosticId",
      "runtimeId",
      "component",
      "category",
      "timestamp",
      "severity",
      "source",
      "correlationId"
    ]
  );

  const d1 = dm.createDiagnosticDescriptor({
    runtimeId: "rt-1",
    component: "obs",
    category: "network",
    severity: "error",
    source: "watchdog_engine",
    timestamp: 1000
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.diagnosticId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of dm.DM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = dm.createDiagnosticDescriptor({
    runtimeId: "rt-1",
    component: "overlay",
    category: "obs",
    severity: "warning",
    source: "monitoring_system",
    timestamp: 1001
  });
  assert.notEqual(d1.descriptor.diagnosticId, d2.descriptor.diagnosticId);
  assert.equal(dm.createDiagnosticDescriptor({ severity: "info" }).ok, false);
  pass("descriptor 8 fields + unique IDs");

  dm.clearDiagnosticsSingletonForTest();

  let healthScoreCalls = 0;
  const mgr = dm.createDiagnosticsManager({
    sourceBridges: {
      runtime_manager: {
        state: "RUNNING",
        activeServices: ["kernel", "event-bus"],
        activeBattle: { id: "b1" },
        connectedPlatforms: ["tiktok"]
      },
      health_manager: {
        healthScore() {
          healthScoreCalls += 1;
          return 72;
        },
        history() {
          return [{ score: 80 }, { score: 72 }];
        },
        trends() {
          return [{ direction: "degrading" }];
        },
        degradations() {
          return [{ component: "obs" }];
        }
      },
      fault_manager: {
        faultHistory() {
          return [{ faultId: "f1", message: "OBS disconnect" }];
        }
      },
      resource_manager: {
        usage() {
          return { cpu: 68, ram: 4, gpu: 30 };
        }
      }
      // recovery_manager, watchdog, event_bus, monitoring intentionally missing
    },
    healthBridge: {
      healthScore() {
        healthScoreCalls += 1;
        return 72;
      },
      history() {
        return [{ score: 80 }, { score: 72 }];
      },
      trends() {
        return [{ direction: "degrading" }];
      },
      degradations() {
        return [{ component: "obs" }];
      }
    },
    faultBridge: {
      faultHistory() {
        return [{ faultId: "f1", message: "OBS disconnect" }];
      }
    },
    runtimeBridge: {
      state: "RUNNING",
      activeServices: ["kernel", "event-bus"],
      activeBattle: { id: "b1" },
      connectedPlatforms: ["tiktok"]
    },
    resourceBridge: {
      usage() {
        return { cpu: 68, ram: 4, gpu: 30 };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleDiagnosticsAuthority, true);
  assert.equal(mgr.status().readOnly, true);
  assert.equal(mgr.status().neverComputesHealth, true);
  pass("central diagnostics manager singleton");

  const duplicate = dm.createDiagnosticsManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "diagnostics_manager_already_active");
  pass("singleton");

  const unauth = mgr.snapshot("rt-1", { source: "intruder", authorized: false });
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_diagnostics");
  pass("unauthorized snapshot blocked");

  const forged = mgr.snapshot("rt-1", {
    source: "kernel",
    authorized: true,
    forged: true
  });
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_diagnostics_blocked");
  pass("forged blocked");

  healthScoreCalls = 0;
  const snap = mgr.snapshot("rt-1", {
    source: "operator",
    authorized: true,
    nowMs: 5000
  });
  assert.equal(snap.ok, true);
  assert.equal(snap.snapshot.diagnosticOnly, true);
  assert.equal(snap.snapshot.runtimeState, "RUNNING");
  assert.ok(Array.isArray(snap.snapshot.activeServices));
  assert.equal(snap.snapshot.healthScore, 72);
  assert.ok(healthScoreCalls >= 1, "healthScore from bridge");
  assert.ok(Array.isArray(snap.snapshot.faults));
  assert.equal(snap.snapshot.cpu, 68);
  assert.equal(snap.snapshot.ram, 4);
  assert.equal(snap.snapshot.gpu, 30);
  assert.ok(snap.snapshot.activeBattle);
  assert.ok(Array.isArray(snap.snapshot.connectedPlatforms));
  // Missing bridges must not crash — empty contributions present
  assert.ok(snap.snapshot.sources.watchdog_engine.empty === true);
  assert.ok(snap.snapshot.sources.event_bus.empty === true);
  pass("snapshot includes required fields; healthScore from bridge");

  const trend = mgr.analyzeTrend("cpu", [35, 52, 68, 91]);
  assert.equal(trend.ok, true);
  assert.equal(trend.direction, "degrading");
  assert.ok(trend.degrading === true);
  assert.ok(trend.delta > 0);
  pass("trend degrading detection");

  const root = mgr.analyzeRootCause(
    [
      { name: "OBS Disconnect", timestamp: 1000, correlationId: "c1" },
      { name: "Overlay Failure", timestamp: 1100, correlationId: "c1" },
      { name: "Speech Timeout", timestamp: 1200, correlationId: "c1" },
      { name: "Battle Delay", timestamp: 1300, correlationId: "c1" }
    ],
    { correlationId: "c1" }
  );
  assert.equal(root.ok, true);
  assert.equal(root.chain.length, 4);
  assert.equal(root.probableRoot.name, "OBS Disconnect");
  assert.equal(root.readOnly, true);
  pass("root cause chain + probable root");

  const qRuntime = mgr.query("Show Runtime", {}, {
    source: "operator",
    authorized: true
  });
  assert.equal(qRuntime.ok, true);
  assert.equal(qRuntime.type, "runtime");
  assert.equal(qRuntime.readOnly, true);

  const qFaults = mgr.query("faults", {}, {
    source: "admin",
    authorized: true
  });
  assert.equal(qFaults.ok, true);
  assert.equal(qFaults.type, "faults");

  const qMut = mgr.query("mutate faults", {}, {
    source: "operator",
    authorized: true
  });
  assert.equal(qMut.ok, false);
  assert.equal(qMut.error, "mutating_query_blocked");
  pass("queries read-only; mutate blocked");

  const recFeed = mgr.forRecovery(
    { runtimeId: "rt-1" },
    { source: "recovery_manager", authorized: true }
  );
  assert.equal(recFeed.ok, true);
  assert.ok(recFeed.feed.snapshot);
  assert.ok(Array.isArray(recFeed.feed.faultHistory));
  assert.ok("runtimeState" in recFeed.feed);
  assert.ok("performanceHistory" in recFeed.feed);
  assert.equal(recFeed.choosesStrategy, false);

  const aiPkg = mgr.forAi(
    { runtimeId: "rt-1" },
    { source: "ai", authorized: true }
  );
  assert.equal(aiPkg.ok, true);
  assert.equal(aiPkg.readOnly, true);
  assert.ok(aiPkg.package);

  const aiMut = mgr.forAi(
    { runtimeId: "rt-1", mutateRequested: true },
    { source: "ai", authorized: true, mutateRequested: true }
  );
  assert.equal(aiMut.ok, false);
  assert.equal(aiMut.error, "ai_cannot_mutate_diagnostics");
  pass("forRecovery / forAi diagnostic feeds");

  const rpt = mgr.createReport(
    {
      runtimeId: "rt-1",
      analyzedComponents: ["obs", "overlay"],
      findings: ["OBS disconnect cascade"],
      recommendations: ["check OBS websocket"],
      relatedFaults: [{ faultId: "f1" }],
      relatedRecovery: null
    },
    { source: "operator", authorized: true }
  );
  assert.equal(rpt.ok, true);
  assert.ok(rpt.report.diagnosticId);
  assert.ok(rpt.report.findings.length >= 1);
  assert.equal(rpt.report.immutable, true);

  const exp = mgr.exportReport(rpt.report.diagnosticId, {
    source: "operator",
    authorized: true
  });
  assert.equal(exp.ok, true);
  assert.ok(exp.export.diagnosticId);
  assert.equal(exp.immutable, true);
  // JSON-serializable
  assert.ok(JSON.stringify(exp.export));

  const m = mgr.metrics();
  assert.ok(m.reportCount >= 1);
  assert.ok(m.snapshotCount >= 1);
  assert.ok(m.queryCount >= 1);
  assert.ok(typeof m.averageAnalysisMs === "number");
  assert.ok(m.findingsCount >= 1);
  assert.ok(mgr.auditTrail().length >= 1);
  assert.ok(mgr.reportArchive().length >= 1);
  pass("report + export; metrics; audit");

  assert.equal(mgr.mutate().ok, false);
  assert.equal(mgr.write().ok, false);
  assert.equal(mgr.delete().ok, false);
  assert.equal(mgr.repair().ok, false);
  assert.equal(mgr.setHealth().ok, false);
  assert.equal(mgr.updateFault().ok, false);
  pass("no mutate/setHealth APIs succeed");

  const reg = mgr.registerCategory("custom_diag", {
    source: "admin",
    authorized: true
  });
  assert.equal(reg.ok, true);
  assert.ok(reg.categories.includes("custom_diag"));

  for (const name of dm.DM_PUBLIC_API) {
    assert.equal(typeof mgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  dm.clearDiagnosticsSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-diagnostics-core/diagnosticsManager.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0070-diagnostics-manager.md")
  );
  const sdmIdx = coreSys.runtime.indexOf(
    "shared/mia-shutdown-core/shutdownManager.js"
  );
  const dmIdx = coreSys.runtime.indexOf(
    "shared/mia-diagnostics-core/diagnosticsManager.js"
  );
  assert.ok(sdmIdx >= 0 && dmIdx === sdmIdx + 1);
  pass("platformSystems nextDocId 0082; diagnostics after shutdown in CORE");

  for (const rel of dm.DM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0070"), "README 0070");
  assert.ok(
    /Diagnostics Manager/i.test(readme),
    "README Diagnostics Manager"
  );
  assert.ok(
    /0070.*Platný|Platný.*0070/s.test(readme) ||
      readme.includes("[Diagnostics Manager")
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
    readme.includes("shared/mia-diagnostics-core/"),
    "README Diagnostics technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0070_contract.js"));
  pass("README + anchors");

  const align69 = read("docs/master-canon/0069-alignment.md");
  assert.ok(
    align69.includes("**0070**") && /Diagnostics Manager/i.test(align69),
    "0069-alignment marks 0070 Diagnostics Manager"
  );
  assert.ok(
    align69.includes("0071"),
    "0069-alignment marks 0071 planned"
  );
  pass("0069-alignment marks 0070 done / 0071 planned");

  const align70 = read("docs/master-canon/0070-alignment.md");
  assert.ok(align70.includes("🟡"));
  assert.ok(align70.includes("source") || align70.includes("bridge"));
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
  pass("0070-alignment marks live source bridge wiring partial + 0071/0072/0073");

  console.log("\nMaster Canon 0070 contract: ALL PASS");
}

run();
