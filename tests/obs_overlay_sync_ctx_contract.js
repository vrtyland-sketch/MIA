"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsOverlaySyncCtx } = require("../scripts/MIA_OBS_OVERLAY_SYNC_CTX");

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
  await test("buildObsOverlaySyncCtx flattens grouped host", () => {
    const getObs = () => ({ id: "obs" });
    const ctx = buildObsOverlaySyncCtx({
      obs: { getObs, getObsConnected: () => true },
      urls: { getSplitOverlays: () => ({ speech: "x" }), getOverlayBase: () => "http://127.0.0.1:3000" },
      core: { runtimeConfig: {}, safeString: (v) => v, writeLog: () => {} },
      modules: { obsHandsModule: { id: "hands" } },
      handlers: { buildVisionContext: () => ({}), getVoicePlaybackSnapshot: () => null },
      state: { getMiaEyes: () => null, setStartupSlideActiveUntil: () => {} }
    });

    assert.equal(ctx.getObs, getObs);
    assert.equal(ctx.obsHandsModule.id, "hands");
    assert.equal(typeof ctx.buildVisionContext, "function");
  });

  await test("index.js uses collectObsOverlaySyncHost and buildObsOverlaySyncCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsOverlaySyncHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_CTX/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_HOST/);
    assert.match(indexSrc, /buildHost\(collectObsOverlaySyncBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initObsOverlaySyncCoreRuntime\(\)/);
    assert.match(indexSrc, /obsOverlaySyncCoreRuntime\(\)/);
    assert.match(indexSrc, /getMiaEyes: miaEyesRuntime/);
    assert.doesNotMatch(indexSrc, /function initObsOverlaySync\(\)/);
    assert.doesNotMatch(indexSrc, /obsOverlaySyncApi/);
    assert.doesNotMatch(indexSrc, /createObsOverlaySync\(\{\s*getObs:/);
  });

  console.log("obs_overlay_sync_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
