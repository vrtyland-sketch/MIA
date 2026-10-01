"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const wfe = require("../shared/mia-workflow-core");
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
  const docPath = path.join(MASTER, "0082-workflow-engine.md");
  const alignPath = path.join(MASTER, "0082-alignment.md");

  assert.ok(fs.existsSync(docPath), "0082-workflow-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0082-alignment.md exists");
  pass("0082 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0082 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0082 kernel layer");
  assert.ok(doc.includes("0083"), "0082 points to 0083");
  assert.ok(/Rule Engine/i.test(doc), "0082 → Rule Engine");
  assert.ok(doc.includes("0084"), "0082 points to 0084");
  assert.ok(/Policy Engine/i.test(doc), "0082 → Policy Engine");
  assert.ok(doc.includes("0085"), "0082 points to 0085");
  assert.ok(/Telemetry Manager/i.test(doc), "0082 → Telemetry Manager");
  pass("21 sections → 0083 Rule / 0084 Policy / 0085 Telemetry Manager");

  assert.equal(wfe.WFE_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...wfe.WFE_COMPONENT_ORDER],
    [
      "workflow_engine",
      "intake_gate",
      "descriptor_factory",
      "type_registry",
      "step_executor",
      "decision_engine",
      "parallel_coordinator",
      "loop_controller",
      "error_handler",
      "timeout_controller",
      "security_gate",
      "workflow_audit"
    ]
  );
  pass("12 components");

  assert.equal(wfe.WFE_FLAGS.soleWorkflowAuthority, true);
  assert.equal(wfe.WFE_FLAGS.executesCommandsDirectly, false);
  assert.equal(wfe.WFE_FLAGS.commandsViaCommandBusOnly, true);
  assert.equal(wfe.WFE_FLAGS.executesProceduresNotSagas, true);
  assert.equal(wfe.soleWorkflowAuthority, true);
  assert.equal(wfe.executesCommandsDirectly, false);
  assert.equal(wfe.commandsViaCommandBusOnly, true);
  pass("flags");

  assert.deepEqual(
    [...wfe.WFE_DESCRIPTOR_FIELDS],
    [
      "workflowId",
      "workflowType",
      "version",
      "currentStep",
      "status",
      "started",
      "updated",
      "owner"
    ]
  );

  const d1 = wfe.createWorkflowDescriptor({ workflowType: "stream_boot" });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.workflowId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of wfe.WFE_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = wfe.createWorkflowDescriptor({ workflowType: "stream_boot" });
  assert.notEqual(d1.descriptor.workflowId, d2.descriptor.workflowId);
  pass("descriptor 8 fields");

  assert.equal(wfe.WFE_STATUS.CREATED, "created");
  assert.equal(wfe.WFE_STATUS.RUNNING, "running");
  assert.equal(wfe.WFE_STATUS.WAITING, "waiting");
  assert.equal(wfe.WFE_STATUS.PAUSED, "paused");
  assert.equal(wfe.WFE_STATUS.COMPLETED, "completed");
  assert.equal(wfe.validateStatusTransition("created", "running").ok, true);
  assert.equal(wfe.validateStatusTransition("running", "paused").ok, true);
  assert.equal(wfe.validateStatusTransition("paused", "running").ok, true);
  assert.equal(wfe.validateStatusTransition("running", "waiting").ok, true);
  assert.equal(wfe.validateStatusTransition("waiting", "running").ok, true);
  assert.equal(wfe.validateStatusTransition("created", "completed").ok, false);
  pass("status FSM");

  wfe.clearWorkflowSingletonForTest();

  const sentCommands = [];
  const commandBusBridge = {
    send(cmd) {
      sentCommands.push(cmd);
      assert.equal(cmd.sender, "workflow_engine");
      return { ok: true, commandType: cmd.commandType };
    }
  };

  const eng = wfe.createWorkflowEngine({ commandBusBridge });
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  assert.equal(eng.status().soleWorkflowAuthority, true);

  const duplicate = wfe.createWorkflowEngine({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "workflow_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };

  // linear steps
  const reg = eng.registerWorkflowType(
    "linear_flow",
    {
      nodes: [
        { id: "init", type: "step", commandType: "Initialize", next: "load" },
        { id: "load", type: "step", commandType: "LoadData", next: "finish" },
        { id: "finish", type: "step", commandType: "Finish" }
      ]
    },
    auth
  );
  assert.equal(reg.ok, true);
  assert.equal(reg.nodeCount, 3);
  pass("register workflow with steps");

  sentCommands.length = 0;
  const started = eng.startWorkflow(
    {
      workflowType: "linear_flow",
      owner: "operator",
      payload: { source: "tikfinity" }
    },
    auth
  );
  assert.equal(started.ok, true);
  assert.equal(started.status, wfe.WFE_STATUS.COMPLETED);
  assert.equal(sentCommands.length, 3);
  assert.equal(sentCommands[0].commandType, "Initialize");
  assert.equal(sentCommands[1].commandType, "LoadData");
  assert.equal(sentCommands[2].commandType, "Finish");
  assert.equal(sentCommands[0].sender, "workflow_engine");
  pass("linear steps via command bus only");

  // decision
  eng.registerWorkflowType(
    "tier_flow",
    {
      nodes: [
        {
          id: "decide",
          type: "decision",
          when: ({ payload }) => Number(payload.coins) > 100,
          then: "tier2",
          else: "tier1"
        },
        { id: "tier1", type: "step", commandType: "PlayTier1" },
        { id: "tier2", type: "step", commandType: "PlayTier2" }
      ]
    },
    auth
  );
  sentCommands.length = 0;
  const low = eng.startWorkflow(
    { workflowType: "tier_flow", payload: { coins: 50 }, owner: "gift" },
    auth
  );
  assert.equal(low.ok, true);
  assert.ok(sentCommands.some((c) => c.commandType === "PlayTier1"));
  assert.ok(!sentCommands.some((c) => c.commandType === "PlayTier2"));

  sentCommands.length = 0;
  const high = eng.startWorkflow(
    { workflowType: "tier_flow", payload: { coins: 150 }, owner: "gift" },
    auth
  );
  assert.equal(high.ok, true);
  assert.ok(sentCommands.some((c) => c.commandType === "PlayTier2"));
  pass("decision branching");

  // parallel + wait all sync
  eng.registerWorkflowType(
    "parallel_flow",
    {
      nodes: [
        {
          id: "fanout",
          type: "parallel",
          branches: ["ai", "overlay", "obs"],
          join: "continue"
        },
        { id: "ai", type: "step", commandType: "RunAI" },
        { id: "overlay", type: "step", commandType: "BuildOverlay" },
        { id: "obs", type: "step", commandType: "SyncOBS" },
        { id: "continue", type: "step", commandType: "Continue" }
      ]
    },
    auth
  );
  sentCommands.length = 0;
  const par = eng.startWorkflow(
    { workflowType: "parallel_flow", owner: "stream" },
    auth
  );
  assert.equal(par.ok, true);
  assert.equal(par.status, wfe.WFE_STATUS.WAITING);
  assert.ok(sentCommands.some((c) => c.commandType === "RunAI"));
  assert.ok(sentCommands.some((c) => c.commandType === "BuildOverlay"));
  assert.ok(sentCommands.some((c) => c.commandType === "SyncOBS"));
  assert.ok(!sentCommands.some((c) => c.commandType === "Continue"));

  assert.equal(eng.completeBranch(par.workflowId, "ai", auth).waiting, true);
  assert.equal(eng.completeBranch(par.workflowId, "overlay", auth).waiting, true);
  sentCommands.length = 0;
  const synced = eng.completeBranch(par.workflowId, "obs", auth);
  assert.equal(synced.synced, true);
  assert.equal(synced.status, wfe.WFE_STATUS.COMPLETED);
  assert.ok(sentCommands.some((c) => c.commandType === "Continue"));
  pass("parallel + wait-all synchronization");

  // loop
  eng.registerWorkflowType(
    "loop_flow",
    {
      nodes: [
        {
          id: "check",
          type: "loop",
          body: "process",
          exitTo: "done",
          continueWhen: ({ payload, loopCount }) => {
            return (payload.remaining || 0) - loopCount > 0;
          },
          maxIterations: 10
        },
        {
          id: "process",
          type: "step",
          commandType: "ProcessItem",
          next: "check"
        },
        { id: "done", type: "step", commandType: "Done" }
      ]
    },
    auth
  );
  sentCommands.length = 0;
  const looped = eng.startWorkflow(
    { workflowType: "loop_flow", payload: { remaining: 3 }, owner: "queue" },
    auth
  );
  assert.equal(looped.ok, true);
  assert.equal(looped.status, wfe.WFE_STATUS.COMPLETED);
  const processCount = sentCommands.filter((c) => c.commandType === "ProcessItem")
    .length;
  assert.equal(processCount, 3);
  assert.ok(sentCommands.some((c) => c.commandType === "Done"));
  pass("loop with exit condition");

  // error handling: retry then alternative
  wfe.clearWorkflowSingletonForTest();
  let failCount = 0;
  const failBridge = {
    send(cmd) {
      sentCommands.push(cmd);
      if (cmd.commandType === "Flaky" && failCount < 1) {
        failCount += 1;
        return { ok: false, error: "transient" };
      }
      if (cmd.commandType === "PrimaryFail") {
        return { ok: false, error: "hard_fail" };
      }
      return { ok: true };
    }
  };
  sentCommands.length = 0;
  const eng2 = wfe.createWorkflowEngine({ commandBusBridge: failBridge });
  eng2.registerWorkflowType(
    "retry_flow",
    {
      nodes: [
        {
          id: "flaky",
          type: "step",
          commandType: "Flaky",
          next: "ok",
          onError: { strategy: "retry", maxRetries: 2 }
        },
        { id: "ok", type: "step", commandType: "Ok" }
      ]
    },
    auth
  );
  const retried = eng2.startWorkflow({ workflowType: "retry_flow" }, auth);
  assert.equal(retried.ok, true);
  assert.equal(retried.status, wfe.WFE_STATUS.COMPLETED);
  assert.ok(
    sentCommands.filter((c) => c.commandType === "Flaky").length >= 2
  );

  eng2.registerWorkflowType(
    "alt_flow",
    {
      nodes: [
        {
          id: "primary",
          type: "step",
          commandType: "PrimaryFail",
          onError: { strategy: "alternative", alternative: "fallback" }
        },
        { id: "fallback", type: "step", commandType: "Fallback" }
      ]
    },
    auth
  );
  sentCommands.length = 0;
  const alt = eng2.startWorkflow({ workflowType: "alt_flow" }, auth);
  assert.equal(alt.ok, true);
  assert.equal(alt.status, wfe.WFE_STATUS.COMPLETED);
  assert.ok(sentCommands.some((c) => c.commandType === "Fallback"));
  pass("error handling retry + alternative");

  // timeout → cancel
  wfe.clearWorkflowSingletonForTest();
  sentCommands.length = 0;
  const eng3 = wfe.createWorkflowEngine({ commandBusBridge });
  eng3.registerWorkflowType(
    "timeout_flow",
    {
      timeoutMs: 100,
      nodes: [
        {
          id: "fanout",
          type: "parallel",
          branches: ["a", "b"],
          join: "done",
          timeoutMs: 100
        },
        { id: "a", type: "step", commandType: "A" },
        { id: "b", type: "step", commandType: "B" },
        { id: "done", type: "step", commandType: "Done" }
      ]
    },
    auth
  );
  const tStart = eng3.startWorkflow(
    { workflowType: "timeout_flow" },
    { ...auth, nowMs: 1000 }
  );
  assert.equal(tStart.status, wfe.WFE_STATUS.WAITING);
  const timed = eng3.tickTimeouts(1200, auth);
  assert.equal(timed.timedOut.length, 1);
  const afterTo = eng3.getWorkflow(tStart.workflowId);
  assert.equal(afterTo.workflow.status, wfe.WFE_STATUS.CANCELLED);
  pass("timeout → cancel");

  // pause / resume / API / skip blocked / saga bridge
  wfe.clearWorkflowSingletonForTest();
  const eng4 = wfe.createWorkflowEngine({ commandBusBridge });
  eng4.registerWorkflowType(
    "pause_flow",
    {
      nodes: [
        {
          id: "fanout",
          type: "parallel",
          branches: ["x", "y"],
          join: "end"
        },
        { id: "x", type: "step", commandType: "X" },
        { id: "y", type: "step", commandType: "Y" },
        { id: "end", type: "step", commandType: "End" }
      ]
    },
    auth
  );
  const pStart = eng4.startWorkflow({ workflowType: "pause_flow", owner: "ops" }, auth);
  assert.equal(pStart.status, wfe.WFE_STATUS.WAITING);
  const paused = eng4.pauseWorkflow(pStart.workflowId, auth);
  assert.equal(paused.status, wfe.WFE_STATUS.PAUSED);
  const resumed = eng4.resumeWorkflow(pStart.workflowId, auth);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.status, wfe.WFE_STATUS.WAITING);

  for (const name of wfe.WFE_PUBLIC_API) {
    assert.equal(typeof eng4[name], "function", `public api ${name}`);
  }
  assert.equal(typeof eng4.registerWorkflowType, "function");
  assert.equal(typeof eng4.completeBranch, "function");
  assert.equal(typeof eng4.tickTimeouts, "function");
  assert.equal(typeof eng4.metrics, "function");
  assert.equal(typeof eng4.workflowAudit, "function");
  assert.equal(typeof eng4.forSagaBridge, "function");

  assert.equal(eng4.directHandlerCall().ok, false);
  assert.ok(/direct_handler_call/.test(eng4.directHandlerCall().error));
  assert.equal(eng4.skipToStep().ok, false);
  assert.ok(/invalid_step_skip/.test(eng4.skipToStep().error));

  eng4.registerWorkflowType(
    "saga_child",
    {
      nodes: [{ id: "one", type: "step", commandType: "FromSaga" }]
    },
    auth
  );
  sentCommands.length = 0;
  const fromSaga = eng4.forSagaBridge(
    { workflowType: "saga_child", owner: "saga" },
    { source: "saga_manager" }
  );
  assert.equal(fromSaga.ok, true);
  assert.ok(sentCommands.some((c) => c.commandType === "FromSaga"));
  pass("pause/resume; API; skip blocked; saga bridge");

  // forged / metrics / audit
  const forged = eng4.startWorkflow(
    { workflowType: "pause_flow" },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_workflow_blocked");

  const m = eng4.metrics();
  assert.ok(typeof m.activeCount === "number");
  assert.ok(typeof m.completedCount === "number");
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.timeoutCount === "number");
  assert.ok(typeof m.averageDurationMs === "number");
  assert.ok(typeof m.parallelBranchCount === "number");

  const trail = eng4.workflowAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("workflowId" in trail[0]);
  assert.ok("workflowType" in trail[0]);
  assert.ok("currentStep" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("owner" in trail[0]);
  pass("forged blocked; metrics; workflow audit");

  // platform wiring
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-saga-core/sagaManager.js"));
  assert.ok(
    coreSys.runtime.includes("shared/mia-workflow-core/workflowEngine.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0082-workflow-engine.md")
  );
  const smIdx = coreSys.runtime.indexOf("shared/mia-saga-core/sagaManager.js");
  const wfIdx = coreSys.runtime.indexOf(
    "shared/mia-workflow-core/workflowEngine.js"
  );
  assert.ok(smIdx >= 0 && wfIdx === smIdx + 1);
  pass("platformSystems nextDocId 0083; workflow after saga in CORE");

  for (const rel of wfe.WFE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0082"), "README 0082");
  assert.ok(/Workflow Engine/i.test(readme), "README Workflow Engine");
  assert.ok(
    /0082.*Platný|Platný.*0082/s.test(readme) ||
      readme.includes("[Workflow Engine"),
    "README 0082 platný"
  );
  assert.ok(readme.includes("0083"), "README 0083");
  assert.ok(/Rule Engine/i.test(readme), "README Rule Engine");
  assert.ok(readme.includes("0084"), "README 0084");
  assert.ok(/Policy Engine/i.test(readme), "README Policy Engine");
  assert.ok(readme.includes("0085"), "README 0085 planned");
  assert.ok(
    /Telemetry Manager/i.test(readme),
    "README Telemetry Manager planned"
  );
  assert.ok(
    readme.includes("shared/mia-workflow-core/"),
    "README Workflow technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0082_contract.js"));
  pass("README + anchors");

  const align81 = read("docs/master-canon/0081-alignment.md");
  assert.ok(
    align81.includes("**0082**") && /Workflow/i.test(align81),
    "0081-alignment marks 0082 Workflow"
  );
  assert.ok(
    align81.includes("0083") && /Rule/i.test(align81),
    "0081-alignment marks 0083 Rule"
  );
  assert.ok(
    align81.includes("0084") && /Policy/i.test(align81),
    "0081-alignment marks 0084 Policy"
  );
  assert.ok(
    align81.includes("0085") && /Telemetry/i.test(align81),
    "0081-alignment marks 0085 Telemetry planned"
  );
  pass("0081-alignment marks 0082–0084 done / 0085 Telemetry planned");

  const align82 = read("docs/master-canon/0082-alignment.md");
  assert.ok(align82.includes("🟡") || align82.includes("🟢"));
  assert.ok(
    align82.includes("Live workflow") ||
      align82.includes("live workflow") ||
      align82.includes("wiring"),
    "0082-alignment marks live wiring partial"
  );

  console.log("\nMaster Canon 0082 contract: ALL PASS");
}

run();
