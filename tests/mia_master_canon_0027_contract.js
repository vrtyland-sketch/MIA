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
  const docPath = path.join(MASTER, "0027-knowledge-graph.md");
  const alignPath = path.join(MASTER, "0027-alignment.md");

  assert.ok(fs.existsSync(docPath), "0027-knowledge-graph.md exists");
  assert.ok(fs.existsSync(alignPath), "0027-alignment.md exists");
  pass("0027 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0027 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0027 critical priority");
  assert.ok(doc.includes("0026"), "0027 links to 0026");
  assert.ok(doc.includes("0028"), "0027 points to 0028");
  pass("0027 structure (23 sections)");

  assert.equal(memory.KG_COMPONENT_ORDER.length, 12);
  assert.equal(Object.keys(memory.KG_ENTITY_KIND).length, 6);
  assert.equal(Object.keys(memory.KG_RELATION_TYPE).length, 10);
  pass("knowledge graph components");

  const store = memory.createKnowledgeGraphStore();

  store.putEntity({
    graphId: "vasa",
    name: "Váša",
    kind: memory.KG_ENTITY_KIND.PERSON,
    owner: "vasa"
  });
  store.putEntity({
    graphId: "mia_project",
    name: "Projekt MIA",
    kind: memory.KG_ENTITY_KIND.CONCEPT,
    owner: "vasa"
  });
  store.putEntity({
    graphId: "mia",
    name: "MIA",
    kind: memory.KG_ENTITY_KIND.AI_ENTITY
  });
  store.putEntity({
    graphId: "kojnozout",
    name: "Kojnožrout",
    kind: memory.KG_ENTITY_KIND.AI_ENTITY
  });
  store.putEntity({
    graphId: "battle",
    name: "Battle",
    kind: memory.KG_ENTITY_KIND.EVENT
  });
  store.putEntity({
    graphId: "obs",
    name: "OBS",
    kind: memory.KG_ENTITY_KIND.SYSTEM
  });
  store.putEntity({
    graphId: "tiktok",
    name: "TikTok",
    kind: memory.KG_ENTITY_KIND.SYSTEM
  });
  pass("entity manager");

  store.putRelationship({
    from: "vasa",
    to: "mia_project",
    type: memory.KG_RELATION_TYPE.CREATED,
    weight: 0.95,
    trust: 0.99
  });
  store.putRelationship({
    from: "mia_project",
    to: "mia",
    type: memory.KG_RELATION_TYPE.CONTAINS,
    weight: 0.9
  });
  store.putRelationship({
    from: "mia",
    to: "kojnozout",
    type: memory.KG_RELATION_TYPE.CONTAINS,
    weight: 0.88
  });
  store.putRelationship({
    from: "kojnozout",
    to: "battle",
    type: memory.KG_RELATION_TYPE.USES,
    weight: 0.8
  });
  store.putRelationship({
    from: "mia",
    to: "obs",
    type: memory.KG_RELATION_TYPE.USES,
    weight: 0.85
  });
  store.putRelationship({
    from: "mia",
    to: "tiktok",
    type: memory.KG_RELATION_TYPE.USES,
    weight: 0.75
  });
  pass("relationship manager");

  const dup = store.putEntity({
    graphId: "vasa",
    name: "Duplicate",
    kind: memory.KG_ENTITY_KIND.PERSON
  });
  assert.equal(dup.ok, false);
  pass("graph validator duplicate entity");

  const missing = store.putRelationship({
    from: "ghost",
    to: "mia",
    type: memory.KG_RELATION_TYPE.INFLUENCES
  });
  assert.equal(missing.ok, false);
  pass("graph validator missing entity");

  const search = store.search({ q: "battle", kind: memory.KG_ENTITY_KIND.EVENT });
  assert.ok(search.entities.some((e) => e.graphId === "battle"));
  pass("graph search");

  const projects = store.search({
    from: "vasa",
    relationType: memory.KG_RELATION_TYPE.CREATED
  });
  assert.ok(projects.relationships.length >= 1);
  pass("graph search by relation");

  const reasoned = store.reason("vasa", { expandContains: true });
  assert.ok(reasoned.inferred.length >= 1);
  pass("graph reasoner");

  const versioned = store.version("mia_ecosystem_v1");
  assert.equal(versioned.ok, true);
  pass("graph versioning");

  const analytics = store.analyze();
  assert.ok(analytics.nodeCount >= 7);
  assert.ok(analytics.edgeCount >= 6);
  pass("graph analytics");

  const visual = store.visualize("mia");
  assert.ok(visual.lines.length >= 2);
  pass("graph visualizer");

  const optimized = store.optimize();
  assert.equal(optimized.optimized.prunedCount, 0);
  pass("graph optimizer");

  const api = memory.createGraphApiResponse(store.snapshot());
  assert.equal(api.component, memory.KG_COMPONENT.GRAPH_API);
  pass("graph API");

  assert.throws(
    () =>
      memory.createGraphRelationship({
        from: "a",
        to: "b",
        type: memory.KG_RELATION_TYPE.IS,
        verified: false
      }),
    /unverified relations must be marked/
  );
  pass("unverified relation guard");

  assert.equal(memory.assertGraphForbiddenActivity("create_unverified_relations").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/knowledgeGraphManager.js"));
  pass("memory system next doc 0028");

  for (const rel of memory.KG_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0027"), "README 0027");
  pass("README registry");

  console.log("\nMaster Canon 0027 contract: ALL PASS");
}

run();
