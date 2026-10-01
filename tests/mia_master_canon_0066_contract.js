"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const wde = require("../shared/mia-watchdog-core");
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
  const docPath = path.join(MASTER, "0066-watchdog-engine.md");
  const alignPath = path.join(MASTER, "0066-alignment.md");

  assert.ok(fs.existsSync(docPath), "0066-watchdog-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0066-alignment.md exists");
  pass("0066 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0066 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0066 kernel layer");
  assert.ok(doc.includes("0067"), "0066 points to 0067");
  pass("0066 structure (21 sections → 0067)");

  assert.equal(wde.WDE_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...wde.WDE_COMPONENT_ORDER],
    [
      "watchdog_engine",
      "heartbeat_intake",
      "heartbeat_verifier",
      "freeze_detector",
      "deadlock_detector",
      "resource_signal_intake",
      "problem_classifier",
      "timeout_registry",
      "recovery_notifier",
      "cycle_controller",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("watchdog components (12)");

  assert.deepEqual(
    [...wde.WDE_CYCLE],
    [
      "receive_heartbeats",
      "verify",
      "detect_problems",
      "classify",
      "notify_recovery"
    ]
  );
  pass("cycle order");

  assert.deepEqual(
    [...wde.WDE_HEARTBEAT_FIELDS],
    ["componentId", "timestamp", "health", "runtimeId", "sequence", "status"]
  );
  assert.deepEqual(
    [...wde.WDE_SEVERITY_ORDER],
    ["info", "warning", "error", "critical", "fatal"]
  );
  for (const kind of [
    "heartbeat_loss",
    "freeze",
    "deadlock",
    "queue_overflow",
    "cpu_overload",
    "memory_leak",
    "slow_response",
    "platform_disconnect"
  ]) {
    assert.ok(wde.WDE_PROBLEM_KIND_ORDER.includes(kind), `kind ${kind}`);
  }
  assert.equal(wde.WDE_FLAGS.repairsDirectly, false);
  assert.equal(wde.WDE_FLAGS.soleWatchdogAuthority, true);
  assert.equal(wde.WDE_FLAGS.notifiesRecoveryOnly, true);
  pass("heartbeat fields + severities + problem kinds + flags");

  assert.deepEqual(wde.WDE_DEFAULT_TIMEOUTS_MS.kernel, 1000);
  assert.equal(wde.WDE_DEFAULT_TIMEOUTS_MS["event-bus"], 2000);
  assert.equal(wde.WDE_DEFAULT_TIMEOUTS_MS.battle, 3000);
  assert.equal(wde.WDE_DEFAULT_TIMEOUTS_MS.obs, 5000);
  assert.equal(wde.WDE_DEFAULT_TIMEOUTS_MS.plugin, 10000);
  pass("default timeouts match canon table");

  const built = wde.createHeartbeatDescriptor({
    componentId: "kernel",
    timestamp: 1000,
    health: "good",
    runtimeId: "rt-1",
    sequence: 1,
    status: "alive"
  });
  assert.equal(built.ok, true);
  assert.ok(built.descriptor.heartbeatId);
  assert.ok(Object.isFrozen(built.descriptor));
  for (const field of wde.WDE_HEARTBEAT_FIELDS) {
    assert.ok(field in built.descriptor, `descriptor field ${field}`);
  }
  const built2 = wde.createHeartbeatDescriptor({
    componentId: "kernel",
    timestamp: 1001,
    health: "good",
    runtimeId: "rt-1",
    sequence: 2,
    status: "alive"
  });
  assert.notEqual(built.descriptor.heartbeatId, built2.descriptor.heartbeatId);
  assert.equal(
    wde.createHeartbeatDescriptor({ componentId: "x" }).ok,
    false
  );
  pass("heartbeat descriptor fields + unique IDs");

  wde.clearWatchdogSingletonForTest();
  const notifyLog = [];
  const eng = wde.createWatchdogEngine({
    seedDefaults: true,
    maxRecoveryNotifies: 2,
    cycleLengthMs: 1000,
    recoveryBridge: {
      fromWatchdog(req, meta) {
        notifyLog.push({ req: { ...req }, meta: { ...meta } });
        assert.ok(!("strategy" in req) || req.strategy == null);
        assert.ok(!("chosenStrategy" in req) || req.chosenStrategy == null);
        assert.ok(!("executeStrategy" in req) || req.executeStrategy == null);
        return { ok: true, received: true };
      }
    }
  });
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  assert.equal(eng.status().soleWatchdogAuthority, true);
  assert.equal(eng.status().repairsDirectly, false);
  assert.equal(eng.status().notifiesRecoveryOnly, true);
  pass("central watchdog engine singleton");

  const duplicate = wde.createWatchdogEngine({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "watchdog_engine_already_active");
  pass("duplicate engine blocked");

  // Unauthorized heartbeat
  const unauth = eng.heartbeat(
    {
      componentId: "kernel",
      timestamp: 1000,
      health: "good",
      runtimeId: "rt-1",
      sequence: 1,
      status: "alive"
    },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_heartbeat");
  pass("unauthorized heartbeat blocked");

  // Forged heartbeat
  const forged = eng.heartbeat(
    {
      componentId: "kernel",
      timestamp: 1000,
      health: "good",
      runtimeId: "rt-1",
      sequence: 1,
      status: "alive"
    },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_heartbeat_blocked");
  pass("forged heartbeat blocked");

  // Valid heartbeats + sequence enforcement
  const hb1 = eng.heartbeat(
    {
      componentId: "speech",
      timestamp: 1000,
      health: "good",
      runtimeId: "rt-1",
      sequence: 1,
      status: "alive"
    },
    { source: "runtime_manager", authorized: true, sourceVerified: true }
  );
  assert.equal(hb1.ok, true);
  const hbDup = eng.heartbeat(
    {
      componentId: "speech",
      timestamp: 1001,
      health: "good",
      runtimeId: "rt-1",
      sequence: 1,
      status: "alive"
    },
    { source: "runtime_manager", authorized: true, sourceVerified: true }
  );
  assert.equal(hbDup.ok, false);
  assert.equal(hbDup.error, "out_of_order_sequence");
  const hb2 = eng.heartbeat(
    {
      componentId: "speech",
      timestamp: 1002,
      health: "good",
      runtimeId: "rt-1",
      sequence: 2,
      status: "alive"
    },
    { source: "runtime_manager", authorized: true, sourceVerified: true }
  );
  assert.equal(hb2.ok, true);
  pass("heartbeat integrity + strictly increasing sequence");

  // Freeze detection → notify Recovery
  eng.registerComponent(
    "speech",
    { scope: "service", timeoutMs: 500 },
    { source: "kernel", authorized: true }
  );
  const freeze = eng.detectFreeze(
    { componentId: "speech", unresponsive: true },
    2000
  );
  assert.equal(freeze.frozen, true);
  assert.ok(freeze.reasons.includes("unresponsive"));
  const freezeNotify = eng.notifyRecovery(
    {
      kind: "freeze",
      componentId: "speech",
      severity: "critical",
      reason: "frozen",
      detectedAt: 1900
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(freezeNotify.ok, true);
  assert.equal(freezeNotify.notifiesRecoveryOnly, true);
  assert.equal(freezeNotify.repairsDirectly, false);
  assert.ok(notifyLog.length >= 1);
  pass("freeze detection → Recovery notify");

  // Deadlock detection
  const deadlock = eng.detectDeadlock({
    componentId: "runtime",
    blockedThreads: ["t1", "t2"],
    lockWaits: ["lockA"],
    cyclicDeps: [["a", "b", "a"]],
    inactiveProcesses: ["p1"]
  });
  assert.equal(deadlock.deadlock, true);
  assert.equal(deadlock.confirmed, true);
  const dlNotify = eng.notifyRecovery(
    {
      kind: "deadlock",
      componentId: "runtime",
      severity: "critical",
      reason: "deadlock"
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(dlNotify.ok, true);
  pass("deadlock detection → Recovery notify");

  // Configurable timeouts
  const badTimeout = eng.setTimeoutMs("kernel", 50, {
    source: "intruder",
    authorized: false
  });
  assert.equal(badTimeout.ok, false);
  const okTimeout = eng.setTimeoutMs("kernel", 1500, {
    source: "kernel",
    authorized: true
  });
  assert.equal(okTimeout.ok, true);
  assert.equal(eng.getTimeoutMs("kernel"), 1500);
  assert.equal(eng.getTimeoutMs("event-bus"), 2000);
  assert.equal(eng.getTimeoutMs("battle"), 3000);
  assert.equal(eng.getTimeoutMs("obs"), 5000);
  assert.equal(eng.getTimeoutMs("plugin"), 10000);
  pass("configurable timeouts (auth)");

  // Classify severities
  const sev = wde.classifyProblem({ kind: "freeze" });
  assert.equal(sev.ok, true);
  assert.equal(sev.classification.severity, "critical");
  assert.equal(
    wde.classifyProblem({ kind: "queue_overflow" }).classification.severity,
    "warning"
  );
  pass("classify severities");

  // Strategy forbidden on notify
  const withStrategy = eng.notifyRecovery(
    {
      kind: "freeze",
      componentId: "overlay",
      strategy: "service_restart"
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(withStrategy.ok, false);
  assert.equal(
    withStrategy.error,
    "watchdog_cannot_choose_or_execute_strategy"
  );
  const withChosen = eng.notifyRecovery(
    {
      kind: "freeze",
      componentId: "overlay",
      chosenStrategy: "task_restart"
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(withChosen.ok, false);
  pass("notify Recovery without choosing strategy");

  // No direct repair APIs
  assert.equal(eng.repair().ok, false);
  assert.equal(eng.restart().ok, false);
  assert.equal(eng.reconnect().ok, false);
  assert.equal(eng.spawnProcess().ok, false);
  assert.equal(eng.killProcess().ok, false);
  assert.equal(eng.exec().ok, false);
  const src = read("shared/mia-watchdog-core/watchdogEngine.js");
  assert.ok(!/child_process/.test(src));
  assert.ok(!/\bspawn\s*\(/.test(src));
  assert.ok(!/\bexecSync\s*\(/.test(src));
  assert.ok(!/process\.kill\s*\(/.test(src));
  pass("no direct repair/restart/spawn APIs");

  // Platform disconnect preserves Kernel
  const plat = eng.notifyRecovery(
    {
      kind: "platform_disconnect",
      componentId: "tiktok",
      severity: "error",
      reason: "disconnect"
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(plat.ok, true);
  assert.equal(plat.kernelPreserved, true);
  const lastPlat = notifyLog[notifyLog.length - 1];
  assert.equal(lastPlat.req.kernelPreserved, true);
  pass("platform disconnect preserves Kernel");

  // Battle frozen → Recovery with kernelPreserved
  const battleFreeze = eng.notifyRecovery(
    {
      kind: "freeze",
      componentId: "battle",
      severity: "critical",
      reason: "frozen_battle",
      kernelPreserved: true
    },
    { source: "watchdog", authorized: true }
  );
  assert.equal(battleFreeze.ok, true);
  assert.equal(battleFreeze.kernelPreserved, true);
  pass("Battle frozen notifies Recovery (kernel preserved)");

  // Resource overload path
  const res = eng.ingestResourceSignal(
    { resource: "cpu", value: 99, componentId: "runtime" },
    { source: "resource_manager", authorized: true }
  );
  assert.equal(res.ok, true);
  assert.equal(res.diagnosticOnly, true);
  assert.equal(res.allocatesResources, false);
  assert.ok(res.problems.some((p) => p.kind === "cpu_overload"));
  assert.ok(res.notifications.some((n) => n.ok === true));
  assert.equal(eng.allocateResource().ok, false);
  assert.equal(eng.freeResource().ok, false);
  pass("resource overload → classify + notify (diagnostic only)");

  // Recovery rate limit
  wde.clearWatchdogSingletonForTest();
  const limitedLog = [];
  const limited = wde.createWatchdogEngine({
    allowParallelForTest: true,
    singleton: false,
    maxRecoveryNotifies: 2,
    recoveryBridge: {
      fromWatchdog(req) {
        limitedLog.push(req.componentId);
        return { ok: true };
      }
    }
  });
  const n1 = limited.notifyRecovery(
    { kind: "freeze", componentId: "loop-comp", severity: "critical" },
    { source: "watchdog", authorized: true }
  );
  const n2 = limited.notifyRecovery(
    { kind: "freeze", componentId: "loop-comp", severity: "critical" },
    { source: "watchdog", authorized: true }
  );
  const n3 = limited.notifyRecovery(
    { kind: "freeze", componentId: "loop-comp", severity: "critical" },
    { source: "watchdog", authorized: true }
  );
  assert.equal(n1.ok, true);
  assert.equal(n2.ok, true);
  assert.equal(n3.ok, false);
  assert.equal(n3.error, "recovery_notify_rate_limited");
  assert.equal(limitedLog.length, 2);
  const bypass = limited.notifyRecovery(
    { kind: "freeze", componentId: "other", severity: "critical" },
    { source: "watchdog", authorized: true, bypassWatchdog: true }
  );
  assert.equal(bypass.ok, false);
  assert.equal(bypass.error, "recovery_notify_bypass_blocked");
  pass("recovery rate limit + bypass blocked");

  // Deterministic cycle
  wde.clearWatchdogSingletonForTest();
  const cycleLog = [];
  const cyc = wde.createWatchdogEngine({
    seedDefaults: true,
    cycleLengthMs: 1000,
    recoveryBridge: {
      fromWatchdog(req) {
        cycleLog.push(req);
        return { ok: true };
      }
    }
  });
  cyc.registerComponent(
    "speech",
    { scope: "service", timeoutMs: 100 },
    { source: "kernel", authorized: true }
  );
  cyc.heartbeat(
    {
      componentId: "speech",
      timestamp: 0,
      health: "good",
      runtimeId: "rt",
      sequence: 1,
      status: "alive"
    },
    { source: "runtime_manager", authorized: true }
  );
  const cycle = cyc.runCycle(5000);
  assert.equal(cycle.ok, true);
  assert.deepEqual([...cycle.phases], [...wde.WDE_CYCLE]);
  assert.ok(cyc.phaseHistory().length >= 5);
  assert.ok(cycle.problems.length >= 1);
  pass("deterministic runCycle phase history");

  // Metrics + audit
  const m = cyc.metrics();
  assert.ok(typeof m.heartbeatCount === "number");
  assert.ok(typeof m.timeoutCount === "number");
  assert.ok(typeof m.freezeCount === "number");
  assert.ok(typeof m.deadlockCount === "number");
  assert.ok(typeof m.recoveryNotifyCount === "number");
  assert.ok(typeof m.averageReactionMs === "number");
  const trail = cyc.auditTrail();
  assert.ok(trail.length > 0);
  assert.ok(trail.every((r) => r.immutable === true));
  pass("metrics + immutable audit trail");

  // Public API frozen list
  for (const name of wde.WDE_PUBLIC_API) {
    assert.equal(typeof cyc[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  // Platform wiring
  wde.clearWatchdogSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-watchdog-core/watchdogEngine.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0066-watchdog-engine.md")
  );
  const recoveryIdx = coreSys.runtime.indexOf(
    "shared/mia-recovery-core/recoveryManager.js"
  );
  const watchdogIdx = coreSys.runtime.indexOf(
    "shared/mia-watchdog-core/watchdogEngine.js"
  );
  assert.ok(recoveryIdx >= 0 && watchdogIdx === recoveryIdx + 1);
  pass("core system next doc 0071; watchdog after recovery");

  for (const rel of wde.WDE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0066"), "README 0066");
  assert.ok(readme.includes("Watchdog Engine"), "README Watchdog Engine");
  assert.ok(/0066.*Platný|Platný.*0066/s.test(readme) || readme.includes("[Watchdog Engine"));
  assert.ok(readme.includes("0067"), "README 0067");
  assert.ok(readme.includes("Fault Manager"), "README Fault Manager");
  assert.ok(
    /0067.*Platný|Platný.*0067/s.test(readme) || readme.includes("[Fault Manager")
  );
  assert.ok(readme.includes("0068"), "README 0068");
  assert.ok(
    /Safe Mode Manager/i.test(readme),
    "README Safe Mode Manager"
  );
  assert.ok(
    /0068.*Platný|Platný.*0068/s.test(readme) || readme.includes("[Safe Mode Manager"),
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
    readme.includes("shared/mia-watchdog-core/"),
    "README watchdog technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0066_contract.js"));
  pass("README registry");

  const align65 = read("docs/master-canon/0065-alignment.md");
  assert.ok(
    align65.includes("**0066**") && align65.includes("Watchdog"),
    "0065-alignment marks 0066"
  );
  assert.ok(align65.includes("0067"), "0065-alignment marks 0067");
  pass("0065-alignment marks 0066 done / 0067");

  const align66 = read("docs/master-canon/0066-alignment.md");
  assert.ok(align66.includes("Live wiring") || align66.includes("timer"));
  assert.ok(align66.includes("🟡"));
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
  pass("0066-alignment marks live timer wiring partial + 0067/0068/0069/0070");

  console.log("\nMaster Canon 0066 contract: ALL PASS");
}

run();
