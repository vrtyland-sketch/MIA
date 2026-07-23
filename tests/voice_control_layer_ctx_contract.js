"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildVoiceControlLayerCtx } = require("../scripts/MIA_VOICE_CONTROL_LAYER_CTX");
const { createVoiceControlLayer } = require("../scripts/MIA_VOICE_CONTROL_LAYER");

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
  await test("buildVoiceControlLayerCtx flattens grouped host", () => {
    const writeLog = () => {};
    const ctx = buildVoiceControlLayerCtx({
      core: { writeLog }
    });
    assert.equal(ctx.appendJsonLog, writeLog);
  });

  await test("createVoiceControlLayer accepts buildVoiceControlLayerCtx shape", () => {
    const api = createVoiceControlLayer(
      buildVoiceControlLayerCtx({
        core: { writeLog: () => {} }
      })
    );
    assert.equal(typeof api.resolveVoiceCommand, "function");
  });

  await test("index.js uses collectVoiceLayerBindingsHost and buildVoiceLayerHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectVoiceLayerBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_VOICE_LAYER_HOST/);
    assert.match(indexSrc, /buildCtx\(collectVoiceLayerHost\(\)\)/);
    assert.match(indexSrc, /function initVoiceLayerRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initVoiceLayer\(\)/);
    assert.doesNotMatch(indexSrc, /createVoiceControlLayer\(\{\s*appendJsonLog:/);
  });

  console.log("voice_control_layer_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
