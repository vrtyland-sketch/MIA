"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildVoicePriorityCtx } = require("../scripts/MIA_VOICE_PRIORITY_CTX");
const { createVoicePriorityLayer } = require("../scripts/MIA_VOICE_PRIORITY");

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
  await test("buildVoicePriorityCtx flattens grouped host", () => {
    const writeLog = () => {};
    const ctx = buildVoicePriorityCtx({
      core: { writeLog }
    });
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("createVoicePriorityLayer accepts buildVoicePriorityCtx shape", () => {
    const api = createVoicePriorityLayer(
      buildVoicePriorityCtx({
        core: { writeLog: () => {} }
      })
    );
    assert.equal(typeof api.getSnapshot, "function");
    assert.equal(typeof api.shouldBlockOverlay, "function");
  });

  await test("index.js uses collectVoicePriorityBindingsHost and buildVoicePriorityHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectVoicePriorityBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_VOICE_PRIORITY_HOST/);
    assert.match(indexSrc, /buildCtx\(collectVoicePriorityHost\(\)\)/);
    assert.match(indexSrc, /function initVoicePriorityLayerRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initVoicePriorityLayer\(\)/);
    assert.doesNotMatch(indexSrc, /createVoicePriorityLayer\(\{\s*appendJsonLog:/);
  });

  console.log("voice_priority_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
