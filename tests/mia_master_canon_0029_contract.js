"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const orchestrator = require("../shared/mia-action-core");
const decision = require("../shared/mia-decision-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function mockHandlers(overrides = {}) {
  const base = {
    [orchestrator.AO_MODULE.OVERLAY]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.VIDEO_ENGINE]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.SPEECH]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.MEMORY]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.ANALYTICS]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.KOJNOZROUT]: async () => ({ ok: true }),
    [orchestrator.AO_MODULE.NOOP]: async () => ({ ok: true })
  };
  return { ...base, ...overrides };
}

async function run() {
  const docPath = path.join(MASTER, "0029-action-orchestrator.md");
  const alignPath = path.join(MASTER, "0029-alignment.md");

  assert.ok(fs.existsSync(docPath), "0029-action-orchestrator.md exists");
  assert.ok(fs.existsSync(alignPath), "0029-alignment.md exists");
  pass("0029 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0029 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0029 critical priority");
  assert.ok(doc.includes("0028"), "0029 links to 0028");
  assert.ok(doc.includes("0030"), "0029 points to 0030");
  pass("0029 structure (23 sections)");

  assert.equal(orchestrator.AO_COMPONENT_ORDER.length, 13);
  pass("orchestrator components");

  assert.equal(orchestrator.AO_DEFAULT_TIMEOUT_MS.overlay, 200);
  assert.equal(orchestrator.AO_DEFAULT_TIMEOUT_MS.video_engine, 2000);
  assert.equal(orchestrator.AO_DEFAULT_TIMEOUT_MS.speech, 10000);
  assert.equal(orchestrator.AO_DEFAULT_TIMEOUT_MS.ai, 30000);
  assert.equal(orchestrator.AO_DEFAULT_TIMEOUT_MS.obs, 5000);
  pass("default timeouts");

  const engine = decision.createDecisionEngine();
  const decided = engine.decide({
    sources: {
      event: {
        type: "gift",
        gift: { tier: "T2", miaPoints: 120, donorId: "vasa" },
        userId: "vasa"
      }
    },
    adapters: { memory: { working: true, shortTerm: true } }
  });

  assert.equal(decided.ok, true);
  assert.equal(decided.executes, false);
  assert.ok(decided.actionPlan.orchestratorOnly);

  const ao = orchestrator.createActionOrchestrator();
  const runResult = await ao.orchestrate(decided.actionPlan, mockHandlers());

  assert.equal(runResult.ok, true);
  assert.equal(runResult.decides, false);
  assert.equal(runResult.completion.planState, orchestrator.AO_ACTION_STATE.COMPLETED);
  assert.ok(runResult.feedback.forDecisionEngine);
  assert.ok(runResult.metrics.actionCount >= 4);
  pass("decision plan orchestration");

  const learned = engine.learn(decided.actionPlan, {
    success: runResult.feedback.success,
    notes: "orchestrator_feedback"
  });
  assert.equal(learned.success, true);
  pass("feedback to decision engine");

  const queued = orchestrator.enqueueActionPlan(decided.actionPlan);
  assert.ok(queued.actions.length >= 4);
  assert.equal(queued.actions[0].state, orchestrator.AO_ACTION_STATE.WAITING);
  pass("action queue");

  const scheduled = orchestrator.scheduleActions(queued);
  assert.equal(scheduled.scheduled.length, queued.actions.length);
  pass("scheduler");

  const deps = orchestrator.resolveDependencies(scheduled);
  assert.equal(deps.ok, true);
  assert.ok(deps.waves.length >= 1);
  pass("dependency manager");

  const sync = orchestrator.synchronizeBarrier(orchestrator.AO_SYNC_GROUP.PRESENTATION, [
    { syncGroup: orchestrator.AO_SYNC_GROUP.PRESENTATION, state: orchestrator.AO_ACTION_STATE.COMPLETED },
    { syncGroup: orchestrator.AO_SYNC_GROUP.PRESENTATION, state: orchestrator.AO_ACTION_STATE.COMPLETED }
  ]);
  assert.equal(sync.synchronized, true);
  pass("synchronization manager");

  const retry = orchestrator.retryAction({ actionId: "a1", attempts: 0, maxRetries: 2 });
  assert.equal(retry.retry, true);
  pass("retry manager");

  const rollback = orchestrator.rollbackActions(
    [
      { actionId: "overlay-1", kind: "overlay", module: "overlay", rollbackable: true },
      { actionId: "video-1", kind: "play_video", module: "video_engine", rollbackable: false }
    ],
    { actionId: "video-1" }
  );
  assert.equal(rollback.count, 1);
  pass("rollback manager");

  const failPlan = decision.generateActionPlan({
    planId: "fail-plan",
    steps: [
      { stepId: "s1", kind: "overlay", action: "show_gift_overlay", execute: false },
      { stepId: "s2", kind: "play_video", action: "play_tier_video", execute: false }
    ],
    validated: true
  });

  const failRun = await ao.orchestrate(
    failPlan,
    mockHandlers({
      [orchestrator.AO_MODULE.VIDEO_ENGINE]: async () => {
        throw new Error("video_failed");
      }
    }),
    { maxRetries: 0 }
  );

  assert.equal(failRun.ok, false);
  assert.ok(failRun.rollbackCount >= 1);
  pass("failure rollback path");

  assert.equal(orchestrator.assertOrchestratorForbiddenActivity("create_own_decisions").ok, false);
  assert.equal(orchestrator.assertOrchestratorForbiddenActivity("mutate_action_plan").ok, false);
  pass("forbidden activities");

  const invalid = await ao.orchestrate({ planId: "x", steps: [] });
  assert.equal(invalid.ok, false);
  pass("invalid plan rejected");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-action-core/actionOrchestrator.js"));
  pass("AI system next doc 0041");

  for (const rel of orchestrator.AO_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0029"), "README 0029");
  pass("README registry");

  console.log("\nMaster Canon 0029 contract: ALL PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
