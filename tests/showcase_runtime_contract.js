"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createShowcaseRuntime exposes speakMiaShowcaseLine", () => {
    const api = createShowcaseRuntime({
      safeString: (v) => String(v ?? ""),
      ttsEngine: null,
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now,
      deliveryRuntime: () => ({}),
      mirrorSpeechOverlayFromVoice: () => null,
      invalidateOverlayStateCache: () => {}
    });
    assert.equal(typeof api.speakMiaShowcaseLine, "function");
  });

  await test("speakMiaShowcaseLine rejects empty text", async () => {
    const result = await createShowcaseRuntime({
      safeString: (v) => String(v ?? ""),
      ttsEngine: { resolveConfig: () => ({ enabled: true }), speak: async () => ({ ok: true }) },
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now,
      deliveryRuntime: () => ({
        bumpVoicePlaybackSeq: () => 1,
        setVoicePlaybackState: () => {}
      }),
      mirrorSpeechOverlayFromVoice: () => null,
      invalidateOverlayStateCache: () => {}
    }).speakMiaShowcaseLine("");

    assert.equal(result.ok, false);
    assert.equal(result.reason, "empty");
  });

  await test("speakMiaShowcaseLine returns tts_disabled when engine off", async () => {
    const result = await createShowcaseRuntime({
      safeString: (v) => String(v ?? ""),
      ttsEngine: { resolveConfig: () => ({ enabled: false }) },
      runtimeConfig: {},
      voiceHoldUntilTs: (now) => now,
      deliveryRuntime: () => ({}),
      mirrorSpeechOverlayFromVoice: () => null,
      invalidateOverlayStateCache: () => {}
    }).speakMiaShowcaseLine("Ahoj");

    assert.equal(result.ok, false);
    assert.equal(result.reason, "tts_disabled");
  });

  await test("index.js wires showcaseRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initShowcaseRuntime/);
    assert.match(indexSrc, /MIA_SHOWCASE_RUNTIME/);
    assert.match(indexSrc, /MIA_SHOWCASE_CTX/);
    assert.match(
      indexSrc,
      /async function speakMiaShowcaseLine\(text, speaker = "mia"\) \{\s*return showcaseRuntime\(\)\.speakMiaShowcaseLine\(text, speaker\);/
    );
    assert.doesNotMatch(indexSrc, /source: "koj_state_showcase_voice"/);
  });

  console.log("showcase_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
