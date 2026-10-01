"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const arch = require("../shared/mia-architecture-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0006-platform-architecture.md");
  const alignPath = path.join(MASTER, "0006-alignment.md");

  assert.ok(fs.existsSync(docPath), "0006-platform-architecture.md exists");
  assert.ok(fs.existsSync(alignPath), "0006-alignment.md exists");
  pass("0006 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0006 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0006 critical priority");
  assert.ok(doc.includes("nejvyšší architektury"), "0006 highest architecture");
  assert.ok(doc.includes("0007"), "0006 points to 0007");
  pass("0006 structure (22 sections)");

  const systems = arch.listPlatformSystems();
  assert.equal(systems.length, 15, "fifteen platform systems");
  assert.equal(arch.PLATFORM_SYSTEM_ORDER.length, 15);
  for (const id of arch.PLATFORM_SYSTEM_ORDER) {
    assert.ok(arch.getPlatformSystem(id), `system ${id}`);
  }
  pass("platform systems registry");

  const core = arch.getPlatformSystem(arch.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(core.nextDocId, "0088");
  assert.ok(core.runtime.includes("index.js"));
  pass("core system anchor");

  const implemented = arch.countSystemsByStatus("implemented");
  const partial = arch.countSystemsByStatus("partial");
  assert.ok(implemented >= 5, `implemented systems: ${implemented}`);
  assert.ok(partial >= 5, `partial systems: ${partial}`);
  pass("system implementation status");

  assert.equal(arch.listArchitecturePrinciples().length, 10, "ten principles");
  pass("architecture principles");

  assert.ok(arch.CANON_PLATFORM_DATA_FLOW.length >= 9);
  assert.ok(arch.describePlatformDataFlow().includes("Event Bus"));
  pass("platform data flow");

  for (const sys of ["core", "stream", "graphics", "game", "economy", "development", "integration"]) {
    const row = arch.getPlatformSystem(sys);
    assert.ok(row.runtime.length > 0, `${sys} has runtime paths`);
    const first = row.runtime[0];
    if (first.includes("/") || first.includes(".")) {
      const check = first.startsWith("npm") ? true : fs.existsSync(path.join(ROOT, first)) || fs.existsSync(path.join(ROOT, first.split("/")[0]));
      assert.ok(check, `runtime path exists for ${sys}: ${first}`);
    }
  }
  pass("key system runtime paths exist");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0006"), "README 0006");
  pass("master canon index");

  console.log("\nMaster Canon 0006 contract: ALL PASS");
}

run();
