"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsSafeCallCtx } = require("../scripts/MIA_OBS_SAFE_CALL_CTX");
const { createObsSafeCall } = require("../scripts/MIA_OBS_SAFE_CALL");

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
  await test("buildObsSafeCallCtx flattens grouped host", () => {
    const ensureObsConnected = async () => ({ ok: false });
    const ctx = buildObsSafeCallCtx({
      core: { safeString: String, writeLog: () => {} },
      obs: { ensureObsConnected, getObs: () => null }
    });
    assert.equal(ctx.ensureObsConnected, ensureObsConnected);
  });

  await test("createObsSafeCall accepts buildObsSafeCallCtx shape", () => {
    const api = createObsSafeCall(
      buildObsSafeCallCtx({
        core: { safeString: String, writeLog: () => {} },
        obs: { ensureObsConnected: async () => ({ ok: false }), getObs: () => null }
      })
    );
    assert.equal(typeof api.safeObsCall, "function");
  });

  await test("index.js uses collectObsSafeCallHost and buildObsSafeCallCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsSafeCallHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_SAFE_CALL_CTX/);
    assert.match(indexSrc, /MIA_OBS_SAFE_CALL_HOST/);
    assert.match(indexSrc, /buildHost\(collectObsSafeCallBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initObsSafeCallRuntime\(\)/);
    assert.match(indexSrc, /obsSafeCallRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /obsSafeCallApi/);
    assert.doesNotMatch(indexSrc, /createObsSafeCall\(\{\s*ensureObsConnected,/);
  });

  console.log("obs_safe_call_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
