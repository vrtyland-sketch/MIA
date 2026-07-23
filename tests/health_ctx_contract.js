"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildHealthCtx } = require("../scripts/MIA_HEALTH_CTX");
const { createHealthRuntime } = require("../scripts/MIA_HEALTH_RUNTIME");

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
  await test("buildHealthCtx flattens grouped host", () => {
    const getStreamState = () => ({ audience: { viewerCount: 2 } });
    const ctx = buildHealthCtx({
      modules: { kojnozoutModule: {}, kickBridgeModule: {}, twitchBridgeModule: {}, telegramBridgeModule: {}, overlayStateModule: {}, ttsEngine: null, llmAdapterModule: {}, videoEngine: null },
      core: { getPort: () => 3000, nowIso: () => "now", runtimeConfig: {}, MIA_SPLIT_OVERLAYS: () => ({}) },
      state: { getKojnozoutState: () => ({}), getStreamState, getObsConnected: () => true, getLastIngestSummary: () => null, getOverlayState: () => ({}) },
      obs: { resolveObsOverlayMode: () => "split", buildObsHealthSnapshot: async () => ({}) },
      overlay: { getVoicePlaybackSnapshot: () => null, overlayTiming: null, voicePriorityLayer: null, overlayQueue: null }
    });
    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.getPort(), 3000);
  });

  await test("createHealthRuntime accepts buildHealthCtx shape", () => {
    const api = createHealthRuntime(
      buildHealthCtx({
        modules: { kojnozoutModule: {}, kickBridgeModule: {}, twitchBridgeModule: {}, telegramBridgeModule: {}, overlayStateModule: {}, ttsEngine: null, llmAdapterModule: {}, videoEngine: null },
        core: { getPort: () => 3000, nowIso: () => "now", runtimeConfig: {}, MIA_SPLIT_OVERLAYS: () => ({}) },
        state: { getKojnozoutState: () => ({}), getStreamState: () => ({}), getObsConnected: () => false, getLastIngestSummary: () => null, getOverlayState: () => ({}) },
        obs: { resolveObsOverlayMode: () => "split", buildObsHealthSnapshot: async () => ({}) },
        overlay: { getVoicePlaybackSnapshot: () => null }
      })
    );
    assert.equal(typeof api.buildHealthPayload, "function");
  });

  await test("buildHealthCtx resolves videoEngine via getter", () => {
    const video = { id: "video" };
    const ctx = buildHealthCtx({
      modules: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("index.js uses collectHealthHost and buildHealthCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectHealthHost\(\)/);
    assert.match(indexSrc, /MIA_HEALTH_CTX/);
    assert.match(indexSrc, /MIA_HEALTH_HOST/);
    assert.match(indexSrc, /buildHost\(collectHealthBindingsHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /createHealthRuntime\(\{\s*kojnozoutModule,/);
  });

  console.log("health_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
