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
  const docPath = path.join(MASTER, "0008-runtime-manager.md");
  const alignPath = path.join(MASTER, "0008-alignment.md");

  assert.ok(fs.existsSync(docPath), "0008-runtime-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0008-alignment.md exists");
  pass("0008 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 16; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0008 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0008 critical priority");
  assert.ok(doc.includes("0007"), "0008 links to parent 0007");
  assert.ok(doc.includes("0009"), "0008 points to 0009");
  pass("0008 structure (16 sections)");

  assert.equal(core.RUNTIME_PHASE_ORDER.length, 6);
  assert.equal(core.describeRuntimeBootstrapPhases().length, 6);
  for (const step of core.describeRuntimeBootstrapPhases()) {
    assert.ok(step.anchors.length > 0, `anchors for ${step.phase}`);
  }
  pass("bootstrap phases");

  assert.equal(Object.keys(core.RUNTIME_STATE).length, 11);
  assert.ok(core.canTransitionRuntimeState(core.RUNTIME_STATE.CREATED, core.RUNTIME_STATE.INITIALIZING));
  assert.ok(!core.canTransitionRuntimeState(core.RUNTIME_STATE.CREATED, core.RUNTIME_STATE.RUNNING));
  pass("runtime state machine");

  const ctx = core.createRuntimeContextRecord({ platformVersion: "1.0.0" });
  assert.ok(ctx.runtimeId.startsWith("mia-runtime-"));
  assert.equal(ctx.platformVersion, "1.0.0");
  assert.equal(ctx.platformState, core.RUNTIME_STATE.CREATED);
  for (const field of core.RUNTIME_CONTEXT_FIELDS) {
    assert.ok(field in ctx, `context field ${field}`);
  }
  pass("runtime context record");

  const sys = core.createSystemRegistryRecord({
    systemId: "core",
    name: "CORE SYSTEM",
    version: "1.0.0"
  });
  assert.equal(sys.systemId, "core");
  for (const field of core.SYSTEM_REGISTRY_FIELDS) {
    assert.ok(field in sys, `registry field ${field}`);
  }
  pass("system registry record");

  assert.equal(core.RUNTIME_FORBIDDEN_ACTIVITIES.length, 5);
  assert.equal(core.assertRuntimeForbiddenActivity("render_graphics").ok, false);
  assert.equal(core.assertRuntimeForbiddenActivity("coordinate_modules").ok, true);
  pass("forbidden activities");

  const runtimeMgr = core.getCoreManager(core.CORE_MANAGER_ID.RUNTIME);
  assert.equal(runtimeMgr.nextDocId, "0009");
  assert.ok(runtimeMgr.runtime.includes("scripts/MIA_SERVER_BOOTSTRAP.js"));
  pass("core runtime manager anchor");

  for (const rel of core.RUNTIME_MANAGER_ANCHORS) {
    assert.ok(pathExists(rel), `runtime anchor exists: ${rel}`);
  }
  pass("runtime manager file anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0008"), "README 0008");
  pass("master canon index");

  console.log("\nMaster Canon 0008 contract: ALL PASS");
}

run();
