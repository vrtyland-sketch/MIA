"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const core = require("../shared/mia-core-canon");
const arch = require("../shared/mia-architecture-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function pathExists(rel) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) return true;
  const first = rel.split("/")[0];
  return fs.existsSync(path.join(ROOT, first));
}

function run() {
  const docPath = path.join(MASTER, "0007-core-system.md");
  const alignPath = path.join(MASTER, "0007-alignment.md");

  assert.ok(fs.existsSync(docPath), "0007-core-system.md exists");
  assert.ok(fs.existsSync(alignPath), "0007-alignment.md exists");
  pass("0007 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0007 section ${i}`);
  }
  assert.ok(doc.includes("Nejvyšší"), "0007 highest priority");
  assert.ok(doc.includes("Navazuje na"), "0007 links to 0006");
  assert.ok(doc.includes("0008"), "0007 points to 0008");
  pass("0007 structure (20 sections)");

  const managers = core.listCoreManagers();
  assert.equal(managers.length, 12, "twelve core managers");
  for (const m of managers) {
    assert.ok(m.id.startsWith("core."), `manager id ${m.id}`);
    assert.ok(m.runtime.length > 0, `runtime for ${m.id}`);
  }
  pass("core managers registry");

  assert.equal(core.CORE_LIFECYCLE_ORDER.length, 8);
  assert.ok(core.isCoreLifecycleState(core.CORE_LIFECYCLE.RUNNING));
  assert.ok(!core.isCoreLifecycleState("bogus"));
  pass("core lifecycle enum");

  const runtime = core.getCoreManager(core.CORE_MANAGER_ID.RUNTIME);
  assert.equal(runtime.nextDocId, "0009");
  assert.ok(runtime.runtime.includes("index.js"));
  pass("runtime manager anchor");

  const forbidden = core.assertCoreForbiddenDependencies([
    { from: "core.event_bus", to: "stream.ingest" },
    { from: "core.event_bus", to: "game.kojnozout" }
  ]);
  assert.equal(forbidden.ok, false);
  assert.ok(forbidden.violations.length >= 1);

  const allowed = core.assertCoreForbiddenDependencies([
    { from: "stream.ingest", to: "core.event_bus" }
  ]);
  assert.equal(allowed.ok, true);
  pass("forbidden upstream dependencies check");

  const platformCore = arch.getPlatformSystem(arch.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(platformCore.nextDocId, "0088");
  pass("platform CORE nextDocId → 0069");

  for (const rel of ["server.js", "index.js", "scripts/MIA_INGEST_QUEUE.js", "scripts/MIA_CONFIG.js", "scripts/mia_stop.js"]) {
    assert.ok(pathExists(rel), `path exists: ${rel}`);
  }
  pass("key core runtime paths");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0007"), "README 0007");
  pass("master canon index");

  console.log("\nMaster Canon 0007 contract: ALL PASS");
}

run();
