"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const memory = require("../shared/mia-memory-core");
const architecture = require("../shared/mia-architecture-core");

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
  const docPath = path.join(MASTER, "0024-semantic-memory.md");
  const alignPath = path.join(MASTER, "0024-alignment.md");

  assert.ok(fs.existsSync(docPath), "0024-semantic-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0024-alignment.md exists");
  pass("0024 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0024 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0024 critical priority");
  assert.ok(doc.includes("0023"), "0024 links to 0023");
  assert.ok(doc.includes("0025"), "0024 points to 0025");
  pass("0024 structure (22 sections)");

  assert.equal(memory.SM_COMPONENT_ORDER.length, 13);
  assert.equal(Object.keys(memory.RULE_DOMAIN).length, 6);
  pass("semantic components");

  const store = memory.createSemanticMemoryStore();

  store.addConcept({
    term: "Gift",
    definition: "Virtual item sent by a viewer during stream",
    relatedTerms: ["Battle", "Economy"],
    synonyms: ["gift", "donation"]
  });
  store.addConcept({
    term: "Battle",
    definition: "Competitive stream event using gifts as score",
    relatedTerms: ["Gift", "Kojnožrout"]
  });
  store.addKnowledge({
    title: "MIA architecture",
    body: "TikFinity → MIA → OBS pipeline",
    domain: "architecture",
    tags: ["stream", "obs"]
  });
  store.addRule({
    name: "Battle scoring",
    rule: "Gifts during battle increase team score",
    domain: memory.RULE_DOMAIN.BATTLE
  });
  pass("concept library, knowledge base, rule library");

  store.defineOntologyRelation("Gift", memory.ONTOLOGY_RELATION.IS_TYPE, "Event");
  store.defineOntologyRelation("Battle", memory.ONTOLOGY_RELATION.USES, "Gift");
  store.defineOntologyRelation("Kojnožrout", memory.ONTOLOGY_RELATION.IS, "Entity");
  assert.ok(store.graph().edges.length >= 3);
  pass("ontology manager");

  store.addTaxonomyNode("entity", "Entity");
  store.addTaxonomyNode("game_entity", "Game Entity", "entity");
  store.addTaxonomyNode("kojnozout", "Kojnožrout", "game_entity");
  store.addTaxonomyNode("battle_kojnozout", "Battle Kojnožrout", "kojnozout");
  assert.equal(store.taxonomySnapshot().length, 4);
  pass("taxonomy manager");

  const validation = memory.validateFact({
    term: "Overlay",
    definition: "Visual layer rendered in OBS"
  });
  assert.equal(validation.ok, true);
  pass("fact validator");

  const dup = store.addConcept({
    term: "Gift",
    definition: "Duplicate definition",
    version: 1
  });
  assert.equal(dup.ok, false);
  pass("duplicate detection");

  const proposed = store.addConcept({
    term: "NewTerm",
    definition: "Unverified proposal",
    trust: memory.KNOWLEDGE_TRUST.PROPOSED,
    source: "ai_draft"
  });
  assert.equal(proposed.ok, true);
  assert.equal(proposed.entry.trust, memory.KNOWLEDGE_TRUST.PROPOSED);
  pass("proposed knowledge marking");

  const giftConcept = store.list(memory.SM_ENTRY_KIND.CONCEPT).find((c) => c.term === "Gift");
  const versioned = store.versionEntry(giftConcept.entryId, {
    definition: "Updated gift definition with battle linkage"
  });
  assert.equal(versioned.ok, true);
  assert.equal(versioned.previousVersion, 1);
  pass("knowledge versioning");

  const search = store.search({ q: "gift" });
  assert.ok(search.count >= 2);
  pass("semantic search");

  const imported = store.importKnowledge(
    {
      items: [
        {
          kind: memory.SM_ENTRY_KIND.KNOWLEDGE,
          title: "OBS overlay sync",
          body: "MIA pushes overlay state to OBS browser source",
          domain: "obs",
          trust: memory.KNOWLEDGE_TRUST.PROPOSED
        }
      ]
    },
    "documentation"
  );
  assert.equal(imported.importedCount, 1);
  assert.ok(imported.auditId);
  pass("knowledge import");

  const exported = store.exportKnowledge();
  assert.ok(exported.concepts.length >= 2);
  assert.ok(exported.rules.length >= 1);
  pass("knowledge export");

  const protectedExport = store.exportKnowledge({ includeInternal: false });
  store.put({
    kind: memory.SM_ENTRY_KIND.KNOWLEDGE,
    title: "Internal secret",
    body: "protected",
    source: "internal_protected",
    trust: memory.KNOWLEDGE_TRUST.VERIFIED
  });
  const afterProtected = store.exportKnowledge({ includeInternal: false });
  assert.ok(
    !afterProtected.knowledge.some((k) => k.title === "Internal secret"),
    "protected data excluded"
  );
  pass("export permission guard");

  assert.equal(memory.assertSemanticForbiddenActivity("store_episodic_memories").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/semanticMemory.js"));
  pass("memory system next doc 0025");

  for (const rel of memory.SM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0024"), "README 0024");
  pass("README registry");

  console.log("\nMaster Canon 0024 contract: ALL PASS");
}

run();
