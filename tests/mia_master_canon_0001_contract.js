"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const constitution = path.join(MASTER, "0001-project-constitution.md");
  const alignment = path.join(MASTER, "0001-alignment.md");
  const readme = path.join(MASTER, "README.md");

  assert.ok(fs.existsSync(constitution), "0001-project-constitution.md exists");
  assert.ok(fs.existsSync(alignment), "0001-alignment.md exists");
  assert.ok(fs.existsSync(readme), "master-canon README exists");
  pass("master canon files on disk");

  const doc = fs.readFileSync(constitution, "utf8");
  const requiredSections = [
    "## 1. Účel dokumentu",
    "## 2. Co je MIA",
    "## 3. Hlavní poslání",
    "## 4. Základní principy",
    "## 5. Rozsah projektu",
    "## 6. Pravidlo jediného zdroje pravdy",
    "## 7. Definice dokončení",
    "## 8. Poznámka pro Cursor"
  ];
  for (const section of requiredSections) {
    assert.ok(doc.includes(section), `constitution contains ${section}`);
  }
  assert.ok(doc.includes("**Verze:** 1.0"), "constitution version 1.0");
  assert.ok(doc.includes("**Stav:** Platný dokument"), "constitution status");
  pass("constitution structure (8 sections, v1.0)");

  const align = fs.readFileSync(alignment, "utf8");
  assert.ok(align.includes("✅"), "alignment uses implemented marker");
  assert.ok(align.includes("🟡"), "alignment uses partial marker");
  assert.ok(align.includes("❌"), "alignment uses missing marker");
  for (const section of ["§1", "§2", "§3", "§4", "§5", "§6", "§7", "§8"]) {
    assert.ok(align.includes(section), `alignment covers ${section}`);
  }
  pass("alignment audit covers all sections");

  const index = fs.readFileSync(readme, "utf8");
  assert.ok(index.includes("0001"), "README registers document 0001");
  assert.ok(index.includes("0002"), "README registers document 0002");
  assert.ok(index.includes("0003"), "README registers document 0003");
  assert.ok(index.includes("0004"), "README registers document 0004");
  assert.ok(index.includes("0005"), "README registers document 0005");
  assert.ok(index.includes("0006"), "README registers document 0006");
  assert.ok(index.includes("0007"), "README registers planned 0007 core system");
  assert.ok(index.includes("Nejvyšší priorita"), "README states priority");
  pass("master canon index");

  const miaCanon = read(".cursor/rules/mia-canon.mdc");
  assert.ok(
    miaCanon.includes("master-canon") || miaCanon.includes("Master Canon"),
    "mia-canon.mdc references Master Canon"
  );
  pass("cursor rule links Master Canon");

  const agent = read("docs/KANON_MIA_AGENT.md");
  assert.ok(
    agent.includes("master-canon") || agent.includes("Master Canon"),
    "KANON_MIA_AGENT references Master Canon"
  );
  pass("operational canon references constitution");

  const alignmentMap = read("docs/KANON_MIA_ALIGNMENT.md");
  assert.ok(
    alignmentMap.includes("master-canon") || alignmentMap.includes("Master Canon"),
    "KANON_MIA_ALIGNMENT references Master Canon"
  );
  pass("code alignment map references constitution");

  const pkg = JSON.parse(read("package.json"));
  const preflight = pkg.scripts["test:preflight:fast"] || "";
  assert.ok(preflight.includes("run_preflight_tests"), "preflight script exists");
  pass("definition-of-done: preflight hook present");

  console.log("\nMaster Canon 0001 contract: ALL PASS");
}

run();
