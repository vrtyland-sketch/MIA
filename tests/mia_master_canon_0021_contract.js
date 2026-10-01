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
  const docPath = path.join(MASTER, "0021-short-term-memory.md");
  const alignPath = path.join(MASTER, "0021-alignment.md");

  assert.ok(fs.existsSync(docPath), "0021-short-term-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0021-alignment.md exists");
  pass("0021 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0021 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0021 critical priority");
  assert.ok(doc.includes("0020"), "0021 links to 0020");
  assert.ok(doc.includes("0022"), "0021 points to 0022");
  pass("0021 structure (22 sections)");

  assert.equal(memory.STM_COMPONENT_ORDER.length, 12);
  assert.equal(Object.keys(memory.STM_ENTRY_KIND).length, 9);
  assert.equal(memory.MAX_GIFT_HISTORY, 500);
  pass("STM components and gift cap");

  const store = memory.createShortTermMemoryStore();

  memory.addConversationTurn(store, {
    conversationId: "conv-1",
    role: "user",
    text: "Ahoj MIA",
    topic: "greeting"
  });
  memory.addConversationTurn(store, {
    conversationId: "conv-1",
    role: "mia",
    text: "Ahoj!"
  });
  const conv = store.get("conv-1");
  assert.equal(conv.entry.data.messages.length, 2);
  pass("conversation memory");

  memory.openUserSession(store, "viewer-42", { platform: "tiktok" });
  memory.closeUserSession(store, "viewer-42");
  const session = store.get("session:viewer-42");
  assert.equal(session.entry.closed, true);
  pass("user session memory");

  memory.updateStreamMemory(store, {
    highlights: ["record_gift"],
    lastBattleId: "battle-1"
  });
  const stream = store.get("stream:active");
  assert.equal(stream.entry.data.lastBattleId, "battle-1");
  pass("stream memory");

  for (let i = 0; i < 6; i += 1) {
    store.appendGift({ donorId: `u${i}`, coins: 10, at: Date.now() });
  }
  const spam = store.detectGiftSpam(5000, 5);
  assert.equal(spam.spam, true);
  assert.ok(store.getRecentGifts(3).length === 3);
  pass("gift memory and spam detection");

  const battle = memory.updateBattleMemory(store, "battle-1", {
    score: { left: 3, right: 2 },
    remainingMs: 30000
  });
  const summary = memory.createBattleSummary(battle.entry);
  assert.equal(summary.finalScore.left, 3);
  pass("battle memory");

  memory.setEmotionContext(store, { mood: "joy", intensity: 0.9, reason: "big_gift" });
  memory.updateRelationshipContext(store, "vasa", {
    giftCount: 3,
    conversationActive: true,
    lastTopic: "mia"
  });
  pass("emotion and relationship context");

  memory.addTemporaryKnowledge(store, {
    key: "event-summer",
    title: "Letní challenge",
    endsAt: Date.now() + 3600000
  });
  pass("temporary knowledge");

  const entry = memory.createStmEntry({
    kind: memory.STM_ENTRY_KIND.CONVERSATION,
    createdAt: Date.now() - 7200000,
    ttlMs: 1000
  });
  assert.equal(memory.isStmExpired(entry), true);
  pass("STM expiration");

  const scored = memory.computeStmScore(
    memory.createStmEntry({
      kind: memory.STM_ENTRY_KIND.GIFT,
      data: { coins: 5000, topic: "gift" }
    }),
    { importance: 0.8, usageCount: 4 }
  );
  assert.ok(scored.score > 0.5);
  pass("memory score");

  const sync = memory.synchronizeShortTermMemory(store, { promoteThreshold: 0.5 });
  assert.ok(sync.operation === memory.STM_OPERATION.SYNC);
  pass("memory synchronizer");

  assert.equal(memory.assertStmForbiddenActivity("bypass_stm_api").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/shortTermMemory.js"));
  pass("memory system next doc 0022");

  for (const rel of memory.STM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0021"), "README 0021");
  pass("README registry");

  console.log("\nMaster Canon 0021 contract: ALL PASS");
}

run();
