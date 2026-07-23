"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildVideoEngineCtx } = require("../scripts/MIA_VIDEO_ENGINE_CTX");
const { createVideoEngine } = require("../scripts/MIA_VIDEO_ENGINE");

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
  await test("buildVideoEngineCtx passes live isMiaVoiceActive handler", () => {
    let active = false;
    const ctx = buildVideoEngineCtx({
      core: { runtimeConfig: {}, writeLog: () => {} },
      state: { outputState: {} },
      obs: { safeObsCall: async () => ({ ok: true }) },
      handlers: {
        isVoicePlaybackActive: () => active,
        pickNextMediaForTier: () => null
      }
    });
    assert.equal(ctx.isMiaVoiceActive(), false);
    active = true;
    assert.equal(ctx.isMiaVoiceActive(), true);
  });

  await test("createVideoEngine accepts buildVideoEngineCtx shape", () => {
    const api = createVideoEngine(
      buildVideoEngineCtx({
        core: { runtimeConfig: {}, writeLog: () => {} },
        state: { outputState: {} },
        obs: { safeObsCall: async () => ({ ok: true }) },
        handlers: {
          isVoicePlaybackActive: () => false,
          pickNextMediaForTier: () => null
        }
      })
    );
    assert.equal(typeof api.enqueueGiftPlayback, "function");
    assert.equal(typeof api.getSnapshot, "function");
  });

  await test("index.js uses collectVideoEngineHost and buildVideoEngineCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectVideoEngineHost\(\)/);
    assert.match(indexSrc, /MIA_VIDEO_ENGINE_CTX/);
    assert.match(indexSrc, /MIA_VIDEO_ENGINE_HOST/);
    assert.match(indexSrc, /buildHost\(collectVideoEngineBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initMediaSingletonsRuntime\(\)/);
    assert.match(indexSrc, /function initVideoEngineRuntime\(\)/);
    assert.match(indexSrc, /function videoEngineRuntime\(\)/);
    assert.match(indexSrc, /function miaEyesRuntime\(\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /function initVideoEngine\(\)/);
    assert.doesNotMatch(indexSrc, /createVideoEngine\(\{\s*runtimeConfig,/);
  });

  console.log("video_engine_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
