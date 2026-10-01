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
  const docPath = path.join(MASTER, "0015-priority-manager.md");
  const alignPath = path.join(MASTER, "0015-alignment.md");

  assert.ok(fs.existsSync(docPath), "0015-priority-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0015-alignment.md exists");
  pass("0015 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0015 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0015 critical priority");
  assert.ok(doc.includes("0014"), "0015 links to 0014");
  assert.ok(doc.includes("0016"), "0015 points to 0016");
  pass("0015 structure (20 sections)");

  assert.equal(events.PRIORITY_MANAGER_COMPONENT_ORDER.length, 9);
  assert.equal(Object.keys(events.PRIORITY_LEVEL).length, 5);
  assert.equal(events.PRIORITY_LEVEL_BY_EVENT_PRIORITY[events.EVENT_PRIORITY.CRITICAL], "P0");
  pass("priority manager components and P0–P4");

  const smallGift = events.resolveDynamicGiftPriority(1);
  const bigGift = events.resolveDynamicGiftPriority(5000);
  assert.equal(smallGift, events.EVENT_PRIORITY.NORMAL);
  assert.equal(bigGift, events.EVENT_PRIORITY.HIGH);
  pass("dynamic gift priority");

  const giftEvent = events.resolveEventPriority({
    eventType: "EVENT_GIFT_RECEIVED",
    payload: { support: { coins: 5000 } }
  });
  assert.equal(giftEvent, events.EVENT_PRIORITY.HIGH);
  pass("resolveEventPriority for gift");

  const queue = events.selectQueueForPriority(events.EVENT_PRIORITY.HIGH);
  assert.equal(queue, events.PRIORITY_QUEUE.HIGH);
  pass("queue selector");

  const scheduler = events.createFairSchedulerState();
  const depths = {
    [events.PRIORITY_QUEUE.HIGH]: 5,
    [events.PRIORITY_QUEUE.NORMAL]: 3
  };
  for (let i = 0; i < 8; i += 1) {
    events.pickNextQueue(scheduler, depths);
  }
  const fairPick = events.pickNextQueue(scheduler, depths);
  assert.equal(fairPick, events.PRIORITY_QUEUE.NORMAL);
  pass("fair scheduler normal slice");

  const starvation = events.applyStarvationProtection(
    {
      waitingSince: {
        [events.PRIORITY_QUEUE.BACKGROUND]: Date.now() - 400000
      }
    },
    { now: Date.now() }
  );
  assert.ok(starvation.changes.length >= 1);
  assert.equal(starvation.changes[0].newPriority, events.EVENT_PRIORITY.LOW);
  pass("starvation protection boost");

  const overflowCritical = events.handleQueueOverflow(events.PRIORITY_QUEUE.CRITICAL, 99999);
  assert.equal(overflowCritical.action, "accept_force");
  const overflowLow = events.handleQueueOverflow(events.PRIORITY_QUEUE.LOW, 99999);
  assert.equal(overflowLow.action, "reject");
  pass("overflow manager");

  const audit = events.createPriorityChangeEvent({
    eventId: "evt-pri-1",
    previousPriority: events.EVENT_PRIORITY.NORMAL,
    newPriority: events.EVENT_PRIORITY.HIGH,
    reason: "gift_tier"
  });
  assert.equal(audit.previousPriority, events.EVENT_PRIORITY.NORMAL);
  assert.equal(audit.newPriority, events.EVENT_PRIORITY.HIGH);
  pass("priority change audit event");

  const assigned = events.assignEventPriority(
    { eventId: "evt-assign-1", eventType: "EVENT_CHAT_MESSAGE" },
    { queueDepth: 0 }
  );
  assert.equal(assigned.priority, events.EVENT_PRIORITY.NORMAL);
  assert.equal(assigned.accepted, true);
  pass("assignEventPriority");

  assert.equal(events.assertPriorityForbiddenActivity("mutate_payload").ok, false);
  assert.equal(events.assertPriorityForbiddenActivity("route_events").ok, false);
  pass("forbidden activities");

  const metrics = events.createPriorityMetricsSnapshot(
    { [events.PRIORITY_QUEUE.HIGH]: 12 },
    { priorityChanges: 2, overflowEvents: 1 }
  );
  assert.equal(metrics.queueDepths[events.PRIORITY_QUEUE.HIGH], 12);
  pass("metrics snapshot");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventDispatcher.js"));
  pass("event bus next doc 0018");

  for (const rel of events.PRIORITY_MANAGER_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0015"), "README 0015");
  pass("README registry");

  console.log("\nMaster Canon 0015 contract: ALL PASS");
}

run();
