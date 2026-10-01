"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const runtime = require("../shared/mia-runtime-core");
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
  const docPath = path.join(MASTER, "0062-runtime-manager.md");
  const alignPath = path.join(MASTER, "0062-alignment.md");

  assert.ok(fs.existsSync(docPath), "0062-runtime-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0062-alignment.md exists");
  pass("0062 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0062 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0062 kernel layer");
  assert.ok(doc.includes("0061"), "0062 links to 0061");
  assert.ok(doc.includes("0063"), "0062 points to 0063");
  pass("0062 structure (20 sections)");

  assert.equal(runtime.RM_COMPONENT_ORDER.length, 12);
  assert.equal(runtime.RM_PUBLIC_API.length, 8);
  assert.equal(runtime.RM_CORE_SERVICES.length, 7);
  pass("runtime components and public api");

  assert.equal(
    runtime.validateRuntimeTransition(
      runtime.RM_STATE.BOOTING,
      runtime.RM_STATE.RUNNING
    ).ok,
    false
  );
  pass("runtime lifecycle validation");

  const beforeBoot = runtime.createRuntimeManager({ bootCompleted: false });
  assert.equal(beforeBoot.ok, false);
  assert.equal(beforeBoot.error, "boot_not_completed");
  pass("runtime context only after boot");

  runtime.clearRuntimeSingletonForTest();
  const mgr = runtime.createRuntimeManager({
    bootCompleted: true,
    bootId: "boot-contract-0062",
    version: "1.0.0",
    build: "contract",
    environment: "test",
    hostname: "mia-test",
    kernelVersion: "1.0.0",
    configuration: { mode: "test" },
    resourceMetrics: { cpu: 0.25, ram: 0.5, gpu: 0, network: 2 }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.RUNNING);
  pass("single runtime starts after boot");

  const context = mgr.runtime();
  assert.ok(Object.isFrozen(context));
  assert.ok(context.runtimeId);
  assert.equal(context.bootId, "boot-contract-0062");
  assert.equal(context.status, runtime.RM_STATE.RUNNING);
  assert.ok(context.uptime >= 0);
  pass("read-only runtime context");

  const duplicate = runtime.createRuntimeManager({ bootCompleted: true });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "runtime_instance_already_active");
  pass("second active runtime blocked");

  const coreServices = mgr.registry().services.map((item) => item.id);
  for (const serviceId of runtime.RM_CORE_SERVICES) {
    assert.ok(coreServices.includes(serviceId), `runtime core: ${serviceId}`);
  }
  pass("runtime core services coordinated");

  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.PROCESS, {
      id: "proc-battle",
      owner: "battle-engine"
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.THREAD, {
      id: "thread-battle-1",
      owner: "battle-engine"
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.MODULE, {
      id: "battle-module",
      version: "4.2.0",
      owner: "gameplay",
      dependencies: ["event-bus"]
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.PLUGIN, {
      id: "plugin-contract"
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.PLATFORM, {
      id: "tiktok",
      owner: "platform",
      connected: true
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.PLATFORM, {
      id: "obs",
      owner: "presentation",
      connected: true
    }).ok,
    true
  );
  assert.equal(
    mgr.registerComponent(runtime.RM_REGISTRY_KIND.MODULE, {
      id: "battle-module"
    }).ok,
    false
  );
  pass("active component registry");

  const session = mgr.session();
  assert.ok(Object.isFrozen(session));
  assert.equal(session.active, true);
  assert.ok(session.activeModules.includes("battle-module"));
  assert.ok(session.auditId);
  pass("runtime session");

  const paused = mgr.pause({ actor: "operator", reason: "contract_pause" });
  assert.equal(paused.ok, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.PAUSED);
  const resumed = mgr.resume({ actor: "operator" });
  assert.equal(resumed.ok, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.RUNNING);
  pass("pause and resume api");

  const denied = mgr.pause({ actor: "unknown-plugin" });
  assert.equal(denied.ok, false);
  assert.equal(mgr.status().state, runtime.RM_STATE.RUNNING);
  pass("unauthorized runtime change blocked");

  const recovering = mgr.recover({
    actor: "recovery-manager",
    reason: "contract_recovery"
  });
  assert.equal(recovering.ok, true);
  assert.equal(recovering.recoveryManager, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.RECOVERING);
  assert.equal(
    mgr.completeRecovery({ actor: "recovery-manager" }).ok,
    true
  );
  assert.equal(mgr.status().state, runtime.RM_STATE.RUNNING);
  pass("recovery integration");

  const invalidConfig = mgr.applyConfiguration(
    { featureX: true },
    { actor: "operator", hotReload: true, supported: true }
  );
  assert.equal(invalidConfig.ok, false);
  const applied = mgr.applyConfiguration(
    { featureX: true },
    {
      actor: "operator",
      validated: true,
      hotReload: true,
      supported: true,
      affectedModules: ["battle-module"]
    }
  );
  assert.equal(applied.ok, true);
  assert.ok(applied.modulesReloaded.includes("battle-module"));
  pass("validated runtime configuration update");

  const disconnected = mgr.disconnectPlatform("tiktok");
  assert.equal(disconnected.ok, true);
  assert.equal(disconnected.runtimeContinues, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.RUNNING);
  assert.equal(
    mgr.registry().platforms.find((item) => item.id === "tiktok").connected,
    false
  );
  pass("platform disconnect isolation");

  const snapshot = mgr.snapshot();
  assert.ok(Object.isFrozen(snapshot));
  assert.equal(snapshot.diagnosticOnly, true);
  assert.equal(snapshot.completeRuntimeRecoveryMechanism, false);
  assert.ok(snapshot.services.length >= 7);
  assert.ok(snapshot.processes.some((item) => item.id === "proc-battle"));
  assert.ok(snapshot.threads.some((item) => item.id === "thread-battle-1"));
  assert.ok(snapshot.modules.some((item) => item.id === "battle-module"));
  pass("non-disruptive diagnostic snapshot");

  const metrics = mgr.metrics();
  assert.ok(metrics.uptime >= 0);
  assert.ok(metrics.services >= 7);
  assert.equal(metrics.processes, 1);
  assert.equal(metrics.threads, 1);
  assert.equal(metrics.modules, 1);
  assert.equal(metrics.cpu, 0.25);
  assert.equal(metrics.ram, 0.5);
  pass("runtime monitoring");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  assert.ok(trail.every((entry) => entry.runtimeId === context.runtimeId));
  assert.ok(trail.every((entry) => entry.bootId === "boot-contract-0062"));
  pass("immutable runtime audit");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-runtime-core/runtimeManager.js")
  );
  pass("core system next doc 0071");

  for (const rel of runtime.RM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0062"), "README 0062");
  assert.ok(readme.includes("Runtime Manager"), "README Runtime Manager");
  pass("README registry");

  const stopped = mgr.shutdown({ actor: "operator", reason: "contract_done" });
  assert.equal(stopped.ok, true);
  assert.equal(mgr.status().state, runtime.RM_STATE.STOPPED);
  assert.equal(mgr.session().active, false);

  const nextRuntime = runtime.createRuntimeManager({
    bootCompleted: true,
    autoInitialize: false
  });
  assert.equal(nextRuntime.ok, true);
  assert.equal(nextRuntime.status().state, runtime.RM_STATE.BOOTING);
  nextRuntime.initialize({ actor: "boot-manager" });
  assert.equal(nextRuntime.status().state, runtime.RM_STATE.READY);
  nextRuntime.shutdown({ actor: "operator" });
  pass("shutdown releases singleton for next session");

  console.log("\nMaster Canon 0062 contract: ALL PASS");
}

run();
