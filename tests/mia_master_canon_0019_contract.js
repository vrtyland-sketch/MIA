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
  const docPath = path.join(MASTER, "0019-memory-system.md");
  const alignPath = path.join(MASTER, "0019-alignment.md");

  assert.ok(fs.existsSync(docPath), "0019-memory-system.md exists");
  assert.ok(fs.existsSync(alignPath), "0019-alignment.md exists");
  pass("0019 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 19; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0019 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0019 critical priority");
  assert.ok(doc.includes("0006"), "0019 links to 0006");
  assert.ok(doc.includes("0020"), "0019 points to 0020");
  pass("0019 structure (19 sections)");

  assert.equal(memory.MEMORY_COMPONENT_ORDER.length, 15);
  assert.equal(Object.keys(memory.MEMORY_TYPE).length, 7);
  assert.equal(memory.MEMORY_LIFECYCLE_ORDER.length, 7);
  pass("memory components and types");

  const record = memory.createMemoryRecord({
    what: "Gift received from viewer",
    why: "important for economy and koj reaction",
    retention: memory.MEMORY_RETENTION.DAYS_30,
    memoryType: memory.MEMORY_TYPE.EPISODIC,
    context: {
      userId: "viewer-1",
      streamId: "stream-live",
      topic: "gift"
    }
  });
  const validation = memory.validateMemoryRecord(record);
  assert.equal(validation.ok, true);
  pass("memory record with what/when/why/retention");

  const invalid = memory.validateMemoryRecord({ what: "x" });
  assert.equal(invalid.ok, false);
  pass("reject incomplete memory");

  const scored = memory.computeMemoryScore(record, { importance: 0.9, usageCount: 5 });
  assert.ok(scored.score > 0);
  pass("memory score");

  const promoted = memory.transitionMemoryLifecycle(record, memory.MEMORY_LIFECYCLE.WORKING);
  assert.equal(promoted.lifecycle, memory.MEMORY_LIFECYCLE.WORKING);
  pass("lifecycle transition");

  const graph = memory.createKnowledgeGraph();
  graph.addNode(memory.createKnowledgeGraphNode({ nodeId: "vasa", label: "Vasa" }));
  graph.addNode(memory.createKnowledgeGraphNode({ nodeId: "mia", label: "MIA" }));
  graph.addEdge(memory.createKnowledgeGraphEdge({ from: "vasa", to: "mia", relation: "created" }));
  assert.equal(graph.listEdges("vasa").length, 1);
  pass("knowledge graph");

  const index = memory.createMemoryIndex();
  index.add(record);
  index.add(
    memory.createMemoryRecord({
      what: "Chat message about gift",
      why: "community context",
      memoryType: memory.MEMORY_TYPE.SHORT_TERM,
      context: { userId: "viewer-1", topic: "gift" }
    })
  );
  const found = memory.searchMemories(index, { topic: "gift", userId: "viewer-1" });
  assert.ok(found.length >= 1);
  pass("memory search");

  const similar = [
    memory.createMemoryRecord({ what: "hello chat", why: "a", memoryType: memory.MEMORY_TYPE.SHORT_TERM }),
    memory.createMemoryRecord({ what: "hello chat", why: "b", memoryType: memory.MEMORY_TYPE.SHORT_TERM }),
    memory.createMemoryRecord({ what: "unique event", why: "c", memoryType: memory.MEMORY_TYPE.EPISODIC })
  ];
  const consolidated = memory.consolidateMemories(similar);
  assert.equal(consolidated.mergedCount, 1);
  pass("memory consolidator");

  const forget = memory.shouldForget(
    memory.createMemoryRecord({
      what: "temp ping",
      why: "noise",
      retention: memory.MEMORY_RETENTION.EPHEMERAL,
      when: Date.now() - 120000
    }),
    { minScore: 0.2 }
  );
  assert.equal(forget.forget, true);
  pass("memory cleaner forget");

  const backup = memory.createMemoryBackup({ memories: [record], graph: graph.snapshot() });
  const restoreIndex = memory.createMemoryIndex();
  const restored = memory.restoreMemoryBackup(backup, restoreIndex);
  assert.equal(restored.restoredCount, 1);
  pass("memory backup restore");

  const api = memory.createMemoryApiResponse({ memories: [record] });
  assert.equal(api.readOnly, true);
  pass("memory API");

  assert.equal(memory.assertMemoryForbiddenActivity("control_ai_directly").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/workingMemory.js"));
  pass("memory system next doc 0022");

  for (const rel of memory.MEMORY_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0019"), "README 0019");
  pass("README registry");

  console.log("\nMaster Canon 0019 contract: ALL PASS");
}

run();
