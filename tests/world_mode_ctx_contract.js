"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildWorldModeCtx } = require("../scripts/MIA_WORLD_MODE_CTX");
const { createWorldModeRuntime } = require("../scripts/MIA_WORLD_MODE_RUNTIME");

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
  await test("buildWorldModeCtx flattens grouped host", () => {
    const getOutputState = () => ({ worldMode: "default" });
    const ctx = buildWorldModeCtx({
      core: { safeString: String, writeLog: () => {}, runtimeConfig: {} },
      modules: { awayModeModule: {} },
      state: { getOutputState, getEcosystemState: () => ({}) },
      obs: { safeObsCall: async () => ({}) },
      overlay: { overlayStateCache: null }
    });
    assert.equal(ctx.getOutputState, getOutputState);
    assert.equal(ctx.awayModeModule, ctx.awayModeModule);
  });

  await test("createWorldModeRuntime accepts buildWorldModeCtx shape", () => {
    const api = createWorldModeRuntime(
      buildWorldModeCtx({
        core: { safeString: String, writeLog: () => {}, runtimeConfig: {} },
        modules: { awayModeModule: {} },
        state: { getOutputState: () => ({}), getEcosystemState: () => ({}) },
        obs: { safeObsCall: async () => ({}) },
        overlay: { overlayStateCache: null }
      })
    );
    assert.equal(typeof api.applyWorldModeChange, "function");
  });

  await test("index.js uses collectWorldModeHost and buildWorldModeCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectWorldModeHost\(\)/);
    assert.match(indexSrc, /MIA_WORLD_MODE_CTX/);
    assert.match(indexSrc, /MIA_WORLD_MODE_HOST/);
    assert.match(indexSrc, /buildHost\(collectWorldModeBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createWorldModeRuntime\(\{\s*safeString,/);
  });

  console.log("world_mode_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
