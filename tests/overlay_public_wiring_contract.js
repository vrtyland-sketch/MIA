"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildOverlayPublicDeps,
  createOverlayPublicApi
} = require("../scripts/MIA_OVERLAY_PUBLIC_WIRING");

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
  await test("buildOverlayPublicDeps maps ctx fields", () => {
    const deps = buildOverlayPublicDeps({
      cloneJson: (v) => v,
      getOverlayState: () => ({ miaOverlay: null }),
      getVoicePlaybackSeq: () => 3
    });
    assert.equal(typeof deps.getOverlayState, "function");
    assert.equal(deps.getVoicePlaybackSeq(), 3);
  });

  await test("createOverlayPublicApi returns fallback when module missing", () => {
    const api = createOverlayPublicApi({}, {});
    const result = api.buildPublicOverlayStateResponse();
    assert.equal(result.ok, false);
    assert.equal(result.error, "overlay_public_missing");
  });

  await test("index.js uses initOverlayPublicRuntime and buildPublicOverlayStateResponse wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initOverlayPublicRuntime/);
    assert.match(indexSrc, /overlayPublicRuntime\(\)/);
    assert.match(indexSrc, /MIA_OVERLAY_PUBLIC_WIRING/);
    assert.match(indexSrc, /MIA_OVERLAY_PUBLIC_CTX/);
    assert.match(indexSrc, /function buildPublicOverlayStateResponse/);
    assert.doesNotMatch(indexSrc, /const overlayPublicApi =/);
  });

  console.log("overlay_public_wiring_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
