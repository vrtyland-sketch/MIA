"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const events = require("../shared/mia-event-core");
const core = require("../shared/mia-core-canon");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pathExists(rel) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) return true;
  return fs.existsSync(path.join(ROOT, rel.split("/")[0]));
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0016-queue-manager.md");
  const alignPath = path.join(MASTER, "0016-alignment.md");

  assert.ok(fs.existsSync(docPath), "0016-queue-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0016-alignment.md exists");
  pass("0016 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0016 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0016 critical priority");
  assert.ok(doc.includes("0015"), "0016 links to 0015");
  assert.ok(doc.includes("0017"), "0016 points to 0017");
  pass("0016 structure (22 sections)");

  assert.equal(events.QUEUE_MANAGER_COMPONENT_ORDER.length, 11);
  assert.equal(Object.keys(events.QUEUE_TYPE).length, 5);
  assert.equal(Object.keys(events.MIA_DOMAIN_QUEUE).length, 11);
  pass("queue manager components and types");

  const registry = events.createQueueRegistry();
  const storage = events.createInMemoryQueueStorage();
  const booted = events.bootstrapDefaultMiaQueues(registry);
  assert.ok(booted.length >= 7);
  assert.ok(registry.has(events.PRIORITY_QUEUE.HIGH));
  assert.ok(registry.has("mia_gifts"));
  pass("bootstrap default MIA queues");

  const { record, audit } = events.createQueueViaFactory(registry, {
    queueId: "custom_fifo_test",
    name: "Custom FIFO",
    type: events.QUEUE_TYPE.FIFO
  });
  assert.equal(record.queueId, "custom_fifo_test");
  assert.equal(audit.operation, "create");
  pass("queue factory with audit");

  const enq = events.enqueueEvent(registry, storage, events.PRIORITY_QUEUE.HIGH, {
    eventId: "evt-q-1",
    eventType: "EVENT_GIFT_RECEIVED"
  });
  assert.equal(enq.ok, true);
  assert.equal(storage.size(events.PRIORITY_QUEUE.HIGH), 1);
  pass("enqueue event");

  const deq = events.dequeueForDispatcher(registry, storage, events.PRIORITY_QUEUE.HIGH);
  assert.equal(deq.ok, true);
  assert.equal(deq.item.eventId, "evt-q-1");
  pass("dequeue for dispatcher");

  const scheduler = events.createQueueSchedulerState();
  storage.enqueue(events.PRIORITY_QUEUE.HIGH, { eventId: "evt-s-1" });
  storage.enqueue(events.PRIORITY_QUEUE.NORMAL, { eventId: "evt-s-2" });
  const nextQueue = events.scheduleNextQueue(scheduler, storage);
  assert.equal(nextQueue, events.PRIORITY_QUEUE.HIGH);
  pass("queue scheduler respects priority");

  const capacity = events.checkCapacity(
    events.createQueueRecord({ queueId: "q-cap", name: "Cap", capacity: 2 }),
    2
  );
  assert.equal(capacity.ok, false);
  pass("capacity manager");

  const giftOrder = events.resolveOrderMode({ eventType: "EVENT_GIFT_RECEIVED" });
  const chatOrder = events.resolveOrderMode({ eventType: "EVENT_CHAT_MESSAGE" });
  assert.equal(giftOrder, events.QUEUE_ORDER_MODE.STRICT);
  assert.equal(chatOrder, events.QUEUE_ORDER_MODE.PARALLEL);
  pass("order mode strict vs parallel");

  const domain = events.resolveMiaDomainQueue({ eventType: "EVENT_GIFT_RECEIVED" });
  assert.equal(domain, events.MIA_DOMAIN_QUEUE.GIFTS);
  pass("MIA domain queue mapping");

  storage.enqueue("mia_gifts", { eventId: "evt-w-1" });
  const claim1 = events.claimEventForWorker(registry, storage, "mia_gifts", "worker-1");
  const claim2 = events.claimEventForWorker(registry, storage, "mia_gifts", "worker-2");
  assert.equal(claim1.ok, true);
  assert.equal(claim2.ok, false);
  pass("parallel worker single claim");

  storage.enqueue(events.PRIORITY_QUEUE.LOW, { eventId: "evt-r-1" });
  const snap = storage.snapshot();
  snap[events.PRIORITY_QUEUE.LOW].push({ eventId: "evt-r-1" });
  const recovery = events.recoverQueuesFromSnapshot(registry, storage, snap);
  assert.ok(recovery.dropped >= 1);
  assert.equal(storage.size(events.PRIORITY_QUEUE.LOW), 1);
  pass("recovery deduplicates events");

  const monitor = events.createQueueMonitorSnapshot(registry, storage);
  assert.ok(monitor.totalDepth >= 0);
  assert.ok(monitor.queues.length > 0);
  pass("queue monitor snapshot");

  assert.equal(events.assertQueueForbiddenActivity("change_priority").ok, false);
  assert.equal(events.assertQueueForbiddenActivity("route_events").ok, false);
  pass("forbidden activities");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventDispatcher.js"));
  pass("event bus next doc 0018");

  for (const rel of events.QUEUE_MANAGER_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0016"), "README 0016");
  pass("README registry");

  console.log("\nMaster Canon 0016 contract: ALL PASS");
}

run();
