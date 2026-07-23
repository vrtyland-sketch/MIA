"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createVoiceTiming } = require("../scripts/MIA_VOICE_TIMING");
const { computeVoiceHoldUntilTs } = require("../scripts/MIA_RUNTIME_PERF");

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
  await test("createVoiceTiming delegates to runtime perf module", () => {
    const now = 1_000_000;
    const hold = createVoiceTiming({
      runtimePerfModule: { computeVoiceHoldUntilTs },
      getEnv: () => ({ MIA_VOICE_HOLD_MIN_MS: "3500" })
    }).voiceHoldUntilTs(now, 4200);

    assert.equal(hold, computeVoiceHoldUntilTs(now, 4200, { MIA_VOICE_HOLD_MIN_MS: "3500" }));
  });

  await test("createVoiceTiming uses fallback when perf module missing", () => {
    const now = 2_000_000;
    const hold = createVoiceTiming({
      runtimePerfModule: {},
      getEnv: () => ({})
    }).voiceHoldUntilTs(now, 5000);

    assert.equal(hold, now + Math.max(5000 + 1200, 3500));
  });

  await test("index.js wires voiceTimingRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initVoiceTimingRuntime/);
    assert.match(indexSrc, /MIA_VOICE_TIMING/);
    assert.match(indexSrc, /MIA_VOICE_TIMING_CTX/);
    assert.match(
      indexSrc,
      /function voiceHoldUntilTs\(now, durationMs\) \{\s*return voiceTimingRuntime\(\)\.voiceHoldUntilTs\(now, durationMs\);/
    );
    assert.doesNotMatch(indexSrc, /runtimePerfModule\.computeVoiceHoldUntilTs\(now, durationMs, process\.env\)/);
  });

  console.log("voice_timing_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
