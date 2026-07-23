"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildShowcaseCtx } = require("../scripts/MIA_SHOWCASE_CTX");
const { createShowcaseRuntime } = require("../scripts/MIA_SHOWCASE_RUNTIME");

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
  await test("buildShowcaseCtx flattens grouped host", () => {
    const deliveryRuntime = () => ({});
    const ctx = buildShowcaseCtx({
      core: { safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
      modules: { ttsEngine: null },
      delivery: { deliveryRuntime },
      handlers: { mirrorSpeechOverlayFromVoice: () => null, invalidateOverlayStateCache: () => {} }
    });
    assert.equal(ctx.deliveryRuntime, deliveryRuntime);
  });

  await test("createShowcaseRuntime accepts buildShowcaseCtx shape", () => {
    const api = createShowcaseRuntime(
      buildShowcaseCtx({
        core: { safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
        modules: { ttsEngine: null },
        delivery: { deliveryRuntime: () => ({ bumpVoicePlaybackSeq: () => 1, setVoicePlaybackState: () => {} }) },
        handlers: { mirrorSpeechOverlayFromVoice: () => null, invalidateOverlayStateCache: () => {} }
      })
    );
    assert.equal(typeof api.speakMiaShowcaseLine, "function");
  });

  await test("buildShowcaseCtx resolves ttsEngine via getter", () => {
    const tts = { id: "tts" };
    const ctx = buildShowcaseCtx({
      core: { safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
      modules: { getTtsEngine: () => tts },
      delivery: { deliveryRuntime: () => ({}) },
      handlers: { mirrorSpeechOverlayFromVoice: () => null, invalidateOverlayStateCache: () => {} }
    });
    assert.equal(ctx.ttsEngine.id, "tts");
  });

  await test("index.js uses collectShowcaseHost and buildShowcaseCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectShowcaseHost\(\)/);
    assert.match(indexSrc, /MIA_SHOWCASE_CTX/);
    assert.match(indexSrc, /MIA_SHOWCASE_HOST/);
    assert.match(indexSrc, /buildHost\(collectShowcaseBindingsHost\(\)\)/);
    assert.match(indexSrc, /initShowcaseRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createShowcaseRuntime\(\{\s*safeString,/);
  });

  console.log("showcase_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
