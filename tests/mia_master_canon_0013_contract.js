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
  const docPath = path.join(MASTER, "0013-event-registry.md");
  const alignPath = path.join(MASTER, "0013-alignment.md");

  assert.ok(fs.existsSync(docPath), "0013-event-registry.md exists");
  assert.ok(fs.existsSync(alignPath), "0013-alignment.md exists");
  pass("0013 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0013 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0013 critical priority");
  assert.ok(doc.includes("0012"), "0013 links to 0012");
  assert.ok(doc.includes("0014"), "0013 points to 0014");
  pass("0013 structure (22 sections)");

  assert.equal(Object.keys(events.REGISTRY_CATEGORY).length, 7);
  assert.equal(events.countActiveEventTypes(), 15);
  pass("registry categories and catalog size");

  const gift = events.getEventTypeDefinition("GIFT");
  assert.ok(gift);
  assert.equal(gift.canonicalName, "EVENT_GIFT_RECEIVED");
  assert.ok(gift.publishers.includes("adapter.tiktok"));
  assert.ok(gift.subscribers.includes("economy.gift_engine"));
  pass("runtime alias resolves to canonical type");

  assert.equal(events.resolveCanonicalEventName("COMMENT"), "EVENT_CHAT_MESSAGE");
  assert.equal(events.validateCanonicalEventName("EVENT_GIFT_RECEIVED").ok, true);
  assert.equal(events.validateCanonicalEventName("gift_received").ok, false);
  pass("naming rules and alias resolution");

  const streamTypes = events.listEventTypeDefinitions({ category: events.REGISTRY_CATEGORY.STREAM });
  assert.ok(streamTypes.length >= 3);
  pass("list by category");

  const search = events.searchEventTypeDefinitions({ q: "kojnozout" });
  assert.ok(search.some((row) => row.canonicalName === "EVENT_KOJNOZROUT_FED"));
  pass("search registry");

  const audit = events.createRegistryAuditEvent({
    eventTypeId: gift.eventTypeId,
    operation: "version_bump",
    oldVersion: "1.0.0",
    newVersion: "1.1.0",
    author: "mia.platform"
  });
  assert.ok(audit.registryId.startsWith("registry-audit-"));
  pass("registry audit event");

  assert.equal(events.assertRegistryForbiddenActivity("route_events").ok, false);
  assert.equal(events.assertRegistryForbiddenActivity("catalog_lookup").ok, true);
  pass("forbidden activities");

  const draft = events.createEventTypeDefinition({
    eventTypeId: "evt-type.test.draft",
    canonicalName: "EVENT_TEST_DRAFT",
    description: "Test draft event type",
    category: events.REGISTRY_CATEGORY.SYSTEM,
    version: "0.1.0",
    status: events.REGISTRY_DEFINITION_STATUS.DRAFT,
    createdAt: new Date().toISOString(),
    author: "test",
    owner: "test",
    documentationRef: "docs/master-canon/0013-event-registry.md",
    payloadSchema: {},
    metadataSchema: {},
    publishers: ["test.publisher"],
    subscribers: ["test.subscriber"]
  });
  assert.equal(draft.status, events.REGISTRY_DEFINITION_STATUS.DRAFT);
  pass("create draft definition");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventRegistry.js"));
  pass("event bus next doc 0018");

  const validated = events.validateEventCanon({
    eventId: "evt-reg-1",
    eventType: "GIFT",
    source: "tiktok",
    timestamp: new Date().toISOString(),
    correlationId: "corr-reg",
    payload: { user: { userId: "u1" }, support: { giftName: "Rose", coins: 10, giftValue: 10 } }
  });
  assert.ok(validated.ok, validated.issues?.map((i) => i.code).join(","));
  pass("validator resolves registry type for GIFT");

  for (const rel of events.REGISTRY_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0013"), "README 0013");
  pass("master canon index");

  console.log("\nMaster Canon 0013 contract: ALL PASS");
}

run();
