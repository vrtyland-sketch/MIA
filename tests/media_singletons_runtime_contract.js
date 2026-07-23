"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { resolveRuntimeGetter } = require("../scripts/MIA_RUNTIME_GETTER");

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
  await test("resolveRuntimeGetter prefers live getter", () => {
    let value = 1;
    assert.equal(resolveRuntimeGetter(() => value, null), 1);
    value = 2;
    assert.equal(resolveRuntimeGetter(() => value, null), 2);
    assert.equal(resolveRuntimeGetter(null, { ok: true })?.ok, true);
  });

  await test("index.js exposes media singleton runtime accessors", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    for (const name of [
      "videoEngineRuntime",
      "miaEyesRuntime",
      "ttsEngineRuntime",
      "overlayStateCacheRuntime",
      "ingestDeduperRuntime",
      "obsVisionRuntime",
      "voiceLayerRuntime",
      "mediaSingletonsRuntime",
      "spamSessionRuntime"
    ]) {
      assert.match(indexSrc, new RegExp(`function ${name}\\(\\)`), `missing ${name}`);
    }
    assert.match(indexSrc, /function initMediaSingletonsRuntime\(\)/);
    assert.match(indexSrc, /let mediaSingletonsRuntimeApi = null/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.match(indexSrc, /getMiaEyes: miaEyesRuntime/);
    assert.match(indexSrc, /getOverlayStateCache: overlayStateCacheRuntime/);
    assert.match(indexSrc, /initSpamSessionRuntime\(\);/);
    assert.doesNotMatch(indexSrc, /function initMediaSingletons\(\)/);
  });

  console.log("media_singletons_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
