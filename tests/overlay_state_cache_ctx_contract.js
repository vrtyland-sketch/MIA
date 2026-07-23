"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOverlayStateCacheCtx } = require("../scripts/MIA_OVERLAY_STATE_CACHE_CTX");
const { createOverlayStateCache } = require("../scripts/MIA_RUNTIME_PERF");

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
  await test("buildOverlayStateCacheCtx flattens grouped host", () => {
    const ctx = buildOverlayStateCacheCtx({
      core: { ttlMs: 900 }
    });
    assert.equal(ctx.ttlMs, 900);
  });

  await test("createOverlayStateCache accepts buildOverlayStateCacheCtx shape", () => {
    const api = createOverlayStateCache(
      buildOverlayStateCacheCtx({
        core: { ttlMs: 450 }
      })
    );
    assert.equal(typeof api.get, "function");
    assert.equal(typeof api.invalidate, "function");
    assert.equal(api.getStats().ttlMs, 450);
  });

  await test("index.js uses collectOverlayStateCacheHost and buildOverlayStateCacheCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOverlayStateCacheHost\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_CACHE_CTX/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_CACHE_HOST/);
    assert.match(indexSrc, /buildHost\(collectOverlayStateCacheBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initOverlayStateCacheRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initOverlayStateCache\(\)/);
    assert.doesNotMatch(indexSrc, /createOverlayStateCache\(\{\s*ttlMs:/);
  });

  console.log("overlay_state_cache_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
