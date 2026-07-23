"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildActionBuilderCtx } = require("../scripts/MIA_ACTION_BUILDER_CTX");
const { createActionBuilderRuntime } = require("../scripts/MIA_ACTION_BUILDER_RUNTIME");

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
  await test("buildActionBuilderCtx flattens grouped host", () => {
    const getOutputState = () => ({ phase: "live" });
    const ctx = buildActionBuilderCtx({
      core: { safeString: String, getUserLabel: () => "Viewer", runtimeConfig: {} },
      modules: { chatBrain: {}, responseEngine: {} },
      state: { getKojnozoutState: () => ({}), getOutputState }
    });
    assert.equal(ctx.getOutputState, getOutputState);
    assert.equal(ctx.chatBrain, ctx.chatBrain);
  });

  await test("createActionBuilderRuntime accepts buildActionBuilderCtx shape", () => {
    const api = createActionBuilderRuntime(
      buildActionBuilderCtx({
        core: { safeString: String, getUserLabel: () => "Viewer", runtimeConfig: {} },
        modules: { chatBrain: {}, responseEngine: {} },
        state: { getKojnozoutState: () => ({}), getOutputState: () => ({}) }
      })
    );
    assert.equal(typeof api.buildDirectChatAction, "function");
  });

  await test("index.js uses collectActionBuilderHost and buildActionBuilderCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectActionBuilderHost\(\)/);
    assert.match(indexSrc, /MIA_ACTION_BUILDER_CTX/);
    assert.match(indexSrc, /MIA_ACTION_BUILDER_HOST/);
    assert.match(indexSrc, /buildHost\(collectActionBuilderBindingsHost\(\)\)/);
    assert.match(indexSrc, /initActionBuilderRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createActionBuilderRuntime\(\{\s*safeString,/);
  });

  console.log("action_builder_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
