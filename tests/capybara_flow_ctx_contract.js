"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildCapybaraFlowCtx } = require("../scripts/MIA_CAPYBARA_FLOW_CTX");
const { createCapybaraFlowRuntime } = require("../scripts/MIA_CAPYBARA_FLOW_RUNTIME");

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
  await test("buildCapybaraFlowCtx resolves ecosystem via getter", () => {
    let count = 0;
    const ctx = buildCapybaraFlowCtx({
      state: {
        getEcosystemState: () => ({ worldMode: `w${++count}` })
      }
    });
    assert.equal(ctx.getEcosystemState().worldMode, "w1");
    assert.equal(ctx.getEcosystemState().worldMode, "w2");
  });

  await test("buildCapybaraFlowCtx flattens grouped host", () => {
    const executeOverlay = async () => ({});
    const ctx = buildCapybaraFlowCtx({
      modules: { capybaraFlowModule: {}, responseEngine: {} },
      core: { runtimeConfig: {}, writeLog: () => {}, safeString: String },
      state: { getOutputState: () => ({}), getKojnozoutState: () => ({}), ecosystemState: {} },
      handlers: { deliverActionVoice: async () => ({}), executeOverlay, getUserLabel: () => "x", maybeDeliverMiaVoice: async () => ({}) }
    });
    assert.equal(ctx.executeOverlay, executeOverlay);
  });

  await test("createCapybaraFlowRuntime accepts buildCapybaraFlowCtx shape", () => {
    const api = createCapybaraFlowRuntime(
      buildCapybaraFlowCtx({
        modules: { capybaraFlowModule: {}, responseEngine: {} },
        core: { runtimeConfig: {}, writeLog: () => {}, safeString: String },
        state: { getOutputState: () => ({}), getKojnozoutState: () => ({}), ecosystemState: {} },
        handlers: { executeOverlay: async () => ({}), getUserLabel: () => "x" }
      })
    );
    assert.equal(typeof api.tryHandleCapybaraWaitingComment, "function");
  });

  await test("index.js uses collectCapybaraFlowHost and buildCapybaraFlowCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectCapybaraFlowHost\(\)/);
    assert.match(indexSrc, /MIA_CAPYBARA_FLOW_CTX/);
    assert.match(indexSrc, /MIA_CAPYBARA_FLOW_HOST/);
    assert.match(indexSrc, /buildHost\(collectCapybaraFlowBindingsHost\(\)\)/);
    assert.match(indexSrc, /getEcosystemState: \(\) => ecosystemState/);
    assert.match(indexSrc, /initCapybaraFlowRuntime\(\)/);
  });

  console.log("capybara_flow_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
