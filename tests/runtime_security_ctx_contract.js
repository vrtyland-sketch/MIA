"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRuntimeSecurityCtx } = require("../scripts/MIA_RUNTIME_SECURITY_CTX");
const {
  createDebugRouteGuard,
  createIngestAuthGuard,
  createLocalAdminGuard
} = require("../scripts/MIA_RUNTIME_SECURITY");

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
  await test("buildRuntimeSecurityCtx returns empty deps bag", () => {
    assert.deepEqual(buildRuntimeSecurityCtx({}), {});
  });

  await test("runtime security factories remain callable after ctx flatten", () => {
    assert.equal(typeof createDebugRouteGuard(buildRuntimeSecurityCtx({})), "function");
    assert.equal(typeof createIngestAuthGuard(buildRuntimeSecurityCtx({})), "function");
    assert.equal(typeof createLocalAdminGuard(buildRuntimeSecurityCtx({})), "function");
  });

  await test("index.js uses collectRuntimeSecurityHost and initRuntimeSecurityRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRuntimeSecurityHost\(\)/);
    assert.match(indexSrc, /MIA_RUNTIME_SECURITY_CTX/);
    assert.match(indexSrc, /MIA_RUNTIME_SECURITY_HOST/);
    assert.match(indexSrc, /buildHost\(collectRuntimeSecurityBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initRuntimeSecurityRuntime\(\)/);
    assert.match(indexSrc, /initRuntimeSecurityRuntime\(\)/);
    assert.match(indexSrc, /runtimeSecurityRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initRuntimeSecurityGuards\(\)/);
    assert.doesNotMatch(indexSrc, /const debugRouteGuard\s*=\s*\n\s*typeof runtimeSecurityModule\.createDebugRouteGuard/);
  });

  console.log("runtime_security_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
