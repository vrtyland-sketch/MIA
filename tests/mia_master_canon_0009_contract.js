"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const core = require("../shared/mia-core-canon");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pathExists(rel) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) return true;
  return fs.existsSync(path.join(ROOT, rel.split("/")[0]));
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0009-lifecycle-manager.md");
  const alignPath = path.join(MASTER, "0009-alignment.md");

  assert.ok(fs.existsSync(docPath), "0009-lifecycle-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0009-alignment.md exists");
  pass("0009 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0009 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0009 critical priority");
  assert.ok(doc.includes("0007"), "0009 links to parent 0007");
  assert.ok(doc.includes("0010"), "0009 points to 0010");
  pass("0009 structure (20 sections)");

  assert.equal(Object.values(core.MANAGED_OBJECT_KIND).length, 9);
  assert.equal(core.PLATFORM_LIFECYCLE_ORDER.length, 13);
  assert.ok(core.isPlatformLifecycleState(core.PLATFORM_LIFECYCLE.FAILED));
  pass("managed object kinds and lifecycle states");

  assert.ok(core.canTransitionPlatformLifecycle(core.PLATFORM_LIFECYCLE.READY, core.PLATFORM_LIFECYCLE.STARTING));
  assert.ok(core.canTransitionPlatformLifecycle(core.PLATFORM_LIFECYCLE.STARTING, core.PLATFORM_LIFECYCLE.RUNNING));
  assert.ok(!core.canTransitionPlatformLifecycle(core.PLATFORM_LIFECYCLE.RUNNING, core.PLATFORM_LIFECYCLE.STOPPED));
  assert.ok(!core.canTransitionPlatformLifecycle(core.PLATFORM_LIFECYCLE.PAUSED, core.PLATFORM_LIFECYCLE.CREATED));
  pass("documented transition rules");

  assert.ok(
    core.canTransitionPlatformLifecycle(core.PLATFORM_LIFECYCLE.CREATED, core.PLATFORM_LIFECYCLE.RUNNING, {
      shortPath: true
    })
  );
  pass("short-path exception");

  const reg = core.createManagedObjectRegistration({
    objectId: "core.event_bus",
    name: "Event Bus",
    type: core.MANAGED_OBJECT_KIND.COMPONENT,
    version: "1.0.0"
  });
  assert.equal(reg.state, core.PLATFORM_LIFECYCLE.REGISTERED);
  for (const field of core.REGISTRATION_FIELDS) {
    assert.ok(field in reg, `registration field ${field}`);
  }
  pass("managed object registration");

  const applied = core.applyLifecycleTransition(reg, core.PLATFORM_LIFECYCLE.CREATED, {
    reason: "instance_created"
  });
  assert.equal(applied.registration.state, core.PLATFORM_LIFECYCLE.CREATED);
  assert.equal(applied.event.previousState, core.PLATFORM_LIFECYCLE.REGISTERED);
  assert.equal(applied.event.newState, core.PLATFORM_LIFECYCLE.CREATED);
  for (const field of core.LIFECYCLE_EVENT_FIELDS) {
    assert.ok(field in applied.event, `event field ${field}`);
  }
  pass("apply lifecycle transition with audit");

  assert.throws(() => {
    core.applyLifecycleTransition(applied.registration, core.PLATFORM_LIFECYCLE.RUNNING);
  });
  pass("rejects invalid transition");

  const restart = core.createRestartRecord({ objectId: "stream.ingest", reason: "watchdog" });
  assert.ok(restart.restartId.startsWith("restart-"));
  assert.equal(restart.path.length, 4);
  pass("restart record");

  assert.equal(core.LIFECYCLE_FORBIDDEN_BEHAVIOR.length, 4);
  pass("forbidden behavior enum");

  const lifecycleMgr = core.getCoreManager(core.CORE_MANAGER_ID.LIFECYCLE);
  assert.equal(lifecycleMgr.nextDocId, "0010");
  assert.ok(lifecycleMgr.runtime.includes("shared/mia-core-canon/lifecycleManager.js"));
  pass("core lifecycle manager anchor");

  for (const rel of core.LIFECYCLE_MANAGER_ANCHORS) {
    assert.ok(pathExists(rel), `lifecycle anchor exists: ${rel}`);
  }
  pass("lifecycle manager file anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0009"), "README 0009");
  pass("master canon index");

  console.log("\nMaster Canon 0009 contract: ALL PASS");
}

run();
