"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildEventPipelineDeps,
  createEventPipelineApi
} = require("../scripts/MIA_EVENT_PIPELINE_WIRING");
const { createEventPipeline } = require("../scripts/MIA_EVENT_PIPELINE");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("buildEventPipelineDeps maps ctx to pipeline deps", () => {
    const handleIngest = async () => ({ ok: true });
    const deps = buildEventPipelineDeps({
      normalizeIncomingEvent: (e) => e,
      upper: (v) => String(v).toUpperCase(),
      applyWorldLayer: () => {},
      buildSupportAction: handleIngest,
      getOutputState: () => ({ solo: true }),
      getOverlayState: () => ({}),
      getKojnozoutState: () => ({}),
      getEcosystemState: () => ({})
    });

    assert.equal(typeof deps.normalizeIncomingEvent, "function");
    assert.equal(deps.buildSupportAction, handleIngest);
    assert.deepEqual(deps.getOutputState(), { solo: true });
  });

  await test("createEventPipelineApi returns fallback when module missing", async () => {
    const api = createEventPipelineApi({}, {});
    const result = await api.processEvent({});
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "event_pipeline_missing");
  });

  await test("createEventPipelineApi wires real pipeline", async () => {
    let called = false;
    const api = createEventPipelineApi(
      {
        createEventPipeline: (deps) => ({
          processEvent: async () => {
            called = typeof deps.applyRuntimeStateImpact === "function";
            return { status: 200, body: { ok: true } };
          }
        })
      },
      {
        applyRuntimeStateImpact: () => ({}),
        getOutputState: () => ({}),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getEcosystemState: () => ({})
      }
    );

    await api.processEvent({});
    assert.equal(called, true);
  });

  await test("createEventPipeline accepts wiring deps shape", async () => {
    const pipeline = createEventPipeline(
      buildEventPipelineDeps({
        normalizeIncomingEvent: (raw) => ({ ...raw, normalized: true }),
        upper: (v) => String(v || "").toUpperCase(),
        writeLog: () => {},
        safeString: (v) => String(v ?? ""),
        getOutputState: () => ({}),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getEcosystemState: () => ({})
      })
    );
    assert.equal(typeof pipeline.processEvent, "function");
  });

  await test("index.js uses initEventPipelineRuntime and eventPipelineRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectEventPipelineHost\(\)/);
    assert.match(indexSrc, /initEventPipelineRuntime/);
    assert.match(indexSrc, /buildCtx\(collectEventPipelineHost\(\)\)/);
    assert.match(indexSrc, /MIA_EVENT_PIPELINE_WIRING/);
    assert.match(indexSrc, /MIA_EVENT_PIPELINE_CTX/);
    assert.match(
      indexSrc,
      /const processEvent = \(\.\.\.args\) => eventPipelineRuntime\(\)\.processEvent\(\.\.\.args\);/
    );
    assert.doesNotMatch(indexSrc, /createEventPipeline\(\{\s*normalizeIncomingEvent,/);
  });

  console.log("event_pipeline_wiring_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
