"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const kernel = require("../shared/mia-kernel-core");
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
  const docPath = path.join(MASTER, "0050-mia-core-kernel.md");
  const alignPath = path.join(MASTER, "0050-alignment.md");

  assert.ok(fs.existsSync(docPath), "0050-mia-core-kernel.md exists");
  assert.ok(fs.existsSync(alignPath), "0050-alignment.md exists");
  pass("0050 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0050 section ${i}`);
  }
  assert.ok(doc.includes("Layer 0"), "0050 layer 0");
  assert.ok(doc.includes("Core Kernel"), "0050 critical priority");
  assert.ok(doc.includes("0049"), "0050 links to 0049");
  assert.ok(doc.includes("0051"), "0050 points to 0051");
  pass("0050 structure (21 sections)");

  assert.equal(kernel.KERNEL_COMPONENT_ORDER.length, 12);
  pass("kernel components");

  assert.equal(kernel.KERNEL_BOOT_PIPELINE.length, 8);
  assert.equal(kernel.KERNEL_BOOT_PIPELINE[0], "power");
  assert.equal(kernel.KERNEL_BOOT_PIPELINE[7], "ready");
  pass("boot pipeline order");

  assert.equal(kernel.KERNEL_PUBLIC_API.length, 9);
  assert.ok(kernel.KERNEL_PUBLIC_API.includes("boot"));
  assert.ok(kernel.KERNEL_PUBLIC_API.includes("diagnostics"));
  pass("public kernel api");

  const skip = kernel.transitionServiceState(
    kernel.KERNEL_SERVICE_STATE.CREATED,
    kernel.KERNEL_SERVICE_STATE.RUNNING
  );
  assert.equal(skip.ok, false);
  pass("service state skip forbidden");

  const cyclic = kernel.buildDependencyGraph([
    { serviceId: "a", dependencies: ["b"] },
    { serviceId: "b", dependencies: ["a"] }
  ]);
  assert.equal(cyclic.cyclic, true);
  assert.equal(cyclic.ok, false);
  pass("reject cyclic dependency graph");

  const acyclic = kernel.buildDependencyGraph([
    { serviceId: "event_bus", dependencies: [] },
    { serviceId: "memory", dependencies: ["event_bus"] },
    { serviceId: "decision", dependencies: ["memory"] }
  ]);
  assert.equal(acyclic.ok, true);
  pass("acyclic dependency graph");

  assert.equal(kernel.assertKernelForbiddenActivity("decide_battle").ok, false);
  assert.equal(kernel.assertKernelForbiddenActivity("communicate_tiktok_api").ok, false);
  assert.equal(kernel.assertKernelForbiddenActivity("generate_text").ok, false);
  pass("forbidden domain activities");

  const k = kernel.createCoreKernel({ environment: "testing" });
  const booted = k.boot();
  assert.equal(booted.ok, true);
  assert.equal(booted.mutatesDomain, false);
  assert.equal(booted.pipeline.immutableOrder, true);
  pass("kernel boot");

  const ctx = k.getRuntimeContext();
  assert.ok(ctx.runtimeId);
  assert.ok(ctx.bootId);
  assert.equal(ctx.currentState, kernel.KERNEL_STATE.RUNNING);
  pass("runtime context");

  assert.equal(Object.keys(k.getRegistry(kernel.KERNEL_REGISTRY_KIND.SERVICE)).length >= 4, true);
  k.registerInRegistry(kernel.KERNEL_REGISTRY_KIND.FEATURE, "safe_mode", { enabled: true });
  assert.ok(k.getRegistry(kernel.KERNEL_REGISTRY_KIND.FEATURE).safe_mode);
  pass("kernel registries");

  const health = k.health({ cpu: 12, ram: 40 });
  assert.equal(health.intervalMs, 5000);
  k.setHealthInterval(2000);
  assert.equal(k.health().intervalMs, 2000);
  pass("health monitoring configurable");

  const paused = k.pause();
  assert.equal(paused.state, kernel.KERNEL_STATE.PAUSED);
  const resumed = k.resume();
  assert.equal(resumed.state, kernel.KERNEL_STATE.RUNNING);
  pass("pause resume");

  const blockedReload = k.reload({ bypassRuntime: true });
  assert.equal(blockedReload.ok, false);
  const reloaded = k.reload({ modules: ["logger"] });
  assert.equal(reloaded.ok, true);
  pass("reload without runtime bypass");

  const safe = k.recover(kernel.KERNEL_RECOVERY_LEVEL.L4_SAFE_MODE);
  assert.equal(safe.mode.aiDisabled, true);
  assert.deepEqual([...safe.mode.activeServices], [...kernel.KERNEL_SAFE_MODE_SERVICES]);
  pass("safe mode recovery");

  const diag = k.diagnostics();
  assert.equal(diag.ok, true);
  assert.ok(diag.auditTrailLength >= 1);
  pass("diagnostics");

  const status = k.status();
  assert.deepEqual([...status.publicApi], [...kernel.KERNEL_PUBLIC_API]);
  pass("status api");

  const k2 = kernel.createCoreKernel();
  k2.boot();
  const shut = k2.shutdown();
  assert.equal(shut.dataPreserved, true);
  const again = k2.restart();
  assert.equal(again.ok, true);
  pass("shutdown restart preserves data contract");

  const audit = k2.auditTrail();
  assert.ok(audit.length >= 2);
  pass("audit trail");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-kernel-core/coreKernel.js"));
  pass("core system next doc 0051");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  pass("game system next doc 0051");

  for (const rel of kernel.KERNEL_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0050"), "README 0050");
  pass("README registry");

  console.log("\nMaster Canon 0050 contract: ALL PASS");
}

run();
