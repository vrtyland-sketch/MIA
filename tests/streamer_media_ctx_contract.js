"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStreamerMediaCtx } = require("../scripts/MIA_STREAMER_MEDIA_CTX");
const { createStreamerMediaRuntime } = require("../scripts/MIA_STREAMER_MEDIA_RUNTIME");

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
  await test("buildStreamerMediaCtx resolves videoEngine and ecosystem via getters", () => {
    const video = { id: "video" };
    let ecoCount = 0;
    const ctx = buildStreamerMediaCtx({
      modules: {
        streamerMediaCommandModule: {},
        streamerAccessModule: {},
        mediaCatalogModule: {},
        soloStreamModule: {}
      },
      core: { safeString: String, getUserLabel: () => "Boss", runtimeConfig: {}, writeLog: () => {} },
      state: {
        getOutputState: () => ({}),
        getEcosystemState: () => ({ worldMode: `w${++ecoCount}` }),
        getStreamState: () => ({})
      },
      handlers: { executeOverlay: async () => ({}), maybeDeliverMiaVoice: async () => ({}) },
      media: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
    assert.equal(ctx.getEcosystemState().worldMode, "w1");
    assert.equal(ctx.getEcosystemState().worldMode, "w2");
  });

  await test("buildStreamerMediaCtx passes live getStreamState getter", () => {
    let count = 0;
    const ctx = buildStreamerMediaCtx({
      modules: {
        streamerMediaCommandModule: {},
        streamerAccessModule: {},
        mediaCatalogModule: {},
        soloStreamModule: {}
      },
      core: { safeString: String, getUserLabel: () => "Boss", runtimeConfig: {}, writeLog: () => {} },
      state: {
        getOutputState: () => ({}),
        ecosystemState: {},
        getStreamState: () => ({ audience: { viewerCount: ++count } })
      },
      handlers: { executeOverlay: async () => ({}), maybeDeliverMiaVoice: async () => ({}) },
      media: { videoEngine: null }
    });
    assert.equal(ctx.getStreamState().audience.viewerCount, 1);
    assert.equal(ctx.getStreamState().audience.viewerCount, 2);
  });

  await test("createStreamerMediaRuntime accepts buildStreamerMediaCtx shape", () => {
    const api = createStreamerMediaRuntime(
      buildStreamerMediaCtx({
        modules: {
          streamerMediaCommandModule: {},
          streamerAccessModule: {},
          mediaCatalogModule: {},
          soloStreamModule: {}
        },
        core: { safeString: String, getUserLabel: () => "Boss", runtimeConfig: {}, writeLog: () => {} },
        state: { getOutputState: () => ({}), ecosystemState: {}, getStreamState: () => ({}) },
        handlers: { executeOverlay: async () => ({}), maybeDeliverMiaVoice: async () => ({}) },
        media: { videoEngine: null }
      })
    );
    assert.equal(typeof api.tryHandleStreamerMediaCommand, "function");
  });

  await test("index.js uses collectStreamerMediaHost and buildStreamerMediaCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStreamerMediaHost\(\)/);
    assert.match(indexSrc, /MIA_STREAMER_MEDIA_CTX/);
    assert.match(indexSrc, /MIA_STREAMER_MEDIA_HOST/);
    assert.match(indexSrc, /buildHost\(collectStreamerMediaBindingsHost\(\)\)/);
    assert.match(indexSrc, /getEcosystemState: \(\) => ecosystemState/);
    assert.match(indexSrc, /initStreamerMediaRuntime\(\)/);
  });

  console.log("streamer_media_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
