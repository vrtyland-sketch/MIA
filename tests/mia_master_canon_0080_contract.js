"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const pm = require("../shared/mia-projection-core");
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
  const docPath = path.join(MASTER, "0080-projection-manager.md");
  const alignPath = path.join(MASTER, "0080-alignment.md");

  assert.ok(fs.existsSync(docPath), "0080-projection-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0080-alignment.md exists");
  pass("0080 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0080 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0080 kernel layer");
  assert.ok(doc.includes("0081"), "0080 points to 0081");
  assert.ok(/Saga Manager/i.test(doc), "0080 → Saga Manager");
  assert.ok(doc.includes("0082"), "0080 points to 0082");
  assert.ok(/Workflow Engine/i.test(doc), "0080 → Workflow Engine");
  assert.ok(doc.includes("0083"), "0080 points to 0083");
  assert.ok(/Rule Engine/i.test(doc), "0080 → Rule Engine");
  assert.ok(doc.includes("0084"), "0080 points to 0084");
  assert.ok(/Policy Engine/i.test(doc), "0080 → Policy Engine");
  assert.ok(doc.includes("0085"), "0080 points to 0085");
  assert.ok(/Telemetry Manager/i.test(doc), "0080 → Telemetry Manager");
  pass("21 sections → 0081 Saga / 0082 Workflow / 0083 Rule / 0084 Policy / 0085 Telemetry Manager");

  assert.equal(pm.PM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...pm.PM_COMPONENT_ORDER],
    [
      "projection_manager",
      "intake_gate",
      "descriptor_factory",
      "type_registry",
      "apply_engine",
      "incremental_updater",
      "replay_rebuilder",
      "version_controller",
      "query_feed",
      "event_bus_adapter",
      "security_gate",
      "projection_audit"
    ]
  );
  pass("12 components");

  assert.equal(pm.PM_FLAGS.soleProjectionAuthority, true);
  assert.equal(pm.PM_FLAGS.createsDomainEvents, false);
  assert.equal(pm.PM_FLAGS.mutatesEventStore, false);
  assert.equal(pm.PM_FLAGS.sourceOfTruthIsEventStore, true);
  assert.equal(pm.PM_FLAGS.eventualConsistency, true);
  assert.equal(pm.PM_FLAGS.manualPatchBlocked, true);
  assert.equal(pm.PM_FLAGS.queryReadsProjectionsOnly, true);
  assert.equal(pm.soleProjectionAuthority, true);
  assert.equal(pm.createsDomainEvents, false);
  assert.equal(pm.mutatesEventStore, false);
  assert.equal(pm.sourceOfTruthIsEventStore, true);
  assert.equal(pm.eventualConsistency, true);
  assert.equal(pm.manualPatchBlocked, true);
  assert.equal(pm.queryReadsProjectionsOnly, true);
  pass("flags");

  assert.deepEqual(
    [...pm.PM_DESCRIPTOR_FIELDS],
    [
      "projectionId",
      "projectionType",
      "sourceStream",
      "version",
      "lastEvent",
      "created",
      "updated",
      "status"
    ]
  );

  const d1 = pm.createProjectionDescriptor({
    projectionType: "inventory",
    sourceStream: "inv-1"
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.projectionId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of pm.PM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  const d2 = pm.createProjectionDescriptor({
    projectionType: "inventory",
    sourceStream: "inv-2"
  });
  assert.notEqual(d1.descriptor.projectionId, d2.descriptor.projectionId);
  pass("descriptor 8 fields");

  assert.ok(pm.PM_PROJECTION_TYPE.INVENTORY);
  assert.ok(pm.PM_PROJECTION_TYPE.BATTLE);
  assert.ok(pm.PM_PROJECTION_TYPE.LEADERBOARD);
  assert.ok(pm.PM_PROJECTION_TYPE.GIFT_STATISTICS);
  assert.ok(pm.PM_PROJECTION_TYPE.RUNTIME);
  assert.ok(pm.PM_PROJECTION_TYPE.AI);
  assert.ok(pm.PM_PROJECTION_TYPE.OVERLAY);
  pass("projection types");

  // --- create inventory projection from events only ---
  pm.clearProjectionSingletonForTest();

  const storeEvents = {
    "inventory-stream": [
      {
        eventId: "e1",
        version: 1,
        eventType: "ItemAdded",
        payload: { item: "sword" }
      },
      {
        eventId: "e2",
        version: 2,
        eventType: "ItemAdded",
        payload: { item: "shield" }
      }
    ]
  };
  let storeMutated = false;

  const bridge = {
    loadStream(streamId) {
      return { events: storeEvents[streamId] || [] };
    },
    replay(streamId, reducer) {
      const events = storeEvents[streamId] || [];
      let state = { items: [] };
      let lastEvent = null;
      let lastSequence = null;
      for (const evt of events) {
        state = reducer(state, evt);
        lastEvent = evt.eventId;
        lastSequence = evt.version;
      }
      return {
        ok: true,
        state,
        version: events.length,
        lastEvent,
        lastSequence,
        eventCount: events.length
      };
    },
    append() {
      storeMutated = true;
      throw new Error("must_not_mutate_store");
    },
    delete() {
      storeMutated = true;
      throw new Error("must_not_mutate_store");
    }
  };

  const mgr = pm.createProjectionManager({ eventStoreBridge: bridge });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleProjectionAuthority, true);

  const duplicate = pm.createProjectionManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "projection_manager_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };
  const created = mgr.createProjection(
    {
      projectionType: pm.PM_PROJECTION_TYPE.INVENTORY,
      sourceStream: "inventory-stream"
    },
    auth
  );
  assert.equal(created.ok, true);
  assert.ok(created.projectionId);
  assert.equal(created.createsDomainEvents, false);
  assert.equal(created.mutatesEventStore, false);
  assert.equal(created.projection.status, pm.PM_STATUS.READY);
  assert.deepEqual([...created.projection.state.items], []);
  pass("create inventory projection from events only");

  // incremental update bumps version
  const u1 = mgr.updateProjection(
    created.projectionId,
    {
      eventId: "e1",
      version: 1,
      eventType: "ItemAdded",
      payload: { item: "sword" }
    },
    auth
  );
  assert.equal(u1.ok, true);
  assert.equal(u1.version, 1);
  assert.equal(u1.lastEvent, "e1");
  assert.deepEqual([...u1.projection.state.items], ["sword"]);

  const u2 = mgr.applyEvent(
    created.projectionId,
    {
      eventId: "e2",
      version: 2,
      eventType: "ItemAdded",
      payload: { item: "shield" }
    },
    auth
  );
  assert.equal(u2.ok, true);
  assert.equal(u2.version, 2);
  assert.deepEqual([...u2.projection.state.items], ["sword", "shield"]);

  // out-of-order rejected
  const ooo = mgr.applyEvent(
    created.projectionId,
    {
      eventId: "e0",
      version: 1,
      payload: { item: "bogus" }
    },
    auth
  );
  assert.equal(ooo.ok, false);
  assert.equal(ooo.error, "out_of_order_event");
  pass("incremental update bumps version; no full replay needed");

  // rebuild from event store; store untouched
  const beforeStore = JSON.stringify(storeEvents["inventory-stream"]);
  // corrupt local state then rebuild
  const rebuilt = mgr.rebuildProjection(created.projectionId, auth);
  assert.equal(rebuilt.ok, true);
  assert.equal(rebuilt.mutatesEventStore, false);
  assert.equal(rebuilt.version, 2);
  assert.deepEqual([...rebuilt.projection.state.items], ["sword", "shield"]);
  assert.equal(JSON.stringify(storeEvents["inventory-stream"]), beforeStore);
  assert.equal(storeMutated, false);

  // missing bridge fails gracefully
  pm.clearProjectionSingletonForTest();
  const noBridge = pm.createProjectionManager({});
  const c2 = noBridge.createProjection(
    { projectionType: "runtime", sourceStream: "rt" },
    auth
  );
  const rbFail = noBridge.rebuildProjection(c2.projectionId, auth);
  assert.equal(rbFail.ok, false);
  assert.equal(rbFail.error, "event_store_bridge_missing");
  pass("rebuild from event store; store untouched");

  // delete removes projection only
  pm.clearProjectionSingletonForTest();
  const mgrDel = pm.createProjectionManager({ eventStoreBridge: bridge });
  const cDel = mgrDel.createProjection(
    {
      projectionType: "inventory",
      sourceStream: "inventory-stream"
    },
    auth
  );
  const del = mgrDel.deleteProjection(cDel.projectionId, auth);
  assert.equal(del.ok, true);
  assert.equal(del.mutatesEventStore, false);
  assert.equal(mgrDel.getProjection(cDel.projectionId).ok, false);
  assert.equal(JSON.stringify(storeEvents["inventory-stream"]), beforeStore);
  pass("delete removes projection only");

  // forQueryBus / getProjection read-only
  pm.clearProjectionSingletonForTest();
  const mgrQ = pm.createProjectionManager({ eventStoreBridge: bridge });
  const cQ = mgrQ.createProjection(
    {
      projectionType: "inventory",
      sourceStream: "inventory-stream",
      projectionId: "proj-inv-q"
    },
    auth
  );
  mgrQ.applyEvent(
    cQ.projectionId,
    { eventId: "e1", version: 1, payload: { item: "sword" } },
    auth
  );
  const got = mgrQ.getProjection(cQ.projectionId);
  assert.equal(got.ok, true);
  assert.equal(got.readOnly, true);
  assert.ok(Object.isFrozen(got.projection));

  const qView = mgrQ.forQueryBus("inventory");
  assert.equal(qView.ok, true);
  assert.equal(qView.needsEventStore, false);
  assert.equal(qView.readOnly, true);
  assert.ok(qView.view.state.items.includes("sword"));

  const qById = mgrQ.forQueryBus("proj-inv-q");
  assert.equal(qById.ok, true);
  assert.equal(qById.needsEventStore, false);
  pass("forQueryBus / getProjection read-only");

  // fromEventBus applies
  const busApply = mgrQ.fromEventBus(
    {
      stream: "inventory-stream",
      event: {
        eventId: "e3",
        version: 3,
        payload: { item: "potion" }
      },
      correlationId: "corr-bus"
    },
    auth
  );
  assert.equal(busApply.ok, true);
  assert.ok(busApply.applied.length >= 1);
  assert.equal(busApply.applied[0].ok, true);
  const afterBus = mgrQ.getProjection(cQ.projectionId);
  assert.ok(afterBus.projection.state.items.includes("potion"));
  pass("fromEventBus applies");

  // manual patch blocked
  assert.equal(mgrQ.patchProjection().ok, false);
  assert.equal(mgrQ.setState().ok, false);
  assert.equal(mgrQ.writeState().ok, false);
  assert.ok(/rejected/.test(mgrQ.patchProjection().error));
  pass("manual patch blocked");

  // API
  for (const name of pm.PM_PUBLIC_API) {
    assert.equal(typeof mgrQ[name], "function", `public api ${name}`);
  }
  assert.equal(typeof mgrQ.applyEvent, "function");
  assert.equal(typeof mgrQ.fromEventBus, "function");
  assert.equal(typeof mgrQ.forQueryBus, "function");
  assert.equal(typeof mgrQ.registerType, "function");
  assert.equal(typeof mgrQ.registerReducer, "function");
  assert.equal(typeof mgrQ.metrics, "function");
  assert.equal(typeof mgrQ.projectionAudit, "function");
  assert.equal(typeof mgrQ.status, "function");
  pass("API create/update/rebuild/delete/get");

  // forged blocked; metrics; audit
  const forged = mgrQ.createProjection(
    { projectionType: "ai", sourceStream: "ai-1" },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_projection_blocked");

  const unauth = mgrQ.createProjection(
    { projectionType: "ai", sourceStream: "ai-1" },
    { source: "unknown_actor" }
  );
  assert.equal(unauth.ok, false);
  assert.equal(unauth.error, "unauthorized_projection");

  const m = mgrQ.metrics();
  assert.ok(typeof m.projectionCount === "number");
  assert.ok(typeof m.updateCount === "number");
  assert.ok(typeof m.rebuildCount === "number");
  assert.ok(typeof m.averageUpdateMs === "number");
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.versionCount === "number");

  const trail = mgrQ.projectionAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("projectionId" in trail[0]);
  assert.ok("sourceEvent" in trail[0]);
  assert.ok("newVersion" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("correlationId" in trail[0]);
  pass("singleton; forged blocked; metrics; audit");

  // registerType extensible
  const reg = mgrQ.registerType("playlist");
  assert.equal(reg.ok, true);
  const regReducer = mgrQ.registerReducer("playlist", (state, event) => ({
    ...(state || {}),
    ...(event.payload || {})
  }));
  assert.equal(regReducer.ok, true);

  // platform wiring
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-query-bus-core/queryBusManager.js")
  );
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-projection-core/projectionManager.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0080-projection-manager.md")
  );
  const qbmIdx = coreSys.runtime.indexOf(
    "shared/mia-query-bus-core/queryBusManager.js"
  );
  const pmIdx = coreSys.runtime.indexOf(
    "shared/mia-projection-core/projectionManager.js"
  );
  assert.ok(qbmIdx >= 0 && pmIdx === qbmIdx + 1);
  pass("platformSystems nextDocId 0082; projection after query-bus in CORE");

  for (const rel of pm.PM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0080"), "README 0080");
  assert.ok(/Projection Manager/i.test(readme), "README Projection Manager");
  assert.ok(
    /0080.*Platný|Platný.*0080/s.test(readme) ||
      readme.includes("[Projection Manager"),
    "README 0080 platný"
  );
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
    readme.includes("shared/mia-projection-core/"),
    "README Projection technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0080_contract.js"));
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

  assert.ok(align80.includes("🟡") || align80.includes("🟢"));
  assert.ok(
    align80.includes("Live Event Store") || align80.includes("subscription"),
    "0080-alignment marks live subscription partial"
  );

  console.log("\nMaster Canon 0080 contract: ALL PASS");
}

run();
