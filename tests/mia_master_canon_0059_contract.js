"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const thread = require("../shared/mia-thread-core");
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
  const docPath = path.join(MASTER, "0059-thread-manager.md");
  const alignPath = path.join(MASTER, "0059-alignment.md");

  assert.ok(fs.existsSync(docPath), "0059-thread-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0059-alignment.md exists");
  pass("0059 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0059 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0059 kernel layer");
  assert.ok(doc.includes("0058"), "0059 links to 0058");
  assert.ok(doc.includes("0060"), "0059 points to 0060");
  pass("0059 structure (21 sections)");

  assert.equal(thread.TM_COMPONENT_ORDER.length, 12);
  pass("thread manager components");

  assert.deepEqual([...thread.TM_HIERARCHY], [
    "kernel",
    "service",
    "process",
    "thread",
    "task"
  ]);
  pass("execution hierarchy");

  assert.ok(thread.TM_THREAD_TYPE.KERNEL);
  assert.ok(thread.TM_THREAD_TYPE.WORKER);
  assert.ok(thread.TM_THREAD_TYPE.IO);
  assert.ok(thread.TM_THREAD_TYPE.BACKGROUND);
  pass("thread types");

  assert.equal(Object.keys(thread.TM_SYNC).length, 5);
  pass("sync mechanisms");

  assert.equal(thread.TM_PUBLIC_API.length, 11);
  pass("public thread api");

  const skip = thread.transitionThreadState(
    thread.TM_STATE.CREATED,
    thread.TM_STATE.RUNNING
  );
  assert.equal(skip.ok, false);
  pass("lifecycle skip forbidden");

  assert.equal(thread.assertSyncRequired("shared_memory_without_sync").ok, false);
  assert.equal(thread.assertSyncRequired("mutex_write").ok, true);
  pass("unsync memory forbidden");

  const mgr = thread.createThreadManager();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleThreadAuthority, true);
  assert.ok(mgr.list().threads.length >= 3);
  pass("seeded thread manager");

  const dup = mgr.create({
    threadId: "thr-watchdog",
    parentProcess: "x",
    ownerService: "y"
  });
  assert.equal(dup.ok, false);
  pass("unique thread id");

  // pool reuse
  const a1 = mgr.acquire("default", { ownerService: "runtime", parentProcess: "proc-runtime" });
  assert.equal(a1.ok, true);
  assert.equal(a1.reused, true);
  mgr.release(a1.thread.threadId);
  const a2 = mgr.acquire("default", { ownerService: "runtime", parentProcess: "proc-runtime" });
  assert.equal(a2.reused, true);
  pass("thread pool reuse");

  // scale blocked when config disables
  const noScale = thread.createThreadManager({
    seedDefaults: false,
    limits: { ...thread.TM_DEFAULT_LIMITS, allowScaleUp: false, poolSize: 1 }
  });
  noScale.ensurePool("p", 1);
  noScale.create({
    threadId: "p-1",
    parentProcess: "pp",
    ownerService: "s",
    pool: "p"
  });
  noScale.acquire("p");
  const blockedScale = noScale.acquire("p");
  assert.equal(blockedScale.ok, false);
  pass("dynamic create respects config");

  // limits
  mgr.applyLimits({ maxIoThreads: 1 });
  assert.equal(
    mgr.create({
      threadId: "io-1",
      parentProcess: "proc-io",
      ownerService: "tiktok",
      type: thread.TM_THREAD_TYPE.IO
    }).ok,
    true
  );
  assert.equal(
    mgr.create({
      threadId: "io-2",
      parentProcess: "proc-io",
      ownerService: "kick",
      type: thread.TM_THREAD_TYPE.IO
    }).ok,
    false
  );
  pass("configurable thread limits");

  // sync + deadlock
  const dl = thread.createThreadManager({ seedDefaults: false });
  dl.create({ threadId: "t1", parentProcess: "p", ownerService: "s" });
  dl.create({ threadId: "t2", parentProcess: "p", ownerService: "s" });
  dl.start("t1");
  dl.start("t2");
  dl.createSync(thread.TM_SYNC.MUTEX, "m1");
  dl.createSync(thread.TM_SYNC.MUTEX, "m2");
  dl.lock("m1", "t1");
  dl.lock("m2", "t2");
  dl.lock("m2", "t1");
  dl.lock("m1", "t2");
  const dead = dl.detectDeadlocks();
  assert.equal(dead.ok, false);
  assert.equal(dead.recovery, true);
  pass("deadlock detection");

  // starvation
  const st = thread.createThreadManager({ seedDefaults: false });
  st.create({
    threadId: "hungry",
    parentProcess: "p",
    ownerService: "overlay",
    priority: thread.TM_PRIORITY.LOW
  });
  const starved = st.detectStarvation(Date.now() + 60_000, 1000);
  assert.ok(starved.starved.length >= 1);
  assert.equal(st.getThread("hungry").status, thread.TM_STATE.STARVATION);
  pass("starvation detection");

  // AI pool
  const ai = mgr.scaleAiPool(3);
  assert.ok(ai.created.length >= 1);
  pass("ai thread pool");

  // Battle parallel threads
  const battle = mgr.spawnBattleThreads();
  assert.equal(battle.threads.length, 3);
  assert.ok(battle.threads.every((id) => mgr.getThread(id)));
  pass("battle threads via manager");

  const kernelStop = mgr.stop("thr-watchdog");
  assert.equal(kernelStop.ok, false);
  pass("kernel threads protected");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.threads >= 3);
  assert.ok(metrics.reusedCount >= 1);
  pass("thread metrics");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-thread-core/threadManager.js"));
  pass("core system next doc 0071");

  for (const rel of thread.TM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0059"), "README 0059");
  assert.ok(readme.includes("Thread Manager"), "README Thread Manager");
  pass("README registry");

  console.log("\nMaster Canon 0059 contract: ALL PASS");
}

run();
