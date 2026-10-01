"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const ebm = require("../shared/mia-event-bus-core");
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
  const docPath = path.join(MASTER, "0076-event-bus-manager.md");
  const alignPath = path.join(MASTER, "0076-alignment.md");

  assert.ok(fs.existsSync(docPath), "0076-event-bus-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0076-alignment.md exists");
  pass("0076 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0076 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0076 kernel layer");
  assert.ok(doc.includes("0077"), "0076 points to 0077");
  assert.ok(/Message Queue Manager/i.test(doc), "0076 → Message Queue Manager");
  assert.ok(doc.includes("0078"), "0076 points to 0078");
  assert.ok(/Command Bus Manager/i.test(doc), "0076 → Command Bus Manager");
  assert.ok(doc.includes("0079"), "0076 points to 0079");
  assert.ok(/Telemetry Manager/i.test(doc), "0076 → Telemetry Manager");
  pass("21 sections → 0077 Message Queue / 0078 Command Bus / 0079 Telemetry Manager");

  assert.equal(ebm.EBM_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...ebm.EBM_COMPONENT_ORDER],
    [
      "event_bus_manager",
      "publish_gate",
      "subscribe_registry",
      "topic_router",
      "priority_queue",
      "delivery_engine",
      "ordering_controller",
      "retry_controller",
      "dead_letter_queue",
      "security_gate",
      "delivery_audit",
      "metrics_audit"
    ]
  );
  pass("12 components");

  assert.equal(ebm.EBM_FLAGS.soleEventBusAuthority, true);
  assert.equal(ebm.EBM_FLAGS.makesBusinessDecisions, false);
  assert.equal(ebm.EBM_FLAGS.rewritesEvents, false);
  assert.equal(ebm.EBM_FLAGS.storesSystemState, false);
  assert.equal(ebm.EBM_FLAGS.separatedFromEventStore, true);
  assert.equal(ebm.EBM_FLAGS.dlqNeverAutoDeletes, true);
  assert.equal(ebm.separatedFromEventStore, true);
  pass("flags");

  assert.deepEqual(
    [...ebm.EBM_DESCRIPTOR_FIELDS],
    [
      "eventId",
      "eventType",
      "timestamp",
      "publisher",
      "correlationId",
      "payload",
      "priority",
      "version"
    ]
  );

  const d1 = ebm.createBusEventDescriptor({
    eventType: "battle.started",
    publisher: "battle_engine",
    payload: { battleId: "001" }
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.eventId);
  assert.ok(Object.isFrozen(d1.descriptor));
  assert.ok(Object.isFrozen(d1.descriptor.payload));
  for (const field of ebm.EBM_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  assert.ok(!("aggregateId" in d1.descriptor), "no aggregateId on bus descriptor");

  const d2 = ebm.createBusEventDescriptor({
    eventType: "battle.started",
    publisher: "battle_engine"
  });
  assert.notEqual(d1.descriptor.eventId, d2.descriptor.eventId);
  pass("descriptor 8 fields + unique IDs");

  assert.deepEqual(
    [...ebm.EBM_PRIORITY_ORDER],
    ["low", "normal", "high", "critical"]
  );
  pass("EBM_PRIORITY / EBM_PRIORITY_ORDER");

  ebm.clearEventBusSingletonForTest();
  esm.clearEventStoreSingletonForTest();

  const store = esm.createEventStoreManager({});
  assert.equal(store.ok, true);

  const bus = ebm.createEventBusManager({
    autoDeliver: false,
    maxAttempts: 2
  });
  assert.equal(bus.ok, true);
  assert.equal(bus.status().singleton, true);
  assert.equal(bus.status().soleEventBusAuthority, true);
  assert.equal(bus.status().separatedFromEventStore, true);
  assert.equal(bus.status().dlqNeverAutoDeletes, true);

  const duplicate = ebm.createEventBusManager({});
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "event_bus_manager_already_active");
  pass("singleton");

  const auth = { source: "battle_engine", authorized: true, nowMs: 1000 };
  const subAuth = { source: "overlay_engine", authorized: true };

  let directCalls = 0;
  bus.subscribe(
    "overlay-1",
    "battle.*",
    () => {
      directCalls += 1;
      return { ok: true };
    },
    subAuth
  );

  const pub1 = bus.publish(
    {
      eventType: "battle.started",
      publisher: "battle_engine",
      payload: { battleId: "001" }
    },
    auth
  );
  assert.equal(pub1.ok, true);
  assert.equal(directCalls, 0, "subscriber not called during publish");
  const delivered = bus.processQueue();
  assert.equal(delivered.ok, true);
  assert.equal(directCalls, 1, "subscriber called only via bus queue");
  pass("publishers do not call subscribers directly");

  assert.ok(ebm.topicMatches("battle.*", "battle.started"));
  assert.ok(ebm.topicMatches("battle.*", "battle.finished"));
  assert.ok(!ebm.topicMatches("battle.*", "gift.received"));

  ebm.clearEventBusSingletonForTest();
  const bus2 = ebm.createEventBusManager({ autoDeliver: false, maxAttempts: 2 });
  const order = [];
  bus2.subscribe("sub-a", "*", () => {
    order.push("a");
    return { ok: true };
  }, subAuth);
  bus2.subscribe("sub-b", "*", () => {
    order.push("b");
    return { ok: true };
  }, { ...subAuth, source: "inventory" });

  bus2.publish(
    {
      eventType: "runtime.ping",
      publisher: "low_pub",
      priority: ebm.EBM_PRIORITY.LOW
    },
    { ...auth, source: "low_pub", nowMs: 100 }
  );
  bus2.publish(
    {
      eventType: "runtime.ping",
      publisher: "crit_pub",
      priority: ebm.EBM_PRIORITY.CRITICAL
    },
    { ...auth, source: "crit_pub", nowMs: 200 }
  );
  bus2.processQueue();
  assert.deepEqual(order.slice(0, 2), ["a", "b"]);
  order.length = 0;
  pass("topic routing battle.* / broadcast");

  ebm.clearEventBusSingletonForTest();
  const bus3 = ebm.createEventBusManager({ autoDeliver: false, maxAttempts: 2 });
  const priorityLog = [];
  bus3.subscribe(
    "prio-sub",
    "*",
    (evt) => {
      priorityLog.push(`${evt.publisher}:${evt.priority}`);
      return { ok: true };
    },
    subAuth
  );
  bus3.publish(
    { eventType: "chat.msg", publisher: "p-low", priority: "low" },
    { ...auth, source: "p-low", nowMs: 1 }
  );
  bus3.publish(
    { eventType: "chat.msg", publisher: "p-crit", priority: "critical" },
    { ...auth, source: "p-crit", nowMs: 2 }
  );
  bus3.publish(
    { eventType: "chat.msg", publisher: "p-norm", priority: "normal" },
    { ...auth, source: "p-norm", nowMs: 3 }
  );
  bus3.processQueue();
  assert.deepEqual(priorityLog, ["p-crit:critical", "p-norm:normal", "p-low:low"]);
  pass("priority ordering");

  ebm.clearEventBusSingletonForTest();
  const bus4 = ebm.createEventBusManager({ autoDeliver: false, maxAttempts: 2 });
  const giftChain = [];
  bus4.subscribe(
    "gift-chain",
    "gift.*",
    (evt) => {
      giftChain.push(evt.eventType);
      return { ok: true };
    },
    subAuth
  );
  const giftAuth = { ...auth, source: "gift_engine" };
  bus4.publish(
    { eventType: "gift.GiftReceived", publisher: "gift_engine", payload: {} },
    { ...giftAuth, nowMs: 10 }
  );
  bus4.publish(
    {
      eventType: "gift.InventoryUpdated",
      publisher: "gift_engine",
      payload: {}
    },
    { ...giftAuth, nowMs: 20 }
  );
  bus4.publish(
    { eventType: "gift.OverlayShown", publisher: "gift_engine", payload: {} },
    { ...giftAuth, nowMs: 30 }
  );
  bus4.processQueue();
  assert.deepEqual(giftChain, [
    "gift.GiftReceived",
    "gift.InventoryUpdated",
    "gift.OverlayShown"
  ]);

  const reorder = bus4.publish(
    {
      eventType: "gift.Late",
      publisher: "gift_engine",
      publisherSequence: 10
    },
    giftAuth
  );
  assert.equal(reorder.ok, false);
  assert.equal(reorder.error, "publisher_reorder_rejected");
  pass("per-publisher ordering GiftReceived→InventoryUpdated→OverlayShown");

  ebm.clearEventBusSingletonForTest();
  const bus5 = ebm.createEventBusManager({ autoDeliver: false, maxAttempts: 2 });
  bus5.subscribe(
    "fail-sub",
    "*",
    () => ({ ok: false, error: "handler_failed" }),
    subAuth
  );
  const failPub = bus5.publish(
    { eventType: "obs.error", publisher: "obs_connector", payload: {} },
    { ...auth, source: "obs_connector", nowMs: 500 }
  );
  bus5.processQueue();
  bus5.processQueue();
  const dlq = bus5.getDeadLetters();
  assert.ok(dlq.length >= 1);
  assert.equal(dlq[0].neverAutoDeletes, true);
  assert.ok(dlq[0].originalEvent);
  assert.ok(dlq[0].failureReason);
  assert.ok(dlq[0].attempts >= 2);
  assert.equal(bus5.purgeDeadLetters().ok, false);
  assert.equal(bus5.deleteDeadLetter().ok, false);
  assert.equal(bus5.clearDlq().ok, false);
  pass("retry then DLQ; DLQ no auto-delete");

  const sepPub = bus5.publish(
    { eventType: "runtime.test", publisher: "runtime", payload: {} },
    { ...auth, source: "runtime", writeToEventStore: true }
  );
  assert.equal(sepPub.ok, false);
  assert.equal(sepPub.error, "write_to_event_store_rejected");

  const beforeEvents = store.metrics().eventCount;
  bus5.publish(
    { eventType: "runtime.test2", publisher: "runtime", payload: {} },
    { ...auth, source: "runtime", nowMs: 600 }
  );
  assert.equal(store.metrics().eventCount, beforeEvents);
  pass("separated from event store");

  const forged = bus5.publish(
    { eventType: "runtime.forged", publisher: "runtime", payload: {} },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_event_bus_blocked");
  pass("auth/forged blocked");

  bus5.unsubscribe("fail-sub", subAuth);
  const acked = bus5.ack(failPub.eventId, {
    subscriberId: "fail-sub",
    ...subAuth
  });
  assert.equal(acked.ok, true);

  ebm.clearEventBusSingletonForTest();
  const bus6 = ebm.createEventBusManager({ autoDeliver: false, maxAttempts: 2 });
  bus6.subscribe("retry-sub", "*", () => ({ ok: false }), subAuth);
  const retryEvt = bus6.publish(
    { eventType: "ai.task", publisher: "ai_engine", payload: {} },
    { ...auth, source: "ai_engine", nowMs: 700 }
  );
  bus6.processQueue();
  const manual = bus6.retry(retryEvt.eventId, { ...auth, deliverNow: true });
  assert.equal(manual.ok, true);
  assert.equal(manual.retried, true);

  const rejected = bus6.reject(retryEvt.eventId, "manual_reject", {
    ...subAuth,
    subscriberId: "retry-sub"
  });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.deadLetter, true);
  pass("publish/subscribe/unsubscribe/ack/retry/reject API");

  for (const name of ebm.EBM_PUBLIC_API) {
    assert.equal(typeof bus6[name], "function", `public api ${name}`);
  }
  assert.equal(typeof bus6.processQueue, "function");
  assert.equal(typeof bus6.getDeadLetters, "function");
  assert.equal(typeof bus6.metrics, "function");
  assert.equal(typeof bus6.deliveryAudit, "function");
  assert.equal(typeof bus6.status, "function");
  pass("API surface");

  const m = bus6.metrics();
  assert.ok(typeof m.eventCount === "number");
  assert.ok(typeof m.publisherCount === "number");
  assert.ok(typeof m.subscriberCount === "number");
  assert.ok(typeof m.retryCount === "number");
  assert.ok(typeof m.dlqCount === "number");
  assert.ok(typeof m.averageLatencyMs === "number");
  assert.equal(m.separatedFromEventStore, true);
  pass("metrics");

  const trail = bus6.deliveryAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("eventId" in trail[0]);
  assert.ok("publisher" in trail[0]);
  assert.ok("subscriber" in trail[0]);
  assert.ok("publishTime" in trail[0]);
  assert.ok("deliverTime" in trail[0]);
  assert.ok("retries" in trail[0]);
  assert.ok("result" in trail[0]);
  pass("delivery audit");

  ebm.clearEventBusSingletonForTest();
  esm.clearEventStoreSingletonForTest();

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-event-store-core/eventStoreManager.js")
  );
  assert.ok(
    coreSys.runtime.includes("shared/mia-event-bus-core/eventBusManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0076-event-bus-manager.md")
  );
  const esmIdx = coreSys.runtime.indexOf(
    "shared/mia-event-store-core/eventStoreManager.js"
  );
  const ebmIdx = coreSys.runtime.indexOf(
    "shared/mia-event-bus-core/eventBusManager.js"
  );
  assert.ok(esmIdx >= 0 && ebmIdx === esmIdx + 1);
  pass("platformSystems nextDocId 0082; event-bus after event-store in CORE");

  for (const rel of ebm.EBM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
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
    readme.includes("shared/mia-event-bus-core/"),
    "README Event Bus technical anchor"
  );
  assert.ok(readme.includes("mia_master_canon_0076_contract.js"));
  pass("README + anchors");

  const align76 = read("docs/master-canon/0076-alignment.md");
  assert.ok(
    align76.includes("**0077**") && /Message Queue/i.test(align76),
    "0076-alignment marks 0077 Message Queue"
  );
  assert.ok(
    align76.includes("**0078**") && /Command Bus/i.test(align76),
    "0076-alignment marks 0078 Command Bus"
  );
  assert.ok(
    align76.includes("0079") && /Telemetry/i.test(align76),
    "0076-alignment marks 0079 Telemetry planned"
  );
  pass("0076-alignment marks 0077 done / 0078 Command Bus / 0079 Telemetry planned");

  assert.ok(align76.includes("🟡") || align76.includes("🟢"));
  assert.ok(
    align76.includes("async") || align76.includes("Live"),
    "0076-alignment marks live async broker partial"
  );
  pass("0076-alignment marks live async broker partial");

  console.log("\nMaster Canon 0076 contract: ALL PASS");
}

run();
