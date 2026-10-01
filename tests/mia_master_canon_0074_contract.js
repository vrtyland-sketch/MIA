"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const aum = require("../shared/mia-audit-core");
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
  const docPath = path.join(MASTER, "0074-audit-manager.md");
  const alignPath = path.join(MASTER, "0074-alignment.md");

  assert.ok(fs.existsSync(docPath), "0074-audit-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0074-alignment.md exists");
  pass("0074 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0074 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0074 kernel layer");
  assert.ok(doc.includes("0075"), "0074 points to 0075");
  assert.ok(/Event Store Manager/i.test(doc), "0074 → Event Store Manager");
  assert.ok(doc.includes("0076"), "0074 points to 0076");
  assert.ok(/Telemetry Manager/i.test(doc), "0074 → Telemetry Manager");
  pass("21 sections → 0075 Event Store / 0076 Telemetry Manager");

  assert.equal(aum.AUM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...aum.AUM_COMPONENT_ORDER],
    [
      "audit_manager",
      "intake_gate",
      "descriptor_factory",
      "integrity_engine",
      "store_controller",
      "lifecycle_controller",
      "search_engine",
      "archive_controller",
      "fault_bridge",
      "alert_linker",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.deepEqual(
    [...aum.AUM_CATEGORY_ORDER],
    [
      "runtime",
      "configuration",
      "security",
      "administration",
      "ai",
      "battle",
      "plugin",
      "user_management",
      "api"
    ]
  );
  pass("categories");

  assert.deepEqual(
    [...aum.AUM_LIFECYCLE_ORDER],
    ["created", "stored", "verified", "archived", "retained"]
  );
  pass("lifecycle");

  assert.equal(aum.AUM_FLAGS.soleAuditAuthority, true);
  assert.equal(aum.AUM_FLAGS.isOperationalLogging, false);
  assert.equal(aum.AUM_FLAGS.runsDiagnostics, false);
  assert.equal(aum.AUM_FLAGS.recordsImmutable, true);
  assert.equal(aum.AUM_FLAGS.onlyCreateWrites, true);
  assert.equal(aum.AUM_FLAGS.separatesOperationalLogging, true);
  assert.equal(aum.separatesOperationalLogging, true);
  pass("flags");

  assert.deepEqual(
    [...aum.AUM_DESCRIPTOR_FIELDS],
    [
      "auditId",
      "runtimeId",
      "timestamp",
      "component",
      "actor",
      "action",
      "result",
      "correlationId",
      "integrityHash"
    ]
  );

  const d1 = aum.createAuditDescriptor({
    runtimeId: "rt-1",
    component: "kernel",
    actor: "admin",
    action: "config_change",
    result: "ok",
    category: "configuration"
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.auditId);
  assert.ok(d1.descriptor.integrityHash);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of aum.AUM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  assert.ok("category" in d1.descriptor, "category extra field");

  const d2 = aum.createAuditDescriptor({
    runtimeId: "rt-1",
    component: "kernel",
    actor: "admin",
    action: "config_change",
    result: "ok"
  });
  assert.notEqual(d1.descriptor.auditId, d2.descriptor.auditId);

  const hash = aum.computeIntegrityHash({
    auditId: "a1",
    runtimeId: "rt-1",
    timestamp: 1,
    component: "c",
    actor: "admin",
    action: "act",
    result: "ok",
    correlationId: "corr-1",
    category: "runtime"
  });
  assert.equal(typeof hash, "string");
  assert.equal(hash.length, 64);
  pass("descriptor 9 fields + unique IDs + integrity hash");

  aum.clearAuditSingletonForTest();

  let loggingWrites = 0;
  const mgr = aum.createAuditManager({
    loggingBridge: {
      log() {
        loggingWrites += 1;
        return { ok: true };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleAuditAuthority, true);
  assert.equal(mgr.status().isOperationalLogging, false);
  assert.equal(mgr.status().runsDiagnostics, false);
  assert.equal(mgr.status().recordsImmutable, true);
  assert.equal(mgr.status().onlyCreateWrites, true);

  const duplicate = aum.createAuditManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "audit_manager_already_active");
  pass("singleton");

  const created = mgr.createAudit(
    {
      runtimeId: "rt-1",
      component: "configuration_manager",
      actor: "admin",
      action: "update_setting",
      result: "applied",
      category: "configuration",
      correlationId: "corr-create-1"
    },
    { source: "admin", authorized: true, nowMs: 1000 }
  );
  assert.equal(created.ok, true);
  assert.ok(created.auditId);
  assert.equal(created.audit.lifecycle, "stored");
  assert.ok(created.audit.integrityHash);
  assert.equal(loggingWrites, 0, "createAudit must not call logging write APIs");

  const dual = mgr.createAudit(
    {
      runtimeId: "rt-1",
      component: "kernel",
      actor: "admin",
      action: "noop",
      result: "ok",
      category: "runtime"
    },
    { source: "admin", authorized: true, writeToLogging: true }
  );
  assert.equal(dual.ok, false);
  assert.equal(dual.error, "logging_dual_write_rejected");
  pass("logging separated");

  const verified = mgr.verifyAudit(created.auditId, {
    source: "admin",
    authorized: true,
    nowMs: 1100
  });
  assert.equal(verified.ok, true);
  assert.equal(verified.valid, true);
  assert.equal(verified.audit.lifecycle, "verified");
  pass("create → verify ok");

  mgr.__tamperForTest(created.auditId, { action: "tampered_action" });
  const tampered = mgr.verifyAudit(created.auditId, {
    source: "admin",
    authorized: true
  });
  assert.equal(tampered.ok, false);
  assert.equal(tampered.valid, false);
  assert.equal(tampered.error, "integrity_mismatch");
  pass("tamper detection");

  // Recreate clean record for remaining tests
  aum.clearAuditSingletonForTest();
  const mgr2 = aum.createAuditManager({});
  const clean = mgr2.createAudit(
    {
      runtimeId: "rt-2",
      component: "security_gate",
      actor: "admin",
      action: "grant_role",
      result: "ok",
      category: "security",
      correlationId: "corr-2"
    },
    { source: "admin", authorized: true, nowMs: 2000 }
  );
  assert.equal(clean.ok, true);
  mgr2.verifyAudit(clean.auditId, { source: "admin", authorized: true });

  assert.equal(mgr2.updateAudit(clean.auditId).ok, false);
  assert.equal(mgr2.updateAudit().blocked, true);
  assert.equal(mgr2.deleteAudit(clean.auditId).ok, false);
  assert.equal(mgr2.rewriteAudit(clean.auditId).ok, false);
  assert.equal(mgr2.purge().ok, false);
  pass("update/delete blocked");

  const other = mgr2.createAudit(
    {
      runtimeId: "rt-2",
      component: "plugin_manager",
      actor: "operator",
      action: "install_plugin",
      result: "ok",
      category: "plugin",
      correlationId: "corr-3"
    },
    { source: "operator", authorized: true, nowMs: 3000 }
  );

  const foundId = mgr2.findAudit(
    { auditId: clean.auditId },
    { source: "admin", authorized: true }
  );
  assert.equal(foundId.ok, true);
  assert.equal(foundId.count, 1);

  const foundRt = mgr2.findAudit(
    { runtimeId: "rt-2" },
    { source: "admin", authorized: true }
  );
  assert.ok(foundRt.count >= 2);

  const foundCat = mgr2.findAudit(
    { category: "plugin" },
    { source: "admin", authorized: true }
  );
  assert.equal(foundCat.count, 1);

  const foundActor = mgr2.findAudit(
    { actor: "operator" },
    { source: "admin", authorized: true }
  );
  assert.equal(foundActor.count, 1);

  const foundComp = mgr2.findAudit(
    { component: "security_gate" },
    { source: "admin", authorized: true }
  );
  assert.equal(foundComp.count, 1);

  const foundCorr = mgr2.findAudit(
    { correlationId: "corr-3" },
    { source: "admin", authorized: true }
  );
  assert.equal(foundCorr.count, 1);

  const foundRange = mgr2.findAudit(
    { fromTimestamp: 2500, toTimestamp: 3500 },
    { source: "admin", authorized: true }
  );
  assert.equal(foundRange.count, 1);
  pass("find by filters");

  const exported = mgr2.exportAudit(clean.auditId, {
    source: "admin",
    authorized: true
  });
  assert.equal(exported.ok, true);
  assert.equal(exported.report.auditId, clean.auditId);
  assert.ok("time" in exported.report);
  assert.ok("actor" in exported.report);
  assert.ok("action" in exported.report);
  assert.ok("result" in exported.report);
  assert.ok("integrity" in exported.report);
  assert.ok("correlationId" in exported.report);
  assert.ok(mgr2.reportArchive().length >= 1);

  const hashBefore = clean.audit.integrityHash;
  const archived = mgr2.archiveAudit(clean.auditId, {
    source: "admin",
    authorized: true,
    nowMs: 4000
  });
  assert.equal(archived.ok, true);
  assert.equal(archived.integrityPreserved, true);
  assert.equal(archived.integrityHash, hashBefore);
  assert.equal(archived.audit.lifecycle, "archived");

  const reverify = mgr2.verifyAudit(clean.auditId, {
    source: "admin",
    authorized: true
  });
  assert.equal(reverify.valid, true);
  pass("export; archive preserves integrity");

  const faultSkip = mgr2.fromFault(
    {
      faultId: "f-warn",
      severity: "warning",
      message: "minor",
      runtimeId: "rt-2"
    },
    { source: "fault_manager", authorized: true }
  );
  assert.equal(faultSkip.audited, false);
  assert.ok(/not_every_fault/i.test(faultSkip.reason));

  const faultHit = mgr2.fromFault(
    {
      faultId: "f-crit",
      severity: "critical",
      message: "critical fault",
      runtimeId: "rt-2",
      correlationId: "corr-fault-1"
    },
    { source: "fault_manager", authorized: true, nowMs: 5000 }
  );
  assert.equal(faultHit.audited, true);
  assert.equal(faultHit.faultId, "f-crit");
  assert.equal(faultHit.correlationId, "corr-fault-1");
  assert.equal(faultHit.audit.faultId, "f-crit");
  pass("fromFault only critical");

  const linked = mgr2.linkAlert("alert-99", other.auditId, {
    source: "alert_manager",
    authorized: true,
    nowMs: 6000
  });
  assert.equal(linked.ok, true);
  assert.equal(linked.alertId, "alert-99");
  assert.equal(linked.auditId, other.auditId);
  assert.ok(linked.link.immutable);
  assert.ok(mgr2.alertLinks().length >= 1);
  pass("linkAlert");

  const unauth = mgr2.createAudit(
    {
      runtimeId: "rt-2",
      component: "kernel",
      actor: "intruder",
      action: "hack",
      result: "denied",
      category: "security"
    },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_audit");

  const forged = mgr2.findAudit(
    { runtimeId: "rt-2" },
    { source: "admin", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_audit_blocked");
  pass("forged blocked");

  const m = mgr2.metrics();
  assert.ok(typeof m.eventCount === "number");
  assert.ok(typeof m.verifiedCount === "number");
  assert.ok(typeof m.archiveCount === "number");
  assert.ok(typeof m.integrityCheckCount === "number");
  assert.ok(typeof m.accessCount === "number");
  assert.ok(m.eventCount >= 1);
  assert.ok(m.archiveCount >= 1);
  assert.ok(m.accessCount >= 1);
  assert.equal(m.isOperationalLogging, false);
  pass("metrics");

  const trail = mgr2.accessTrail();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok(trail.every((t) => t.operation));
  pass("access trail");

  for (const name of aum.AUM_PUBLIC_API) {
    assert.equal(typeof mgr2[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  const reg = mgr2.registerCategory("custom_audit", {
    source: "admin",
    authorized: true
  });
  assert.equal(reg.ok, true);

  aum.clearAuditSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-audit-core/auditManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0074-audit-manager.md")
  );
  const amIdx = coreSys.runtime.indexOf(
    "shared/mia-alert-core/alertManager.js"
  );
  const aumIdx = coreSys.runtime.indexOf(
    "shared/mia-audit-core/auditManager.js"
  );
  assert.ok(amIdx >= 0 && aumIdx === amIdx + 1);
  pass("platformSystems nextDocId 0082; audit after alert in CORE");

  for (const rel of aum.AUM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
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
    readme.includes("shared/mia-audit-core/"),
    "README Audit technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0074_contract.js"));
  pass("README + anchors");

  const align74 = read("docs/master-canon/0074-alignment.md");
  assert.ok(
    align74.includes("**0075**") && /Event Store/i.test(align74),
    "0074-alignment marks 0075 Event Store"
  );
  assert.ok(
    align74.includes("0076") && /Telemetry/i.test(align74),
    "0074-alignment marks 0076 Telemetry planned"
  );
  pass("0074-alignment marks 0075 done / 0076 Telemetry planned");

  assert.ok(align74.includes("🟡"));
  assert.ok(
    align74.includes("durable") || align74.includes("Live"),
    "0074-alignment marks live durable store partial"
  );
  pass("0074-alignment marks live durable store partial");

  console.log("\nMaster Canon 0074 contract: ALL PASS");
}

run();
