"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildSoloStreamCtx } = require("../scripts/MIA_SOLO_STREAM_CTX");
const { createSoloStreamRuntime } = require("../scripts/MIA_SOLO_STREAM_RUNTIME");

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
  await test("buildSoloStreamCtx resolves videoEngine via media getter", () => {
    const video = { id: "video-live" };
    const ctx = buildSoloStreamCtx({
      media: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video-live");
  });

  await test("buildSoloStreamCtx passes live getStreamState getter", () => {
    let count = 0;
    const ctx = buildSoloStreamCtx({
      modules: { soloStreamModule: {}, videoEngine: null },
      core: { runtimeConfig: {}, serverStartedAt: 1, writeLog: () => {}, safeString: String },
      state: {
        getStreamState: () => ({ audience: { viewerCount: ++count } }),
        getOutputState: () => ({}),
        getOverlayState: () => ({}),
        getKojnozoutState: () => ({}),
        getObsConnected: () => true
      },
      handlers: { isVoicePlaybackActive: () => false, executeOverlay: async () => ({}), maybeDeliverMiaVoice: async () => ({}) },
      obs: { safeObsCall: async () => ({}) }
    });

    const api = createSoloStreamRuntime(ctx);
    const first = api.buildSoloStreamSceneCtx();
    const second = api.buildSoloStreamSceneCtx();
    assert.equal(first.streamState.audience.viewerCount, 1);
    assert.equal(second.streamState.audience.viewerCount, 2);
    assert.equal(first.obsConnected, true);
  });

  await test("index.js uses collectSoloStreamHost and buildSoloStreamCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectSoloStreamHost\(\)/);
    assert.match(indexSrc, /MIA_SOLO_STREAM_CTX/);
    assert.match(indexSrc, /MIA_SOLO_STREAM_HOST/);
    assert.match(indexSrc, /buildHost\(collectSoloStreamBindingsHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.match(indexSrc, /initSoloStreamRuntime\(\)/);
  });

  console.log("solo_stream_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
