"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildTranslationCtx } = require("../scripts/MIA_TRANSLATION_CTX");
const { createTranslationRuntime } = require("../scripts/MIA_TRANSLATION_RUNTIME");

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
  await test("buildTranslationCtx flattens grouped host", () => {
    const deliveryRuntime = () => ({});
    const ctx = buildTranslationCtx({
      core: { writeLog: () => {}, safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
      modules: { ttsEngine: null, translationRuntime: {}, translateModule: {}, languageModule: {} },
      handlers: { setOverlay: () => ({}), invalidateOverlayStateCache: () => {}, getUserLabel: () => "x" },
      delivery: { deliveryRuntime }
    });

    assert.equal(ctx.deliveryRuntime, deliveryRuntime);
    assert.equal(typeof ctx.getUserLabel, "function");
  });

  await test("createTranslationRuntime accepts buildTranslationCtx shape", () => {
    const api = createTranslationRuntime(
      buildTranslationCtx({
        core: { writeLog: () => {}, safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
        modules: { translationRuntime: {}, translateModule: {}, languageModule: {} },
        handlers: { setOverlay: () => ({}), invalidateOverlayStateCache: () => {}, getUserLabel: () => "x" },
        delivery: { deliveryRuntime: () => ({}) }
      })
    );
    assert.equal(typeof api.deliverChatTranslation, "function");
  });

  await test("buildTranslationCtx resolves interpreter via getter", () => {
    const interpreter = { id: "interpreter" };
    const ctx = buildTranslationCtx({
      core: { writeLog: () => {}, safeString: String, runtimeConfig: {}, voiceHoldUntilTs: (n) => n },
      modules: {
        getInterpreterRuntime: () => interpreter,
        translateModule: {},
        languageModule: {}
      },
      handlers: { setOverlay: () => ({}), invalidateOverlayStateCache: () => {}, getUserLabel: () => "x" },
      delivery: { deliveryRuntime: () => ({}) }
    });

    assert.equal(ctx.translationRuntime.id, "interpreter");
  });

  await test("index.js uses collectTranslationHost and buildTranslationCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectTranslationHost\(\)/);
    assert.match(indexSrc, /MIA_TRANSLATION_CTX/);
    assert.match(indexSrc, /MIA_TRANSLATION_HOST/);
    assert.match(indexSrc, /buildHost\(collectTranslationBindingsHost\(\)\)/);
    assert.match(indexSrc, /getInterpreterRuntime: interpreterRuntime/);
    assert.doesNotMatch(indexSrc, /modules:\s*\{[^}]*translationRuntime,/s);
  });

  console.log("translation_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
