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
  const docPath = path.join(MASTER, "0022-long-term-memory.md");
  const alignPath = path.join(MASTER, "0022-alignment.md");

  assert.ok(fs.existsSync(docPath), "0022-long-term-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0022-alignment.md exists");
  pass("0022 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0022 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0022 critical priority");
  assert.ok(doc.includes("0019"), "0022 links to 0019");
  assert.ok(doc.includes("0023"), "0022 points to 0023");
  pass("0022 structure (23 sections)");

  assert.equal(memory.LTM_COMPONENT_ORDER.length, 14);
  assert.equal(Object.keys(memory.LTM_ENTRY_KIND).length, 10);
  pass("LTM components");

  const evaluation = memory.evaluateForLongTermRetention(
    { what: "Community loves witty replies", importance: 0.8 },
    { importance: 0.8, minScore: 0.5 }
  );
  assert.equal(evaluation.accepted, true);
  pass("long-term evaluation");

  const store = memory.createLongTermMemoryStore();

  memory.upsertUserProfile(store, "viewer-42", {
    nickname: "Váša",
    relationshipToMia: "creator"
  });
  const userList = store.list(memory.LTM_ENTRY_KIND.USER);
  assert.equal(userList[0].data.nickname, "Váša");
  pass("user memory");

  memory.recordStreamMemory(store, {
    streamId: "stream-1",
    peakViewers: 1200,
    highlights: ["record_gift"]
  });
  assert.equal(store.list(memory.LTM_ENTRY_KIND.STREAM).length, 1);
  pass("stream memory");

  memory.updateRelationshipMemory(store, "vasa", {
    role: "project_creator",
    trustLevel: "very_high",
    linkTo: "mia_project",
    relation: "builds"
  });
  const graph = store.graph();
  assert.ok(graph.nodes.length >= 2);
  pass("relationship memory and knowledge graph");

  memory.addProjectMemory(store, {
    title: "Memory System canon",
    version: "0019",
    system: "memory"
  });
  memory.addWorldKnowledge(store, {
    term: "Kojnožrout",
    definition: "Digitální entita MIA"
  });
  memory.updatePersonalityMemory(store, {
    communicationStyle: "warm",
    humor: "playful"
  });
  memory.updateKojnozoutMemory(store, {
    evolutionStage: "hungry_hero",
    favoriteFood: "gifts"
  });
  memory.addSkillMemory(store, { name: "OBS overlay sync", domain: "obs" });
  memory.recordDecision(store, {
    decision: "Use per-tier rotation index",
    reason: "canon compliance",
    outcome: "stable playback"
  });
  memory.addExperience(store, {
    summary: "Witty chat replies increase engagement",
    pattern: "humor",
    sourceEvents: 500
  });
  pass("project, world, personality, kojnozout, skill, decision, experience");

  const consolidated = memory.consolidateLongTermMemories(store);
  assert.equal(consolidated.operation, memory.LTM_OPERATION.CONSOLIDATE);
  pass("consolidation");

  const projectEntry = store.list(memory.LTM_ENTRY_KIND.PROJECT)[0];
  const forgetProject = memory.shouldForgetLtm(projectEntry);
  assert.equal(forgetProject.forget, false);
  assert.equal(forgetProject.reason, "critical_protected");
  pass("critical knowledge protected");

  const promotion = memory.ingestFromShortTerm({
    promoted: true,
    fromEntryId: "stm-1",
    record: {
      what: "Significant gift moment",
      why: "stm_sync_promotion",
      when: Date.now(),
      score: 0.8
    }
  });
  assert.equal(promotion.ok, true);
  const ingested = store.put(promotion.entryInput);
  assert.equal(ingested.ok, true);
  pass("STM promotion bridge");

  const backup = store.backup();
  assert.ok(backup.backupId);
  const restored = store.restore(backup);
  assert.ok(restored.restoredCount >= 1);
  pass("backup and restore");

  const archived = store.archive(userList[0].entryId);
  assert.equal(archived.ok, true);
  pass("memory archive");

  assert.equal(memory.assertLtmForbiddenActivity("bypass_permissions").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/longTermMemory.js"));
  pass("memory system next doc 0023");

  for (const rel of memory.LTM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0022"), "README 0022");
  pass("README registry");

  console.log("\nMaster Canon 0022 contract: ALL PASS");
}

run();
