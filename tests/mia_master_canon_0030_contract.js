"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
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
  const docPath = path.join(MASTER, "0030-goal-management-system.md");
  const alignPath = path.join(MASTER, "0030-alignment.md");

  assert.ok(fs.existsSync(docPath), "0030-goal-management-system.md exists");
  assert.ok(fs.existsSync(alignPath), "0030-alignment.md exists");
  pass("0030 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0030 section ${i}`);
  }
  assert.ok(doc.includes("Core AI"), "0030 critical priority");
  assert.ok(doc.includes("0028"), "0030 links to 0028");
  assert.ok(doc.includes("0031"), "0030 points to 0031");
  pass("0030 structure (23 sections)");

  assert.equal(goals.GMS_COMPONENT_ORDER.length, 12);
  pass("goal components");

  const gms = goals.createGoalManagementSystem();
  const registered = gms.register({
    goalId: goals.GMS_GOAL_ID.GROW_COMMUNITY,
    name: "Grow Community",
    type: goals.GMS_GOAL_TYPE.PERSISTENT,
    priority: 40
  });
  assert.equal(registered.ok, true);
  assert.equal(gms.registry().length, 1);
  pass("goal registry");

  const giftResolved = gms.resolve({
    gift: { tier: "T2", miaPoints: 120 },
    battleActive: true,
    chatMessage: "Ahoj!"
  });

  assert.equal(giftResolved.ok, true);
  assert.equal(giftResolved.executes, false);
  assert.ok(giftResolved.topGoal);
  assert.ok(giftResolved.goals.length >= 4);
  pass("reactive goals from context");

  const emergency = gms.resolve({ obsDown: true, systemLoad: 0.99 });
  assert.equal(emergency.topGoal.goalId, goals.GMS_GOAL_ID.OBS_RECOVERY);
  assert.equal(emergency.topGoal.type, goals.GMS_GOAL_TYPE.EMERGENCY);
  pass("emergency goal priority");

  const battlePlan = goals.planGoal(
    { goalId: goals.GMS_GOAL_ID.COMPLETE_BATTLE, name: "Complete Battle" },
    []
  );
  assert.equal(battlePlan.steps.length, 4);
  pass("goal planner");

  const prioritized = goals.prioritizeGoals(
    [
      { goalId: goals.GMS_GOAL_ID.RESPOND_CHAT, priority: 70, type: goals.GMS_GOAL_TYPE.REACTIVE },
      { goalId: goals.GMS_GOAL_ID.COMPLETE_BATTLE, priority: 85, type: goals.GMS_GOAL_TYPE.REACTIVE }
    ],
    { battleActive: true }
  );
  assert.equal(prioritized.topGoal.goalId, goals.GMS_GOAL_ID.COMPLETE_BATTLE);
  pass("goal prioritizer");

  const scheduled = goals.scheduleGoal(
    { goalId: goals.GMS_GOAL_ID.GROW_COMMUNITY, type: goals.GMS_GOAL_TYPE.PERSISTENT },
    { battleActive: true }
  );
  assert.equal(scheduled.schedule, goals.GMS_SCHEDULE.AFTER_BATTLE);
  pass("goal scheduler");

  const deps = goals.resolveGoalDependencies([
    { goalId: "battle", dependencies: [] },
    { goalId: "winner", dependencies: ["battle"] },
    { goalId: "stats", dependencies: ["winner"] }
  ]);
  assert.equal(deps.ok, true);
  assert.equal(deps.waves.length, 3);
  pass("goal dependencies");

  const conflicts = goals.resolveGoalConflicts(
    [
      { goalId: goals.GMS_GOAL_ID.COMPLETE_BATTLE, priority: 85, type: goals.GMS_GOAL_TYPE.REACTIVE },
      { goalId: goals.GMS_GOAL_ID.RESPOND_CHAT, priority: 70, type: goals.GMS_GOAL_TYPE.REACTIVE }
    ],
    { battleActive: true, chatMessage: "help" }
  );
  assert.equal(conflicts.winner.goalId, goals.GMS_GOAL_ID.COMPLETE_BATTLE);
  assert.ok(conflicts.deferred.some((d) => d.goalId === goals.GMS_GOAL_ID.RESPOND_CHAT));
  pass("goal conflict resolver");

  const created = goals.transitionGoalLifecycle(
    { goalId: "g1", state: goals.GMS_GOAL_STATE.CREATED },
    goals.GMS_GOAL_STATE.PLANNED
  );
  assert.equal(created.ok, true);
  const active = goals.transitionGoalLifecycle(created.goal, goals.GMS_GOAL_STATE.ACTIVE);
  const completed = goals.transitionGoalLifecycle(active.goal, goals.GMS_GOAL_STATE.COMPLETED);
  const archived = goals.transitionGoalLifecycle(completed.goal, goals.GMS_GOAL_STATE.ARCHIVED);
  assert.equal(archived.ok, true);
  pass("goal lifecycle");

  const stale = goals.enforceActiveGoalLimit({
    goalId: "stale",
    state: goals.GMS_GOAL_STATE.ACTIVE,
    activatedAt: Date.now() - goals.MAX_ACTIVE_MS - 1000
  });
  assert.equal(stale.goal.state, goals.GMS_GOAL_STATE.WAITING);
  pass("active goal time limit");

  const completedRun = gms.complete(
    { goalId: goals.GMS_GOAL_ID.THANK_GIFT, name: "Thank Gift", type: goals.GMS_GOAL_TYPE.REACTIVE },
    { success: true, durationMs: 1200, stepCount: 2 }
  );
  assert.equal(completedRun.metrics.success, true);
  assert.ok(completedRun.history.historyId);
  assert.equal(completedRun.learning.planningAdjustment, "reinforce");
  pass("metrics history learning");

  const memory = goals.adaptMemoryContext({
    working: true,
    shortTerm: true,
    episodic: true,
    emotional: true
  });
  assert.equal(memory.readOnly, true);
  pass("memory adapter read-only");

  const engine = decision.createDecisionEngine();
  const decided = engine.decide({
    sources: {
      event: {
        type: "gift",
        gift: { tier: "T2", miaPoints: 120 },
        userId: "vasa"
      }
    },
    goals: giftResolved.decisionCandidates,
    adapters: { memory: { working: true, shortTerm: true } }
  });
  assert.equal(decided.ok, true);
  assert.equal(decided.executes, false);
  assert.ok(decided.actionPlan.orchestratorOnly);
  pass("decision engine uses GMS candidates");

  assert.equal(goals.assertGoalForbiddenActivity("execute_actions").ok, false);
  assert.equal(goals.assertGoalForbiddenActivity("bypass_decision_engine").ok, false);
  pass("forbidden activities");

  const aiSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.AI);
  assert.equal(aiSys.nextDocId, "0088");
  assert.ok(aiSys.runtime.includes("shared/mia-goal-core/goalManagementSystem.js"));
  pass("AI system next doc 0041");

  for (const rel of goals.GMS_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0030"), "README 0030");
  pass("README registry");

  console.log("\nMaster Canon 0030 contract: ALL PASS");
}

run();
