"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const events = require("../shared/mia-event-core");
const { normalizeEvent } = require("../shared/platform_normalizers/normalize_event");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0003-event-definition.md");
  const alignPath = path.join(MASTER, "0003-alignment.md");

  assert.ok(fs.existsSync(docPath), "0003-event-definition.md exists");
  assert.ok(fs.existsSync(alignPath), "0003-alignment.md exists");
  pass("0003 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 15; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0003 contains section ${i}`);
  }
  assert.ok(doc.includes("Event-Driven System"), "0003 event-driven");
  assert.ok(doc.includes("**Verze:** 1.0"), "0003 version 1.0");
  pass("0003 structure (15 sections)");

  assert.equal(events.EVENT_LIFECYCLE_ORDER.length, 6, "six primary lifecycle phases");
  assert.ok(events.EVENT_LIFECYCLE.FAILED, "failed lifecycle state");
  assert.equal(Object.keys(events.EVENT_CATEGORY).length, 6, "six event categories");
  assert.equal(Object.keys(events.EVENT_PRIORITY).length, 5, "five priority levels");
  assert.equal(Object.keys(events.EVENT_QUEUE).length, 6, "six event queues");
  pass("event-core enums");

  const valid = events.createEventRecord({
    eventId: "tiktok_gift_abc",
    eventType: "GIFT",
    source: "tiktok",
    target: "support",
    payload: { tier: "T3", giftName: "Rose" }
  });
  assert.equal(valid.ok, true, valid.errors?.join(","));
  assert.equal(valid.normalized.priority, events.EVENT_PRIORITY.HIGH);
  assert.equal(valid.normalized.category, events.EVENT_CATEGORY.STREAM);
  pass("createEventRecord gift");

  const normalized = normalizeEvent({
    platform: "tiktok",
    eventType: "comment",
    user: { userId: "u42", nickname: "Alice" },
    message: "ahoj MIA"
  });
  const bridged = events.fromNormalizedIngestEvent(normalized);
  assert.equal(bridged.ok, true, bridged.errors?.join(","));
  assert.equal(bridged.normalized.eventType, "COMMENT");
  assert.ok(bridged.normalized.eventId);
  pass("fromNormalizedIngestEvent bridge");

  assert.ok(events.CANON_EVENT_FLOW.length >= 9, "canon event flow steps");
  assert.ok(events.describeEventFlow().includes("Ingest"));
  assert.ok(events.EVENT_BUS_FORBIDDEN.includes("business_logic"));
  pass("event bus canon");

  const ingestQueue = read("scripts/MIA_INGEST_QUEUE.js");
  assert.ok(ingestQueue.includes("support") && ingestQueue.includes("community"));
  const pipeline = read("scripts/pipeline/run.js");
  assert.ok(pipeline.includes("runEventPipeline"));
  pass("runtime anchors exist");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0003"), "README registers 0003");
  pass("master canon index 0003");

  console.log("\nMaster Canon 0003 contract: ALL PASS");
}

run();
