"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsPostConnectCtx } = require("../scripts/MIA_OBS_POST_CONNECT_CTX");
const { createObsPostConnectRuntime } = require("../scripts/MIA_OBS_POST_CONNECT_RUNTIME");

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
  await test("buildObsPostConnectCtx flattens grouped host", () => {
    const ensureObsHands = async () => ({ ok: true });
    const ctx = buildObsPostConnectCtx({
      core: { writeLog: () => {}, safeString: String, runtimeConfig: {} },
      obs: {
        ensureObsHands,
        configureObsMiaLiveHub: async () => ({}),
        fixObsOverlayBrowserLayouts: async () => {},
        fixObsOverlaySceneTransforms: async () => {},
        ensureObsMiaSourceVisibleInProgramScene: async () => ({}),
        ensureObsVoiceBrowserReady: async () => {},
        obsBrowserRefreshOnConnectEnabled: () => false,
        refreshObsMiaBrowserSources: async () => ({})
      },
      media: { videoEngine: null, obsVision: null, miaEyes: null }
    });
    assert.equal(ctx.ensureObsHands, ensureObsHands);
  });

  await test("createObsPostConnectRuntime accepts buildObsPostConnectCtx shape", () => {
    const api = createObsPostConnectRuntime(
      buildObsPostConnectCtx({
        core: { writeLog: () => {}, safeString: String, runtimeConfig: {} },
        obs: {
          ensureObsHands: async () => ({}),
          configureObsMiaLiveHub: async () => ({}),
          fixObsOverlayBrowserLayouts: async () => {},
          fixObsOverlaySceneTransforms: async () => {},
          ensureObsMiaSourceVisibleInProgramScene: async () => ({}),
          ensureObsVoiceBrowserReady: async () => {},
          obsBrowserRefreshOnConnectEnabled: () => false,
          refreshObsMiaBrowserSources: async () => ({})
        },
        media: { videoEngine: null, obsVision: null, miaEyes: null }
      })
    );
    assert.equal(typeof api.bootstrapObsAfterConnect, "function");
  });

  await test("buildObsPostConnectCtx resolves videoEngine via getter", () => {
    const video = { id: "video" };
    const ctx = buildObsPostConnectCtx({
      media: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("index.js uses collectObsPostConnectHost and buildObsPostConnectCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsPostConnectHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_POST_CONNECT_CTX/);
    assert.match(indexSrc, /MIA_OBS_POST_CONNECT_HOST/);
    assert.match(indexSrc, /buildHost\(collectObsPostConnectBindingsHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /createObsPostConnectRuntime\(\{\s*writeLog,/);
  });

  console.log("obs_post_connect_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
