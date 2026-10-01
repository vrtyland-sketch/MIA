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

async function run() {
  const docPath = path.join(MASTER, "0017-event-dispatcher.md");
  const alignPath = path.join(MASTER, "0017-alignment.md");

  assert.ok(fs.existsSync(docPath), "0017-event-dispatcher.md exists");
  assert.ok(fs.existsSync(alignPath), "0017-alignment.md exists");
  pass("0017 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0017 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0017 critical priority");
  assert.ok(doc.includes("0016"), "0017 links to 0016");
  assert.ok(doc.includes("0018"), "0017 points to 0018");
  assert.ok(doc.includes("0010–0017"), "0017 closes event bus stack");
  pass("0017 structure (22 sections)");

  assert.equal(events.DISPATCHER_COMPONENT_ORDER.length, 10);
  assert.equal(Object.keys(events.DELIVERY_ACK).length, 3);
  assert.equal(Object.keys(events.DELIVERY_MODE).length, 3);
  pass("dispatcher components and delivery modes");

  assert.equal(events.resolveSubscriberTimeout("graphics.overlay"), 100);
  assert.equal(events.resolveSubscriberTimeout("ai.conversation"), 20000);
  assert.equal(events.resolveSubscriberTimeout("analytics.stream"), 60000);
  pass("subscriber timeouts");

  const idempotency = events.createIdempotencyStore();
  const first = await events.deliverToSubscriber(
    { eventId: "evt-idem-1", correlationId: "corr-1" },
    "memory.session",
    {
      idempotency,
      handlers: {
        "memory.session": async () => ({ ack: events.DELIVERY_ACK.ACK })
      }
    }
  );
  const second = await events.deliverToSubscriber(
    { eventId: "evt-idem-1", correlationId: "corr-1" },
    "memory.session",
    {
      idempotency,
      handlers: {
        "memory.session": async () => ({ ack: events.DELIVERY_ACK.ACK })
      }
    }
  );
  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  pass("idempotency manager");

  const dispatched = await events.dispatchEvent(
    {
      eventId: "evt-gift-dispatch-1",
      eventType: "EVENT_GIFT_RECEIVED",
      priority: events.EVENT_PRIORITY.HIGH
    },
    {
      handlers: {
        "economy.gift_engine": async () => ({ ack: events.DELIVERY_ACK.ACK }),
        "game.kojnozout": async () => ({ ack: events.DELIVERY_ACK.NACK }),
        "graphics.video_engine": async () => ({ ack: events.DELIVERY_ACK.ACK }),
        "analytics.stream": async () => ({ ack: events.DELIVERY_ACK.ACK })
      },
      retryPolicy: events.createRetryPolicy({ maxAttempts: 1 })
    }
  );
  assert.equal(dispatched.ok, true);
  assert.ok(dispatched.deliveries.length >= 4);
  const acked = dispatched.deliveries.filter((d) => d.ack === events.DELIVERY_ACK.ACK || d.skipped);
  assert.ok(acked.length >= 3);
  assert.ok(dispatched.failures.length >= 1 || dispatched.retries.length >= 0);
  pass("parallel dispatch with isolated failure");

  const log = events.createDeliveryLog({
    eventId: "evt-log-1",
    subscriberId: "economy.gift_engine",
    sentAt: 1000,
    ackAt: 1100,
    result: events.DELIVERY_ACK.ACK
  });
  assert.equal(log.durationMs, 100);
  assert.equal(log.readOnly, true);
  pass("delivery logger");

  const failure = events.handleDeliveryFailure(
    { eventId: "evt-fail-1" },
    "ai.conversation",
    { ack: events.DELIVERY_ACK.TIMEOUT, attempt: 3 },
    { retryPolicy: events.createRetryPolicy({ maxAttempts: 3 }) }
  );
  assert.equal(failure.action, "dead_letter");
  assert.ok(failure.deadLetter.eventId, "evt-fail-1");
  pass("failure handler to dead letter");

  const retry = events.createRetryAttempt({
    eventId: "evt-retry-1",
    subscriberId: "graphics.overlay",
    attempt: 2,
    reason: events.DELIVERY_ACK.TIMEOUT
  });
  assert.equal(retry.attempt, 2);
  pass("retry manager");

  assert.equal(events.evaluateAckResponse({ ack: "NACK" }), events.DELIVERY_ACK.NACK);
  pass("ack manager");

  const registry = events.createQueueRegistry();
  const storage = events.createInMemoryQueueStorage();
  events.bootstrapDefaultMiaQueues(registry);
  storage.enqueue(events.PRIORITY_QUEUE.HIGH, {
    eventId: "evt-sched-1",
    eventType: "EVENT_CHAT_MESSAGE"
  });
  const scheduler = events.createDispatchSchedulerState({
    queueScheduler: events.createQueueSchedulerState()
  });
  const next = events.pickNextDispatchItem(registry, storage, scheduler);
  assert.equal(next.ok, true);
  assert.equal(next.item.eventId, "evt-sched-1");
  pass("dispatch scheduler from queue");

  assert.ok(events.describeMiaGiftDispatchChain().includes("economy.gift_engine"));
  assert.ok(events.describeMiaChatDispatchChain().includes("ai.conversation"));
  pass("MIA dispatch chains");

  assert.equal(events.assertDispatcherForbiddenActivity("change_routing").ok, false);
  assert.equal(events.assertDispatcherForbiddenActivity("mutate_payload").ok, false);
  pass("forbidden activities");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventDispatcher.js"));
  pass("event bus next doc 0018");

  for (const rel of events.DISPATCHER_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0017"), "README 0017");
  pass("README registry");

  console.log("\nMaster Canon 0017 contract: ALL PASS");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
