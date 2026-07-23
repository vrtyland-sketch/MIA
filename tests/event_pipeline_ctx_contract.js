"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildEventPipelineCtx } = require("../scripts/MIA_EVENT_PIPELINE_CTX");
const { buildEventPipelineDeps } = require("../scripts/MIA_EVENT_PIPELINE_WIRING");

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
  await test("buildEventPipelineCtx flattens grouped host", () => {
    const applyWorldLayer = () => ({ ok: true });
    const ctx = buildEventPipelineCtx({
      core: {
        upper: (v) => String(v).toUpperCase(),
        normalizeIncomingEvent: (e) => e,
        writeLog: () => {},
        safeString: (v) => String(v ?? ""),
        nowIso: () => "now",
        runtimeConfig: { id: "cfg" },
        recordIngestSummary: () => {},
        recordShadowPipelineSummary: () => {}
      },
      modules: {
        streamSessionModule: { id: "session" },
        shadowRuntime: { id: "shadow" }
      },
      handlers: { applyWorldLayer },
      media: {
        videoEngine: { id: "video" },
        getObsSourceAudioMap: () => ({})
      },
      state: {
        getOutputState: () => ({ solo: true }),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getEcosystemState: () => ({})
      }
    });

    assert.equal(ctx.streamSessionModule.id, "session");
    assert.equal(ctx.shadowRuntime.id, "shadow");
    assert.equal(ctx.applyWorldLayer, applyWorldLayer);
    assert.equal(ctx.videoEngine.id, "video");
    assert.deepEqual(ctx.getOutputState(), { solo: true });
  });

  await test("buildEventPipelineCtx matches wiring deps shape", () => {
    const host = {
      core: {
        upper: (v) => String(v).toUpperCase(),
        normalizeIncomingEvent: (e) => e,
        writeLog: () => {},
        safeString: (v) => String(v ?? ""),
        nowIso: () => "now",
        runtimeConfig: {},
        recordIngestSummary: () => {},
        recordShadowPipelineSummary: () => {}
      },
      modules: {},
      handlers: {
        applyWorldLayer: () => {}
      },
      media: {
        videoEngine: {},
        getObsSourceAudioMap: () => ({})
      },
      state: {
        getOutputState: () => ({}),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getEcosystemState: () => ({})
      }
    };

    const ctx = buildEventPipelineCtx(host);
    const deps = buildEventPipelineDeps(ctx);
    assert.equal(typeof deps.normalizeIncomingEvent, "function");
    assert.equal(typeof deps.applyWorldLayer, "function");
    assert.equal(typeof deps.getOutputState, "function");
  });

  await test("buildEventPipelineCtx resolves videoEngine and ingestDeduper via getters", () => {
    const video = { id: "video-live" };
    const deduper = { id: "deduper" };
    const ctx = buildEventPipelineCtx({
      modules: {
        getIngestDeduper: () => deduper
      },
      media: {
        getVideoEngine: () => video
      }
    });
    assert.equal(ctx.videoEngine.id, "video-live");
    assert.equal(ctx.ingestDeduper.id, "deduper");
  });

  await test("index.js uses collectEventPipelineHost and buildEventPipelineCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectEventPipelineHost\(\)/);
    assert.match(indexSrc, /MIA_EVENT_PIPELINE_CTX/);
    assert.match(indexSrc, /MIA_EVENT_PIPELINE_HOST/);
    assert.match(indexSrc, /buildHost\(collectEventPipelineBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.match(indexSrc, /initEventPipelineRuntime\(\);\s*\n\s*initIngestHttpRuntime\(\);/);
    assert.doesNotMatch(indexSrc, /function getEventPipelineCtx\(\)/);
  });

  console.log("event_pipeline_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
