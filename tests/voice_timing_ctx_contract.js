"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildVoiceTimingCtx } = require("../scripts/MIA_VOICE_TIMING_CTX");
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
  await test("buildVoiceTimingCtx flattens grouped host", () => {
    const getEnv = () => ({ MIA_VOICE_HOLD_MIN_MS: "3500" });
    const ctx = buildVoiceTimingCtx({
      core: { getEnv },
      modules: { runtimePerfModule: { computeVoiceHoldUntilTs } }
    });
    const now = 1_000_000;
    assert.equal(
      ctx.runtimePerfModule.computeVoiceHoldUntilTs(now, 4200, ctx.getEnv()),
      computeVoiceHoldUntilTs(now, 4200, { MIA_VOICE_HOLD_MIN_MS: "3500" })
    );
  });

  await test("createVoiceTiming accepts buildVoiceTimingCtx shape", () => {
    const api = createVoiceTiming(
      buildVoiceTimingCtx({
        core: { getEnv: () => ({}) },
        modules: { runtimePerfModule: { computeVoiceHoldUntilTs } }
      })
    );
    assert.equal(typeof api.voiceHoldUntilTs, "function");
  });

  await test("index.js uses collectVoiceTimingBindingsHost and buildVoiceTimingHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectVoiceTimingBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_VOICE_TIMING_HOST/);
    assert.match(indexSrc, /buildCtx\(collectVoiceTimingHost\(\)\)/);
    assert.match(indexSrc, /function initVoiceTimingRuntime\(\)/);
    assert.match(indexSrc, /voiceTimingRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /voiceTimingApi/);
    assert.doesNotMatch(indexSrc, /createVoiceTiming\(\{\s*runtimePerfModule,/);
  });

  console.log("voice_timing_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
