"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOverlayTimingCtx } = require("../scripts/MIA_OVERLAY_TIMING_CTX");
const { createOverlayTiming } = require("../scripts/MIA_OVERLAY_TIMING");

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
  await test("buildOverlayTimingCtx flattens grouped host", () => {
    const ctx = buildOverlayTimingCtx({
      core: { baseDelayMs: 900 }
    });
    assert.equal(ctx.baseDelayMs, 900);
  });

  await test("createOverlayTiming accepts buildOverlayTimingCtx shape", () => {
    const api = createOverlayTiming(
      buildOverlayTimingCtx({
        core: { baseDelayMs: 650 }
      })
    );
    assert.equal(typeof api.canEmitNow, "function");
    assert.equal(typeof api.getSnapshot, "function");
  });

  await test("index.js uses collectOverlayTimingBindingsHost and buildOverlayTimingHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOverlayTimingBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_TIMING_HOST/);
    assert.match(indexSrc, /buildCtx\(collectOverlayTimingHost\(\)\)/);
    assert.match(indexSrc, /function initOverlayTimingRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initOverlayTiming\(\)/);
    assert.doesNotMatch(indexSrc, /createOverlayTiming\(\{\s*baseDelayMs:/);
  });

  console.log("overlay_timing_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
