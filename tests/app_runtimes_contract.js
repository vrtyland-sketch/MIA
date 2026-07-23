"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

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
  await test("index.js uses initAppRuntimesRuntime orchestrator", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /let appRuntimesApi = null/);
    assert.match(indexSrc, /function initAppRuntimesRuntime\(\)/);
    assert.match(indexSrc, /function appRuntimesRuntime\(\)/);
    assert.match(indexSrc, /initAppRuntimesRuntime\(\);/);
    assert.match(indexSrc, /initPlatformBridgesRuntime\(\);\s*\n\s*bootstrapPlatformBridges\(\);/);
    assert.match(indexSrc, /bootstrapPlatformBridges\(\);\s*\n\s*initRuntimeLoopsRuntime\(\);\s*\n\s*initServerBootstrapRuntime\(\);/);
  });

  console.log("app_runtimes_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
