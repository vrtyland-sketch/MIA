"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const qbm = require("../shared/mia-query-bus-core");
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
  const docPath = path.join(MASTER, "0079-query-bus-manager.md");
  const alignPath = path.join(MASTER, "0079-alignment.md");

  assert.ok(fs.existsSync(docPath), "0079-query-bus-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0079-alignment.md exists");
  pass("0079 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0079 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0079 kernel layer");
  assert.ok(doc.includes("0080"), "0079 points to 0080");
  assert.ok(/Projection Manager/i.test(doc), "0079 → Projection Manager");
  assert.ok(doc.includes("0081"), "0079 points to 0081");
  assert.ok(/Telemetry Manager/i.test(doc), "0079 → Telemetry Manager");
  pass("21 sections → 0080 Projection / 0081 Telemetry Manager");

  assert.equal(qbm.QBM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...qbm.QBM_COMPONENT_ORDER],
    [
      "query_bus_manager",
      "intake_gate",
      "validator",
      "authorization_gate",
      "router",
      "handler_registry",
      "read_model_gate",
      "pipeline_controller",
      "response_store",
      "security_gate",
      "query_audit",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.equal(qbm.QBM_FLAGS.soleQueryBusAuthority, true);
  assert.equal(qbm.QBM_FLAGS.oneHandlerPerQuery, true);
  assert.equal(qbm.QBM_FLAGS.neverMutatesState, true);
  assert.equal(qbm.QBM_FLAGS.neverCreatesDomainEvents, true);
  assert.equal(qbm.QBM_FLAGS.cqrsSeparated, true);
  assert.equal(qbm.QBM_FLAGS.readsOnlyViaReadModel, true);
  assert.equal(qbm.QBM_FLAGS.noDirectEventStreamRead, true);
  assert.equal(qbm.soleQueryBusAuthority, true);
  assert.equal(qbm.oneHandlerPerQuery, true);
  assert.equal(qbm.neverMutatesState, true);
  assert.equal(qbm.neverCreatesDomainEvents, true);
  assert.equal(qbm.cqrsSeparated, true);
  assert.equal(qbm.readsOnlyViaReadModel, true);
  assert.equal(qbm.noDirectEventStreamRead, true);
  pass("flags");

  assert.deepEqual(
    [...qbm.QBM_DESCRIPTOR_FIELDS],
    [
      "queryId",
      "queryType",
      "sender",
      "timestamp",
      "payload",
      "correlationId",
      "version"
    ]
  );

  const d1 = qbm.createQueryDescriptor({
    queryType: "GetInventory",
    sender: "inventory",
    payload: { userId: "u1" }
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.queryId);
  assert.ok(Object.isFrozen(d1.descriptor));
  assert.ok(Object.isFrozen(d1.descriptor.payload));
  assert.ok(!("priority" in d1.descriptor));
  for (const field of qbm.QBM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }

  const d2 = qbm.createQueryDescriptor({
    queryType: "GetInventory",
    sender: "inventory",
    payload: { userId: "u2" }
  });
  assert.notEqual(d1.descriptor.queryId, d2.descriptor.queryId);
  pass("descriptor 7 fields + unique IDs");

  assert.deepEqual(
    [...qbm.QBM_PIPELINE],
    ["validation", "authorization", "routing", "handler", "response"]
  );
  pass("pipeline order");

  qbm.clearQueryBusSingletonForTest();
  const store = { inventory: { items: ["sword"], password: "secret-pw", token: "tok" } };
  const bus = qbm.createQueryBusManager({
    readModelBridge: {
      get(key) {
        return store[key];
      },
      snapshot() {
        return { ...store };
      }
    },
    stateBridge: {
      readOnlySnapshot() {
        return { phase: "running" };
      },
      transition() {
        throw new Error("should_not_call_transition");
      },
      set() {
        throw new Error("should_not_call_set");
      }
    }
  });
  assert.equal(bus.ok, true);
  assert.equal(bus.status().singleton, true);
  assert.equal(bus.status().soleQueryBusAuthority, true);
  assert.equal(bus.status().oneHandlerPerQuery, true);
  assert.equal(bus.status().cqrsSeparated, true);

  const duplicate = qbm.createQueryBusManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "query_bus_manager_already_active");
  pass("singleton");

  const reg1 = bus.registerHandler(
    "GetInventory",
    (query, ctx) => {
      const inv = ctx.readModel.get("inventory");
      return { ok: true, data: { items: inv.items, password: inv.password, token: inv.token } };
    },
    { name: "inventory" }
  );
  assert.equal(reg1.ok, true);
  const reg2 = bus.registerHandler("GetInventory", () => ({ ok: true }), {
    name: "inventory2"
  });
  assert.equal(reg2.ok, false);
  assert.equal(reg2.error, "handler_already_registered");
  pass("one handler per type; second register blocked");

  const auth = { source: "inventory", authorized: true };
  const routed = bus.execute(
    {
      queryType: "GetInventory",
      sender: "overlay_ui",
      payload: { userId: "u9" }
    },
    auth
  );
  assert.equal(routed.ok, true);
  assert.equal(routed.result, qbm.QBM_RESULT.SUCCESS);
  assert.equal(routed.routedHandler, "inventory");
  assert.equal(routed.senderKnowsHandler, false);
  assert.deepEqual([...routed.phases], [...qbm.QBM_PIPELINE]);
  assert.ok(routed.data);
  assert.ok(Array.isArray(routed.data.items));
  assert.ok(!("password" in routed.data));
  assert.ok(!("token" in routed.data));
  pass("GetInventory→inventory handler; sensitive filtered");

  const mutateStub = bus.mutate();
  assert.equal(mutateStub.ok, false);
  assert.ok(/rejected/.test(mutateStub.error));
  assert.equal(bus.appendEvent().ok, false);
  assert.equal(bus.sendCommand().ok, false);
  assert.equal(bus.write().ok, false);
  assert.equal(bus.transitionState().ok, false);
  pass("never mutates; mutate/appendEvent/sendCommand stubs reject");

  const asCmd = bus.execute(
    {
      queryType: "GetInventory",
      sender: "inventory",
      payload: {}
    },
    { ...auth, asCommand: true }
  );
  assert.equal(asCmd.ok, false);
  assert.equal(asCmd.error, "cqrs_query_as_command_rejected");
  assert.equal(asCmd.cqrsSeparated, true);

  const mutateReq = bus.execute(
    {
      queryType: "GetInventory",
      sender: "inventory",
      payload: {}
    },
    { ...auth, mutateRequested: true }
  );
  assert.equal(mutateReq.ok, false);
  assert.equal(mutateReq.error, "cqrs_query_as_command_rejected");
  pass("CQRS separated; asCommand rejected");

  const streamDirect = bus.execute(
    {
      queryType: "GetInventory",
      sender: "inventory",
      payload: {}
    },
    { ...auth, readEventStreamDirectly: true }
  );
  assert.equal(streamDirect.ok, false);
  assert.equal(streamDirect.error, "direct_event_stream_read_rejected");
  assert.equal(streamDirect.noDirectEventStreamRead, true);
  pass("no direct event stream read");

  const badPayload = bus.execute(
    {
      queryType: "GetInventory",
      sender: "inventory",
      payload: null
    },
    auth
  );
  assert.equal(badPayload.ok, false);
  assert.equal(badPayload.result, qbm.QBM_RESULT.VALIDATION_FAILED);

  const unauth = bus.execute(
    {
      queryType: "GetInventory",
      sender: "hacker",
      payload: {}
    },
    { source: "unknown_actor" }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_query_bus");
  pass("validation/auth; sensitive filtered");

  const got = bus.getResponse(routed.queryId);
  assert.equal(got.ok, true);
  assert.ok(got.data);
  assert.ok(!("domainEvent" in (got.data || {})));
  assert.ok(!("sideEffect" in (got.data || {})));
  pass("response data-only; getResponse");

  for (const name of qbm.QBM_PUBLIC_API) {
    assert.equal(typeof bus[name], "function", `public api ${name}`);
  }
  assert.equal(typeof bus.registerHandler, "function");
  assert.equal(typeof bus.metrics, "function");
  assert.equal(typeof bus.queryAudit, "function");
  assert.equal(typeof bus.status, "function");
  pass("API execute/validate/authorize/cancel/getResponse");

  const authz = bus.authorize(
    { queryType: "GetInventory", sender: "inventory", payload: {} },
    auth
  );
  assert.equal(authz.ok, true);
  assert.equal(authz.authorized, true);

  qbm.clearQueryBusSingletonForTest();
  const busCancel = qbm.createQueryBusManager({
    scheduleAsync() {
      /* hold pending */
    },
    readModelBridge: {
      get() {
        return {};
      }
    }
  });
  busCancel.registerHandler("GetHealth", () => ({ ok: true, data: { ok: true } }), {
    name: "health"
  });
  const cancelAuth = { source: "runtime", authorized: true };
  const pendingQ = busCancel.execute(
    {
      queryId: "cancel-me",
      queryType: "GetHealth",
      sender: "runtime",
      payload: {}
    },
    { ...cancelAuth, mode: "async" }
  );
  assert.equal(pendingQ.pending, true);
  const cancelled = busCancel.cancel("cancel-me", cancelAuth);
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.result, qbm.QBM_RESULT.CANCELLED);

  const done = busCancel.execute(
    {
      queryId: "already-done",
      queryType: "GetHealth",
      sender: "runtime",
      payload: {}
    },
    cancelAuth
  );
  assert.equal(done.result, qbm.QBM_RESULT.SUCCESS);
  const cancelDone = busCancel.cancel("already-done", cancelAuth);
  assert.equal(cancelDone.ok, false);
  assert.equal(cancelDone.error, "query_already_completed");

  const forged = busCancel.execute(
    {
      queryType: "GetHealth",
      sender: "runtime",
      payload: {}
    },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_query_blocked");

  const m = busCancel.metrics();
  assert.ok(typeof m.queryCount === "number");
  assert.ok(typeof m.handlerCount === "number");
  assert.ok(typeof m.averageLatencyMs === "number");
  assert.ok(typeof m.rejectedCount === "number");
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.readModelHits === "number");

  const trail = busCancel.queryAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("queryId" in trail[0]);
  assert.ok("sender" in trail[0]);
  assert.ok("handler" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("correlationId" in trail[0]);
  pass("singleton; forged blocked; metrics; query audit");

  // Handler context mutation stubs
  qbm.clearQueryBusSingletonForTest();
  let ctxSeen = null;
  const busCtx = qbm.createQueryBusManager({
    readModelBridge: {
      get(key) {
        return key === "x" ? 1 : undefined;
      },
      snapshot() {
        return { x: 1 };
      }
    }
  });
  busCtx.registerHandler(
    "Probe",
    (_q, ctx) => {
      ctxSeen = ctx;
      assert.equal(ctx.readModel.set().ok, false);
      assert.equal(ctx.mutate().ok, false);
      assert.equal(ctx.appendEvent().ok, false);
      assert.equal(ctx.sendCommand().ok, false);
      return { ok: true, data: { v: ctx.readModel.get("x") } };
    },
    { name: "probe" }
  );
  const probe = busCtx.execute(
    { queryType: "Probe", sender: "runtime", payload: {} },
    { source: "runtime", authorized: true }
  );
  assert.equal(probe.ok, true);
  assert.equal(probe.data.v, 1);
  assert.ok(ctxSeen);
  assert.equal(typeof ctxSeen.loadStream, "function");
  assert.equal(ctxSeen.loadStream().ok, false);

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-command-bus-core/commandBusManager.js"
    )
  );
  assert.ok(
    coreSys.runtime.includes("shared/mia-query-bus-core/queryBusManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0079-query-bus-manager.md")
  );
  const cbmIdx = coreSys.runtime.indexOf(
    "shared/mia-command-bus-core/commandBusManager.js"
  );
  const qbmIdx = coreSys.runtime.indexOf(
    "shared/mia-query-bus-core/queryBusManager.js"
  );
  assert.ok(cbmIdx >= 0 && qbmIdx === cbmIdx + 1);
  pass("platformSystems nextDocId 0082; query-bus after command-bus in CORE");

  for (const rel of qbm.QBM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0079"), "README 0079");
  assert.ok(/Query Bus Manager/i.test(readme), "README Query Bus Manager");
  assert.ok(
    /0079.*Platný|Platný.*0079/s.test(readme) ||
      readme.includes("[Query Bus Manager"),
    "README 0079 platný"
  );
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
    readme.includes("shared/mia-query-bus-core/"),
    "README Query Bus technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0079_contract.js"));
  pass("README + anchors");

  const align78 = read("docs/master-canon/0078-alignment.md");
  assert.ok(
    align78.includes("**0079**") && /Query Bus/i.test(align78),
    "0078-alignment marks 0079 Query Bus"
  );
  assert.ok(
    align78.includes("0080") && /Projection/i.test(align78),
    "0078-alignment marks 0080 Projection"
  );
  pass("0078-alignment marks 0079 done / 0080 Projection");

  const align79 = read("docs/master-canon/0079-alignment.md");
  assert.ok(align79.includes("🟡") || align79.includes("🟢"));
  assert.ok(
    align79.includes("read-model") || align79.includes("Live"),
    "0079-alignment marks live read-model wiring partial"
  );
  assert.ok(
    align79.includes("**0080**") && /Projection/i.test(align79),
    "0079-alignment marks 0080 Projection"
  );
  assert.ok(
    (align79.includes("0082") && /Telemetry/i.test(align79)) || (align79.includes("0081") && /Telemetry/i.test(align79)),
    "0079-alignment marks 0081 Telemetry planned"
  );

  console.log("\nMaster Canon 0079 contract: ALL PASS");
}

run();
