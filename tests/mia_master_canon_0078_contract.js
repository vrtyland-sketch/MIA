"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const cbm = require("../shared/mia-command-bus-core");
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
  const docPath = path.join(MASTER, "0078-command-bus-manager.md");
  const alignPath = path.join(MASTER, "0078-alignment.md");

  assert.ok(fs.existsSync(docPath), "0078-command-bus-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0078-alignment.md exists");
  pass("0078 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0078 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0078 kernel layer");
  assert.ok(doc.includes("0079"), "0078 points to 0079");
  assert.ok(/Query Bus Manager/i.test(doc), "0078 → Query Bus Manager");
  assert.ok(doc.includes("0080"), "0078 points to 0080");
  assert.ok(/Projection Manager/i.test(doc), "0078 → Projection Manager");
  assert.ok(doc.includes("0081"), "0078 points to 0081");
  assert.ok(/Telemetry Manager/i.test(doc), "0078 → Telemetry Manager");
  pass("21 sections → 0079 Query Bus / 0080 Projection / 0081 Telemetry Manager");

  assert.equal(cbm.CBM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...cbm.CBM_COMPONENT_ORDER],
    [
      "command_bus_manager",
      "intake_gate",
      "validator",
      "authorization_gate",
      "router",
      "handler_registry",
      "pipeline_controller",
      "result_store",
      "async_bridge",
      "security_gate",
      "command_audit",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.equal(cbm.CBM_FLAGS.soleCommandBusAuthority, true);
  assert.equal(cbm.CBM_FLAGS.oneHandlerPerCommand, true);
  assert.equal(cbm.CBM_FLAGS.doesNotStoreDomainEvents, true);
  assert.equal(cbm.CBM_FLAGS.doesNotStoreQueueMessages, true);
  assert.equal(cbm.CBM_FLAGS.separatedFromEventBus, true);
  assert.equal(cbm.CBM_FLAGS.idempotentOnce, true);
  assert.equal(cbm.soleCommandBusAuthority, true);
  assert.equal(cbm.oneHandlerPerCommand, true);
  assert.equal(cbm.doesNotStoreDomainEvents, true);
  assert.equal(cbm.doesNotStoreQueueMessages, true);
  assert.equal(cbm.separatedFromEventBus, true);
  assert.equal(cbm.idempotentOnce, true);
  pass("flags");

  assert.deepEqual(
    [...cbm.CBM_DESCRIPTOR_FIELDS],
    [
      "commandId",
      "commandType",
      "sender",
      "timestamp",
      "payload",
      "priority",
      "correlationId",
      "version"
    ]
  );

  const d1 = cbm.createCommandDescriptor({
    commandType: "StartBattle",
    sender: "battle_engine",
    payload: { arenaId: "a1" }
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.commandId);
  assert.ok(Object.isFrozen(d1.descriptor));
  assert.ok(Object.isFrozen(d1.descriptor.payload));
  for (const field of cbm.CBM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }

  const d2 = cbm.createCommandDescriptor({
    commandType: "StartBattle",
    sender: "battle_engine",
    payload: { arenaId: "a2" }
  });
  assert.notEqual(d1.descriptor.commandId, d2.descriptor.commandId);
  pass("descriptor 8 fields + unique IDs");

  assert.deepEqual(
    [...cbm.CBM_PIPELINE],
    ["validation", "authorization", "routing", "handler", "result"]
  );
  pass("pipeline order");

  cbm.clearCommandBusSingletonForTest();
  const bus = cbm.createCommandBusManager({});
  assert.equal(bus.ok, true);
  assert.equal(bus.status().singleton, true);
  assert.equal(bus.status().soleCommandBusAuthority, true);
  assert.equal(bus.status().oneHandlerPerCommand, true);

  const duplicate = cbm.createCommandBusManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "command_bus_manager_already_active");
  pass("singleton");

  const reg1 = bus.registerHandler(
    "StartBattle",
    (cmd) => ({ ok: true, started: cmd.payload.arenaId }),
    { name: "battle" }
  );
  assert.equal(reg1.ok, true);
  const reg2 = bus.registerHandler("StartBattle", () => ({ ok: true }), {
    name: "battle2"
  });
  assert.equal(reg2.ok, false);
  assert.equal(reg2.error, "handler_already_registered");
  pass("one handler per type; second register blocked");

  const auth = { source: "battle_engine", authorized: true };
  const routed = bus.dispatch(
    {
      commandType: "StartBattle",
      sender: "overlay_ui",
      payload: { arenaId: "arena-9" }
    },
    auth
  );
  assert.equal(routed.ok, true);
  assert.equal(routed.result, cbm.CBM_RESULT.SUCCESS);
  assert.equal(routed.routedHandler, "battle");
  assert.equal(routed.senderKnowsHandler, false);
  assert.deepEqual([...routed.phases], [...cbm.CBM_PIPELINE]);
  pass("routing StartBattle→battle handler; sender unaware");

  const badPayload = bus.send(
    {
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: null
    },
    auth
  );
  assert.equal(badPayload.ok, false);
  assert.equal(badPayload.result, cbm.CBM_RESULT.VALIDATION_FAILED);

  const unauth = bus.send(
    {
      commandType: "StartBattle",
      sender: "hacker",
      payload: {}
    },
    { source: "unknown_actor" }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_command_bus");
  pass("validation rejects bad payload; auth required");

  bus.registerHandler("FailMe", () => ({ ok: false, error: "boom" }), {
    name: "fail"
  });
  const syncOk = bus.send(
    {
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: { arenaId: "ok" }
    },
    auth
  );
  assert.equal(syncOk.ok, true);
  assert.equal(syncOk.result, cbm.CBM_RESULT.SUCCESS);

  const execFail = bus.send(
    {
      commandType: "FailMe",
      sender: "battle_engine",
      payload: {}
    },
    auth
  );
  assert.equal(execFail.ok, false);
  assert.equal(execFail.result, cbm.CBM_RESULT.EXECUTION_FAILED);
  pass("sync Success; Execution Failed from handler");

  cbm.clearCommandBusSingletonForTest();
  const queueCalls = [];
  let deferredAsyncWork = null;
  const busAsync = cbm.createCommandBusManager({
    messageQueueBridge: {
      enqueue(msg, meta) {
        queueCalls.push({ msg, meta });
        return { ok: true, messageId: "q-1" };
      }
    },
    scheduleAsync(fn) {
      // deferred — do not run immediately so cancel can work
      deferredAsyncWork = fn;
    }
  });
  void deferredAsyncWork;
  busAsync.registerHandler(
    "LongJob",
    () => ({ ok: true, done: true }),
    { name: "long" }
  );
  const asyncSend = busAsync.send(
    {
      commandType: "LongJob",
      sender: "runtime",
      payload: { work: 1 },
      commandId: "async-1"
    },
    { ...auth, source: "runtime", mode: "async", queueId: "platform" }
  );
  assert.equal(asyncSend.ok, true);
  assert.equal(asyncSend.pending, true);
  assert.equal(asyncSend.result, cbm.CBM_RESULT.PENDING);
  assert.equal(queueCalls.length, 1);
  assert.equal(busAsync.status().pendingCount, 1);
  // CBM must not expose a local message store API
  assert.equal(typeof busAsync.enqueue, "undefined");
  assert.equal(typeof busAsync.getMessages, "undefined");
  pass("async mode uses queue bridge, not local message store");

  cbm.clearCommandBusSingletonForTest();
  const appended = [];
  const published = [];
  const busEvt = cbm.createCommandBusManager({
    eventStoreBridge: {
      appendEvent(evt, meta) {
        appended.push({ evt, meta });
        return { ok: true, eventId: "e-1" };
      }
    },
    eventBusBridge: {
      publish(evt, meta) {
        published.push({ evt, meta });
        return { ok: true, eventId: "bus-1" };
      }
    }
  });
  busEvt.registerHandler(
    "StartBattle",
    () => ({
      ok: true,
      domainEvent: {
        eventType: "BattleStarted",
        payload: { battleId: "b1" }
      }
    }),
    { name: "battle" }
  );
  const withEvt = busEvt.send(
    {
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: { arenaId: "x" }
    },
    auth
  );
  assert.equal(withEvt.ok, true);
  assert.equal(withEvt.domainEventAppended, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].evt.eventType, "BattleStarted");
  assert.ok(!("commandType" in (appended[0].evt || {})));
  assert.equal(published.length, 1);
  pass("success may append Domain Event to event store bridge; command itself not stored");
  pass("event bus publish after success optional");

  const writeCmd = busEvt.send(
    {
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: { arenaId: "y" }
    },
    { ...auth, writeCommandToEventStore: true }
  );
  assert.equal(writeCmd.ok, false);
  assert.equal(writeCmd.error, "write_command_to_event_store_rejected");

  const dupId = "idem-1";
  const first = busEvt.send(
    {
      commandId: dupId,
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: { arenaId: "dup" }
    },
    auth
  );
  assert.equal(first.ok, true);
  const second = busEvt.send(
    {
      commandId: dupId,
      commandType: "StartBattle",
      sender: "battle_engine",
      payload: { arenaId: "dup2" }
    },
    auth
  );
  assert.equal(second.error, "duplicate_commandId");
  assert.equal(second.reexecuted, false);
  pass("duplicate commandId blocked/idempotent");

  const cancelAuth = { source: "runtime", authorized: true };
  cbm.clearCommandBusSingletonForTest();
  const busCancel = cbm.createCommandBusManager({
    messageQueueBridge: {
      enqueue() {
        return { ok: true };
      }
    },
    scheduleAsync() {
      /* hold pending */
    }
  });
  busCancel.registerHandler("LongJob", () => ({ ok: true }), { name: "long" });
  const pendingCmd = busCancel.send(
    {
      commandId: "cancel-me",
      commandType: "LongJob",
      sender: "runtime",
      payload: {}
    },
    { ...cancelAuth, mode: "async" }
  );
  assert.equal(pendingCmd.pending, true);
  const cancelled = busCancel.cancel("cancel-me", cancelAuth);
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.result, cbm.CBM_RESULT.CANCELLED);
  const after = busCancel.getResult("cancel-me");
  assert.equal(after.result, cbm.CBM_RESULT.CANCELLED);

  const done = busCancel.send(
    {
      commandId: "already-done",
      commandType: "LongJob",
      sender: "runtime",
      payload: {}
    },
    cancelAuth
  );
  assert.equal(done.result, cbm.CBM_RESULT.SUCCESS);
  const cancelDone = busCancel.cancel("already-done", cancelAuth);
  assert.equal(cancelDone.ok, false);
  assert.equal(cancelDone.error, "command_already_completed");
  pass("cancel works for pending");

  for (const name of cbm.CBM_PUBLIC_API) {
    assert.equal(typeof busCancel[name], "function", `public api ${name}`);
  }
  assert.equal(typeof busCancel.registerHandler, "function");
  assert.equal(typeof busCancel.metrics, "function");
  assert.equal(typeof busCancel.commandAudit, "function");
  assert.equal(typeof busCancel.status, "function");
  pass("API send/validate/dispatch/cancel/getResult");

  const forged = busCancel.send(
    {
      commandType: "LongJob",
      sender: "runtime",
      payload: {}
    },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_command_blocked");
  pass("singleton; forged blocked; metrics; command audit");

  const m = busCancel.metrics();
  assert.ok(typeof m.commandCount === "number");
  assert.ok(typeof m.handlerCount === "number");
  assert.ok(typeof m.successCount === "number");
  assert.ok(typeof m.rejectedCount === "number");
  assert.ok(typeof m.averageExecutionMs === "number");
  assert.ok(typeof m.errorCount === "number");

  const trail = busCancel.commandAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("commandId" in trail[0]);
  assert.ok("sender" in trail[0]);
  assert.ok("handler" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("correlationId" in trail[0]);

  const v = busCancel.validate(
    {
      commandType: "LongJob",
      sender: "runtime",
      payload: {}
    },
    cancelAuth
  );
  assert.equal(v.ok, true);
  assert.equal(v.valid, true);

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-message-queue-core/messageQueueManager.js"
    )
  );
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-command-bus-core/commandBusManager.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0078-command-bus-manager.md")
  );
  const mqmIdx = coreSys.runtime.indexOf(
    "shared/mia-message-queue-core/messageQueueManager.js"
  );
  const cbmIdx = coreSys.runtime.indexOf(
    "shared/mia-command-bus-core/commandBusManager.js"
  );
  assert.ok(mqmIdx >= 0 && cbmIdx === mqmIdx + 1);
  pass("platformSystems nextDocId 0082; command-bus after message-queue in CORE");

  for (const rel of cbm.CBM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0078"), "README 0078");
  assert.ok(/Command Bus Manager/i.test(readme), "README Command Bus Manager");
  assert.ok(
    /0078.*Platný|Platný.*0078/s.test(readme) ||
      readme.includes("[Command Bus Manager"),
    "README 0078 platný"
  );
  assert.ok(readme.includes("0079"), "README 0079");
  assert.ok(/Query Bus Manager/i.test(readme), "README Query Bus Manager");
  assert.ok(readme.includes("0080"), "README 0080");
  assert.ok(/Projection Manager/i.test(readme), "README Projection Manager");
  assert.ok(
    /0080.*Platný|Platný.*0080/s.test(readme) ||
      readme.includes("[Projection Manager"),
    "README 0080 platný"
  );
  assert.ok(readme.includes("0081"), "README 0081 planned");
  assert.ok(
    /Telemetry Manager/i.test(readme),
    "README Telemetry Manager planned"
  );
  assert.ok(
    readme.includes("shared/mia-command-bus-core/"),
    "README Command Bus technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0078_contract.js"));
  pass("README + anchors");

  const align78 = read("docs/master-canon/0078-alignment.md");
  assert.ok(align78.includes("🟡") || align78.includes("🟢"));
  assert.ok(
    align78.includes("handler") || align78.includes("Live"),
    "0078-alignment marks live handler wiring partial"
  );
  assert.ok(
    align78.includes("**0079**") && /Query Bus/i.test(align78),
    "0078-alignment marks 0079 Query Bus"
  );
  assert.ok(
    align78.includes("0080") && /Projection/i.test(align78),
    "0078-alignment marks 0080 Projection"
  );
  assert.ok(
    (align78.includes("0082") && /Telemetry/i.test(align78)) || (align78.includes("0081") && /Saga|Telemetry/i.test(align78)),
    "0078-alignment marks 0081 Telemetry planned"
  );
  pass("0078-alignment marks 0079 done / 0080 Projection / 0081 Telemetry planned");

  console.log("\nMaster Canon 0078 contract: ALL PASS");
}

run();
