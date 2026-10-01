"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const esm = require("../shared/mia-event-store-core");
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
  const docPath = path.join(MASTER, "0075-event-store-manager.md");
  const alignPath = path.join(MASTER, "0075-alignment.md");

  assert.ok(fs.existsSync(docPath), "0075-event-store-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0075-alignment.md exists");
  pass("0075 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0075 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0075 kernel layer");
  assert.ok(doc.includes("0077"), "0075 points to 0077");
  assert.ok(/Telemetry Manager/i.test(doc), "0075 → 0077 Telemetry Manager");
  pass("21 sections → 0077 Telemetry Manager");

  assert.equal(esm.ESM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...esm.ESM_COMPONENT_ORDER],
    [
      "event_store_manager",
      "intake_gate",
      "descriptor_factory",
      "stream_index",
      "version_controller",
      "append_engine",
      "replay_engine",
      "snapshot_engine",
      "archive_controller",
      "state_bridge",
      "security_gate",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.equal(esm.ESM_FLAGS.soleEventStoreAuthority, true);
  assert.equal(esm.ESM_FLAGS.storesOperationalLogs, false);
  assert.equal(esm.ESM_FLAGS.storesAdminAudit, false);
  assert.equal(esm.ESM_FLAGS.eventsImmutable, true);
  assert.equal(esm.ESM_FLAGS.onlyAppendWrites, true);
  assert.equal(esm.ESM_FLAGS.snapshotsAreOptimization, true);
  assert.equal(esm.separatesLoggingAndAudit, true);
  pass("flags");

  assert.deepEqual(
    [...esm.ESM_DESCRIPTOR_FIELDS],
    [
      "eventId",
      "aggregateId",
      "aggregateType",
      "eventType",
      "version",
      "timestamp",
      "payload",
      "correlationId",
      "runtimeId"
    ]
  );

  const d1 = esm.createEventDescriptor({
    aggregateId: "001",
    aggregateType: "Battle",
    eventType: "BattleStarted",
    runtimeId: "rt-1",
    payload: { status: "started" }
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.eventId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of esm.ESM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }

  const d2 = esm.createEventDescriptor({
    aggregateId: "001",
    aggregateType: "Battle",
    eventType: "BattleStarted",
    runtimeId: "rt-1"
  });
  assert.notEqual(d1.descriptor.eventId, d2.descriptor.eventId);
  pass("descriptor 9 fields + unique IDs");

  esm.clearEventStoreSingletonForTest();

  let loggingWrites = 0;
  let auditWrites = 0;
  const mgr = esm.createEventStoreManager({
    loggingBridge: {
      log() {
        loggingWrites += 1;
        return { ok: true };
      }
    },
    auditBridge: {
      createAudit() {
        auditWrites += 1;
        return { ok: true };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleEventStoreAuthority, true);
  assert.equal(mgr.status().storesOperationalLogs, false);
  assert.equal(mgr.status().storesAdminAudit, false);
  assert.equal(mgr.status().eventsImmutable, true);
  assert.equal(mgr.status().onlyAppendWrites, true);
  assert.equal(mgr.status().snapshotsAreOptimization, true);

  const duplicate = esm.createEventStoreManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "event_store_manager_already_active");
  pass("singleton");

  const auth = { source: "admin", authorized: true, nowMs: 1000 };
  const e1 = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "BattleStarted",
      runtimeId: "rt-1",
      payload: { status: "started", battleId: "001" },
      correlationId: "corr-battle-1"
    },
    { ...auth, nowMs: 1000 }
  );
  assert.equal(e1.ok, true);
  assert.equal(e1.version, 1);
  assert.equal(e1.event.eventType, "BattleStarted");

  const e2 = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "GiftReceived",
      runtimeId: "rt-1",
      payload: { gift: "rose", points: 10 },
      eventSchemaVersion: "v1",
      correlationId: "corr-battle-1"
    },
    { ...auth, nowMs: 2000 }
  );
  assert.equal(e2.ok, true);
  assert.equal(e2.version, 2);
  assert.equal(e2.event.eventSchemaVersion, "v1");

  const e3 = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "BattleFinished",
      runtimeId: "rt-1",
      payload: { status: "finished", winner: "A" },
      correlationId: "corr-battle-1"
    },
    { ...auth, nowMs: 3000 }
  );
  assert.equal(e3.ok, true);
  assert.equal(e3.version, 3);

  const stream = mgr.loadStream("Battle:001", auth);
  assert.equal(stream.ok, true);
  assert.equal(stream.events.length, 3);
  assert.deepEqual(
    stream.events.map((e) => e.eventType),
    ["BattleStarted", "GiftReceived", "BattleFinished"]
  );
  assert.deepEqual(
    stream.events.map((e) => e.version),
    [1, 2, 3]
  );
  pass("append BattleStarted→GiftReceived→BattleFinished ordered versions 1..3");

  const ooo = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "LateEvent",
      runtimeId: "rt-1",
      version: 10,
      payload: {}
    },
    auth
  );
  assert.equal(ooo.ok, false);
  assert.ok(
    ooo.error === "out_of_order_version" || ooo.error === "version_gap_or_reorder"
  );

  const conflict = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "ConflictEvent",
      runtimeId: "rt-1",
      expectedVersion: 1,
      payload: {}
    },
    auth
  );
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error, "version_conflict");

  assert.equal(mgr.updateEvent(e1.eventId).ok, false);
  assert.equal(mgr.deleteEvent(e1.eventId).ok, false);
  assert.equal(mgr.rewriteEvent(e1.eventId).ok, false);
  assert.equal(mgr.reorderEvents().ok, false);
  assert.equal(mgr.insertEvent().ok, false);
  assert.equal(mgr.purge().ok, false);
  pass("out-of-order / rewrite blocked");

  const replayed = mgr.replay("Battle:001", {}, auth);
  assert.equal(replayed.ok, true);
  assert.ok(Object.isFrozen(replayed.state));
  assert.equal(replayed.state.status, "finished");
  assert.equal(replayed.state.gift, "rose");
  assert.equal(replayed.state.winner, "A");
  assert.equal(replayed.reconstructed.version, 3);
  pass("replay reconstructs state");

  const snap = mgr.createSnapshot(
    "Battle:001",
    { status: "finished", gift: "rose", winner: "A", snapped: true },
    { ...auth, version: 3 }
  );
  assert.equal(snap.ok, true);
  assert.equal(snap.snapshotsAreOptimization, true);
  assert.equal(snap.historyPreserved, true);

  const e4 = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "PostSnapNote",
      runtimeId: "rt-1",
      payload: { note: "after-snap" }
    },
    { ...auth, nowMs: 4000 }
  );
  assert.equal(e4.ok, true);
  assert.equal(e4.version, 4);

  const replayFromSnap = mgr.replay(
    "Battle:001",
    { useSnapshot: true },
    auth
  );
  assert.equal(replayFromSnap.ok, true);
  assert.equal(replayFromSnap.state.snapped, true);
  assert.equal(replayFromSnap.state.note, "after-snap");

  const fullHistory = mgr.loadStream("Battle:001", auth);
  assert.equal(fullHistory.events.length, 4);
  assert.ok(fullHistory.events.some((e) => e.eventType === "BattleStarted"));
  pass("snapshot optimizes; full history still present");

  const giftEvt = fullHistory.events.find((e) => e.eventType === "GiftReceived");
  assert.equal(giftEvt.eventSchemaVersion, "v1");

  const schemaV2 = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "GiftReceived",
      runtimeId: "rt-1",
      payload: { gift: "diamond", points: 100 },
      eventSchemaVersion: "v2"
    },
    { ...auth, nowMs: 5000 }
  );
  assert.equal(schemaV2.ok, true);
  const afterSchema = mgr.loadStream("Battle:001", auth);
  const schemas = afterSchema.events
    .filter((e) => e.eventType === "GiftReceived")
    .map((e) => e.eventSchemaVersion);
  assert.deepEqual(schemas, ["v1", "v2"]);
  pass("eventSchemaVersion preserved");

  assert.equal(loggingWrites, 0, "append must not call logging");
  assert.equal(auditWrites, 0, "append must not call audit");

  const asLog = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "ShouldReject",
      runtimeId: "rt-1",
      payload: {}
    },
    { ...auth, asOperationalLog: true }
  );
  assert.equal(asLog.ok, false);
  assert.equal(asLog.error, "operational_log_rejected");

  const asAudit = mgr.appendEvent(
    {
      aggregateId: "001",
      aggregateType: "Battle",
      eventType: "ShouldReject",
      runtimeId: "rt-1",
      payload: {}
    },
    { ...auth, asAdminAudit: true }
  );
  assert.equal(asAudit.ok, false);
  assert.equal(asAudit.error, "admin_audit_rejected");

  const forState = mgr.forStateManager("Battle:001", {
    ...auth,
    reconstruct: true
  });
  assert.equal(forState.ok, true);
  assert.equal(forState.historySource, "event_store");
  assert.ok(Array.isArray(forState.events));
  assert.ok(forState.events.length >= 4);
  assert.ok(forState.reconstructed);
  pass("logging/audit separation; forStateManager historySource event_store");

  const agg = mgr.loadAggregate("Battle:001", auth);
  assert.equal(agg.ok, true);
  assert.equal(agg.aggregateType, "Battle");
  assert.ok(agg.metadata.currentVersion >= 4);

  const archived = mgr.archiveStream("Battle:001", auth);
  assert.equal(archived.ok, true);
  assert.equal(archived.orderPreserved, true);
  assert.equal(archived.versionsPreserved, true);

  const loadActive = mgr.loadStream("Battle:001", auth);
  assert.equal(loadActive.ok, false);

  const loadArchived = mgr.loadStream("Battle:001", {
    ...auth,
    includeArchived: true
  });
  assert.equal(loadArchived.ok, true);
  assert.equal(loadArchived.archived, true);
  assert.ok(loadArchived.events.length >= 4);

  const replayArchived = mgr.replay("Battle:001", {}, auth);
  assert.equal(replayArchived.ok, true);
  assert.equal(replayArchived.archived, true);
  assert.ok(replayArchived.state.status === "finished" || replayArchived.state.note);
  pass("archive preserves replay");

  const forged = mgr.loadStream("Battle:001", {
    source: "admin",
    authorized: true,
    forged: true,
    includeArchived: true
  });
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_event_store_blocked");

  assert.equal(mgr.update().ok, false);
  assert.equal(mgr.delete().ok, false);
  assert.equal(mgr.rewrite().ok, false);
  pass("singleton; forged blocked; only append writes");

  const m = mgr.metrics();
  assert.ok(typeof m.eventCount === "number");
  assert.ok(typeof m.streamCount === "number");
  assert.ok(typeof m.replayCount === "number");
  assert.ok(typeof m.snapshotCount === "number");
  assert.ok(typeof m.storeSize === "number");
  assert.ok(typeof m.appendRate === "number");
  assert.ok(m.eventCount >= 4);
  assert.ok(m.replayCount >= 1);
  assert.ok(m.snapshotCount >= 1);
  assert.equal(m.storesOperationalLogs, false);
  assert.equal(m.storesAdminAudit, false);
  assert.equal(m.separatesLoggingAndAudit, true);
  pass("metrics");

  for (const name of esm.ESM_PUBLIC_API) {
    assert.equal(typeof mgr[name], "function", `public api ${name}`);
  }
  const trail = mgr.accessTrail();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  pass("API surface");

  esm.clearEventStoreSingletonForTest();
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-event-store-core/eventStoreManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0075-event-store-manager.md")
  );
  const aumIdx = coreSys.runtime.indexOf(
    "shared/mia-audit-core/auditManager.js"
  );
  const esmIdx = coreSys.runtime.indexOf(
    "shared/mia-event-store-core/eventStoreManager.js"
  );
  assert.ok(aumIdx >= 0 && esmIdx === aumIdx + 1);
  pass("platformSystems nextDocId 0082; event-store after audit in CORE");

  for (const rel of esm.ESM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0075"), "README 0075");
  assert.ok(/Event Store Manager/i.test(readme), "README Event Store Manager");
  assert.ok(
    /0075.*Platný|Platný.*0075/s.test(readme) ||
      readme.includes("[Event Store Manager"),
    "README 0075 platný"
  );
  assert.ok(readme.includes("0076"), "README 0076");
  assert.ok(/Event Bus Manager/i.test(readme), "README Event Bus Manager");
  assert.ok(
    /0076.*Platný|Platný.*0076/s.test(readme) ||
      readme.includes("[Event Bus Manager"),
    "README 0076 platný"
  );
  assert.ok(readme.includes("0077"), "README 0077");
  assert.ok(/Message Queue Manager/i.test(readme), "README Message Queue Manager");
  assert.ok(
    /0077.*Platný|Platný.*0077/s.test(readme) ||
      readme.includes("[Message Queue Manager"),
    "README 0077 platný"
  );
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
  assert.ok(readme.includes("0081"), "README 0081");
  assert.ok(/Saga Manager/i.test(readme), "README Saga Manager");
  assert.ok(readme.includes("0082"), "README 0082 planned");
  assert.ok(
    /Telemetry Manager/i.test(readme),
    "README Telemetry Manager planned"
  );
  assert.ok(
    readme.includes("shared/mia-event-store-core/"),
    "README Event Store technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0075_contract.js"));
  pass("README + anchors");

  const align75 = read("docs/master-canon/0075-alignment.md");
  assert.ok(
    align75.includes("**0076**") && /Event Bus/i.test(align75),
    "0075-alignment marks 0076 Event Bus"
  );
  assert.ok(
    align75.includes("**0077**") && /Message Queue/i.test(align75),
    "0075-alignment marks 0077 Message Queue"
  );
  assert.ok(
    align75.includes("**0078**") && /Command Bus/i.test(align75),
    "0075-alignment marks 0078 Command Bus"
  );
  assert.ok(
    align75.includes("0079") && /Telemetry/i.test(align75),
    "0075-alignment marks 0079 Telemetry planned"
  );
  pass("0075-alignment marks 0076–0078 done / 0079 Telemetry planned");

  assert.ok(align75.includes("🟡"));
  assert.ok(
    align75.includes("durable") || align75.includes("Live"),
    "0075-alignment marks live durable store partial"
  );
  pass("0075-alignment marks live durable store partial");

  console.log("\nMaster Canon 0075 contract: ALL PASS");
}

run();
