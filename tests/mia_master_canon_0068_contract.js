"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const smm = require("../shared/mia-safe-mode-core");
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
  const docPath = path.join(MASTER, "0068-safe-mode-manager.md");
  const alignPath = path.join(MASTER, "0068-alignment.md");

  assert.ok(fs.existsSync(docPath), "0068-safe-mode-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0068-alignment.md exists");
  pass("0068 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0068 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0068 kernel layer");
  assert.ok(doc.includes("0069"), "0068 points to 0069");
  assert.ok(
    /Shutdown Manager/i.test(doc),
    "0068 mentions Shutdown Manager"
  );
  assert.ok(doc.includes("0070"), "0068 points to 0070");
  assert.ok(
    /Diagnostic Engine/i.test(doc),
    "0068 mentions Diagnostic Engine"
  );
  pass("0068 structure (20 sections → 0069 Shutdown / 0070 Diagnostic)");

  assert.equal(smm.SMM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...smm.SMM_COMPONENT_ORDER],
    [
      "safe_mode_manager",
      "activation_gate",
      "level_controller",
      "restriction_engine",
      "isolation_controller",
      "kernel_guardian",
      "runtime_gate",
      "ai_throttle",
      "platform_isolator",
      "exit_verifier",
      "report_engine",
      "metrics_audit"
    ]
  );
  pass("safe mode components (12)");

  assert.deepEqual([...smm.SMM_LEVEL_ORDER], [1, 2, 3, 4]);
  assert.equal(smm.SMM_LEVEL_NAME[1], "light");
  assert.equal(smm.SMM_LEVEL_NAME[2], "partial");
  assert.equal(smm.SMM_LEVEL_NAME[3], "essential_only");
  assert.equal(smm.SMM_LEVEL_NAME[4], "kernel_survival");
  pass("four safe mode levels");

  assert.equal(smm.SMM_FLAGS.soleSafeModeAuthority, true);
  assert.equal(smm.SMM_FLAGS.shutsDownSystem, false);
  assert.equal(smm.SMM_FLAGS.kernelAlwaysPreserved, true);
  assert.equal(smm.SMM_FLAGS.exitRequiresVerification, true);
  pass("safe mode flags");

  assert.deepEqual(
    [...smm.SMM_DESCRIPTOR_FIELDS],
    [
      "safeModeId",
      "level",
      "reason",
      "started",
      "ended",
      "runtimeId",
      "owner",
      "status"
    ]
  );

  const d1 = smm.createSafeModeDescriptor({
    level: 1,
    reason: "recovery failed",
    started: 1000,
    runtimeId: "rt-1",
    owner: "kernel",
    status: "active"
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.safeModeId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of smm.SMM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = smm.createSafeModeDescriptor({
    level: 2,
    reason: "critical fault",
    started: 1001,
    runtimeId: "rt-1",
    owner: "kernel",
    status: "active"
  });
  assert.notEqual(d1.descriptor.safeModeId, d2.descriptor.safeModeId);
  assert.equal(smm.createSafeModeDescriptor({ level: 1 }).ok, false);
  pass("descriptor 8 fields + unique IDs");

  for (const svc of [
    "runtime",
    "fault_manager",
    "recovery_manager",
    "watchdog",
    "health_manager",
    "audit",
    "monitoring",
    "kernel"
  ]) {
    assert.ok(
      smm.SMM_PRESERVED_SERVICES.includes(svc),
      `preserved ${svc}`
    );
  }
  pass("preserved services never disabled");

  smm.clearSafeModeSingletonForTest();
  const mgr = smm.createSafeModeManager({});
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleSafeModeAuthority, true);
  assert.equal(mgr.status().shutsDownSystem, false);
  assert.equal(mgr.status().kernelAlwaysPreserved, true);
  assert.equal(mgr.status().exitRequiresVerification, true);
  pass("central safe mode manager singleton");

  const duplicate = smm.createSafeModeManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "safe_mode_manager_already_active");
  pass("duplicate manager blocked");

  const unauth = mgr.activate(
    {
      reason: "test",
      level: 1,
      runtimeId: "rt-1",
      owner: "intruder",
      trigger: "admin_manual"
    },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_activation");
  pass("unauthorized activation blocked");

  const forged = mgr.activate(
    {
      reason: "test",
      level: 1,
      runtimeId: "rt-1",
      owner: "kernel",
      trigger: "critical_fault"
    },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_activation_blocked");
  pass("forged activation blocked");

  const act = mgr.activate(
    {
      reason: "recovery exhausted",
      level: 1,
      runtimeId: "rt-1",
      owner: "recovery_manager",
      trigger: "recovery_failed",
      affectedComponents: ["plugins"]
    },
    { source: "recovery_manager", authorized: true, nowMs: 2000 }
  );
  assert.equal(act.ok, true);
  assert.ok(act.safeModeId);
  assert.equal(act.safeMode.status, "active");
  assert.equal(act.kernelPreserved, true);
  assert.ok(act.phases.includes("fault"));
  assert.ok(act.phases.includes("recovery_failed"));
  assert.ok(act.phases.includes("safe_mode_decision"));
  assert.ok(act.phases.includes("safe_mode_active"));
  const trail = mgr.auditTrail();
  assert.ok(trail.some((a) => a.action === "activate"));
  assert.ok(trail.every((a) => a.immutable === true));
  pass("activate audited; kernel preserved");

  assert.equal(mgr.isKernelProtected(), true);
  assert.equal(mgr.canStartService("runtime").allowed, true);
  assert.equal(mgr.canStartService("fault_manager").allowed, true);
  assert.equal(mgr.canStartService("diagnostics").allowed, false);
  assert.equal(mgr.canStartService("plugins").allowed, false);
  pass("canStartService respects level 1");

  const esc = mgr.escalateLevel(2, {
    source: "kernel",
    authorized: true,
    nowMs: 2500
  });
  assert.equal(esc.ok, true);
  assert.equal(esc.toLevel, 2);
  assert.equal(mgr.canStartService("battle").allowed, false);
  pass("escalate 1→2; battle restricted");

  const ai = mgr.aiRestrictions();
  assert.ok(ai);
  assert.equal(ai.imageGeneration, false);
  assert.equal(ai.textOnly, true);
  assert.ok(ai.modelSizeLimit);
  assert.ok(typeof ai.maxParallel === "number");
  pass("AI restrictions apply");

  const iso = mgr.isolatePlatform("tiktok", {
    source: "kernel",
    authorized: true,
    nowMs: 2600
  });
  assert.equal(iso.ok, true);
  assert.equal(iso.platformId, "tiktok");
  assert.equal(iso.kernelPreserved, true);
  assert.equal(iso.kernelStopped, false);
  assert.ok(iso.otherPlatformsActive.includes("kick"));
  assert.ok(iso.otherPlatformsActive.includes("twitch"));
  assert.ok(!iso.otherPlatformsActive.includes("tiktok"));
  assert.equal(mgr.canStartService("tiktok").allowed, false);
  assert.equal(mgr.canStartService("kick").allowed, true);
  pass("platform isolate only affected platform");

  const exitNoVerify = mgr.exit({
    source: "operator",
    authorized: true,
    nowMs: 3000
  });
  assert.equal(exitNoVerify.ok, false);
  assert.ok(
    exitNoVerify.error === "verification_required" ||
      exitNoVerify.error === "verification_failed"
  );
  pass("exit blocked without verification");

  const unauthExit = mgr.exit({
    source: "intruder",
    authorized: false,
    verified: true,
    nowMs: 3100
  });
  assert.equal(unauthExit.ok, false);
  assert.equal(unauthExit.error, "unauthorized_exit");
  pass("unauthorized exit blocked");

  const forgedExit = mgr.exit({
    source: "kernel",
    authorized: true,
    forged: true,
    verified: true,
    nowMs: 3200
  });
  assert.equal(forgedExit.ok, false);
  assert.equal(forgedExit.error, "forged_exit_blocked");
  pass("forged exit blocked");

  const exitOk = mgr.exit({
    source: "operator",
    authorized: true,
    verified: true,
    nowMs: 4000,
    result: "RECOVERED"
  });
  assert.equal(exitOk.ok, true);
  assert.equal(exitOk.verified, true);
  assert.ok(exitOk.report);
  assert.equal(exitOk.report.reason, "recovery exhausted");
  assert.ok(typeof exitOk.report.duration === "number");
  assert.ok(exitOk.report.exitMethod);
  assert.ok(exitOk.report.result);
  const archived = mgr.reportArchive();
  assert.ok(archived.length >= 1);
  pass("exit succeeds with verification; report archived");

  const m = mgr.metrics();
  assert.equal(m.active, false);
  assert.ok(typeof m.activationCount === "number");
  assert.ok(m.activationCount >= 1);
  assert.ok(typeof m.totalActiveMs === "number");
  assert.ok(typeof m.historyCount === "number");
  assert.ok(m.byLevel);
  pass("metrics");

  assert.equal(mgr.shutdown().ok, false);
  assert.equal(mgr.kill().ok, false);
  assert.equal(mgr.killProcess().ok, false);
  assert.equal(mgr.halt().ok, false);
  assert.equal(mgr.powerOff().ok, false);
  assert.equal(mgr.shutdown().error, "safe_mode_does_not_shutdown");
  pass("no system shutdown APIs");

  assert.equal(mgr.deleteHistory().ok, false);
  assert.equal(mgr.clearHistory().ok, false);
  assert.equal(mgr.purge().ok, false);
  pass("immutable audit / no delete history");

  // Re-activate for level 3/4 checks
  smm.clearSafeModeSingletonForTest();
  const mgr2 = smm.createSafeModeManager({
    allowParallelForTest: true,
    singleton: false,
    exitVerifier() {
      return { ok: true, verified: true };
    }
  });
  const a3 = mgr2.activate(
    {
      reason: "multi outage",
      level: 3,
      runtimeId: "rt-2",
      owner: "kernel",
      trigger: "multi_service_outage"
    },
    { source: "kernel", authorized: true, nowMs: 5000 }
  );
  assert.equal(a3.ok, true);
  assert.equal(mgr2.canStartService("communication").allowed, true);
  assert.equal(mgr2.canStartService("battle").allowed, false);
  assert.equal(mgr2.canStartService("experimental").allowed, false);
  const a4 = mgr2.escalateLevel(4, {
    source: "kernel",
    authorized: true,
    nowMs: 5100
  });
  assert.equal(a4.ok, true);
  assert.equal(mgr2.canStartService("communication").allowed, false);
  assert.equal(mgr2.canStartService("kernel").allowed, true);
  assert.equal(mgr2.canStartService("runtime").allowed, true);
  const exit2 = mgr2.exit({
    source: "kernel",
    authorized: true,
    nowMs: 6000
  });
  assert.equal(exit2.ok, true);
  pass("levels 3–4 restrictions + verifier exit");

  for (const name of smm.SMM_PUBLIC_API) {
    assert.equal(typeof mgr2[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  smm.clearSafeModeSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-safe-mode-core/safeModeManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0068-safe-mode-manager.md")
  );
  const faultIdx = coreSys.runtime.indexOf(
    "shared/mia-fault-core/faultManager.js"
  );
  const smmIdx = coreSys.runtime.indexOf(
    "shared/mia-safe-mode-core/safeModeManager.js"
  );
  assert.ok(faultIdx >= 0 && smmIdx === faultIdx + 1);
  pass("platformSystems nextDocId 0082; safe-mode after fault in CORE");

  for (const rel of smm.SMM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0068"), "README 0068");
  assert.ok(readme.includes("Safe Mode Manager"), "README Safe Mode Manager");
  assert.ok(
    /0068.*Platný|Platný.*0068/s.test(readme) ||
      readme.includes("[Safe Mode Manager")
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
    readme.includes("shared/mia-safe-mode-core/"),
    "README Safe Mode technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0068_contract.js"));
  pass("README + anchors");

  const align67 = read("docs/master-canon/0067-alignment.md");
  assert.ok(
    align67.includes("**0068**") && /Safe Mode/i.test(align67),
    "0067-alignment marks 0068 Safe Mode"
  );
  assert.ok(
    align67.includes("0069") && /Shutdown/i.test(align67),
    "0067-alignment marks 0069 Shutdown"
  );
  assert.ok(
    align67.includes("0070") && /Diagnostic/i.test(align67),
    "0067-alignment marks 0070 Diagnostic planned"
  );
  pass("0067-alignment marks 0068 done / 0069 Shutdown / 0070 Diagnostic");

  const align68 = read("docs/master-canon/0068-alignment.md");
  assert.ok(align68.includes("Live Runtime/AI bridge") || align68.includes("bridge"));
  assert.ok(align68.includes("🟡"));
  assert.ok(
    align68.includes("**0069**") && /Shutdown/i.test(align68),
    "0068-alignment marks 0069 Shutdown"
  );
  assert.ok(
    align68.includes("0070") && /Diagnostic/i.test(align68),
    "0068-alignment marks 0070 Diagnostic"
  );
  pass("0068-alignment marks live Runtime/AI bridge wiring partial + 0069/0070");

  console.log("\nMaster Canon 0068 contract: ALL PASS");
}

run();
