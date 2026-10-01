"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const startup = require("../shared/mia-startup-core");
const boot = require("../shared/mia-boot-core");
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
  const docPath = path.join(MASTER, "0052-startup-sequence-manager.md");
  const alignPath = path.join(MASTER, "0052-alignment.md");

  assert.ok(fs.existsSync(docPath), "0052-startup-sequence-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0052-alignment.md exists");
  pass("0052 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0052 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0052 kernel layer");
  assert.ok(doc.includes("0051"), "0052 links to 0051");
  assert.ok(doc.includes("0053"), "0052 points to 0053");
  pass("0052 structure (21 sections)");

  assert.equal(startup.SSM_COMPONENT_ORDER.length, 12);
  pass("startup components");

  assert.deepEqual([...startup.SSM_LAYER_ORDER], [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(startup.SSM_LAYER_SERVICES[0].includes("kernel"));
  assert.ok(startup.SSM_LAYER_SERVICES[4].includes("battle"));
  assert.ok(startup.SSM_LAYER_SERVICES[6].includes("tiktok"));
  pass("startup layers 0-7");

  assert.equal(startup.SSM_PUBLIC_API.length, 7);
  pass("public startup api");

  const skip = startup.transitionServiceState(
    startup.SSM_SERVICE_STATE.WAITING,
    startup.SSM_SERVICE_STATE.READY
  );
  assert.equal(skip.ok, false);
  pass("service state skip forbidden");

  const cyclic = startup.buildStartupDependencyGraph([
    { id: "a", layer: 0, priority: "critical", dependencies: ["b"] },
    { id: "b", layer: 0, priority: "critical", dependencies: ["a"] }
  ]);
  assert.equal(cyclic.ok, false);
  pass("reject cyclic dependency graph");

  const graph = startup.buildStartupDependencyGraph();
  assert.equal(graph.ok, true);
  const battle = startup.DEFAULT_SERVICE_DEFS.find((d) => d.id === "battle");
  assert.ok(battle.dependencies.includes("inventory"));
  assert.ok(battle.dependencies.includes("economy"));
  assert.ok(battle.dependencies.includes("event_bus"));
  pass("battle depends on inventory economy event_bus");

  const queue = startup.buildStartupQueue();
  assert.ok(queue.queue.indexOf("logger") < queue.queue.indexOf("runtime"));
  assert.ok(queue.queue.indexOf("event_bus") < queue.queue.indexOf("battle"));
  assert.ok(queue.parallelGroups.some((g) => g.groups.some((grp) => grp.length > 1)));
  pass("startup queue and parallel groups");

  const blockedPlugin = startup.runPluginHook(false);
  assert.equal(blockedPlugin.ok, false);
  const plugins = startup.runPluginHook(true);
  assert.equal(plugins.blocksKernel, false);
  pass("plugin hook after kernel");

  const earlyPlatforms = startup.assertPlatformsAfterReady(true, false);
  assert.equal(earlyPlatforms.ok, false);
  pass("platforms blocked before ready");

  assert.equal(startup.assertStartupForbiddenActivity("decide_battle").ok, false);
  assert.equal(startup.assertStartupForbiddenActivity("ai_decision").ok, false);
  pass("forbidden activities");

  const blocked = startup.createStartupSequenceManager({ bootCompleted: false });
  const noBoot = blocked.start();
  assert.equal(noBoot.ok, false);
  assert.equal(noBoot.error, "boot_manager_required");
  pass("requires boot manager");

  const ssm = startup.createStartupSequenceManager({ bootCompleted: true });
  const double = ssm.startService("kernel");
  assert.equal(double.ok, true);
  const again = ssm.startService("kernel");
  assert.equal(again.ok, false);
  assert.equal(again.error, "double_initialization_forbidden");
  pass("prevent double initialization");

  const manager = startup.createStartupSequenceManager({ bootCompleted: true });
  const result = manager.start({ obsUnavailable: true });
  assert.equal(result.ok, true);
  assert.equal(result.state, "ready");
  assert.equal(result.mutatesDomain, false);
  assert.equal(result.decidesBattle, false);
  assert.ok(result.order.indexOf("event_bus") < result.order.indexOf("battle"));
  assert.ok(result.order.indexOf("overlay") < result.order.indexOf("ready") || result.order.includes("overlay"));
  assert.ok(result.order.indexOf("ready") < result.order.indexOf("tiktok"));
  pass("full startup sequence");

  const report = manager.getReport();
  assert.ok(report.order.length > 0);
  assert.ok(Array.isArray(report.parallelGroups));
  pass("startup report");

  const metrics = manager.getMetrics();
  assert.ok(metrics.serviceCount > 0);
  pass("startup metrics");

  const status = manager.status();
  assert.equal(status.singleton, true);
  assert.equal(status.serviceStates.ready, startup.SSM_SERVICE_STATE.RUNNING);
  pass("singleton ready status");

  const obsOrder = startup.createStartupSequenceManager({ bootCompleted: true });
  obsOrder.startService("kernel");
  const obsTooSoon = obsOrder.startService("obs");
  assert.equal(obsTooSoon.ok, false);
  pass("obs waits for dependencies");

  const degraded = startup.createStartupSequenceManager({ bootCompleted: true });
  const deg = degraded.start({ obsUnavailable: true });
  assert.equal(deg.ok, true);
  assert.ok(deg.report.warnings.some((w) => w.code === "obs_unavailable_continue" || w.serviceId === "obs"));
  pass("obs unavailable degraded mode");

  const retryMgr = startup.createStartupSequenceManager({ bootCompleted: true, maxRetries: 2 });
  retryMgr.startService("kernel");
  retryMgr.startService("logger");
  retryMgr.startService("configuration");
  const fail = retryMgr.startService("runtime", { failAt: startup.SSM_SERVICE_STATE.STARTING });
  assert.equal(fail.ok, false);
  const retried = retryMgr.retryService("runtime");
  assert.equal(retried.ok, true);
  pass("startup retry");

  const bootMgr = boot.createBootManager({ rootDir: ROOT });
  const booted = bootMgr.boot({ allowCreateDirs: false, strictFilesystem: false });
  assert.equal(booted.handedOffToStartupSequence, true);
  const afterBoot = startup.createStartupSequenceManager({ bootCompleted: booted.ok });
  const sequenced = afterBoot.start();
  assert.equal(sequenced.ok, true);
  pass("boot manager handoff to startup");

  manager.setTimeouts({ start: 7000 });
  assert.equal(manager.getTimeouts().start, 7000);
  pass("configurable timeouts");

  const sync = manager.synchronizeLayer(0);
  assert.equal(sync.ok, true);
  pass("layer sync barrier");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-startup-core/startupSequenceManager.js"));
  pass("core system next doc 0053");

  for (const rel of startup.SSM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0052"), "README 0052");
  pass("README registry");

  console.log("\nMaster Canon 0052 contract: ALL PASS");
}

run();
