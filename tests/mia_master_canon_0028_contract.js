"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const decision = require("../shared/mia-decision-core");
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
  const docPath = path.join(MASTER, "0028-decision-engine.md");
  const alignPath = path.join(MASTER, "0028-alignment.md");

  assert.ok(fs.existsSync(docPath), "0028-decision-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0028-alignment.md exists");
  pass("0028 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0028 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0028 critical priority");
  assert.ok(doc.includes("0007"), "0028 links to 0007");
  assert.ok(doc.includes("0029"), "0028 points to 0029");
  pass("0028 structure (24 sections)");

  assert.equal(decision.DE_COMPONENT_ORDER.length, 15);
  pass("decision components");

  const emotional = memory.createEmotionalMemoryStore();
  emotional.updateRelationship("vasa", {
    trustDelta: { positiveExperienceBoost: 10 },
    reputation: memory.REPUTATION_ROLE.SUPPORTER
  });

  const graph = memory.createKnowledgeGraphStore();
  graph.putEntity({ graphId: "vasa", name: "Váša", kind: memory.KG_ENTITY_KIND.PERSON });
  graph.putEntity({ graphId: "kojnozout", name: "Kojnožrout", kind: memory.KG_ENTITY_KIND.AI_ENTITY });
  graph.putRelationship({ from: "vasa", to: "kojnozout", type: memory.KG_RELATION_TYPE.COLLABORATES });

  const engine = decision.createDecisionEngine();
  const result = engine.decide({
    sources: {
      event: {
        type: "gift",
        gift: { tier: "T2", miaPoints: 120, donorId: "vasa" },
        battleActive: true,
        userId: "vasa"
      },
      chat: { active: true }
    },
    adapters: {
      emotion: emotional.snapshotForEmotionEngine(),
      memory: {
        working: true,
        shortTerm: true,
        longTerm: true,
        episodic: true,
        semantic: true,
        procedural: true
      },
      knowledge: graph.search({ userId: "vasa" })
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.executes, false);
  assert.ok(result.actionPlan.orchestratorOnly);
  assert.ok(result.actionPlan.steps.length >= 4);
  assert.equal(result.actionPlan.steps.every((s) => s.execute === false), true);
  pass("gift decision pipeline");

  const chatResult = engine.decide({
    sources: {
      event: { type: "chat", message: "Ahoj MIA!", userId: "viewer-1" }
    },
    adapters: { memory: { working: true, shortTerm: true } }
  });
  assert.equal(chatResult.ok, true);
  assert.ok(chatResult.actionPlan.steps.some((s) => s.action === "chat_reply"));
  pass("chat decision");

  const spamBlocked = engine.decide({
    sources: {
      event: { type: "gift", gift: { spam: true }, userId: "spammer" }
    }
  });
  assert.equal(spamBlocked.ok, false);
  pass("rule evaluator blocks spam");

  const learned = engine.learn(result.actionPlan, { success: true });
  assert.equal(learned.success, true);
  assert.equal(learned.strategyAdjustment, "reinforce");
  pass("learning feedback");

  const emotion = decision.adaptEmotionContext({ mood: "joy", trustScore: 88 });
  assert.equal(emotion.readOnly, true);
  const mem = decision.adaptMemoryContext({ working: {}, episodic: {} });
  assert.equal(mem.readOnly, true);
  pass("emotion and memory adapters read-only");

  assert.equal(decision.assertDecisionForbiddenActivity("bypass_action_orchestrator").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-decision-core/decisionEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of decision.DE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0028"), "README 0028");
  pass("README registry");

  console.log("\nMaster Canon 0028 contract: ALL PASS");
}

run();
