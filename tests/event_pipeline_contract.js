"use strict";

const assert = require("assert/strict");
const { createEventContext } = require("../scripts/MIA_EVENT_CONTEXT");
const {
  resolveIngestLane,
  isLikelyGiftIngestPayload,
  resolveLaneFromNormalized
} = require("../scripts/MIA_INGEST_LANE");
const { createIngestQueue } = require("../scripts/MIA_INGEST_QUEUE");
const {
  createCommandRegistry,
  buildDefaultCommandHandlers
} = require("../scripts/MIA_COMMAND_REGISTRY");
const { normalizeIncomingEvent, createIngestHttpHandlers } = require("../scripts/MIA_INGEST_HTTP");
const { createEventPipeline } = require("../scripts/MIA_EVENT_PIPELINE");
const { runEventPipeline, phaseSession } = require("../scripts/pipeline/run");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("resolveIngestLane classifies gift vs community", () => {
  assert.equal(resolveIngestLane({ giftName: "Rose" }, String), "support");
  assert.equal(resolveIngestLane({ eventType: "comment", message: "hi" }, String), "community");
  assert.equal(resolveIngestLane({ viewerCount: 120 }, String), "audience");
});

test("isLikelyGiftIngestPayload detects gift signals", () => {
  assert.equal(isLikelyGiftIngestPayload({ eventType: "gift" }, String), true);
  assert.equal(isLikelyGiftIngestPayload({ message: "ahoj" }, String), false);
});

test("createEventContext builds lane from normalized route", () => {
  const ctx = createEventContext(
    { eventType: "gift", giftName: "Rose" },
    {
      normalizeIncomingEvent: () => ({
        eventType: "GIFT",
        route: "support",
        user: { nickname: "Fan" }
      }),
      upper: (v) => String(v || "").toUpperCase(),
      safeString: (v, d) => (v == null || v === "" ? d || "" : String(v)),
      getStreamSession: () => ({}),
      getGiftSupporterProfile: () => ({}),
      getGiftUserLedger: () => ({}),
      getLastGiftMapping: () => null,
      getStreamState: () => ({}),
      getOutputState: () => ({}),
      getOverlayState: () => ({}),
      getKojnozoutState: () => ({}),
      getEcosystemState: () => ({})
    }
  );
  assert.equal(ctx.lane, "support");
  assert.equal(ctx.eventType, "GIFT");
});

test("createIngestQueue serializes support lane", async () => {
  const order = [];
  const queue = createIngestQueue({ safeString: String });
  await Promise.all([
    queue.enqueue("support", async () => {
      order.push("a-start");
      await new Promise((r) => setTimeout(r, 30));
      order.push("a-end");
    }),
    queue.enqueue("support", async () => {
      order.push("b-start");
      order.push("b-end");
    })
  ]);
  assert.deepEqual(order, ["a-start", "a-end", "b-start", "b-end"]);
});

test("createIngestHttpHandlers fastAck queues via lane", async () => {
  const calls = [];
  const handlers = createIngestHttpHandlers({
    normalizer: {},
    runtimeConfig: { ingest: { fastAck: true } },
    languageModule: {},
    safeString: (v, d) => (v == null || v === "" ? d || "" : String(v)),
    upper: (v) => String(v || "").toUpperCase(),
    ingestGuardModule: { hasIngestPayloadSignal: () => true },
    writeLog: () => {},
    recordIngestSummary: () => {},
    streamAudienceModule: {},
    spamSessionEngine: {},
    getStreamState: () => ({}),
    setStreamState: () => {},
    processEvent: async (payload) => {
      calls.push(payload.message);
      return { status: 200, body: { ok: true } };
    }
  });

  const res = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  await handlers.handleIngest(
    { method: "POST", query: {}, body: { eventType: "comment", message: "queued-test" } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.lane, "community");
  await new Promise((r) => setTimeout(r, 25));
  assert.deepEqual(calls, ["queued-test"]);
});

test("command registry halts pipeline on handled command", async () => {
  const registry = createCommandRegistry([
    {
      id: "test_cmd",
      handle: async () => ({ handled: true, body: { ok: true, command: "test" } })
    }
  ]);

  const ctx = createEventContext(
    { message: "item" },
    {
      normalizeIncomingEvent: () => ({ eventType: "COMMENT", message: "item", user: {} }),
      upper: (v) => String(v || "").toUpperCase(),
      safeString: String,
      getStreamSession: () => ({}),
      getGiftSupporterProfile: () => ({}),
      getGiftUserLedger: () => ({}),
      getLastGiftMapping: () => null,
      getStreamState: () => ({}),
      getOutputState: () => ({}),
      getOverlayState: () => ({}),
      getKojnozoutState: () => ({}),
      getEcosystemState: () => ({})
    }
  );

  await registry.runCommandGate(ctx, { writeLog: () => {} });
  assert.equal(ctx.meta.halted, true);
  assert.equal(ctx.meta.commandId, "test_cmd");
});

test("phaseSession dedupes duplicate ingest", async () => {
  const ctx = createEventContext(
    { message: "dup" },
    {
      normalizeIncomingEvent: () => ({ eventType: "COMMENT", message: "dup", user: {} }),
      upper: (v) => String(v || "").toUpperCase(),
      safeString: String,
      getStreamSession: () => ({ phase: "LIVE" }),
      getGiftSupporterProfile: () => ({}),
      getGiftUserLedger: () => ({}),
      getLastGiftMapping: () => null,
      getStreamState: () => ({}),
      getOutputState: () => ({}),
      getOverlayState: () => ({}),
      getKojnozoutState: () => ({}),
      getEcosystemState: () => ({})
    }
  );

  await phaseSession(ctx, {
    streamSessionModule: { noteIngest: (s) => s },
    ingestDeduper: { checkDuplicate: () => ({ duplicate: true, key: "k1", ageMs: 1 }) },
    writeLog: () => {},
    safeString: String,
    recordIngestSummary: () => {}
  });

  assert.equal(ctx.meta.halted, true);
  assert.equal(ctx.meta.deduped, true);
});

test("createEventPipeline dedupes via runEventPipeline", async () => {
  const pipeline = createEventPipeline({
    normalizeIncomingEvent: () => ({ eventType: "COMMENT", message: "x", user: {} }),
    upper: (v) => String(v || "").toUpperCase(),
    safeString: String,
    streamSessionModule: { noteIngest: (s) => s },
    ingestDeduper: { checkDuplicate: () => ({ duplicate: true, key: "k1", ageMs: 10 }) },
    writeLog: () => {},
    recordIngestSummary: () => {},
    getStreamSession: () => ({}),
    setStreamSession: () => {},
    getGiftSupporterProfile: () => ({}),
    setGiftSupporterProfile: () => {},
    getGiftUserLedger: () => ({}),
    setGiftUserLedger: () => {},
    getLastGiftMapping: () => null,
    setLastGiftMapping: () => {},
    getStreamState: () => ({}),
    setStreamState: () => {},
    getOutputState: () => ({}),
    getOverlayState: () => ({}),
    getKojnozoutState: () => ({}),
    getEcosystemState: () => ({})
  });

  const result = await pipeline.processEvent({ message: "dup" });
  assert.equal(result.body.deduped, true);
});

console.log("event_pipeline_contract: all passed");
