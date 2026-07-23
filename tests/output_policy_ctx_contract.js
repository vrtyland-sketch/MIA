"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildOutputPolicyCtx } = require("../scripts/MIA_OUTPUT_POLICY_CTX");
const { createOutputPolicy } = require("../scripts/MIA_OUTPUT_POLICY");

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
  await test("buildOutputPolicyCtx passes policy input through", () => {
    const ctx = buildOutputPolicyCtx({
      core: { policyInput: { minActionIntervalMs: 9000, ttsEnabled: true } }
    });
    assert.equal(ctx.minActionIntervalMs, 9000);
    assert.equal(ctx.ttsEnabled, true);
  });

  await test("createOutputPolicy accepts buildOutputPolicyCtx shape", () => {
    const api = createOutputPolicy(
      buildOutputPolicyCtx({
        core: { policyInput: { minActionIntervalMs: 6500 } }
      })
    );
    assert.equal(api.minActionIntervalMs, 6500);
    assert.equal(api.overlayEnabled, true);
  });

  await test("index.js uses collectOutputPolicyBindingsHost and buildOutputPolicyHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectOutputPolicyBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OUTPUT_POLICY_HOST/);
    assert.match(indexSrc, /buildCtx\(collectOutputPolicyHost\(\)\)/);
    assert.match(indexSrc, /function initOutputPolicyRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initOutputPolicy\(\)/);
    assert.doesNotMatch(indexSrc, /createOutputPolicy\(runtimeConfig\?\.outputPolicy/);
  });

  console.log("output_policy_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
