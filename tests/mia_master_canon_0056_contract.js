"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const resource = require("../shared/mia-resource-core");
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
  const docPath = path.join(MASTER, "0056-resource-manager.md");
  const alignPath = path.join(MASTER, "0056-alignment.md");

  assert.ok(fs.existsSync(docPath), "0056-resource-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0056-alignment.md exists");
  pass("0056 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0056 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0056 kernel layer");
  assert.ok(doc.includes("0055"), "0056 links to 0055");
  assert.ok(doc.includes("0057"), "0056 points to 0057");
  pass("0056 structure (21 sections)");

  assert.equal(resource.RM_COMPONENT_ORDER.length, 12);
  pass("resource manager components");

  assert.equal(Object.keys(resource.RM_DOMAIN).length, 4);
  pass("resource domains");

  assert.equal(resource.RM_RESOURCE_KIND.EXCLUSIVE, "exclusive");
  assert.equal(resource.RM_RESOURCE_KIND.SHARED, "shared");
  assert.equal(resource.RM_RESOURCE_KIND.LIMITED, "limited");
  pass("resource kinds");

  assert.deepEqual([...resource.RM_PRIORITY_ORDER], [
    "critical",
    "high",
    "normal",
    "low",
    "optional"
  ]);
  pass("resource priorities");

  assert.deepEqual([...resource.RM_ALARM_ORDER], [
    "warning",
    "high",
    "critical",
    "emergency"
  ]);
  pass("alarm levels");

  assert.equal(resource.RM_PUBLIC_API.length, 10);
  pass("public resource api");

  assert.equal(resource.assertSelfAllocateForbidden("self_allocate").ok, false);
  assert.equal(resource.assertSelfAllocateForbidden("request_via_manager").ok, true);
  pass("self allocate forbidden");

  const mgr = resource.createResourceManager();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleAllocator, true);
  assert.equal(mgr.status().gpuRequired, false);
  assert.ok(mgr.list().resources.length >= 10);
  pass("seeded resource registry");

  const self = mgr.request("cpu", 10, { owner: "battle", activity: "self_allocate" });
  assert.equal(self.ok, false);
  pass("block self allocate on request");

  const alloc = mgr.request("cache", 50, { owner: "battle", priority: resource.RM_PRIORITY.NORMAL });
  assert.equal(alloc.ok, true);
  assert.ok(alloc.allocId);
  pass("allocate via manager");

  const exclusive = mgr.request("port_8080", 1, { owner: "http" });
  assert.equal(exclusive.ok, true);
  const exclusive2 = mgr.request("port_8080", 1, { owner: "other" });
  assert.equal(exclusive2.ok, false);
  pass("exclusive resource");

  const over = mgr.request("ai_requests", 1000, { owner: "decision" });
  assert.equal(over.ok, false);
  pass("limit enforcement");

  mgr.applyLimits({ connectionMax: 2, cacheMax: 200 });
  assert.equal(mgr.getLimits().connectionMax, 2);
  pass("configurable limits");

  const c1 = mgr.openConnection("ws-1", { type: "websocket", owner: "tiktok" });
  const c2 = mgr.openConnection("ws-2", { type: "websocket", owner: "obs" });
  assert.equal(c1.ok, true);
  assert.equal(c2.ok, true);
  const c3 = mgr.openConnection("ws-3", { type: "websocket", owner: "kick" });
  assert.equal(c3.ok, false);
  mgr.closeConnection("ws-1");
  assert.equal(
    mgr.list().connections.find((c) => c.connectionId === "ws-1").state,
    resource.RM_CONNECTION_STATE.CLOSED
  );
  pass("connection lifecycle");

  mgr.updateUsage("cache", 180);
  const opt = mgr.optimize();
  assert.equal(opt.ok, true);
  assert.equal(opt.kernelAffected, false);
  assert.ok(opt.actions.length >= 1);
  pass("auto optimize without kernel impact");

  mgr.updateUsage("cpu", 96);
  mgr.updateUsage("ram", 96);
  const alarms = mgr.evaluateAlarms();
  assert.ok(alarms.alarms.some((a) => a.level === resource.RM_ALARM.CRITICAL));
  pass("alarms on overload");

  const wd = mgr.watchdogSnapshot();
  assert.equal(wd.source, "resource_manager");
  assert.ok(wd.cpu > 0.9);
  assert.equal(typeof wd.canStartRecovery, "boolean");
  pass("watchdog feed");

  const released = mgr.release(alloc.allocId);
  assert.equal(released.ok, true);
  pass("release allocation");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.resources >= 10);
  assert.ok(metrics.cpu >= 0);
  pass("resource metrics");

  const protectedKernel = mgr.protectKernel();
  assert.equal(protectedKernel.kernelProtected, true);
  pass("kernel protection");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-resource-core/resourceManager.js"));
  pass("core system next doc 0071");

  for (const rel of resource.RM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0056"), "README 0056");
  assert.ok(readme.includes("Resource Manager"), "README Resource Manager");
  pass("README registry");

  console.log("\nMaster Canon 0056 contract: ALL PASS");
}

run();
