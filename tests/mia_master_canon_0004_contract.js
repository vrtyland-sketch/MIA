"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const components = require("../shared/mia-component-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0004-component-definition.md");
  const alignPath = path.join(MASTER, "0004-alignment.md");

  assert.ok(fs.existsSync(docPath), "0004-component-definition.md exists");
  assert.ok(fs.existsSync(alignPath), "0004-alignment.md exists");
  pass("0004 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 16; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0004 contains section ${i}`);
  }
  assert.ok(doc.includes("**Verze:** 1.0"), "0004 version 1.0");
  assert.ok(doc.includes("Komponenta není totéž co entita"), "0004 entity distinction");
  pass("0004 structure (16 sections)");

  assert.equal(components.COMPONENT_LIFECYCLE_ORDER.length, 8, "eight lifecycle states");
  assert.equal(Object.keys(components.COMPONENT_TYPE).length, 6, "six component types");
  assert.equal(components.REQUIRED_COMPONENT_FIELDS.length, 10, "ten mandatory fields");
  pass("component-core enums");

  const valid = components.createComponentRecord({
    componentId: "test.component",
    componentType: components.COMPONENT_TYPE.RUNTIME,
    name: "Test",
    purpose: "Contract probe",
    inputs: ["in"],
    outputs: ["out"],
    logging: "test",
    configuration: { sources: ["env"] }
  });
  assert.equal(valid.ok, true, valid.errors?.join(","));
  pass("createComponentRecord");

  const registry = components.listComponents();
  assert.ok(registry.length >= 13, "canon component registry");
  const unique = new Set(registry.map((r) => r.componentId));
  assert.equal(unique.size, registry.length, "unique componentIds");
  pass("registry unique ids");

  const acyclic = components.assertAcyclicDependencies(registry);
  assert.equal(acyclic.ok, true, `cycle: ${acyclic.cycle?.join(" -> ")}`);
  pass("dependency graph acyclic");

  const pipeline = components.getComponent("runtime.event_pipeline");
  assert.ok(pipeline);
  assert.ok(pipeline.listensTo.includes("pipeline.process"));
  assert.ok(fs.existsSync(path.join(ROOT, pipeline.module)), `module exists: ${pipeline.module}`);
  pass("runtime.event_pipeline registry anchor");

  const hostFiles = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => f.endsWith("_HOST.js"));
  assert.ok(hostFiles.length >= 50, "HOST component wiring files");
  pass("runtime HOST modules");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0004"), "README registers 0004");
  pass("master canon index 0004");

  console.log("\nMaster Canon 0004 contract: ALL PASS");
}

run();
