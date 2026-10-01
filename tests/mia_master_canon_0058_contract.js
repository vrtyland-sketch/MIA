"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const scheduler = require("../shared/mia-scheduler-core");
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
  const docPath = path.join(MASTER, "0058-task-scheduler.md");
  const alignPath = path.join(MASTER, "0058-alignment.md");

  assert.ok(fs.existsSync(docPath), "0058-task-scheduler.md exists");
  assert.ok(fs.existsSync(alignPath), "0058-alignment.md exists");
  pass("0058 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0058 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0058 kernel layer");
  assert.ok(doc.includes("0057"), "0058 links to 0057");
  assert.ok(doc.includes("0059"), "0058 points to 0059");
  pass("0058 structure (21 sections)");

  assert.equal(scheduler.TS_COMPONENT_ORDER.length, 12);
  pass("task scheduler components");

  assert.equal(scheduler.TS_LAYER.PROCESS, "process");
  assert.equal(scheduler.TS_LAYER.TASK, "task");
  pass("task vs process layers");

  assert.equal(scheduler.TS_QUEUE_ORDER.length, 5);
  pass("five queues");

  assert.equal(Object.keys(scheduler.TS_POLICY).length, 5);
  pass("scheduling policies");

  assert.equal(scheduler.TS_PUBLIC_API.length, 10);
  pass("public scheduler api");

  const noId = scheduler.createTaskDescriptor({ owner: "x" });
  assert.equal(noId.ok, false);
  pass("task id required");

  const none = scheduler.evaluateRetry(scheduler.TS_RETRY_POLICY.NONE, 0, 3);
  assert.equal(none.retry, false);
  const exp = scheduler.evaluateRetry(scheduler.TS_RETRY_POLICY.EXPONENTIAL, 2, 5, 1000);
  assert.equal(exp.delayMs, 4000);
  const exhausted = scheduler.evaluateRetry(scheduler.TS_RETRY_POLICY.FIXED, 3, 3);
  assert.equal(exhausted.retry, false);
  pass("retry policy");

  const mgr = scheduler.createTaskScheduler();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleScheduler, true);
  assert.equal(mgr.status().executesTasksDirectly, false);
  pass("sole scheduler does not execute");

  const dup1 = mgr.submit({ taskId: "t1", owner: "battle", priority: scheduler.TS_PRIORITY.NORMAL });
  assert.equal(dup1.ok, true);
  assert.equal(dup1.executesDirectly, false);
  const dup2 = mgr.submit({ taskId: "t1", owner: "battle" });
  assert.equal(dup2.ok, false);
  pass("unique task id");

  mgr.submit({
    taskId: "t-low",
    owner: "overlay",
    priority: scheduler.TS_PRIORITY.LOW,
    type: scheduler.TS_TASK_TYPE.PLATFORM
  });
  mgr.submit({
    taskId: "t-crit",
    owner: "recovery",
    priority: scheduler.TS_PRIORITY.CRITICAL,
    type: scheduler.TS_TASK_TYPE.SYSTEM,
    immediate: true
  });
  mgr.submit({
    taskId: "t-norm",
    owner: "battle",
    priority: scheduler.TS_PRIORITY.NORMAL,
    type: scheduler.TS_TASK_TYPE.GAMEPLAY
  });

  mgr.setWorkerPoolSize(2);
  const tick1 = mgr.tick(Date.now(), 2);
  assert.ok(tick1.started.length >= 1);
  assert.equal(tick1.started[0].taskId, "t-crit");
  pass("critical kernel priority first");

  mgr.complete("t-crit");
  mgr.complete(tick1.started[1] ? tick1.started[1].taskId : "t-norm");

  // dependencies + parallel
  const depMgr = scheduler.createTaskScheduler({ workerPoolSize: 3 });
  depMgr.submit({ taskId: "speech", owner: "speech", type: scheduler.TS_TASK_TYPE.AI });
  depMgr.submit({
    taskId: "overlay",
    owner: "overlay",
    dependencies: ["speech"],
    type: scheduler.TS_TASK_TYPE.PLATFORM
  });
  depMgr.submit({
    taskId: "battle-calc",
    owner: "battle",
    type: scheduler.TS_TASK_TYPE.GAMEPLAY
  });
  depMgr.submit({
    taskId: "speech-synth",
    owner: "speech",
    type: scheduler.TS_TASK_TYPE.AI
  });
  const parallelTick = depMgr.tick(Date.now(), 3);
  const startedIds = parallelTick.started.map((t) => t.taskId);
  assert.ok(startedIds.includes("speech") || startedIds.includes("battle-calc"));
  assert.ok(!startedIds.includes("overlay"));
  assert.ok(parallelTick.parallel || startedIds.length >= 2);
  depMgr.complete("speech");
  depMgr.complete("battle-calc");
  if (startedIds.includes("speech-synth")) depMgr.complete("speech-synth");
  const afterDep = depMgr.tick(Date.now(), 2);
  assert.ok(afterDep.started.some((t) => t.taskId === "overlay"));
  pass("dependencies and parallel scheduling");

  // timeout + retry
  const toMgr = scheduler.createTaskScheduler({ workerPoolSize: 1 });
  toMgr.submit({
    taskId: "slow",
    owner: "ai",
    timeout: 10,
    maxRetries: 2,
    retryPolicy: scheduler.TS_RETRY_POLICY.FIXED
  });
  toMgr.tick(Date.now(), 1);
  const timed = toMgr.checkTimeouts(Date.now() + 50);
  assert.ok(timed.timedOut.includes("slow"));
  assert.equal(toMgr.getTask("slow").status, scheduler.TS_STATE.QUEUED);
  assert.equal(toMgr.getTask("slow").queue, scheduler.TS_QUEUE.RETRY);
  pass("timeout then retry");

  // retry exhausted
  const failMgr = scheduler.createTaskScheduler();
  failMgr.submit({
    taskId: "flaky",
    owner: "svc",
    maxRetries: 1,
    retryPolicy: scheduler.TS_RETRY_POLICY.FIXED
  });
  failMgr.tick();
  assert.equal(failMgr.fail("flaky").retry, true);
  failMgr.tick(Date.now() + 2000);
  assert.equal(failMgr.fail("flaky").retry, false);
  assert.equal(failMgr.getTask("flaky").status, scheduler.TS_STATE.FAILED);
  pass("retry exhausted fails");

  // overload
  const ov = scheduler.createTaskScheduler();
  ov.submit({ taskId: "k1", owner: "kernel", priority: scheduler.TS_PRIORITY.CRITICAL, type: scheduler.TS_TASK_TYPE.SYSTEM });
  ov.submit({ taskId: "bg1", owner: "maint", priority: scheduler.TS_PRIORITY.BACKGROUND, type: scheduler.TS_TASK_TYPE.MAINTENANCE });
  ov.submit({ taskId: "opt1", owner: "plugin", priority: scheduler.TS_PRIORITY.LOW, optional: true });
  const overload = ov.handleOverload();
  assert.equal(overload.emergencyMode, true);
  assert.equal(overload.kernelProtected, true);
  assert.equal(ov.getTask("k1").priority, scheduler.TS_PRIORITY.CRITICAL);
  pass("overload protects kernel");

  // queue overflow
  const small = scheduler.createTaskScheduler({ maxQueue: 1, seedDefaults: false });
  assert.equal(small.submit({ taskId: "q1", owner: "a" }).ok, true);
  assert.equal(small.submit({ taskId: "q2", owner: "a" }).ok, false);
  assert.equal(
    small.submit({
      taskId: "q3",
      owner: "kernel",
      priority: scheduler.TS_PRIORITY.CRITICAL,
      type: scheduler.TS_TASK_TYPE.SYSTEM
    }).ok,
    true
  );
  pass("queue overflow with kernel bypass");

  // cancel kernel protected
  const prot = scheduler.createTaskScheduler();
  prot.submit({
    taskId: "kernel-task",
    owner: "runtime",
    priority: scheduler.TS_PRIORITY.CRITICAL,
    type: scheduler.TS_TASK_TYPE.SYSTEM
  });
  assert.equal(prot.cancel("kernel-task").ok, false);
  pass("kernel task protected");

  mgr.setPolicy(scheduler.TS_POLICY.FIFO);
  assert.equal(mgr.status().policy, scheduler.TS_POLICY.FIFO);
  pass("configurable policy");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  const actions = new Set(trail.map((a) => a.action));
  assert.ok(actions.has("created"));
  assert.ok(actions.has("queued"));
  pass("immutable lifecycle audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.tasks >= 1);
  assert.ok(typeof metrics.avgWaitMs === "number");
  pass("scheduler metrics");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-scheduler-core/taskScheduler.js"));
  pass("core system next doc 0071");

  for (const rel of scheduler.TS_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0058"), "README 0058");
  assert.ok(readme.includes("Task Scheduler"), "README Task Scheduler");
  pass("README registry");

  console.log("\nMaster Canon 0058 contract: ALL PASS");
}

run();
