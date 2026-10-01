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
  const docPath = path.join(MASTER, "0014-event-router.md");
  const alignPath = path.join(MASTER, "0014-alignment.md");

  assert.ok(fs.existsSync(docPath), "0014-event-router.md exists");
  assert.ok(fs.existsSync(alignPath), "0014-alignment.md exists");
  pass("0014 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0014 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0014 critical priority");
  assert.ok(doc.includes("0013"), "0014 links to 0013");
  assert.ok(doc.includes("0015"), "0014 points to 0015");
  pass("0014 structure (21 sections)");

  assert.equal(events.ROUTER_COMPONENT_ORDER.length, 10);
  assert.equal(Object.keys(events.ROUTE_MODE).length, 4);
  pass("router components and modes");

  const gift = events.computeDistributionPlan({
    eventId: "evt-route-1",
    eventType: "GIFT",
    priority: events.EVENT_PRIORITY.HIGH
  });
  assert.equal(gift.ok, true);
  assert.equal(gift.plan.canonicalEventType, "EVENT_GIFT_RECEIVED");
  assert.equal(gift.plan.mode, events.ROUTE_MODE.MULTICAST);
  assert.ok(gift.plan.recipients.includes("economy.gift_engine"));
  pass("gift multicast route from registry");

  const cache = events.createRouteCache();
  const first = events.computeDistributionPlan(
    { eventId: "evt-cache-1", eventType: "EVENT_CHAT_MESSAGE" },
    { cache, useCache: true }
  );
  const second = events.computeDistributionPlan(
    { eventId: "evt-cache-2", eventType: "EVENT_CHAT_MESSAGE" },
    { cache, useCache: true }
  );
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.plan.fromCache, true);
  cache.invalidate();
  const third = events.computeDistributionPlan(
    { eventId: "evt-cache-3", eventType: "EVENT_CHAT_MESSAGE" },
    { cache, useCache: true }
  );
  assert.equal(third.plan.fromCache, false);
  pass("route cache and invalidation");

  const direct = events.computeDistributionPlan({
    eventId: "evt-direct-1",
    eventType: "EVENT_RUNTIME_READY"
  });
  assert.equal(direct.plan.mode, events.ROUTE_MODE.DIRECT);
  assert.equal(direct.plan.recipients.length, 1);
  pass("direct route mode");

  const rule = events.createRouteRule({
    ruleId: "rule.cs-only",
    eventType: "EVENT_CHAT_MESSAGE",
    subscriber: "ai.conversation",
    filter: { language: "cs" }
  });
  const filtered = events.computeDistributionPlan(
    {
      eventId: "evt-filter-1",
      eventType: "EVENT_CHAT_MESSAGE",
      payload: { language: "en", message: "hi", user: { userId: "u1" } }
    },
    { rules: [rule], useCache: false }
  );
  assert.ok(!filtered.plan.recipients.includes("ai.conversation"));
  pass("subscriber filter engine");

  const unknown = events.computeDistributionPlan({ eventId: "x", eventType: "UNKNOWN_X" });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, events.ROUTE_ERROR_CODE.UNKNOWN_EVENT_TYPE);
  pass("route error without crash");

  assert.equal(events.assertRouterForbiddenActivity("mutate_payload").ok, false);
  assert.ok(events.describeGiftRouteChain().includes("economy.gift_engine"));
  pass("forbidden activities and gift chain");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventDispatcher.js"));
  pass("event bus next doc 0018");

  for (const rel of events.ROUTER_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0014"), "README 0014");
  pass("master canon index");

  console.log("\nMaster Canon 0014 contract: ALL PASS");
}

run();
