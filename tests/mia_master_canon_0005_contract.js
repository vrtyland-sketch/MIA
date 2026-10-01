"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const arch = require("../shared/mia-architecture-core");
const components = require("../shared/mia-component-core");
const entities = require("../shared/mia-entity-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0005-architecture-layers.md");
  const alignPath = path.join(MASTER, "0005-alignment.md");

  assert.ok(fs.existsSync(docPath), "0005-architecture-layers.md exists");
  assert.ok(fs.existsSync(alignPath), "0005-alignment.md exists");
  pass("0005 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 16; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0005 section ${i}`);
  }
  assert.ok(doc.includes("MIA není aplikace"), "0005 platform definition");
  assert.ok(doc.includes("0001–0005"), "0005 vocabulary summary");
  pass("0005 structure (16 sections)");

  assert.equal(arch.ARCHITECTURE_LAYER_ORDER.length, 8, "eight architecture layers");
  assert.equal(Object.keys(arch.LAYER_RESPONSIBILITY).length, 8, "eight responsibilities");
  pass("architecture layer taxonomy");

  const good = arch.validateArchitectureName("DecisionEngine");
  assert.equal(good.ok, true);
  const bad = arch.validateArchitectureName("DecisionManagerEngineSystem");
  assert.equal(bad.ok, false);
  pass("naming rules");

  const dep = arch.assertLayerDependencyAllowed(arch.ARCHITECTURE_LAYER.ENGINE, arch.ARCHITECTURE_LAYER.SYSTEM);
  assert.equal(dep.ok, false, "engine must not depend on system");
  const okDep = arch.assertLayerDependencyAllowed(arch.ARCHITECTURE_LAYER.MODULE, arch.ARCHITECTURE_LAYER.ENGINE);
  assert.equal(okDep.ok, true);
  pass("layer dependency rules");

  const flat = arch.flattenPlatformMap();
  assert.ok(flat.length >= 20, "platform map nodes");
  assert.ok(arch.findPlatformNode("mia.platform"));
  assert.ok(arch.findPlatformNode("engine.decision"));
  assert.ok(arch.listNodesByLayer(arch.ARCHITECTURE_LAYER.SYSTEM).length >= 4);
  pass("MIA platform map");

  const registry = components.listComponents();
  for (const row of registry) {
    const layer = arch.MAP_0004_COMPONENT_TO_LAYER[row.componentId];
    assert.ok(layer, `0004→0005 layer for ${row.componentId}`);
    assert.ok(arch.isArchitectureLayer(layer));
  }
  pass("0004 component registry mapped to 0005 layers");

  const entityList = entities.listSystemEntities();
  assert.ok(entityList.length >= 6);
  pass("entities from 0002 present");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0005"), "README 0005");
  pass("master canon index");

  console.log("\nMaster Canon 0005 contract: ALL PASS");
}

run();
