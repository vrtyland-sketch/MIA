"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildTtsEngineCtx } = require("../scripts/MIA_TTS_ENGINE_CTX");
const { createTtsEngine } = require("../scripts/MIA_TTS_ENGINE");

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
  await test("buildTtsEngineCtx flattens grouped host", () => {
    const writeLog = () => {};
    const ctx = buildTtsEngineCtx({
      core: { writeLog, cacheDir: "/tmp/audio-cache" }
    });
    assert.equal(ctx.appendJsonLog, writeLog);
    assert.equal(ctx.cacheDir, "/tmp/audio-cache");
  });

  await test("createTtsEngine accepts buildTtsEngineCtx shape", () => {
    const api = createTtsEngine(
      buildTtsEngineCtx({
        core: { writeLog: () => {}, cacheDir: path.join(ROOT, "mia-output-overlay", "audio-cache") }
      })
    );
    assert.equal(typeof api.speak, "function");
    assert.equal(typeof api.resolveConfig, "function");
  });

  await test("index.js uses collectTtsEngineHost and buildTtsEngineCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectTtsEngineHost\(\)/);
    assert.match(indexSrc, /MIA_TTS_ENGINE_CTX/);
    assert.match(indexSrc, /MIA_TTS_ENGINE_HOST/);
    assert.match(indexSrc, /buildHost\(collectTtsEngineBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initTtsEngineRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initTtsEngine\(\)/);
    assert.doesNotMatch(indexSrc, /createTtsEngine\(\{\s*appendJsonLog:/);
  });

  console.log("tts_engine_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
