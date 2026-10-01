"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const sdm = require("../shared/mia-shutdown-core");
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
  const docPath = path.join(MASTER, "0069-shutdown-manager.md");
  const alignPath = path.join(MASTER, "0069-alignment.md");

  assert.ok(fs.existsSync(docPath), "0069-shutdown-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0069-alignment.md exists");
  pass("0069 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0069 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0069 kernel layer");
  assert.ok(doc.includes("0070"), "0069 points to 0070");
  assert.ok(
    /Diagnostics Manager/i.test(doc),
    "0069 mentions Diagnostics Manager"
  );
  assert.ok(doc.includes("0071"), "0069 points to 0071");
  pass("0069 structure (21 sections → 0070 Diagnostics Manager / 0071)");

  assert.equal(sdm.SDM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...sdm.SDM_COMPONENT_ORDER],
    [
      "shutdown_manager",
      "request_intake",
      "validation_gate",
      "notification_dispatcher",
      "stop_sequencer",
      "state_persister",
      "resource_releaser",
      "runtime_closer",
      "recovery_coordinator",
      "report_engine",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("shutdown components (12)");

  assert.deepEqual(
    [...sdm.SDM_MODE_ORDER],
    ["graceful", "maintenance", "emergency", "restart"]
  );
  pass("four shutdown modes");

  assert.equal(sdm.SDM_FLAGS.soleShutdownAuthority, true);
  assert.equal(sdm.SDM_FLAGS.phasesMustNotSkip, true);
  assert.equal(sdm.SDM_FLAGS.kernelStopsLast, true);
  assert.equal(sdm.SDM_FLAGS.blocksParallelShutdown, true);
  pass("shutdown flags");

  assert.deepEqual(
    [...sdm.SDM_WORKFLOW],
    [
      "shutdown_request",
      "validation",
      "notify_components",
      "stop_services",
      "save_state",
      "release_resources",
      "close_runtime",
      "exit"
    ]
  );
  pass("workflow 8 phases no skip");

  assert.deepEqual(
    [...sdm.SDM_DESCRIPTOR_FIELDS],
    [
      "shutdownId",
      "runtimeId",
      "reason",
      "requestedBy",
      "started",
      "finished",
      "mode",
      "result"
    ]
  );

  const d1 = sdm.createShutdownDescriptor({
    runtimeId: "rt-1",
    reason: "maintenance window",
    requestedBy: "operator",
    started: 1000,
    mode: "graceful"
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.shutdownId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of sdm.SDM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = sdm.createShutdownDescriptor({
    runtimeId: "rt-1",
    reason: "restart",
    requestedBy: "kernel",
    started: 1001,
    mode: "restart"
  });
  assert.notEqual(d1.descriptor.shutdownId, d2.descriptor.shutdownId);
  assert.equal(sdm.createShutdownDescriptor({ mode: "graceful" }).ok, false);
  pass("descriptor 8 fields + unique IDs");

  assert.deepEqual(
    [...sdm.SDM_STOP_ORDER],
    [
      "plugins",
      "battle",
      "ai",
      "platform_connectors",
      "obs",
      "core_services",
      "kernel"
    ]
  );
  assert.equal(
    sdm.SDM_STOP_ORDER[sdm.SDM_STOP_ORDER.length - 1],
    "kernel"
  );
  pass("stop order kernel last");

  sdm.clearShutdownSingletonForTest();
  const runtimeTransitions = [];
  const lifecycleTransitions = [];
  const notified = [];
  let restartCalls = 0;

  const mgr = sdm.createShutdownManager({
    runtimeBridge: {
      state: "RUNNING",
      transition(from, to) {
        runtimeTransitions.push(`${from}->${to}`);
        return { ok: true };
      }
    },
    lifecycleBridge: {
      transition(from, to) {
        lifecycleTransitions.push(`${from}->${to}`);
        return { ok: true };
      }
    },
    recoveryBridge: {
      isActive() {
        return false;
      },
      finishOrAbort() {
        return { ok: true, action: "none" };
      }
    },
    stateBridge: {
      supportsPersistence() {
        return true;
      },
      save() {
        return { ok: true };
      }
    },
    resourceBridge: {
      release() {
        return { ok: true };
      },
      activeResources() {
        return [];
      }
    },
    exitBridge: {
      requestExit() {
        return { ok: true, scheduled: true };
      }
    },
    restartBridge: {
      scheduleRestart() {
        restartCalls += 1;
        return { ok: true, scheduled: true };
      }
    },
    notifier(event) {
      notified.push(event);
      return { ok: true };
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleShutdownAuthority, true);
  assert.equal(mgr.status().blocksParallelShutdown, true);
  pass("central shutdown manager singleton");

  const duplicate = sdm.createShutdownManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "shutdown_manager_already_active");
  pass("singleton");

  const unauth = mgr.shutdown(
    { reason: "test", runtimeId: "rt-1", mode: "graceful" },
    { source: "intruder", authorized: false }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_shutdown");
  pass("validation auth");

  const forged = mgr.shutdown(
    { reason: "test", runtimeId: "rt-1", mode: "graceful" },
    { source: "kernel", authorized: true, forged: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_shutdown_blocked");
  pass("forged blocked");

  sdm.clearShutdownSingletonForTest();
  let recoveryActive = true;
  const mgrRec = sdm.createShutdownManager({
    allowParallelForTest: true,
    singleton: false,
    recoveryBridge: {
      isActive() {
        return recoveryActive;
      },
      finishOrAbort() {
        return { ok: false, error: "still_recovering" };
      }
    }
  });
  const blockedRec = mgrRec.shutdown(
    { reason: "graceful stop", runtimeId: "rt-2", mode: "graceful" },
    { source: "operator", authorized: true, nowMs: 2000 }
  );
  assert.equal(blockedRec.ok, false);
  assert.ok(
    blockedRec.error === "recovery_in_progress" ||
      blockedRec.deferred === true
  );
  pass("recovery gate for graceful");

  sdm.clearShutdownSingletonForTest();
  const mgrOk = sdm.createShutdownManager({
    runtimeBridge: {
      state: "RUNNING",
      transition(from, to) {
        runtimeTransitions.push(`${from}->${to}`);
        return { ok: true };
      }
    },
    lifecycleBridge: {
      transition(from, to) {
        lifecycleTransitions.push(`${from}->${to}`);
        return { ok: true };
      }
    },
    notifier(event) {
      notified.push(event);
      return { ok: true };
    },
    restartBridge: {
      scheduleRestart() {
        restartCalls += 1;
        return { ok: true, scheduled: true };
      }
    }
  });

  const ok = mgrOk.shutdown(
    {
      reason: "planned maintenance",
      runtimeId: "rt-3",
      mode: "graceful",
      requestedBy: "operator"
    },
    { source: "operator", authorized: true, nowMs: 3000, finishedMs: 3100 }
  );
  assert.equal(ok.ok, true);
  assert.ok(ok.shutdownId);
  assert.deepEqual([...ok.phases], [...sdm.SDM_WORKFLOW]);
  assert.equal(ok.kernelLast, true);
  assert.equal(
    ok.shutdown.stoppedComponents[ok.shutdown.stoppedComponents.length - 1],
    "kernel"
  );
  assert.ok(notified.some((e) => e.type === "ShutdownRequested"));
  assert.ok(runtimeTransitions.includes("RUNNING->STOPPING"));
  assert.ok(runtimeTransitions.includes("STOPPING->STOPPED"));
  assert.ok(lifecycleTransitions.includes("ACTIVE->STOPPING"));
  assert.ok(lifecycleTransitions.includes("STOPPING->STOPPED"));
  assert.ok(lifecycleTransitions.includes("STOPPED->DESTROYED"));
  pass("ShutdownRequested + Runtime STOPPING/STOPPED + Lifecycle path");

  const archived = mgrOk.reportArchive();
  assert.ok(archived.length >= 1);
  assert.ok(archived[0].shutdownId);
  assert.ok(archived[0].reason);
  assert.ok(typeof archived[0].duration === "number");
  assert.ok(archived[0].stoppedComponents);
  assert.ok(archived[0].immutable === true);
  const m = mgrOk.metrics();
  assert.ok(m.shutdownCount >= 1);
  assert.ok(m.byReason);
  assert.ok(typeof m.averageDurationMs === "number");
  assert.ok(typeof m.emergencyCount === "number");
  assert.ok(typeof m.successRate === "number");
  pass("report archived; metrics");

  // Parallel blocked
  sdm.clearShutdownSingletonForTest();
  let holdRecovery = false;
  const parallelMgr = sdm.createShutdownManager({
    recoveryBridge: {
      isActive() {
        return holdRecovery;
      },
      finishOrAbort() {
        return { ok: true };
      }
    }
  });
  // Simulate in-progress by starting emergency in a way that... 
  // Use internal: call shutdown while forcing second concurrent via inProgress.
  // Second call while first would need concurrent - we set a long path by
  // checking shutdown_already_in_progress via overlapping: create custom
  // by calling shutdown when current is set mid-flight is hard sync.
  // Instead: mark by running shutdown then immediately another while we
  // re-enter via a bridge that calls shutdown again.
  let nested = null;
  const reentrant = sdm.createShutdownManager({
    allowParallelForTest: true,
    singleton: false,
    exitBridge: {
      requestExit() {
        nested = reentrant.shutdown(
          { reason: "nested", runtimeId: "rt-x", mode: "graceful" },
          { source: "kernel", authorized: true }
        );
        return { ok: true };
      }
    }
  });
  // Need fresh singleton clear for parallelMgr unused - use reentrant only
  const first = reentrant.shutdown(
    { reason: "outer", runtimeId: "rt-p", mode: "graceful" },
    { source: "kernel", authorized: true, nowMs: 4000, finishedMs: 4010 }
  );
  assert.equal(first.ok, true);
  assert.ok(nested);
  assert.equal(nested.ok, false);
  assert.equal(nested.error, "shutdown_already_in_progress");
  pass("parallel blocked");

  // Emergency + minimal save
  sdm.clearShutdownSingletonForTest();
  const emerMgr = sdm.createShutdownManager({
    recoveryBridge: {
      isActive() {
        return true;
      },
      finishOrAbort({ force }) {
        return force
          ? { ok: true, action: "aborted" }
          : { ok: false, error: "still_recovering" };
      }
    }
  });
  const emer = emerMgr.emergencyShutdown(
    { runtimeId: "rt-e", reason: "critical_failure" },
    { source: "kernel", authorized: true, nowMs: 5000, finishedMs: 5050 }
  );
  assert.equal(emer.ok, true);
  assert.equal(emer.shutdown.mode, "emergency");
  assert.equal(emer.shutdown.saveMode, "minimal_save");
  assert.deepEqual([...emer.phases], [...sdm.SDM_WORKFLOW]);
  assert.ok(emer.report);
  assert.ok(emerMgr.metrics().emergencyCount >= 1);
  pass("emergency works with minimal save");

  // Restart schedules bridge
  sdm.clearShutdownSingletonForTest();
  restartCalls = 0;
  const restartMgr = sdm.createShutdownManager({
    restartBridge: {
      scheduleRestart() {
        restartCalls += 1;
        return { ok: true, scheduled: true };
      }
    }
  });
  const rst = restartMgr.shutdown(
    { reason: "upgrade", runtimeId: "rt-r", mode: "restart" },
    { source: "admin", authorized: true, nowMs: 6000, finishedMs: 6020 }
  );
  assert.equal(rst.ok, true);
  assert.equal(rst.restartPending, true);
  assert.ok(restartCalls >= 1);
  pass("restart schedules restartBridge");

  assert.equal(mgrOk.processExit().ok, false);
  assert.equal(mgrOk.killOs().ok, false);
  const src = read("shared/mia-shutdown-core/shutdownManager.js");
  assert.ok(!/\bprocess\.exit\s*\(/.test(src), "no process.exit() call");
  pass("no process.exit in source");

  for (const name of sdm.SDM_PUBLIC_API) {
    assert.equal(typeof restartMgr[name], "function", `public api ${name}`);
  }
  pass("public API surface");

  sdm.clearShutdownSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-shutdown-core/shutdownManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0069-shutdown-manager.md")
  );
  const smmIdx = coreSys.runtime.indexOf(
    "shared/mia-safe-mode-core/safeModeManager.js"
  );
  const sdmIdx = coreSys.runtime.indexOf(
    "shared/mia-shutdown-core/shutdownManager.js"
  );
  assert.ok(smmIdx >= 0 && sdmIdx === smmIdx + 1);
  pass("platformSystems nextDocId 0082; shutdown after safe-mode in CORE");

  for (const rel of sdm.SDM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0069"), "README 0069");
  assert.ok(readme.includes("Shutdown Manager"), "README Shutdown Manager");
  assert.ok(
    /0069.*Platný|Platný.*0069/s.test(readme) ||
      readme.includes("[Shutdown Manager")
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
    readme.includes("shared/mia-shutdown-core/"),
    "README Shutdown technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0069_contract.js"));
  pass("README + anchors");

  const align68 = read("docs/master-canon/0068-alignment.md");
  assert.ok(
    align68.includes("**0069**") && /Shutdown/i.test(align68),
    "0068-alignment marks 0069 Shutdown"
  );
  assert.ok(
    align68.includes("0070") && /Diagnostic/i.test(align68),
    "0068-alignment marks 0070 Diagnostic"
  );
  pass("0068-alignment marks 0069 done / 0070 Diagnostic");

  const align69 = read("docs/master-canon/0069-alignment.md");
  assert.ok(align69.includes("process.exit") || align69.includes("OS exit"));
  assert.ok(align69.includes("🟡"));
  assert.ok(
    align69.includes("**0070**") && /Diagnostics Manager/i.test(align69),
    "0069-alignment marks 0070 Diagnostics Manager"
  );
  assert.ok(align69.includes("0071"), "0069-alignment marks 0071 planned");
  pass("0069-alignment marks live OS exit wiring partial + 0070/0071");

  console.log("\nMaster Canon 0069 contract: ALL PASS");
}

run();
