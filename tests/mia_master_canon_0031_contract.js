"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const planning = require("../shared/mia-planning-core");
const goals = require("../shared/mia-goal-core");
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

function run() {
  const docPath = path.join(MASTER, "0031-planning-engine.md");
  const alignPath = path.join(MASTER, "0031-alignment.md");

  assert.ok(fs.existsSync(docPath), "0031-planning-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0031-alignment.md exists");
  pass("0031 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0031 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0031 critical priority");
  assert.ok(doc.includes("0030"), "0031 links to 0030");
  assert.ok(doc.includes("0032"), "0031 points to 0032");
  pass("0031 structure (23 sections)");

  assert.equal(planning.PE_COMPONENT_ORDER.length, 13);
  pass("planning components");

  const gms = goals.createGoalManagementSystem();
  const resolved = gms.resolve({
    gift: { tier: "T2", miaPoints: 120 },
    battleActive: true
  });

  const engine = planning.createPlanningEngine();
  const planned = engine.plan(resolved, { gift: { tier: "T2" } });

  assert.equal(planned.ok, true);
  assert.equal(planned.executes, false);
  assert.ok(planned.plan.forDecisionEngine);
  assert.ok(planned.plan.tasks.length >= 4);
  pass("GMS to planning pipeline");

  const battleResolved = gms.resolve({ battleActive: true });
  const battlePlan = engine.plan(battleResolved, { battleActive: true });
  assert.equal(battlePlan.plan.goalId, goals.GMS_GOAL_ID.COMPLETE_BATTLE);
  assert.equal(battlePlan.plan.tasks.length, 5);
  pass("battle plan generator");

  const decomposed = planning.decomposeTasks(
    { goalId: goals.GMS_GOAL_ID.GROW_COMMUNITY },
    { depth: 5 }
  );
  assert.equal(decomposed.tasks.length, 5);
  pass("task decomposer");

  const resources = planning.planResources(decomposed.tasks, { cpu: 0.9, timeMs: 60000 });
  assert.equal(resources.ok, true);
  pass("resource planner");

  const timeline = planning.buildTimeline({ planId: "p1" });
  assert.equal(timeline.timeline.length, 5);
  pass("timeline manager");

  const scenarios = planning.planScenarios({ goalId: "thank_gift" }, { obsDown: true });
  assert.equal(scenarios.selected.scenarioId, planning.PE_SCENARIO_ID.OBS_OUTAGE);
  pass("scenario planner");

  const predictions = planning.predictSituation({ systemLoad: 0.85, giftRate: 12 });
  assert.ok(predictions.predictions.length >= 2);
  assert.equal(predictions.readOnly, true);
  pass("prediction engine");

  const constraints = planning.solveConstraints(
    { planId: "p1", goalId: "g1", tasks: [{ action: "a" }] },
    { safety: true },
    { systemLoad: 0.5 }
  );
  assert.equal(constraints.ok, true);
  pass("constraint solver");

  const optimized = planning.optimizePlan([
    { variantId: "a", durationMs: 4000, quality: 0.9, resourceCost: 0.6 },
    { variantId: "b", durationMs: 2000, quality: 0.85, resourceCost: 0.4 }
  ]);
  assert.equal(optimized.selected.variantId, "b");
  pass("plan optimizer");

  const replanned = engine.replan(
    { planId: "p1", tasks: [{ action: "announce_result" }] },
    { battleEndedEarly: true }
  );
  assert.ok(replanned.tasks.length >= 2);
  pass("replanning engine");

  const validation = planning.validatePlan({
    planId: "p1",
    goalId: "g1",
    tasks: [{ action: "step" }],
    executes: false
  });
  assert.equal(validation.ok, true);
  pass("plan validator");

  const completed = engine.complete(
    { planId: "p1", goalId: goals.GMS_GOAL_ID.THANK_GIFT, createdAt: Date.now() },
    { success: true }
  );
  assert.equal(completed.learning.strategyAdjustment, "reinforce");
  pass("plan history and learning");

  const knowledge = planning.adaptKnowledgeContext({ entities: [{ id: "vasa" }] });
  assert.equal(knowledge.readOnly, true);
  pass("knowledge adapter read-only");

  const decisionEngine = decision.createDecisionEngine();
  const decided = decisionEngine.decide({
    sources: {
      event: {
        type: "gift",
        gift: { tier: "T2", miaPoints: 120 },
        userId: "vasa"
      }
    },
    goals: resolved.decisionCandidates,
    adapters: { memory: { working: true, shortTerm: true } }
  });
  assert.equal(decided.ok, true);
  assert.equal(decided.executes, false);
  assert.ok(planned.decisionHints.length >= 1);
  pass("planning hints for decision engine");

  const obsPlan = engine.plan(
    gms.resolve({ obsDown: true, systemLoad: 0.99 }),
    { obsDown: true, systemLoad: 0.99 }
  );
  assert.equal(obsPlan.ok, true);
  assert.equal(obsPlan.plan.horizon, planning.PE_PLAN_HORIZON.CRISIS);
  pass("crisis horizon plan");

  assert.equal(planning.assertPlanningForbiddenActivity("execute_actions").ok, false);
  assert.equal(planning.assertPlanningForbiddenActivity("mutate_goal_registry").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-planning-core/planningEngine.js"));
  pass("AI system next doc 0041");

  for (const rel of planning.PE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0031"), "README 0031");
  pass("README registry");

  console.log("\nMaster Canon 0031 contract: ALL PASS");
}

run();
