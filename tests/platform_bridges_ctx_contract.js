"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildPlatformBridgesCtx } = require("../scripts/MIA_PLATFORM_BRIDGES_CTX");
const { createPlatformBridges } = require("../scripts/MIA_PLATFORM_BRIDGES");

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
  await test("buildPlatformBridgesCtx resolves processEvent via getter", () => {
    let calls = 0;
    const ctx = buildPlatformBridgesCtx({
      core: {
        getProcessEvent: () => async () => {
          calls += 1;
          return { ok: true };
        }
      }
    });
    assert.equal(typeof ctx.processEvent, "function");
    return ctx.processEvent({}).then(() => {
      assert.equal(calls, 1);
    });
  });

  await test("buildPlatformBridgesCtx flattens grouped host", () => {
    const processEvent = async () => ({ ok: true });
    const ctx = buildPlatformBridgesCtx({
      core: {
        app: { id: "app" },
        runtimeConfig: {},
        writeLog: () => {},
        cloneJson: (v) => v,
        safeString: String,
        processEvent
      },
      modules: { kickBridgeModule: {}, twitchBridgeModule: {}, telegramBridgeModule: {}, responseEngine: {} },
      state: { getOutputState: () => ({}), getKojnozoutState: () => ({}) }
    });

    assert.equal(ctx.app.id, "app");
    assert.equal(ctx.processEvent, processEvent);
  });

  await test("createPlatformBridges accepts buildPlatformBridgesCtx shape", () => {
    const api = createPlatformBridges(
      buildPlatformBridgesCtx({
        core: {
          app: {},
          runtimeConfig: {},
          writeLog: () => {},
          cloneJson: (v) => v,
          safeString: String,
          processEvent: async () => ({})
        },
        modules: { kickBridgeModule: {}, twitchBridgeModule: {}, telegramBridgeModule: {}, responseEngine: {} },
        state: { getOutputState: () => ({}), getKojnozoutState: () => ({}) }
      })
    );
    assert.equal(typeof api.bootstrapPlatformBridges, "function");
  });

  await test("index.js uses collectPlatformBridgesHost and buildPlatformBridgesCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectPlatformBridgesHost\(\)/);
    assert.match(indexSrc, /MIA_PLATFORM_BRIDGES_CTX/);
    assert.match(indexSrc, /MIA_PLATFORM_BRIDGES_HOST/);
    assert.match(indexSrc, /buildHost\(collectPlatformBridgesBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initPlatformBridgesRuntime\(\)/);
    assert.match(indexSrc, /platformBridgesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /platformBridgesApi/);
    assert.match(indexSrc, /getProcessEvent: \(\) => processEvent/);
    assert.match(indexSrc, /initPlatformBridgesRuntime\(\)/);
  });

  console.log("platform_bridges_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
