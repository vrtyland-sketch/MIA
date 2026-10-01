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
  const docPath = path.join(MASTER, "0011-event-gateway.md");
  const alignPath = path.join(MASTER, "0011-alignment.md");

  assert.ok(fs.existsSync(docPath), "0011-event-gateway.md exists");
  assert.ok(fs.existsSync(alignPath), "0011-alignment.md exists");
  pass("0011 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0011 section ${i}`);
  }
  assert.ok(doc.includes("Kritická"), "0011 critical priority");
  assert.ok(doc.includes("0010"), "0011 links to 0010");
  assert.ok(doc.includes("0012"), "0011 points to 0012");
  pass("0011 structure (20 sections)");

  assert.equal(events.GATEWAY_COMPONENT_ORDER.length, 11);
  assert.equal(events.GATEWAY_PIPELINE_STEP.length, 11);
  assert.ok(events.describeGatewayPipeline().includes("validator_connector"));
  pass("gateway components and pipeline");

  assert.ok(events.STREAM_PLATFORM_SOURCES.length >= 5);
  assert.ok(events.isGatewaySource(events.GATEWAY_SOURCE.TIKTOK));
  assert.ok(events.isGatewaySource(events.GATEWAY_SOURCE.KICK));
  pass("gateway sources");

  const meta = events.createGatewayMetadata({
    eventId: "evt-gateway-1",
    source: events.GATEWAY_SOURCE.KICK
  });
  assert.ok(meta.gatewayId.startsWith("gw-"));
  assert.ok(meta.requestId.startsWith("req-"));
  assert.equal(meta.source, events.GATEWAY_SOURCE.KICK);
  for (const field of events.GATEWAY_METADATA_FIELDS) {
    assert.ok(field in meta, `metadata field ${field}`);
  }
  pass("gateway metadata");

  const log = events.createGatewayLogRecord({
    requestId: meta.requestId,
    source: events.GATEWAY_SOURCE.TIKTOK,
    payloadBytes: 512
  });
  assert.equal(log.requestId, meta.requestId);
  pass("gateway log record");

  assert.equal(Object.keys(events.GATEWAY_ERROR_CODE).length, 8);
  const err = events.createGatewayError({
    code: events.GATEWAY_ERROR_CODE.DUPLICATE_EVENT
  });
  assert.equal(err.code, events.GATEWAY_ERROR_CODE.DUPLICATE_EVENT);
  pass("gateway error codes");

  assert.equal(events.assertGatewayForbiddenActivity("ai_decision").ok, false);
  assert.equal(events.assertGatewayForbiddenActivity("normalize").ok, true);
  pass("forbidden activities");

  const adapters = events.listGatewayAdapters();
  assert.ok(adapters.length >= 4);
  assert.ok(adapters.some((a) => a.source === events.GATEWAY_SOURCE.TIKTOK));
  pass("MIA gateway adapters");

  const busMgr = core.getCoreManager(core.CORE_MANAGER_ID.EVENT_BUS);
  assert.equal(busMgr.nextDocId, "0018");
  assert.ok(busMgr.runtime.includes("shared/mia-event-core/eventGateway.js"));
  pass("event bus next doc 0018");

  for (const rel of [
    "routes/ingest.js",
    "shared/platform_normalizers/normalize_event.js",
    "scripts/MIA_RUNTIME_SECURITY.js",
    "scripts/MIA_INGEST_GUARD.js",
    "scripts/MIA_KICK_BRIDGE.js"
  ]) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0011"), "README 0011");
  pass("master canon index");

  console.log("\nMaster Canon 0011 contract: ALL PASS");
}

run();
