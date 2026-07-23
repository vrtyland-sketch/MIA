"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOverlayStateCtx } = require("../scripts/MIA_OVERLAY_STATE_CTX");
const { createOverlayStateRuntime } = require("../scripts/MIA_OVERLAY_STATE_RUNTIME");

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
  await test("buildOverlayStateCtx flattens grouped host", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const ctx = buildOverlayStateCtx({
      core: { safeString: String },
      modules: { overlayStateModule: {}, outputStateModule: {} },
      state: { getOverlayState, getOutputState: () => ({}) },
      overlay: { overlayStateCache: null }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.overlayStateModule, ctx.overlayStateModule);
  });

  await test("createOverlayStateRuntime accepts buildOverlayStateCtx shape", () => {
    const api = createOverlayStateRuntime(
      buildOverlayStateCtx({
        core: { safeString: String },
        modules: {
          overlayStateModule: {
            setOverlay: (state, payload) => {
              state.miaOverlay = payload;
              return { ...payload, accepted: true };
            }
          },
          outputStateModule: {}
        },
        state: { getOverlayState: () => ({ miaOverlay: null }), getOutputState: () => ({}) },
        overlay: { overlayStateCache: null }
      })
    );
    assert.equal(typeof api.setOverlay, "function");
  });

  await test("index.js uses collectOverlayStateHost and buildOverlayStateCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOverlayStateHost\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_CTX/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_HOST/);
    assert.match(indexSrc, /buildHost\(collectOverlayStateBindingsHost\(\)\)/);
    assert.match(indexSrc, /function overlayStateRuntime\(\)/);
    assert.match(indexSrc, /initOverlayStateRuntime\(\);/);
    assert.doesNotMatch(indexSrc, /createOverlayStateRuntime\(\{\s*safeString,/);
  });

  console.log("overlay_state_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
