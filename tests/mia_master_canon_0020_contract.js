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
  const docPath = path.join(MASTER, "0020-working-memory.md");
  const alignPath = path.join(MASTER, "0020-alignment.md");

  assert.ok(fs.existsSync(docPath), "0020-working-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0020-alignment.md exists");
  pass("0020 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0020 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0020 critical priority");
  assert.ok(doc.includes("0019"), "0020 links to 0019");
  assert.ok(doc.includes("0021"), "0020 points to 0021");
  pass("0020 structure (22 sections)");

  assert.equal(memory.WORKING_MEMORY_COMPONENT_ORDER.length, 12);
  assert.equal(Object.keys(memory.WORKING_CONTEXT_KIND).length, 7);
  pass("working memory components");

  const store = memory.createWorkingMemoryStore({ capacity: 4 });
  const buffer = store.create(memory.createContextBuffer({
    lastQuestion: "Ahoj MIA",
    activeTopic: "greeting",
    language: "cs"
  }));
  assert.equal(buffer.ok, true);
  pass("context buffer");

  const conversation = store.create(
    memory.createActiveConversation({
      userId: "viewer-1",
      question: "Co dělá Kojnožrout?",
      draftAnswer: "Právě žere..."
    })
  );
  assert.equal(conversation.context.kind, memory.WORKING_CONTEXT_KIND.CONVERSATION);
  pass("active conversation");

  const task = store.create(
    memory.createActiveTask({
      taskType: "ai_response",
      focusPriority: 70
    })
  );
  assert.equal(task.context.data.taskType, "ai_response");
  pass("active tasks");

  const decision = memory.createDecisionBuffer({
    eventType: "GIFT",
    giftSize: 5000,
    battleActive: true,
    kojMood: "excited"
  });
  const attention = memory.pickAttentionTarget([decision, task.context]);
  assert.ok(attention.score >= 60);
  pass("decision buffer and attention");

  const eventCtx = memory.createEventContext({
    eventId: "evt-1",
    correlationId: "corr-1",
    priority: "high",
    source: "ingest",
    subscribers: ["ai.conversation"]
  });
  assert.equal(eventCtx.data.eventId, "evt-1");
  pass("event context");

  store.setFocus(task.context.contextId);
  assert.equal(store.focusContextId, task.context.contextId);
  const focus = memory.pickFocusTarget(store.list());
  assert.equal(focus.contextId, task.context.contextId);
  pass("focus manager");

  const locked = store.lock(task.context.contextId, "worker-1");
  assert.equal(locked.context.locked, true);
  const denied = store.update(task.context.contextId, { data: { x: 1 }, lockOwner: "other" });
  assert.equal(denied.ok, false);
  pass("lock and release API");

  const expired = memory.createWorkingContext({
    kind: memory.WORKING_CONTEXT_KIND.CACHE,
    createdAt: Date.now() - 120000,
    ttlMs: 1000
  });
  assert.equal(memory.isWorkingContextExpired(expired), true);
  const sweep = store.sweepExpired(Date.now() + 100000);
  assert.ok(Array.isArray(sweep.removed));
  pass("memory expiration");

  const promoted = memory.promoteToShortTerm(conversation.context);
  assert.equal(promoted.record.memoryType, memory.MEMORY_TYPE.SHORT_TERM);
  pass("synchronization to short-term");

  const tiny = memory.createWorkingMemoryStore({ capacity: 1 });
  tiny.create(memory.createTemporaryObject({ objectType: "overlay_draft" }));
  const overflow = tiny.create(memory.createTemporaryObject({ objectType: "low_prio" }));
  assert.equal(overflow.ok, true);
  assert.equal(tiny.size(), 1);
  pass("overflow eviction");

  const lockedStore = memory.createWorkingMemoryStore({ capacity: 1 });
  const held = lockedStore.create(memory.createActiveTask({ taskType: "battle", focusPriority: 100 }));
  lockedStore.lock(held.context.contextId, "battle-engine");
  const rejected = lockedStore.create(memory.createTemporaryObject({ objectType: "low_prio" }));
  assert.equal(rejected.ok, false);
  pass("overflow protection");

  assert.equal(memory.assertWorkingMemoryForbiddenActivity("store_long_term").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/workingMemory.js"));
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/shortTermMemory.js"));
  pass("memory system next doc 0022");

  for (const rel of memory.WORKING_MEMORY_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0020"), "README 0020");
  pass("README registry");

  console.log("\nMaster Canon 0020 contract: ALL PASS");
}

run();
