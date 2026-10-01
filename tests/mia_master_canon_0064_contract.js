"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const hm = require("../shared/mia-health-core");
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
  const docPath = path.join(MASTER, "0064-health-manager.md");
  const alignPath = path.join(MASTER, "0064-alignment.md");

  assert.ok(fs.existsSync(docPath), "0064-health-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0064-alignment.md exists");
  pass("0064 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0064 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0064 kernel layer");
  assert.ok(doc.includes("0065"), "0064 points to 0065");
  assert.ok(doc.includes("Watchdog"), "0064 points to Watchdog Engine");
  assert.ok(doc.includes("Health není totožný se State") || doc.includes("Health není"), "health ≠ state");
  pass("0064 structure (20 sections)");

  assert.equal(hm.HM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...hm.HM_COMPONENT_ORDER],
    [
      "health_manager",
      "health_registry",
      "score_engine",
      "rule_engine",
      "interval_scheduler",
      "event_publisher",
      "report_engine",
      "trend_analyzer",
      "recovery_feed",
      "watchdog_feed",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("health components (12)");

  for (const scope of [
    "system",
    "service",
    "module",
    "platform",
    "ai",
    "battle",
    "obs"
  ]) {
    assert.ok(Object.values(hm.HM_SCOPE).includes(scope), `scope ${scope}`);
  }
  assert.equal(hm.HM_DIAGNOSTIC_FLAGS.healthIsState, false);
  pass("HM scopes + healthIsState false");

  assert.deepEqual(
    [...hm.HM_HEALTH_ORDER],
    ["excellent", "good", "degraded", "critical", "failed"]
  );
  pass("five health levels");

  assert.equal(hm.scoreToHealth(100).health, "excellent");
  assert.equal(hm.scoreToHealth(95).health, "excellent");
  assert.equal(hm.scoreToHealth(94).health, "good");
  assert.equal(hm.scoreToHealth(80).health, "good");
  assert.equal(hm.scoreToHealth(79).health, "degraded");
  assert.equal(hm.scoreToHealth(50).health, "degraded");
  assert.equal(hm.scoreToHealth(49).health, "critical");
  assert.equal(hm.scoreToHealth(20).health, "critical");
  assert.equal(hm.scoreToHealth(19).health, "failed");
  assert.equal(hm.scoreToHealth(0).health, "failed");
  assert.equal(hm.validateScore(101).ok, false);
  assert.equal(hm.validateScore(-1).ok, false);
  assert.equal(hm.validateThresholds(hm.HM_DEFAULT_THRESHOLDS).ok, true);
  assert.equal(
    hm.validateThresholds({
      failed: { min: 0, max: 19 },
      critical: { min: 20, max: 49 },
      degraded: { min: 50, max: 79 },
      good: { min: 80, max: 90 },
      excellent: { min: 95, max: 100 }
    }).ok,
    false
  );
  pass("thresholds + score clamp/reject");

  assert.equal(hm.HM_DEFAULT_INTERVALS_MS.kernel, 1000);
  assert.equal(hm.HM_DEFAULT_INTERVALS_MS["event-bus"], 1000);
  assert.equal(hm.HM_DEFAULT_INTERVALS_MS.ai, 5000);
  assert.equal(hm.HM_DEFAULT_INTERVALS_MS.battle, 2000);
  assert.equal(hm.HM_DEFAULT_INTERVALS_MS.obs, 3000);
  assert.equal(hm.HM_DEFAULT_INTERVALS_MS.plugins, 10000);
  pass("seed intervals");

  const cpuRule = hm.evaluateRules({ baseScore: 100, cpu: 95 });
  assert.equal(cpuRule.score, 90);
  assert.ok(cpuRule.applied.some((a) => a.rule === "cpu_gt_90"));
  const noResp = hm.evaluateRules({ baseScore: 100, noResponse: true });
  assert.equal(noResp.score, 0);
  assert.equal(noResp.forcedLevel, "failed");
  const custom = hm.evaluateRules(
    { baseScore: 80, latencyHigh: true },
    [{ id: "lat", type: "deduction", when: { latencyHigh: true }, amount: 15 }]
  );
  assert.equal(custom.score, 65);
  const forced = hm.evaluateRules(
    { baseScore: 90, panic: true },
    [{ id: "panic", type: "force_level", when: { panic: true }, level: "critical" }]
  );
  assert.equal(forced.forcedLevel, "critical");
  pass("extensible rules");

  assert.equal(hm.HM_EVENT.HEALTH_CHANGED, "HealthChanged");
  assert.equal(
    hm.assertDirectHealthMutationForbidden("direct_health_write").ok,
    false
  );
  assert.equal(
    hm.assertDirectHealthMutationForbidden("forge_score").ok,
    false
  );
  assert.equal(
    hm.assertDirectHealthMutationForbidden("authorized_probe").ok,
    true
  );
  pass("events and mutation guard");

  const events = [];
  hm.clearHealthSingletonForTest();
  const mgr = hm.createHealthManager({
    seedDefaults: true,
    eventBus: {
      publish(event) {
        events.push(event);
        return { ok: true, event };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleHealthAuthority, true);
  assert.equal(mgr.status().healthIsState, false);
  assert.equal(mgr.status().diagnosticOnly, true);
  assert.equal(mgr.status().performsRecovery, false);
  assert.equal(mgr.status().performsRestart, false);
  pass("central health manager singleton");

  const duplicateMgr = hm.createHealthManager({ seedDefaults: false });
  assert.equal(duplicateMgr.ok, false);
  assert.equal(duplicateMgr.error, "health_manager_already_active");
  pass("duplicate manager blocked");

  const built = hm.createHealthDescriptor({
    component: "svc-demo",
    owner: "kernel",
    scope: hm.HM_SCOPE.SERVICE
  });
  assert.equal(built.ok, true);
  assert.ok(built.descriptor.healthId);
  assert.ok(Object.isFrozen(built.descriptor));
  for (const field of [
    "healthId",
    "owner",
    "component",
    "currentHealth",
    "previousHealth",
    "score",
    "lastCheck",
    "nextCheck"
  ]) {
    assert.ok(field in built.descriptor, `descriptor field ${field}`);
  }
  assert.equal(built.descriptor.healthIsState, false);
  pass("health descriptor fields");

  assert.equal(mgr.getIntervals().kernel, 1000);
  assert.equal(mgr.findByComponent("ai-core").intervalMs, 5000);
  assert.equal(mgr.findByComponent("battle-engine").intervalMs, 2000);
  assert.equal(mgr.findByComponent("obs-bridge").intervalMs, 3000);
  assert.equal(mgr.findByComponent("plugin-host").intervalMs, 10000);
  assert.equal(
    mgr.setIntervalMs("ai-core", 7000, {
      source: "kernel",
      sourceVerified: true
    }).ok,
    true
  );
  assert.equal(mgr.findByComponent("ai-core").intervalMs, 7000);
  pass("per-component interval config");

  const duplicateKernel = mgr.register(
    {
      component: "kernel",
      owner: "kernel",
      scope: hm.HM_SCOPE.SYSTEM
    },
    { source: "kernel", sourceVerified: true }
  );
  assert.equal(duplicateKernel.ok, false);
  assert.equal(duplicateKernel.error, "duplicate_component");
  const customReg = mgr.register(
    {
      component: "tiktok-connector",
      owner: "stream",
      scope: hm.HM_SCOPE.PLATFORM
    },
    { source: "kernel", sourceVerified: true }
  );
  assert.equal(customReg.ok, true);
  assert.equal(
    mgr.register(
      {
        component: "forged-component",
        owner: "plugin",
        scope: hm.HM_SCOPE.MODULE
      },
      { source: "unknown-plugin" }
    ).ok,
    false
  );
  assert.equal(
    mgr.addRule(
      "tiktok-connector",
      {
        id: "latency-high",
        type: "deduction",
        when: { latencyHigh: true },
        amount: 10
      },
      { source: "kernel", sourceVerified: true }
    ).ok,
    true
  );
  pass("protected registry and configurable rules");

  const denied = mgr.recordMeasurement("tiktok-connector", { baseScore: 50 }, {
    actor: "unknown-plugin"
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "unauthorized_measurement");

  const forged = mgr.recordMeasurement("tiktok-connector", { baseScore: 10 }, {
    source: "kernel",
    forged: true
  });
  assert.equal(forged.ok, false);

  const forgeWrite = mgr.recordMeasurement("tiktok-connector", { baseScore: 10 }, {
    source: "kernel",
    forgeScore: true
  });
  assert.equal(forgeWrite.ok, false);
  assert.equal(forgeWrite.error, "forged_score_write_rejected");

  const direct = mgr.recordMeasurement("tiktok-connector", { baseScore: 10 }, {
    source: "kernel",
    activity: "direct_health_write"
  });
  assert.equal(direct.ok, false);
  pass("auth/source verification + forged write blocked");

  const okMeasure = mgr.recordMeasurement(
    "tiktok-connector",
    { baseScore: 100, cpu: 95 },
    { source: "health-probe", sourceVerified: true, reason: "cpu_check" }
  );
  assert.equal(okMeasure.ok, true);
  assert.equal(mgr.findByComponent("tiktok-connector").score, 90);
  assert.equal(mgr.findByComponent("tiktok-connector").currentHealth, "good");
  pass("authorized measurement + CPU rule");

  assert.equal(
    mgr.addRule(
      "tiktok-connector",
      {
        id: "forced-critical",
        type: "force_level",
        when: { panic: true },
        level: hm.HM_HEALTH.CRITICAL
      },
      { source: "kernel", sourceVerified: true }
    ).ok,
    true
  );
  const forcedCritical = mgr.recordMeasurement(
    "tiktok-connector",
    { baseScore: 100, panic: true },
    { source: "health-probe", sourceVerified: true }
  );
  assert.equal(forcedCritical.ok, true);
  assert.equal(forcedCritical.health.currentHealth, hm.HM_HEALTH.CRITICAL);
  assert.equal(forcedCritical.health.score, 49);
  pass("forced health remains score-consistent");

  // State RUNNING + Health DEGRADED are independent concepts
  assert.equal(hm.HM_DIAGNOSTIC_FLAGS.healthIsState, false);
  const deg = mgr.recordMeasurement(
    "tiktok-connector",
    { baseScore: 60 },
    { source: "monitoring", authorized: true }
  );
  assert.equal(deg.ok, true);
  assert.equal(mgr.findByComponent("tiktok-connector").currentHealth, "degraded");
  // Simulated companion state would still be RUNNING — health is separate
  const companionState = { state: "RUNNING", health: mgr.findByComponent("tiktok-connector").currentHealth };
  assert.equal(companionState.state, "RUNNING");
  assert.equal(companionState.health, "degraded");
  pass("state RUNNING + health DEGRADED distinguished");

  events.length = 0;
  const sameLevel = mgr.recordMeasurement(
    "tiktok-connector",
    { baseScore: 55 },
    { source: "monitoring", authorized: true }
  );
  assert.equal(sameLevel.ok, true);
  assert.equal(sameLevel.levelChanged, false);
  assert.equal(events.length, 0);

  let subCalls = 0;
  let subFailed = false;
  mgr.subscribe(() => {
    subCalls += 1;
    throw new Error("subscriber boom");
  });
  mgr.subscribe(() => {
    subCalls += 1;
  });

  const failLevel = mgr.recordMeasurement(
    "tiktok-connector",
    { baseScore: 100, noResponse: true },
    { source: "monitoring", authorized: true }
  );
  assert.equal(failLevel.ok, true);
  assert.equal(failLevel.levelChanged, true);
  assert.equal(mgr.findByComponent("tiktok-connector").currentHealth, "failed");
  assert.ok(events.some((e) => e.type === "HealthChanged"));
  assert.equal(subCalls, 2);
  assert.equal(subFailed, false);
  pass("HealthChanged only on level change; subscriber failures isolated");

  assert.equal(mgr.restart().ok, false);
  assert.equal(mgr.repair().ok, false);
  assert.equal(mgr.enterSafeMode().ok, false);
  assert.equal(mgr.shutdown().ok, false);
  const feed = mgr.recoveryFeed();
  assert.equal(feed.diagnosticOnly, true);
  assert.equal(feed.performsRecovery, false);
  assert.equal(feed.performsRestart, false);
  const wd = mgr.watchdogFeed();
  assert.equal(wd.diagnosticOnly, true);
  assert.equal(wd.performsRestart, false);
  assert.ok(wd.objects.length >= 1);
  const src = read("shared/mia-health-core/healthManager.js");
  assert.equal(src.includes("require(") && /require\([^)]*restart/i.test(src), false);
  assert.ok(!/require\(["'].*processManager/.test(src));
  pass("no repair/restart behavior; diagnostic feeds only");

  // Gradual degradation trend
  hm.clearHealthSingletonForTest();
  const trendMgr = hm.createHealthManager({
    seedDefaults: false,
    allowParallelForTest: true,
    singleton: false
  });
  const trendReg = trendMgr.register(
    {
      component: "cpu-probe",
      owner: "kernel",
      scope: hm.HM_SCOPE.SYSTEM
    },
    { source: "kernel", sourceVerified: true }
  );
  const tid = trendReg.health.healthId;
  for (const score of [100, 85, 70, 55, 40]) {
    assert.equal(
      trendMgr.recordMeasurement(
        tid,
        { baseScore: score },
        { source: "kernel", authorized: true }
      ).ok,
      true
    );
  }
  const tr = trendMgr.trend(tid);
  assert.equal(tr.ok, true);
  assert.equal(tr.direction, "degrading");
  assert.ok(tr.delta < 0);
  assert.ok(tr.gradualDegradation === true);
  pass("trend analysis detects gradual degradation");

  const report = trendMgr.createReport();
  assert.equal(report.ok, true);
  assert.ok(typeof report.report.overallSystemScore === "number");
  assert.ok(report.report.componentScores["cpu-probe"] === 40);
  assert.ok(typeof report.report.failedCount === "number");
  assert.ok(typeof report.report.criticalCount === "number");
  assert.ok(report.report.trends);
  assert.equal(report.report.immutable, true);
  const archived = trendMgr.reportArchive();
  assert.equal(archived.length, 1);
  assert.equal(archived[0].reportId, report.report.reportId);
  assert.ok(Object.isFrozen(archived[0]));
  pass("health report + immutable archive");

  assert.ok(trendMgr.history().every((h) => h.immutable === true));
  assert.ok(trendMgr.auditTrail().every((a) => a.immutable === true));
  pass("immutable measurement history and audit");

  const mon = mgr.monitoringSnapshot();
  assert.ok(mon.system);
  assert.ok(mon.service);
  assert.ok(mon.ai);
  assert.ok(mon.battle);
  assert.ok(mon.obs);
  assert.ok(mon.platform);
  assert.equal(mon.healthIsState, false);
  pass("monitoring snapshot scopes");

  const metrics = mgr.metrics();
  assert.ok(typeof metrics.registryCount === "number");
  assert.ok(typeof metrics.checks === "number");
  assert.ok(typeof metrics.invalidWrites === "number");
  assert.ok(metrics.invalidWrites >= 1);
  assert.ok(typeof metrics.events === "number");
  assert.ok(typeof metrics.reports === "number");
  assert.ok(typeof metrics.failedObjects === "number");
  assert.ok(typeof metrics.criticalObjects === "number");
  pass("health metrics");

  // Restore singleton for platform wiring checks
  hm.clearHealthSingletonForTest();

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-health-core/healthManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0064-health-manager.md")
  );
  pass("core system next doc 0071");

  for (const rel of hm.HM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  assert.ok(pathExists("shared/mia-component-core/componentHealth.js"));
  assert.ok(pathExists("shared/mia-monitoring-core/monitoringSystem.js"));
  pass("runtime anchors; existing componentHealth/monitoring untouched");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0064"), "README 0064");
  assert.ok(readme.includes("Health Manager"), "README Health Manager");
  assert.ok(readme.includes("0066"), "README 0066");
  assert.ok(readme.includes("0067"), "README 0067 planned");
  assert.ok(readme.includes("Watchdog"), "README Watchdog");
  assert.ok(
    readme.includes("shared/mia-health-core/"),
    "README health technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0064_contract.js"));
  pass("README registry");

  const align63 = read("docs/master-canon/0063-alignment.md");
  assert.ok(align63.includes("**0064** Health Manager"));
  assert.ok(align63.includes("**0065** (plánováno)"));
  assert.ok(align63.includes("Watchdog Engine"));
  pass("0063-alignment marks 0064 done / 0065 planned");

  console.log("\nMaster Canon 0064 contract: ALL PASS");
}

run();
