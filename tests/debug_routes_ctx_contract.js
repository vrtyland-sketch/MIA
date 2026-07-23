"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildDebugRoutesCtx } = require("../scripts/MIA_DEBUG_ROUTES_CTX");
const { createDebugRoutesRuntime } = require("../scripts/MIA_DEBUG_ROUTES_RUNTIME");

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
  await test("buildDebugRoutesCtx resolves processEvent via getter", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const ctx = buildDebugRoutesCtx({
      handlers: { getProcessEvent: () => processEvent }
    });
    assert.equal(ctx.processEvent, processEvent);
  });

  await test("buildDebugRoutesCtx flattens grouped host", () => {
    const processEvent = async () => ({ status: 200, body: { ok: true } });
    const ctx = buildDebugRoutesCtx({
      handlers: { processEvent }
    });
    assert.equal(ctx.processEvent, processEvent);
  });

  await test("createDebugRoutesRuntime accepts buildDebugRoutesCtx shape", async () => {
    const api = createDebugRoutesRuntime(
      buildDebugRoutesCtx({
        handlers: {
          processEvent: async () => ({ status: 200, body: { ok: true } })
        }
      })
    );
    assert.equal(typeof api.handleDebugComment, "function");
  });

  await test("index.js uses collectDebugRoutesHost and buildDebugRoutesCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectDebugRoutesHost\(\)/);
    assert.match(indexSrc, /MIA_DEBUG_ROUTES_CTX/);
    assert.match(indexSrc, /MIA_DEBUG_ROUTES_HOST/);
    assert.match(indexSrc, /buildHost\(collectDebugRoutesBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initDebugRoutesRuntime\(\)/);
    assert.match(indexSrc, /debugRoutesRuntime\(\)/);
    assert.match(indexSrc, /getProcessEvent: \(\) => processEvent/);
    assert.doesNotMatch(indexSrc, /debugRoutesApiCache/);
    assert.doesNotMatch(indexSrc, /createDebugRoutesRuntime\(\{\s*processEvent\s*\}\)/);
  });

  console.log("debug_routes_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
