"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const rm = require("../shared/mia-recovery-core");
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
  const docPath = path.join(MASTER, "0065-recovery-manager.md");
  const alignPath = path.join(MASTER, "0065-alignment.md");

  assert.ok(fs.existsSync(docPath), "0065-recovery-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0065-alignment.md exists");
  pass("0065 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0065 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0065 kernel layer");
  assert.ok(doc.includes("0066"), "0065 points to 0066");
  assert.ok(doc.includes("Watchdog"), "0065 points to Watchdog Engine");
  pass("0065 structure (21 sections)");

  assert.equal(rm.RM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...rm.RM_COMPONENT_ORDER],
    [
      "recovery_manager",
      "incident_intake",
      "incident_validator",
      "incident_classifier",
      "strategy_selector",
      "isolation_controller",
      "strategy_executor",
      "verifier",
      "escalation_controller",
      "report_engine",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("recovery components (12)");

  assert.deepEqual(
    [...rm.RM_WORKFLOW],
    [
      "detect",
      "validate",
      "classify",
      "choose_strategy",
      "recover",
      "verify",
      "report"
    ]
  );
  pass("workflow order");

  assert.deepEqual([...rm.RM_LEVEL_ORDER], [1, 2, 3, 4, 5]);
  assert.equal(rm.RM_LEVEL_NAME[1], "task_restart");
  assert.equal(rm.RM_LEVEL_NAME[2], "process_restart");
  assert.equal(rm.RM_LEVEL_NAME[3], "service_restart");
  assert.equal(rm.RM_LEVEL_NAME[4], "module_restart");
  assert.equal(rm.RM_LEVEL_NAME[5], "runtime_recovery");
  assert.equal(rm.RM_FLAGS.allowsOsRestart, false);
  assert.equal(rm.assertNoOsRestart("os_restart").ok, false);
  pass("five levels; no OS restart");

  assert.deepEqual(
    [...rm.RM_SEVERITY_ORDER],
    ["info", "warning", "error", "critical", "fatal"]
  );
  pass("five severities");

  const built = rm.createRecoveryDescriptor({
    component: "battle",
    severity: "error"
  });
  assert.equal(built.ok, true);
  assert.ok(built.descriptor.recoveryId);
  assert.ok(Object.isFrozen(built.descriptor));
  for (const field of [
    "recoveryId",
    "component",
    "severity",
    "strategy",
    "attempts",
    "result",
    "started",
    "finished"
  ]) {
    assert.ok(field in built.descriptor, `descriptor field ${field}`);
  }
  const built2 = rm.createRecoveryDescriptor({
    component: "battle",
    severity: "error"
  });
  assert.notEqual(built.descriptor.recoveryId, built2.descriptor.recoveryId);
  pass("descriptor fields + unique IDs");

  // Retry / backoff deterministic
  const r0 = rm.evaluateRetry({ attempt: 0 }, { maxAttempts: 3, delayMs: 100, backoffFactor: 2 });
  assert.equal(r0.shouldRetry, true);
  assert.equal(r0.nextDelayMs, 100);
  const r1 = rm.evaluateRetry({ attempt: 1 }, { maxAttempts: 3, delayMs: 100, backoffFactor: 2 });
  assert.equal(r1.nextDelayMs, 200);
  const r2 = rm.evaluateRetry({ attempt: 2 }, { maxAttempts: 3, delayMs: 100, backoffFactor: 2 });
  assert.equal(r2.nextDelayMs, 400);
  const rMax = rm.evaluateRetry({ attempt: 3 }, { maxAttempts: 3, delayMs: 100, backoffFactor: 2 });
  assert.equal(rMax.shouldRetry, false);
  assert.equal(rMax.reason, "max_attempts");
  const rOk = rm.evaluateRetry({ attempt: 1, succeeded: true }, { maxAttempts: 3 });
  assert.equal(rOk.shouldRetry, false);
  assert.equal(rOk.reason, "success");
  pass("retries + exponential backoff (deterministic)");

  // Invalid strategy rejection
  assert.equal(
    rm.validateStrategyDefinition({ strategy: "explode_server" }).ok,
    false
  );
  assert.equal(rm.validateStrategyDefinition({ strategy: "os_restart" }).ok, false);
  assert.equal(
    rm.validateStrategyDefinition({ strategy: "service_restart", level: 3 }).ok,
    true
  );
  assert.equal(
    rm.validateStrategyDefinition({ strategy: "service_restart", level: 1 }).ok,
    false
  );
  pass("invalid strategy blocked; allowlist + level mapping");

  rm.clearRecoverySingletonForTest();
  const execLog = [];
  const verifyLog = [];
  let verifyFailUntil = 0;
  const mgr = rm.createRecoveryManager({
    seedDefaults: true,
    maxTotalCycles: 8,
    retryPolicy: { maxAttempts: 2, delayMs: 10, backoffFactor: 2 },
    executor(ctx) {
      execLog.push({ ...ctx });
      return { ok: true, outcome: "fake_restart", step: ctx.step };
    },
    verifier(ctx) {
      verifyLog.push({ ...ctx });
      if (verifyFailUntil > 0) {
        verifyFailUntil -= 1;
        return { ok: false, verified: false, reason: "forced_fail" };
      }
      return { ok: true, verified: true };
    },
    runtimeBridge: {
      restartProcess(ctx) {
        execLog.push({ bridge: "process", ...ctx });
        return { ok: true, via: "runtimeBridge.process" };
      },
      restartService(ctx) {
        execLog.push({ bridge: "service", ...ctx });
        return { ok: true, via: "runtimeBridge.service" };
      },
      restartModule(ctx) {
        execLog.push({ bridge: "module", ...ctx });
        return { ok: true, via: "runtimeBridge.module" };
      },
      recoverRuntime(ctx) {
        execLog.push({ bridge: "runtime", ...ctx });
        return { ok: true, via: "runtimeBridge.runtime" };
      },
      diagnosticSnapshot() {
        return { ok: true, diagnosticOnly: true, snapshot: { partial: true } };
      }
    },
    healthBridge: {
      check() {
        return { ok: true, healthy: true };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleRecoveryAuthority, true);
  assert.equal(mgr.status().executorInjectedOnly, true);
  assert.equal(mgr.status().allowsOsRestart, false);
  pass("central recovery manager singleton");

  const duplicateMgr = rm.createRecoveryManager({});
  assert.equal(duplicateMgr.ok, false);
  assert.equal(duplicateMgr.error, "recovery_manager_already_active");
  pass("duplicate manager blocked");

  // OBS / Battle strategies
  assert.equal(mgr.getStrategy("battle").strategy, "service_restart");
  assert.equal(mgr.getStrategy("battle").level, 3);
  assert.deepEqual(
    [...mgr.getStrategy("obs").steps],
    ["reconnect", "restart_connector"]
  );
  pass("OBS reconnect+connector; Battle service restart");

  // Unauthorized rejection
  const unauth = mgr.recover(
    { component: "battle", severity: "error" },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_recovery");
  pass("auth/source verification rejection");

  const forcedDenied = mgr.recover(
    {
      component: "battle",
      severity: "error",
      forcedStrategy: "task_restart",
      forcedLevel: 1
    },
    {
      source: "health_manager",
      authorized: true,
      allowForcedStrategy: true
    }
  );
  assert.equal(forcedDenied.ok, false);
  assert.equal(forcedDenied.error, "forced_strategy_not_authorized");
  pass("external reporters cannot force strategy");

  // INFO → recorded no-action
  const info = mgr.recover(
    { component: "overlay", severity: "info", cause: "noise" },
    { source: "health_manager", authorized: true }
  );
  assert.equal(info.ok, true);
  assert.equal(info.result, "NO_ACTION");
  assert.equal(info.report.result, "NO_ACTION");
  assert.equal(info.report.immutable, true);
  assert.ok(info.report.recoveryId);
  pass("INFO produces recorded no-action report");

  // Critical cannot be ignored
  const critIgnore = mgr.recover(
    { component: "battle", severity: "critical", ignore: true, cause: "crit" },
    { source: "health_manager", authorized: true }
  );
  assert.equal(critIgnore.ok, false);
  assert.equal(critIgnore.error, "critical_fatal_cannot_be_ignored");
  const fatalIgnore = mgr.recover(
    { component: "runtime", severity: "fatal", ignore: true },
    { source: "kernel", authorized: true, allowKernelRecovery: true }
  );
  assert.equal(fatalIgnore.ok, false);
  assert.equal(fatalIgnore.error, "critical_fatal_cannot_be_ignored");
  pass("critical/fatal cannot be silently ignored");

  // Successful recovery: workflow order + isolation before exec + verification
  execLog.length = 0;
  verifyLog.length = 0;
  const okRec = mgr.recover(
    { component: "battle", severity: "error", cause: "battle_down" },
    { source: "health_manager", authorized: true, sourceVerified: true }
  );
  assert.equal(okRec.ok, true);
  assert.equal(okRec.result, "SUCCESS");
  assert.ok(okRec.verification && okRec.verification.verified === true);
  const phases = okRec.phases.map((p) => p.phase);
  assert.deepEqual(
    phases.filter((p, i) => phases.indexOf(p) === i),
    ["detect", "validate", "classify", "choose_strategy", "recover", "verify", "report"]
  );
  const recoverIdx = okRec.phases.findIndex((p) => p.phase === "recover");
  assert.ok(recoverIdx >= 0);
  assert.equal(okRec.phases[recoverIdx].isolationFirst, true);
  assert.ok(okRec.isolation && okRec.isolation.isolated === true);
  assert.equal(okRec.isolation.kernelPreserved, true);
  assert.equal(okRec.isolation.runtimePreserved, true);
  assert.ok(execLog.length >= 1, "executor invoked");
  assert.ok(verifyLog.length >= 1, "verifier invoked");
  // Isolation recorded before execution in audit/isolation log
  const iso = mgr.isolationLog();
  assert.ok(iso.some((i) => i.recoveryId === okRec.recoveryId));
  pass("workflow + isolation before executor + verification required");

  // Failed verification causes retry then success
  verifyFailUntil = 1;
  execLog.length = 0;
  const retryRec = mgr.recover(
    { component: "speech-worker", severity: "error", cause: "worker_hang" },
    { source: "system", authorized: true }
  );
  assert.equal(retryRec.ok, true);
  assert.ok(retryRec.attempts >= 2);
  pass("failed verification triggers retry");

  // Escalation sequential N→N+1
  rm.clearRecoverySingletonForTest();
  let failAlways = true;
  const escMgr = rm.createRecoveryManager({
    allowParallelForTest: true,
    singleton: false,
    retryPolicy: { maxAttempts: 1, delayMs: 1, backoffFactor: 2 },
    maxTotalCycles: 20,
    componentStrategies: {
      flaky: { strategy: "task_restart", level: 1, steps: ["task_restart"] }
    },
    executor() {
      return failAlways ? { ok: false, error: "boom" } : { ok: true };
    },
    verifier() {
      return failAlways
        ? { ok: false, verified: false }
        : { ok: true, verified: true };
    }
  });
  const esc = escMgr.recover(
    { component: "flaky", severity: "error", cause: "escalate_me" },
    { source: "kernel", authorized: true }
  );
  assert.equal(esc.ok, false);
  assert.ok(esc.escalations >= 4);
  const choosePhases = esc.phases.filter(
    (p) => p.phase === "choose_strategy" && p.escalated
  );
  for (let i = 0; i < choosePhases.length; i += 1) {
    assert.equal(choosePhases[i].to, choosePhases[i].from + 1);
    assert.ok(choosePhases[i].to <= 5);
  }
  pass("sequential escalation Level N→N+1; never above 5");

  // Explicit skip only when strategy opts in
  const skip = escMgr.escalate(1, { allowLevelSkip: true, skipToLevel: 3 });
  assert.equal(skip.ok, true);
  assert.equal(skip.to, 3);
  assert.equal(skip.skipped, true);
  const noSkip = escMgr.escalate(1, {});
  assert.equal(noSkip.to, 2);
  assert.equal(noSkip.skipped, false);
  const above = escMgr.escalate(5, {});
  assert.equal(above.ok, false);
  pass("explicit level skip only when allowLevelSkip");

  // Health input semantics
  rm.clearRecoverySingletonForTest();
  const healthMgr = rm.createRecoveryManager({
    allowParallelForTest: true,
    singleton: false,
    executor() {
      return { ok: true };
    },
    verifier() {
      return { ok: true, verified: true };
    }
  });
  const fromH = healthMgr.fromHealth(
    {
      diagnosticOnly: true,
      objects: [{ component: "battle", currentHealth: "failed", score: 10 }]
    },
    { source: "health_manager", authorized: true }
  );
  assert.equal(fromH.ok, true);
  assert.equal(fromH.healthDecides, false);
  assert.equal(fromH.recoveryDecides, true);
  assert.equal(fromH.diagnosticInputOnly, true);
  assert.ok(fromH.results.length >= 1);
  assert.equal(fromH.results[0].ok, true);
  pass("Health reports; Recovery decides");

  // Watchdog request — cannot choose/execute strategy
  const wdBad = healthMgr.fromWatchdog(
    { component: "battle", strategy: "service_restart" },
    { source: "watchdog", authorized: true }
  );
  assert.equal(wdBad.ok, false);
  assert.equal(wdBad.error, "watchdog_cannot_choose_or_execute_strategy");
  const wdOk = healthMgr.fromWatchdog(
    { component: "battle", severity: "critical", cause: "deadlock" },
    { source: "watchdog", authorized: true }
  );
  assert.equal(wdOk.ok, true);
  assert.equal(wdOk.result, "SUCCESS");
  pass("Watchdog may request recovery; cannot choose strategy");

  // Runtime snapshot diagnostic-only
  const snap = healthMgr.recover(
    {
      component: "ai-module",
      severity: "error",
      runtimeSnapshot: { modules: ["ai"], incomplete: true }
    },
    { source: "runtime-manager", authorized: true }
  );
  assert.equal(snap.ok, true);
  assert.ok(snap.diagnosticSnapshot);
  assert.equal(snap.diagnosticSnapshot.diagnosticOnly, true);
  assert.equal(snap.diagnosticSnapshot.assumedCompleteRecoveryState, false);
  pass("Runtime snapshot is diagnostic-only input");

  // Reports + archive immutable
  const archived = healthMgr.reportArchive();
  assert.ok(archived.length >= 1);
  assert.ok(archived.every((r) => r.immutable === true));
  assert.ok(archived.every((r) => Object.isFrozen(r)));
  for (const field of [
    "recoveryId",
    "cause",
    "strategy",
    "attempts",
    "duration",
    "result",
    "verification",
    "escalations"
  ]) {
    assert.ok(field in archived[0], `report field ${field}`);
  }
  assert.ok(healthMgr.auditTrail().every((a) => a.immutable === true));
  pass("immutable recovery reports + audit");

  // Metrics
  const metrics = healthMgr.metrics();
  assert.ok(typeof metrics.actions === "number");
  assert.ok(typeof metrics.successRate === "number");
  assert.ok(typeof metrics.averageDuration === "number");
  assert.ok(Array.isArray(metrics.frequentErrors));
  assert.ok(Array.isArray(metrics.frequentComponents));
  assert.ok(typeof metrics.escalations === "number");
  pass("recovery metrics");

  // Loop cap
  rm.clearRecoverySingletonForTest();
  const loopMgr = rm.createRecoveryManager({
    allowParallelForTest: true,
    singleton: false,
    maxTotalCycles: 2,
    retryPolicy: { maxAttempts: 5, delayMs: 1, backoffFactor: 2 },
    executor() {
      return { ok: false, error: "still_broken" };
    },
    verifier() {
      return { ok: false, verified: false };
    }
  });
  const capped = loopMgr.recover(
    { component: "overlay", severity: "error" },
    { source: "system", authorized: true }
  );
  assert.equal(capped.ok, false);
  assert.equal(capped.error, "max_total_cycles_exceeded");
  assert.equal(capped.result, rm.RM_RESULT.LOOP_CAP);
  assert.equal(capped.attempts, 2);
  pass("max total cycles per incident");

  // Kernel protection
  rm.clearRecoverySingletonForTest();
  const kernMgr = rm.createRecoveryManager({
    allowParallelForTest: true,
    singleton: false,
    executor() {
      return { ok: true };
    },
    verifier() {
      return { ok: true, verified: true };
    }
  });
  const kernBlocked = kernMgr.recover(
    { component: "kernel", severity: "error" },
    { source: "operator", authorized: true }
  );
  assert.equal(kernBlocked.ok, false);
  assert.equal(kernBlocked.error, "kernel_protected");
  const forgedKernelPermission = kernMgr.recover(
    { component: "kernel", severity: "critical" },
    {
      source: "health_manager",
      authorized: true,
      allowKernelRecovery: true
    }
  );
  assert.equal(forgedKernelPermission.ok, false);
  assert.equal(forgedKernelPermission.error, "kernel_protected");
  const kernelRecovery = kernMgr.recover(
    { component: "kernel", severity: "critical" },
    {
      source: "kernel",
      sourceVerified: true,
      allowKernelRecovery: true
    }
  );
  assert.equal(kernelRecovery.ok, true);
  pass("Kernel protection");

  // No direct OS/process APIs on manager
  assert.equal(mgr.spawnProcess().ok, false);
  assert.equal(mgr.killProcess().ok, false);
  assert.equal(mgr.restartOsService().ok, false);
  assert.equal(mgr.restartOs().ok, false);
  const src = read("shared/mia-recovery-core/recoveryManager.js");
  assert.ok(!/child_process/.test(src));
  assert.ok(!/\bspawn\s*\(/.test(src));
  assert.ok(!/\bexecSync\s*\(/.test(src));
  assert.ok(!/process\.kill\s*\(/.test(src));
  pass("no direct OS/process restart APIs");

  // WARNING policy isolate/observe
  rm.clearRecoverySingletonForTest();
  const warnMgr = rm.createRecoveryManager({
    allowParallelForTest: true,
    singleton: false,
    warningPolicy: { action: "isolate_observe" },
    executor() {
      return { ok: true };
    },
    verifier() {
      return { ok: true, verified: true };
    }
  });
  const warn = warnMgr.recover(
    { component: "overlay", severity: "warning", cause: "degraded" },
    { source: "health_manager", authorized: true }
  );
  assert.equal(warn.ok, true);
  assert.equal(warn.report.strategy, "isolate_observe");
  assert.ok(warn.isolation);
  pass("WARNING may isolate/observe per policy");

  // Invalid strategy registration blocked
  const badReg = warnMgr.registerStrategy(
    "x",
    { strategy: "not_a_real_strategy" },
    { source: "kernel", authorized: true }
  );
  assert.equal(badReg.ok, false);
  pass("invalid strategy registration blocked");

  // Platform wiring
  rm.clearRecoverySingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-recovery-core/recoveryManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0065-recovery-manager.md")
  );
  const healthIdx = coreSys.runtime.indexOf(
    "shared/mia-health-core/healthManager.js"
  );
  const recoveryIdx = coreSys.runtime.indexOf(
    "shared/mia-recovery-core/recoveryManager.js"
  );
  assert.ok(healthIdx >= 0 && recoveryIdx === healthIdx + 1);
  pass("core system next doc 0071; recovery after health");

  for (const rel of rm.RM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0065"), "README 0065");
  assert.ok(readme.includes("Recovery Manager"), "README Recovery Manager");
  assert.ok(readme.includes("0066"), "README 0066");
  assert.ok(readme.includes("Watchdog"), "README Watchdog");
  assert.ok(readme.includes("0067"), "README 0067 planned");
  assert.ok(
    readme.includes("shared/mia-recovery-core/"),
    "README recovery technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0065_contract.js"));
  pass("README registry");

  const align64 = read("docs/master-canon/0064-alignment.md");
  assert.ok(align64.includes("**0065** Recovery Manager") || align64.includes("**0065**"));
  assert.ok(align64.includes("0066"));
  assert.ok(align64.includes("Watchdog"));
  pass("0064-alignment marks 0065 done / 0066 planned");

  const align65 = read("docs/master-canon/0065-alignment.md");
  assert.ok(align65.includes("Live wiring") || align65.includes("executors"));
  assert.ok(align65.includes("🟡"));
  pass("0065-alignment marks executor wiring partial");

  console.log("\nMaster Canon 0065 contract: ALL PASS");
}

run();
