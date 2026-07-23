"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsVisionCtx } = require("../scripts/MIA_OBS_VISION_CTX");
const { createObsVision } = require("../scripts/MIA_OBS_VISION");

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
  await test("buildObsVisionCtx flattens grouped host", () => {
    const buildVisionContext = () => ({ mode: "live" });
    const miaEyes = { getSnapshot: () => ({}) };
    const ctx = buildObsVisionCtx({
      core: { runtimeConfig: {}, writeLog: () => {} },
      obs: { safeObsCall: async () => ({ ok: true }) },
      media: { miaEyes },
      handlers: { buildVisionContext }
    });
    assert.equal(ctx.miaEyes, miaEyes);
    assert.equal(ctx.getContext, buildVisionContext);
    assert.deepEqual(ctx.getContext(), { mode: "live" });
  });

  await test("createObsVision accepts buildObsVisionCtx shape", () => {
    const api = createObsVision(
      buildObsVisionCtx({
        core: { runtimeConfig: {}, writeLog: () => {} },
        obs: { safeObsCall: async () => ({ ok: true }) },
        media: { miaEyes: null },
        handlers: { buildVisionContext: () => ({}) }
      })
    );
    assert.equal(typeof api.getSnapshot, "function");
  });

  await test("index.js uses collectObsVisionBindingsHost and buildObsVisionHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsVisionBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_VISION_HOST/);
    assert.match(indexSrc, /buildCtx\(collectObsVisionHost\(\)\)/);
    assert.match(indexSrc, /function initObsVisionRuntime\(\)/);
    assert.match(indexSrc, /getMiaEyes: miaEyesRuntime/);
    assert.doesNotMatch(indexSrc, /function initObsVision\(\)/);
    assert.doesNotMatch(indexSrc, /createObsVision\(\{\s*runtimeConfig,/);
  });

  console.log("obs_vision_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
