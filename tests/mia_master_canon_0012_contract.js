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
  const docPath = path.join(MASTER, "0012-event-validator.md");
  const alignPath = path.join(MASTER, "0012-alignment.md");

  assert.ok(fs.existsSync(docPath), "0012-event-validator.md exists");
  assert.ok(fs.existsSync(alignPath), "0012-alignment.md exists");
  pass("0012 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 22; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0012 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0012 critical priority");
  assert.ok(doc.includes("0011"), "0012 links to 0011");
  assert.ok(doc.includes("0013"), "0012 points to 0013");
  pass("0012 structure (22 sections)");

  assert.equal(events.VALIDATOR_COMPONENT_ORDER.length, 11);
  assert.equal(events.VALIDATOR_REQUIRED_FIELDS.length, 7);
  assert.equal(Object.keys(events.VALIDATION_RESULT).length, 4);
  pass("validator components and results");

  const valid = events.validateEventCanon({
    eventId: "evt-val-1",
    eventType: "CHAT_MESSAGE",
    source: "kick",
    timestamp: new Date().toISOString(),
    correlationId: "corr-1",
    payload: { user: { userId: "u1" }, message: "hello" }
  });
  assert.equal(valid.result, events.VALIDATION_RESULT.VALID);
  assert.ok(valid.ok);
  assert.ok(valid.report.validationId.startsWith("validation-"));
  pass("valid comment event");

  const invalid = events.validateEventCanon({
    eventId: "",
    eventType: "GIFT",
    source: "tiktok",
    timestamp: "not-a-date",
    payload: { support: { coins: 500, giftValue: 0, giftName: "Rose" }, user: { userId: "u2" } }
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.length > 0);
  pass("rejects invalid gift integrity and fields");

  const blocked = events.validateEventCanon({
    eventId: "evt-sec-1",
    eventType: "COMMENT",
    source: "test",
    timestamp: new Date().toISOString(),
    correlationId: "corr-sec",
    payload: { user: { userId: "u3" }, message: "<script>alert(1)</script>" }
  });
  assert.equal(blocked.result, events.VALIDATION_RESULT.SECURITY_BLOCKED);
  assert.equal(blocked.normalized, null);
  pass("security blocked payload");

  const log = events.createValidationLogRecord({
    eventId: "evt-val-1",
    result: events.VALIDATION_RESULT.VALID,
    durationMs: 3
  });
  assert.equal(log.eventId, "evt-val-1");
  pass("validation log record");

  assert.equal(events.assertValidatorForbiddenActivity("mutate_payload").ok, false);
  assert.equal(events.assertValidatorForbiddenActivity("validate").ok, true);
  pass("forbidden activities");

  assert.ok(events.describeValidatorPipeline().includes("event_validator"));
  pass("validator pipeline");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventValidator.js"));
  pass("event bus next doc 0018");

  for (const rel of events.VALIDATOR_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0012"), "README 0012");
  pass("master canon index");

  console.log("\nMaster Canon 0012 contract: ALL PASS");
}

run();
