"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildVisionContextCtx } = require("../scripts/MIA_VISION_CONTEXT_CTX");
const { createVisionContextRuntime } = require("../scripts/MIA_VISION_CONTEXT_RUNTIME");

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
  await test("buildVisionContextCtx flattens grouped host", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const ctx = buildVisionContextCtx({
      modules: { overlayStateModule: {}, kojnozoutDuelModule: {}, kickBridgeModule: {} },
      core: { runtimeConfig: {} },
      state: { getOverlayState, getDuelState: () => ({}) },
      media: { miaEyes: { getSnapshot: () => ({}) } },
      handlers: { isStartupSlideActive: () => false }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(typeof ctx.isStartupSlideActive, "function");
  });

  await test("createVisionContextRuntime accepts buildVisionContextCtx shape", () => {
    const api = createVisionContextRuntime(
      buildVisionContextCtx({
        modules: {
          overlayStateModule: { getOverlaySnapshot: () => ({ comboMoment: null }) },
          kojnozoutDuelModule: {},
          kickBridgeModule: {}
        },
        core: { runtimeConfig: {} },
        state: { getOverlayState: () => ({}), getDuelState: () => ({}) },
        media: { miaEyes: null },
        handlers: { isStartupSlideActive: () => false }
      })
    );
    assert.equal(typeof api.buildVisionContext, "function");
  });

  await test("index.js uses collectVisionContextBindingsHost and buildVisionContextHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectVisionContextBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_VISION_CONTEXT_HOST/);
    assert.match(indexSrc, /buildCtx\(collectVisionContextHost\(\)\)/);
    assert.match(indexSrc, /getMiaEyes: miaEyesRuntime/);
    assert.doesNotMatch(indexSrc, /createVisionContextRuntime\(\{\s*overlayStateModule,/);
  });

  console.log("vision_context_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
