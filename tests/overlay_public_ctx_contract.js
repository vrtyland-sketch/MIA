"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOverlayPublicCtx } = require("../scripts/MIA_OVERLAY_PUBLIC_CTX");
const { buildOverlayPublicDeps } = require("../scripts/MIA_OVERLAY_PUBLIC_WIRING");

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
  await test("buildOverlayPublicCtx flattens grouped host", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const ctx = buildOverlayPublicCtx({
      core: { cloneJson: (v) => v, runtimeConfig: { id: "cfg" }, obsConnected: true },
      modules: {
        overlayStateModule: { id: "overlay" },
        videoEngine: { id: "video" }
      },
      state: {
        getOverlayState,
        getStreamState: () => ({ audience: { viewerCount: 1 } }),
        getGiftUserLedger: () => ({ entries: [] }),
        getOutputState: () => ({}),
        getEcosystemState: () => ({})
      },
      delivery: {
        getVoicePlaybackSeq: () => 2
      }
    });

    assert.equal(ctx.overlayStateModule.id, "overlay");
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.deepEqual(ctx.getStreamState(), { audience: { viewerCount: 1 } });
    assert.equal(ctx.getVoicePlaybackSeq(), 2);
  });

  await test("buildOverlayPublicCtx matches wiring deps shape", () => {
    const host = {
      core: { cloneJson: (v) => v, runtimeConfig: {}, obsConnected: false },
      modules: { overlayStateModule: {} },
      state: {
        getOverlayState: () => ({}),
        getStreamState: () => ({}),
        getOutputState: () => ({}),
        getEcosystemState: () => ({})
      },
      delivery: { getVoicePlaybackSeq: () => 0 }
    };
    const deps = buildOverlayPublicDeps(buildOverlayPublicCtx(host));
    assert.equal(typeof deps.getOverlayState, "function");
    assert.equal(typeof deps.getVoicePlaybackSeq, "function");
  });

  await test("buildOverlayPublicCtx resolves videoEngine via getter", () => {
    const video = { id: "video-live" };
    const ctx = buildOverlayPublicCtx({
      modules: {
        getVideoEngine: () => video
      }
    });
    assert.equal(ctx.videoEngine.id, "video-live");
  });

  await test("buildOverlayPublicCtx resolves spamSession via getter", () => {
    const spam = { id: "spam-live" };
    const ctx = buildOverlayPublicCtx({
      modules: {
        getSpamSessionEngine: () => spam
      }
    });
    assert.equal(ctx.spamSessionEngine.id, "spam-live");
  });

  await test("index.js uses collectOverlayPublicHost and buildOverlayPublicCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOverlayPublicHost\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_PUBLIC_CTX/);
    assert.match(indexSrc, /MIA_OVERLAY_PUBLIC_HOST/);
    assert.match(indexSrc, /buildHost\(collectOverlayPublicBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initOverlayPublicRuntime\(\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.match(indexSrc, /getSpamSessionEngine: spamSessionRuntime/);
    assert.match(indexSrc, /function initPipelineRuntimesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function getOverlayPublicCtx\(\)/);
  });

  console.log("overlay_public_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
