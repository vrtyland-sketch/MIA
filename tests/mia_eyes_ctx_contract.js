"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildMiaEyesCtx } = require("../scripts/MIA_MIA_EYES_CTX");
const { createMiaEyes } = require("../scripts/MIA_EYES");

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
  await test("buildMiaEyesCtx flattens grouped host", () => {
    const writeLog = () => {};
    const safeObsCall = async () => ({ ok: true });
    const ctx = buildMiaEyesCtx({
      core: { runtimeConfig: {}, writeLog },
      obs: { safeObsCall }
    });
    assert.equal(ctx.appendJsonLog, writeLog);
    assert.equal(ctx.safeObsCall, safeObsCall);
  });

  await test("createMiaEyes accepts buildMiaEyesCtx shape", () => {
    const api = createMiaEyes(
      buildMiaEyesCtx({
        core: { runtimeConfig: {}, writeLog: () => {} },
        obs: { safeObsCall: async () => ({ ok: true }) }
      })
    );
    assert.equal(typeof api.getSnapshot, "function");
  });

  await test("index.js uses collectMiaEyesHost and buildMiaEyesCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectMiaEyesHost\(\)/);
    assert.match(indexSrc, /MIA_MIA_EYES_CTX/);
    assert.match(indexSrc, /MIA_MIA_EYES_HOST/);
    assert.match(indexSrc, /buildHost\(collectMiaEyesBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initMiaEyesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initMiaEyes\(\)/);
    assert.doesNotMatch(indexSrc, /createMiaEyes\(\{\s*runtimeConfig,/);
  });

  console.log("mia_eyes_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
