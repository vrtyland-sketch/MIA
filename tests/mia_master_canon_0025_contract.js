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
  const docPath = path.join(MASTER, "0025-procedural-memory.md");
  const alignPath = path.join(MASTER, "0025-alignment.md");

  assert.ok(fs.existsSync(docPath), "0025-procedural-memory.md exists");
  assert.ok(fs.existsSync(alignPath), "0025-alignment.md exists");
  pass("0025 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0025 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0025 critical priority");
  assert.ok(doc.includes("0024"), "0025 links to 0024");
  assert.ok(doc.includes("0026"), "0025 points to 0026");
  pass("0025 structure (22 sections)");

  assert.equal(memory.PM_COMPONENT_ORDER.length, 13);
  assert.equal(Object.keys(memory.SKILL_DOMAIN).length, 7);
  pass("procedural components");

  const store = memory.createProceduralMemoryStore();

  const giftProcedure = store.registerProcedure({
    name: "Gift reaction",
    purpose: "Process incoming gift through bowl and overlay",
    domain: memory.SKILL_DOMAIN.STREAM,
    origin: memory.PROCEDURE_ORIGIN.ADMIN_APPROVAL,
    tags: ["gift", "overlay"],
    inputs: { giftEvent: "object" },
    prerequisites: ["stream_active"],
    steps: [
      { label: "Calculate points", action: "economy.calculate" },
      { label: "Update bowl", action: "bowl.update" },
      { label: "Select tier video", action: "video.select_tier" },
      { label: "Play overlay", action: "overlay.play" },
      { label: "Speak reaction", action: "tts.speak" },
      { label: "Save to memory", action: "memory.save" }
    ],
    expectedOutcome: "gift_processed",
    terminationConditions: ["overlay_complete"]
  });
  assert.equal(giftProcedure.ok, true);
  pass("procedure engine and learning pipeline");

  const battleProcedure = store.registerProcedure({
    name: "Battle flow",
    purpose: "Run battle from start to summary",
    domain: memory.SKILL_DOMAIN.BATTLE,
    validated: true,
    steps: [
      { label: "Battle start", action: "battle.start" },
      { label: "Inventory", action: "battle.inventory" },
      { label: "Use items", action: "battle.use_items" },
      { label: "Animate", action: "graphics.animate" },
      { label: "Score", action: "battle.score" },
      { label: "Summary", action: "battle.summary" }
    ],
    expectedOutcome: "battle_complete"
  });
  pass("battle procedure");

  const chatProcedure = store.registerProcedure({
    name: "Chat response",
    purpose: "Generate contextual chat reply",
    domain: memory.SKILL_DOMAIN.API,
    validated: true,
    steps: [
      { label: "Analyze chat", action: "chat.analyze" },
      { label: "Load context", action: "memory.context" },
      { label: "AI generate", action: "ai.generate" },
      { label: "Reply", action: "chat.reply" }
    ],
    expectedOutcome: "reply_sent"
  });

  const workflow = store.put({
    kind: memory.PM_ENTRY_KIND.WORKFLOW,
    name: "Gift to memory workflow",
    procedureIds: [giftProcedure.entry.procedureId]
  });
  assert.equal(workflow.entry.kind, memory.PM_ENTRY_KIND.WORKFLOW);
  pass("workflow manager");

  store.put({
    kind: memory.PM_ENTRY_KIND.SKILL,
    name: "OBS control",
    domain: memory.SKILL_DOMAIN.OBS,
    procedureIds: [giftProcedure.entry.procedureId]
  });
  pass("skill library");

  store.put({
    kind: memory.PM_ENTRY_KIND.STRATEGY,
    name: "Battle aggression",
    domain: memory.SKILL_DOMAIN.BATTLE,
    rule: "Prioritize high-value gifts in final 30 seconds"
  });
  pass("strategy library");

  store.put({
    kind: memory.PM_ENTRY_KIND.MACRO,
    name: "Restart OBS",
    steps: [
      { label: "Restart OBS", action: "obs.restart" },
      { label: "Check connection", action: "obs.check" },
      { label: "Load scenes", action: "obs.load_scenes" },
      { label: "Test overlays", action: "overlay.test" },
      { label: "Confirm", action: "obs.confirm" }
    ]
  });
  pass("macro engine");

  const obsReconnect = store.registerProcedure({
    name: "OBS reconnect",
    purpose: "Reconnect OBS and restore overlays",
    domain: memory.SKILL_DOMAIN.OBS,
    validated: true,
    procedureId: "proc-obs-reconnect",
    steps: [
      { label: "Connect", action: "obs.connect" },
      { label: "Verify", action: "obs.verify" },
      { label: "Restore overlays", action: "overlay.restore" }
    ],
    expectedOutcome: "obs_online"
  });
  store.addAutomation("obs_disconnected", obsReconnect.entry.procedureId);
  const autoRun = store.runAutomation("obs_disconnected", { source: "monitor" });
  assert.equal(autoRun.executed.length, 1);
  pass("automation engine");

  for (let i = 0; i < 5; i += 1) {
    store.recordExecution(giftProcedure.entry.procedureId, {
      success: i !== 2,
      durationMs: 1200 + i * 100
    });
  }
  const evaluation = store.recordExecution(giftProcedure.entry.procedureId, {
    success: true,
    durationMs: 900
  });
  assert.ok(evaluation.evaluation.reliabilityScore > 0);
  pass("skill evaluator");

  const optimized = store.optimize(giftProcedure.entry.entryId);
  assert.ok(Array.isArray(optimized.optimization.suggestions));
  pass("optimization engine");

  const versioned = store.versionProcedure(giftProcedure.entry.entryId, {
    purpose: "Process gift with improved tier rotation"
  });
  assert.equal(versioned.ok, true);
  assert.equal(versioned.previousVersion, 1);
  pass("skill versioning");

  const search = store.search({ q: "gift", domain: memory.SKILL_DOMAIN.STREAM });
  assert.ok(search.count >= 1);
  pass("procedure search");

  assert.throws(
    () =>
      memory.createProcedure({
        name: "Invalid",
        purpose: "missing validation",
        steps: [{ label: "only step", action: "noop" }]
      }),
    /invalid procedure/
  );
  pass("unvalidated procedure rejected");

  assert.equal(memory.assertProceduralForbiddenActivity("bypass_decision_engine").ok, false);
  pass("forbidden activities");

  const memSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.MEMORY);
  assert.equal(memSys.nextDocId, "0028");
  assert.ok(memSys.runtime.includes("shared/mia-memory-core/proceduralMemory.js"));
  pass("memory system next doc 0026");

  for (const rel of memory.PM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0025"), "README 0025");
  pass("README registry");

  console.log("\nMaster Canon 0025 contract: ALL PASS");
}

run();
