"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildInterpreterCtx } = require("../scripts/MIA_INTERPRETER_CTX");
const { createTranslationRuntime } = require("../scripts/MIA_TRANSLATE");

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
  await test("buildInterpreterCtx returns empty deps bag", () => {
    const ctx = buildInterpreterCtx({});
    assert.deepEqual(ctx, {});
  });

  await test("createTranslationRuntime accepts buildInterpreterCtx shape", () => {
    const api = createTranslationRuntime(buildInterpreterCtx({}));
    assert.equal(typeof api.getReplyLanguage, "function");
    assert.equal(typeof api.getState, "function");
  });

  await test("index.js uses collectInterpreterHost and buildInterpreterCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectInterpreterHost\(\)/);
    assert.match(indexSrc, /MIA_INTERPRETER_CTX/);
    assert.match(indexSrc, /MIA_INTERPRETER_HOST/);
    assert.match(indexSrc, /buildHost\(collectInterpreterBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initInterpreterRuntime\(\)/);
    assert.match(indexSrc, /function interpreterRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /\?\s*translateModule\.createTranslationRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /let translationRuntime = null/);
  });

  console.log("interpreter_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
