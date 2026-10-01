"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const processCore = require("../shared/mia-process-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`? ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0057-process-manager.md");
  const alignPath = path.join(MASTER, "0057-alignment.md");

  assert.ok(fs.existsSync(docPath), "0057-process-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0057-alignment.md exists");
  pass("0057 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0057 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0057 kernel layer");
  assert.ok(doc.includes("0056"), "0057 links to 0056");
  assert.ok(doc.includes("0058"), "0057 points to 0058");
  pass("0057 structure (21 sections)");

  assert.equal(processCore.PM_COMPONENT_ORDER.length, 12);
  pass("process manager components");

  assert.equal(processCore.PM_LAYER.SERVICE, "service");
  assert.equal(processCore.PM_LAYER.PROCESS, "process");
  pass("service vs process layers");

  assert.ok(processCore.PM_PROCESS_TYPE.KERNEL);
  assert.ok(processCore.PM_PROCESS_TYPE.WORKER);
  assert.ok(processCore.PM_PROCESS_TYPE.IO);
  assert.ok(processCore.PM_PROCESS_TYPE.BACKGROUND);
  pass("process types");

  assert.equal(processCore.PM_PUBLIC_API.length, 12);
  pass("public process api");

  const skip = processCore.transitionProcessState(
    processCore.PM_STATE.CREATED,
    processCore.PM_STATE.RUNNING
  );
  assert.equal(skip.ok, false);
  pass("lifecycle skip forbidden");

  const noOwner = processCore.createProcessDescriptor({ processId: "x" });
  assert.equal(noOwner.ok, false);
  pass("owner required");

  const never = processCore.evaluateRestartPolicy(processCore.PM_RESTART_POLICY.NEVER);
  assert.equal(never.restart, false);
  const exp = processCore.evaluateRestartPolicy(processCore.PM_RESTART_POLICY.EXPONENTIAL, 2, 1000);
  assert.equal(exp.delayMs, 4000);
  const maxed = processCore.evaluateRestartPolicy(
    processCore.PM_RESTART_POLICY.IMMEDIATE,
    5,
    1000,
    5
  );
  assert.equal(maxed.restart, false);
  pass("restart policy limits");

  const mgr = processCore.createProcessManager();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().managesExecution, true);
  assert.equal(mgr.status().managesLogicalServices, false);
  assert.ok(mgr.list().processes.length >= 5);
  pass("seeded process registry");

  const dup = mgr.create({
    processId: "proc-battle",
    ownerService: "battle-engine"
  });
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "duplicate_process_id");
  pass("block duplicate process id");

  const deniedResources = processCore.createProcessManager({
    seedDefaults: false,
    resourceAllocator: () => ({ ok: false, error: "insufficient_resources" })
  });
  const noRes = deniedResources.create({
    processId: "proc-x",
    ownerService: "speech"
  });
  assert.equal(noRes.ok, false);
  assert.equal(noRes.error, "insufficient_resources");
  pass("resource allocation before start");

  const speech = mgr.create({
    processId: "proc-speech-1",
    ownerService: "speech",
    type: processCore.PM_PROCESS_TYPE.WORKER,
    parentProcess: "proc-speech-queue"
  });
  assert.equal(speech.ok, true);
  assert.equal(mgr.getProcess("proc-speech-1").status, processCore.PM_STATE.RUNNING);

  mgr.create({
    processId: "proc-speech-2",
    ownerService: "speech",
    type: processCore.PM_PROCESS_TYPE.WORKER
  });
  pass("multi process per service");

  const failed = mgr.fail("proc-speech-1", "tts_crash");
  assert.equal(failed.isolatesOthers, true);
  assert.ok(failed.othersStillRunning.includes("proc-battle"));
  assert.equal(mgr.getProcess("proc-battle").status, processCore.PM_STATE.RUNNING);
  pass("process isolation on failure");

  const restarted = mgr.restart("proc-speech-1");
  assert.equal(restarted.ok, true);
  assert.equal(restarted.attempt, 1);
  pass("restart policy apply");

  const limited = processCore.createProcessManager({ seedDefaults: false });
  limited.create({
    processId: "proc-loop",
    ownerService: "test",
    restartPolicy: processCore.PM_RESTART_POLICY.IMMEDIATE,
    maxRestarts: 1
  });
  limited.fail("proc-loop");
  assert.equal(limited.restart("proc-loop").ok, true);
  limited.fail("proc-loop");
  assert.equal(limited.restart("proc-loop").ok, false);
  pass("max restarts enforced");

  const zombieMgr = processCore.createProcessManager({ seedDefaults: false });
  zombieMgr.create({ processId: "proc-idle", ownerService: "cache" });
  zombieMgr.getProcess("proc-idle");
  const proc = zombieMgr.list().processes[0];
  zombieMgr.heartbeat("proc-idle");
  // force stale activity
  const mapProbe = processCore.createProcessManager({ seedDefaults: false });
  mapProbe.create({ processId: "proc-stale", ownerService: "bg", type: processCore.PM_PROCESS_TYPE.BACKGROUND });
  const stale = mapProbe.getProcess("proc-stale");
  // directly mark unresponsive via wait + detect with low threshold
  mapProbe.wait("proc-stale", "event:forever");
  const zombies = mapProbe.detectZombies(Date.now() + 120_000, { idleMs: 1000, waitMs: 1000 });
  assert.ok(zombies.zombies.length >= 1);
  assert.equal(mapProbe.getProcess("proc-stale").status, processCore.PM_STATE.ZOMBIE);
  pass("zombie detection");

  const dl = processCore.createProcessManager({ seedDefaults: false });
  dl.create({ processId: "a", ownerService: "s1" });
  dl.create({ processId: "b", ownerService: "s2" });
  dl.wait("a", "b");
  dl.wait("b", "a");
  const deadlocks = dl.detectDeadlocks();
  assert.equal(deadlocks.ok, false);
  assert.equal(deadlocks.isolated, true);
  assert.equal(deadlocks.recovery, true);
  pass("deadlock detection");

  mgr.configureWorkerPool(3);
  const pool = mgr.spawnWorkers("decision", 3);
  assert.equal(pool.workers.length, 3);
  pass("worker pool");

  const ext = mgr.registerExternal({
    processId: "ext-obs",
    name: "OBS",
    ownerService: "obs"
  });
  assert.equal(ext.ok, true);
  assert.equal(mgr.getProcess("ext-obs").external, true);
  pass("external process monitoring");

  const kernelStop = mgr.stop("proc-runtime");
  assert.equal(kernelStop.ok, false);
  pass("protect kernel processes");

  const spawnLimit = processCore.createProcessManager({
    seedDefaults: false,
    maxProcesses: 1
  });
  assert.equal(spawnLimit.create({ processId: "p1", ownerService: "s" }).ok, true);
  assert.equal(spawnLimit.create({ processId: "p2", ownerService: "s" }).ok, false);
  pass("spawn limit");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.processes >= 5);
  pass("process metrics");

  const wd = mgr.watchdogSnapshot();
  assert.equal(wd.source, "process_manager");
  assert.ok(Array.isArray(wd.processes));
  pass("watchdog process feed");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-process-core/processManager.js"));
  pass("core system next doc 0071");

  for (const rel of processCore.PM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0057"), "README 0057");
  assert.ok(readme.includes("Process Manager"), "README Process Manager");
  pass("README registry");

  // silence unused
  assert.ok(proc || true);

  console.log("\nMaster Canon 0057 contract: ALL PASS");
}

run();
