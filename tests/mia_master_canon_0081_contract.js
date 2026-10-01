"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const sm = require("../shared/mia-saga-core");
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
  const docPath = path.join(MASTER, "0081-saga-manager.md");
  const alignPath = path.join(MASTER, "0081-alignment.md");

  assert.ok(fs.existsSync(docPath), "0081-saga-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0081-alignment.md exists");
  pass("0081 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0081 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0081 kernel layer");
  assert.ok(doc.includes("0082"), "0081 points to 0082");
  assert.ok(/Workflow Engine/i.test(doc), "0081 → Workflow Engine");
  assert.ok(doc.includes("0083"), "0081 points to 0083");
  assert.ok(/Rule Engine/i.test(doc), "0081 → Rule Engine");
  assert.ok(doc.includes("0084"), "0081 points to 0084");
  assert.ok(/Policy Engine/i.test(doc), "0081 → Policy Engine");
  assert.ok(doc.includes("0085"), "0081 points to 0085");
  assert.ok(/Telemetry Manager/i.test(doc), "0081 → Telemetry Manager");
  pass("21 sections → 0082 Workflow / 0083 Rule / 0084 Policy / 0085 Telemetry Manager");

  assert.equal(sm.SM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...sm.SM_COMPONENT_ORDER],
    [
      "saga_manager",
      "intake_gate",
      "descriptor_factory",
      "type_registry",
      "step_orchestrator",
      "event_adapter",
      "command_dispatcher",
      "waiting_controller",
      "timeout_controller",
      "compensation_engine",
      "security_gate",
      "saga_audit"
    ]
  );
  pass("12 components");

  assert.equal(sm.SM_FLAGS.soleSagaAuthority, true);
  assert.equal(sm.SM_FLAGS.executesCommandsDirectly, false);
  assert.equal(sm.SM_FLAGS.createsBusinessLogic, false);
  assert.equal(sm.SM_FLAGS.usesGlobalTransactions, false);
  assert.equal(sm.SM_FLAGS.coordinatesOnly, true);
  assert.equal(sm.SM_FLAGS.commandsViaCommandBusOnly, true);
  assert.equal(sm.soleSagaAuthority, true);
  assert.equal(sm.executesCommandsDirectly, false);
  assert.equal(sm.createsBusinessLogic, false);
  assert.equal(sm.usesGlobalTransactions, false);
  assert.equal(sm.coordinatesOnly, true);
  assert.equal(sm.commandsViaCommandBusOnly, true);
  pass("flags");

  assert.deepEqual(
    [...sm.SM_DESCRIPTOR_FIELDS],
    [
      "sagaId",
      "sagaType",
      "currentStep",
      "status",
      "started",
      "updated",
      "correlationId",
      "version"
    ]
  );

  const d1 = sm.createSagaDescriptor({ sagaType: "battle_flow" });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.sagaId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of sm.SM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = sm.createSagaDescriptor({ sagaType: "battle_flow" });
  assert.notEqual(d1.descriptor.sagaId, d2.descriptor.sagaId);
  pass("descriptor 8 fields");

  // status FSM
  assert.equal(sm.SM_STATUS.CREATED, "created");
  assert.equal(sm.SM_STATUS.RUNNING, "running");
  assert.equal(sm.SM_STATUS.WAITING, "waiting");
  assert.equal(sm.SM_STATUS.COMPLETED, "completed");
  assert.equal(sm.SM_STATUS.COMPENSATING, "compensating");
  assert.equal(sm.SM_STATUS.FAILED, "failed");
  assert.equal(sm.SM_STATUS.CANCELLED, "cancelled");

  assert.equal(sm.validateStatusTransition("created", "running").ok, true);
  assert.equal(sm.validateStatusTransition("running", "waiting").ok, true);
  assert.equal(sm.validateStatusTransition("waiting", "completed").ok, true);
  assert.equal(sm.validateStatusTransition("waiting", "running").ok, true);
  assert.equal(sm.validateStatusTransition("running", "completed").ok, true);
  assert.equal(sm.validateStatusTransition("running", "compensating").ok, true);
  assert.equal(sm.validateStatusTransition("waiting", "compensating").ok, true);
  assert.equal(sm.validateStatusTransition("compensating", "failed").ok, true);
  assert.equal(sm.validateStatusTransition("created", "completed").ok, false);
  assert.equal(sm.validateStatusTransition("running", "cancelled").ok, true);
  pass("status FSM");

  sm.clearSagaSingletonForTest();

  const sentCommands = [];
  const lifecycleEvents = [];
  const commandBusBridge = {
    send(cmd) {
      sentCommands.push(cmd);
      assert.equal(cmd.sender, "saga_manager");
      return { ok: true, commandType: cmd.commandType };
    }
  };
  const eventStoreBridge = {
    appendEvent(evt) {
      lifecycleEvents.push(evt);
      return { ok: true };
    }
  };

  const mgr = sm.createSagaManager({
    commandBusBridge,
    eventStoreBridge
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleSagaAuthority, true);

  const duplicate = sm.createSagaManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "saga_manager_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };

  // register saga type with steps
  const reg = mgr.registerSagaType(
    "order_flow",
    {
      timeoutMs: 5000,
      steps: [
        {
          name: "reserve",
          onEnter: {
            commandType: "ReserveStock",
            payloadBuilder: ({ payload }) => ({ item: payload.item })
          },
          waitFor: "StockReserved",
          onTimeout: "compensate",
          compensate: { commandType: "ReleaseStock" },
          timeoutMs: 1000
        },
        {
          name: "charge",
          onEnter: { commandType: "ChargePayment" },
          waitFor: "PaymentCharged",
          onTimeout: "compensate",
          compensate: { commandType: "RefundPayment" },
          timeoutMs: 1000
        },
        {
          name: "ship",
          onEnter: { commandType: "ShipOrder" }
        }
      ]
    },
    auth
  );
  assert.equal(reg.ok, true);
  assert.equal(reg.stepCount, 3);

  const regDup = mgr.registerSagaType(
    "order_flow",
    { steps: [{ name: "x" }] },
    auth
  );
  assert.equal(regDup.ok, false);
  assert.equal(regDup.error, "saga_type_already_registered");
  pass("register saga type with steps");

  // start advances; commands via command bus bridge only
  sentCommands.length = 0;
  const started = mgr.startSaga(
    {
      sagaType: "order_flow",
      correlationId: "corr-1",
      payload: { item: "sword" }
    },
    auth
  );
  assert.equal(started.ok, true);
  assert.ok(started.sagaId);
  assert.equal(started.status, sm.SM_STATUS.WAITING);
  assert.equal(started.saga.waitFor, "StockReserved");
  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0].commandType, "ReserveStock");
  assert.equal(sentCommands[0].sender, "saga_manager");
  assert.equal(sentCommands[0].payload.item, "sword");
  assert.equal(sentCommands[0].correlationId, "corr-1");
  assert.ok(lifecycleEvents.some((e) => e.eventType === "SagaStarted"));
  pass("start advances; commands via command bus bridge only");

  // waiting for event then continue
  sentCommands.length = 0;
  const advanced = mgr.onEvent(
    { eventType: "StockReserved", correlationId: "corr-1" },
    { source: "event_bus", authorized: true }
  );
  assert.equal(advanced.ok, true);
  assert.equal(advanced.advanced.length, 1);
  assert.equal(advanced.advanced[0].ok, true);
  const afterEvt = mgr.getSaga(started.sagaId);
  assert.equal(afterEvt.saga.status, sm.SM_STATUS.WAITING);
  assert.equal(afterEvt.saga.waitFor, "PaymentCharged");
  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0].commandType, "ChargePayment");

  const bus = mgr.fromEventBus(
    {
      event: { eventType: "PaymentCharged", correlationId: "corr-1" },
      correlationId: "corr-1"
    },
    auth
  );
  assert.equal(bus.ok, true);
  const afterPay = mgr.getSaga(started.sagaId);
  assert.equal(afterPay.saga.status, sm.SM_STATUS.COMPLETED);
  assert.ok(sentCommands.some((c) => c.commandType === "ShipOrder"));
  assert.ok(lifecycleEvents.some((e) => e.eventType === "SagaCompleted"));
  pass("waiting for event then continue");

  // timeout → compensate
  sm.clearSagaSingletonForTest();
  sentCommands.length = 0;
  const mgr2 = sm.createSagaManager({ commandBusBridge });
  mgr2.registerSagaType(
    "timeout_flow",
    {
      steps: [
        {
          name: "wait_step",
          onEnter: { commandType: "DoWork" },
          waitFor: "WorkDone",
          onTimeout: "compensate",
          compensate: { commandType: "UndoWork" },
          timeoutMs: 100
        }
      ]
    },
    auth
  );
  const tStart = mgr2.startSaga(
    { sagaType: "timeout_flow", correlationId: "corr-to", payload: {} },
    { ...auth, nowMs: 1000 }
  );
  assert.equal(tStart.status, sm.SM_STATUS.WAITING);
  sentCommands.length = 0;
  const timed = mgr2.tickTimeouts(1200, auth);
  assert.equal(timed.timedOut.length, 1);
  assert.equal(timed.timedOut[0].action, "compensate");
  const afterTo = mgr2.getSaga(tStart.sagaId);
  assert.equal(afterTo.saga.status, sm.SM_STATUS.FAILED);
  assert.ok(sentCommands.some((c) => c.commandType === "UndoWork"));
  pass("timeout → compensate");

  // compensate on step failure
  sm.clearSagaSingletonForTest();
  sentCommands.length = 0;
  let failOnce = true;
  const failBridge = {
    send(cmd) {
      sentCommands.push(cmd);
      if (failOnce && cmd.commandType === "StepTwo") {
        failOnce = false;
        return { ok: false, error: "handler_failed" };
      }
      return { ok: true };
    }
  };
  const mgr3 = sm.createSagaManager({ commandBusBridge: failBridge });
  mgr3.registerSagaType(
    "fail_flow",
    {
      steps: [
        {
          name: "one",
          onEnter: { commandType: "StepOne" },
          compensate: { commandType: "UndoOne" }
        },
        {
          name: "two",
          onEnter: { commandType: "StepTwo" },
          compensate: { commandType: "UndoTwo" }
        }
      ]
    },
    auth
  );
  const failStart = mgr3.startSaga(
    { sagaType: "fail_flow", correlationId: "corr-fail" },
    auth
  );
  assert.equal(failStart.ok, false);
  const failSaga = mgr3.getSaga(failStart.sagaId);
  assert.equal(failSaga.saga.status, sm.SM_STATUS.FAILED);
  assert.ok(sentCommands.some((c) => c.commandType === "StepOne"));
  assert.ok(sentCommands.some((c) => c.commandType === "StepTwo"));
  assert.ok(sentCommands.some((c) => c.commandType === "UndoOne"));
  pass("compensate on step failure");

  // no direct handler calls; no global transactions
  assert.equal(mgr3.directHandlerCall().ok, false);
  assert.ok(/direct_handler_call/.test(mgr3.directHandlerCall().error));
  assert.equal(mgr3.beginGlobalTransaction().ok, false);
  assert.ok(/global_transaction/.test(mgr3.beginGlobalTransaction().error));
  assert.equal(sm.SM_FLAGS.executesCommandsDirectly, false);
  assert.equal(sm.SM_FLAGS.usesGlobalTransactions, false);
  pass("no direct handler calls; no global transactions");

  // duplicate start blocked; resume works
  sm.clearSagaSingletonForTest();
  sentCommands.length = 0;
  const mgr4 = sm.createSagaManager({ commandBusBridge });
  mgr4.registerSagaType(
    "resume_flow",
    {
      steps: [
        {
          name: "a",
          onEnter: { commandType: "CmdA" },
          waitFor: "EvtA",
          timeoutMs: 99999
        },
        {
          name: "b",
          onEnter: { commandType: "CmdB" }
        }
      ]
    },
    auth
  );
  const s1 = mgr4.startSaga(
    { sagaType: "resume_flow", correlationId: "corr-dup", sagaId: "saga-fixed-1" },
    auth
  );
  assert.equal(s1.ok, true);
  const dupId = mgr4.startSaga(
    { sagaType: "resume_flow", sagaId: "saga-fixed-1" },
    auth
  );
  assert.equal(dupId.ok, false);
  assert.equal(dupId.error, "duplicate_saga_start");
  const dupCorr = mgr4.startSaga(
    { sagaType: "resume_flow", correlationId: "corr-dup" },
    auth
  );
  assert.equal(dupCorr.ok, false);
  assert.equal(dupCorr.error, "duplicate_saga_start");

  // simulate crash recovery via resume with persisted
  sm.clearSagaSingletonForTest();
  const mgr5 = sm.createSagaManager({ commandBusBridge });
  mgr5.registerSagaType(
    "resume_flow",
    {
      steps: [
        {
          name: "a",
          onEnter: { commandType: "CmdA" },
          waitFor: "EvtA",
          timeoutMs: 99999
        },
        {
          name: "b",
          onEnter: { commandType: "CmdB" }
        }
      ]
    },
    auth
  );
  sentCommands.length = 0;
  const resumed = mgr5.resumeSaga("saga-recovered", {
    ...auth,
    persisted: {
      sagaId: "saga-recovered",
      sagaType: "resume_flow",
      currentStep: 1,
      status: "running",
      started: 100,
      updated: 200,
      correlationId: "corr-rec",
      version: 2,
      completedSteps: [0],
      payload: {}
    }
  });
  assert.equal(resumed.ok, true);
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.status, sm.SM_STATUS.COMPLETED);
  assert.ok(sentCommands.some((c) => c.commandType === "CmdB"));
  pass("duplicate start blocked; resume works");

  // API surface
  for (const name of sm.SM_PUBLIC_API) {
    assert.equal(typeof mgr5[name], "function", `public api ${name}`);
  }
  assert.equal(typeof mgr5.registerSagaType, "function");
  assert.equal(typeof mgr5.onEvent, "function");
  assert.equal(typeof mgr5.fromEventBus, "function");
  assert.equal(typeof mgr5.tickTimeouts, "function");
  assert.equal(typeof mgr5.metrics, "function");
  assert.equal(typeof mgr5.sagaAudit, "function");
  assert.equal(typeof mgr5.status, "function");
  pass("API surface");

  // forged blocked; metrics; saga audit
  const forged = mgr5.startSaga(
    { sagaType: "resume_flow", correlationId: "forge-1" },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_saga_blocked");

  const unauth = mgr5.startSaga(
    { sagaType: "resume_flow", correlationId: "unauth-1" },
    { source: "unknown_actor" }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_saga");

  const m = mgr5.metrics();
  assert.ok(typeof m.activeCount === "number");
  assert.ok(typeof m.completedCount === "number");
  assert.ok(typeof m.compensationCount === "number");
  assert.ok(typeof m.timeoutCount === "number");
  assert.ok(typeof m.averageDurationMs === "number");
  assert.ok(typeof m.failureCount === "number");

  const trail = mgr5.sagaAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("sagaId" in trail[0]);
  assert.ok("sagaType" in trail[0]);
  assert.ok("currentStep" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("correlationId" in trail[0]);
  pass("singleton; forged blocked; metrics; saga audit");

  // platform wiring
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-projection-core/projectionManager.js"
    )
  );
  assert.ok(
    coreSys.runtime.includes("shared/mia-saga-core/sagaManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0081-saga-manager.md")
  );
  const pmIdx = coreSys.runtime.indexOf(
    "shared/mia-projection-core/projectionManager.js"
  );
  const smIdx = coreSys.runtime.indexOf(
    "shared/mia-saga-core/sagaManager.js"
  );
  assert.ok(pmIdx >= 0 && smIdx === pmIdx + 1);
  pass("platformSystems nextDocId 0083; saga after projection in CORE");

  for (const rel of sm.SM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0081"), "README 0081");
  assert.ok(/Saga Manager/i.test(readme), "README Saga Manager");
  assert.ok(
    /0081.*Platný|Platný.*0081/s.test(readme) ||
      readme.includes("[Saga Manager"),
    "README 0081 platný"
  );
  assert.ok(readme.includes("0082"), "README 0082");
  assert.ok(/Workflow Engine/i.test(readme), "README Workflow Engine");
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
    readme.includes("shared/mia-saga-core/"),
    "README Saga technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0081_contract.js"));
  pass("README + anchors");

  const align80 = read("docs/master-canon/0080-alignment.md");
  assert.ok(
    align80.includes("**0081**") && /Saga/i.test(align80),
    "0080-alignment marks 0081 Saga"
  );
  assert.ok(
    align80.includes("0082") && /Workflow/i.test(align80),
    "0080-alignment marks 0082 Workflow"
  );
  assert.ok(
    align80.includes("0083") && /Rule/i.test(align80),
    "0080-alignment marks 0083 Rule"
  );
  assert.ok(
    align80.includes("0084") && /Policy/i.test(align80),
    "0080-alignment marks 0084 Policy"
  );
  assert.ok(
    align80.includes("0085") && /Telemetry/i.test(align80),
    "0080-alignment marks 0085 Telemetry planned"
  );
  pass("0080-alignment marks 0081–0084 done / 0085 Telemetry planned");

  const align81 = read("docs/master-canon/0081-alignment.md");
  assert.ok(align81.includes("🟡") || align81.includes("🟢"));
  assert.ok(
    align81.includes("Live saga") || align81.includes("live saga") || align81.includes("wiring"),
    "0081-alignment marks live wiring partial"
  );

  console.log("\nMaster Canon 0081 contract: ALL PASS");
}

run();
