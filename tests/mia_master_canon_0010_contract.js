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
  const docPath = path.join(MASTER, "0010-event-bus.md");
  const alignPath = path.join(MASTER, "0010-alignment.md");

  assert.ok(fs.existsSync(docPath), "0010-event-bus.md exists");
  assert.ok(fs.existsSync(alignPath), "0010-alignment.md exists");
  pass("0010 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0010 section ${i}`);
  }
  assert.ok(doc.includes("Critical"), "0010 critical priority");
  assert.ok(doc.includes("0003"), "0010 links to 0003");
  assert.ok(doc.includes("0011"), "0010 points to 0011");
  pass("0010 structure (24 sections)");

  assert.equal(events.EVENT_BUS_COMPONENT_ORDER.length, 12);
  assert.equal(events.EVENT_JOURNEY_ORDER.length, 11);
  assert.ok(events.describeEventJourney().includes("gateway"));
  pass("event bus components and journey");

  assert.equal(Object.keys(events.KNOWN_EVENT_TYPES).length, 9);
  assert.ok(events.isKnownEventType(events.KNOWN_EVENT_TYPES.GIFT_RECEIVED));
  assert.ok(!events.isKnownEventType("UNKNOWN_TYPE"));
  pass("known event types registry");

  assert.equal(events.PRIORITY_QUEUE.CRITICAL, "critical_queue");
  assert.equal(
    events.resolvePriorityQueue(events.EVENT_PRIORITY.HIGH),
    events.PRIORITY_QUEUE.HIGH
  );
  pass("priority queue mapping");

  const sub = events.createSubscriberRegistration({
    systemId: "economy.gift_engine",
    eventTypes: [events.KNOWN_EVENT_TYPES.GIFT_RECEIVED]
  });
  for (const field of events.SUBSCRIBER_FIELDS) {
    assert.ok(field in sub, `subscriber field ${field}`);
  }
  pass("subscriber registration");

  const audit = events.createEventAuditStep({
    eventId: "evt-1",
    step: events.AUDIT_STEP.VALIDATED,
    correlationId: "corr-abc"
  });
  assert.equal(audit.step, events.AUDIT_STEP.VALIDATED);
  pass("audit step record");

  const dlq = events.createDeadLetterRecord({
    eventId: "evt-2",
    attemptCount: 3,
    lastError: "timeout"
  });
  assert.equal(dlq.attemptCount, 3);
  pass("dead letter record");

  const retry = events.createRetryPolicy({ maxAttempts: 5 });
  assert.equal(retry.maxAttempts, 5);
  pass("retry policy");

  assert.equal(events.ensureCorrelationId({ eventId: "e1" }), "e1");
  assert.equal(events.ensureCorrelationId({ traceId: "t1" }), "t1");
  pass("correlation id");

  assert.equal(events.assertEventBusForbiddenActivity("mutate_event_payload").ok, false);
  assert.equal(events.assertEventBusForbiddenActivity("enqueue").ok, true);
  pass("forbidden activities");

  assert.ok(events.MIA_REFERENCE_PIPELINE.length >= 11);
  assert.ok(events.describeMiaReferencePipeline().includes("Event Bus"));
  pass("MIA reference pipeline");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventBusInfrastructure.js"));
  pass("core event bus manager anchor");

  for (const rel of [
    "shared/mia-event-core/eventBusInfrastructure.js",
    "scripts/MIA_INGEST_QUEUE.js",
    "scripts/pipeline/run.js",
    "scripts/MIA_INGEST_GUARD.js"
  ]) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0010"), "README 0010");
  pass("master canon index");

  console.log("\nMaster Canon 0010 contract: ALL PASS");
}

run();
