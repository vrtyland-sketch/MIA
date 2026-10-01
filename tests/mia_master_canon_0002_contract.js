"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const core = require("../shared/mia-entity-core");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0002-entity-definition.md");
  const alignPath = path.join(MASTER, "0002-alignment.md");

  assert.ok(fs.existsSync(docPath), "0002-entity-definition.md exists");
  assert.ok(fs.existsSync(alignPath), "0002-alignment.md exists");
  pass("0002 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  const sections = [
    "## 1. Účel dokumentu",
    "## 2. Definice entity",
    "## 3. Základní pravidlo",
    "## 4. Životní cyklus entity",
    "## 5. Povinné vlastnosti každé entity",
    "## 6. Druhy entit",
    "## 7. Vztahy mezi entitami",
    "## 8. Chování entity",
    "## 9. Jedinečnost",
    "## 10. Budoucí rozšíření",
    "## 11. Kontrolní seznam implementace",
    "## 12. Poznámka architekta"
  ];
  for (const section of sections) {
    assert.ok(doc.includes(section), `0002 contains ${section}`);
  }
  assert.ok(doc.includes("**Verze:** 1.0"), "0002 version 1.0");
  assert.ok(doc.includes("Entity-First Architecture"), "0002 entity-first note");
  pass("0002 structure (12 sections)");

  assert.equal(core.ENTITY_LIFECYCLE_ORDER.length, 7, "seven lifecycle states");
  assert.equal(Object.keys(core.ENTITY_CATEGORY).length, 6, "six entity categories");
  assert.equal(core.REQUIRED_ENTITY_FIELDS.length, 9, "nine mandatory fields");
  pass("entity-core enums");

  const valid = core.createEntityRecord({
    entityId: "test.entity",
    entityType: "data.test",
    category: core.ENTITY_CATEGORY.DATA,
    name: "Test",
    createdBy: "contract"
  });
  assert.equal(valid.ok, true, "createEntityRecord ok");
  assert.equal(valid.normalized.state, core.ENTITY_LIFECYCLE.CREATED);
  pass("createEntityRecord");

  const invalid = core.validateEntityRecord({ entityId: "x" });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.length > 0);
  pass("validateEntityRecord rejects incomplete");

  const registry = core.listSystemEntities();
  assert.ok(registry.length >= 6, "system entity registry");
  const unique = core.assertUniqueEntityIds(registry);
  assert.equal(unique.ok, true, `unique ids: ${unique.duplicates.join(",")}`);
  pass("system entity registry unique ids");

  const mia = core.getSystemEntity("mia.main");
  assert.ok(mia);
  assert.equal(mia.category, core.ENTITY_CATEGORY.AI);
  const koj = core.getSystemEntity("kojnozout.pet");
  assert.ok(koj);
  assert.notEqual(mia.entityType, koj.entityType);
  pass("mia.main and kojnozout.pet distinct");

  for (const edge of core.CANON_ENTITY_RELATIONS) {
    const rel = core.validateEntityRelation(edge);
    assert.equal(rel.ok, true, `relation ${edge.fromEntityId}->${edge.toEntityId}`);
  }
  pass("canon entity relations valid");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0002"), "README registers 0002");
  pass("master canon index 0002");

  const align = fs.readFileSync(alignPath, "utf8");
  for (const section of ["§1", "§6", "§11", "§12"]) {
    assert.ok(align.includes(section), `alignment covers ${section}`);
  }
  pass("0002 alignment audit");

  console.log("\nMaster Canon 0002 contract: ALL PASS");
}

run();
