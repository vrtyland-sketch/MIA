"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRuntimeStateCtx } = require("../scripts/MIA_RUNTIME_STATE_CTX");
const { createRuntimeStateRuntime } = require("../scripts/MIA_RUNTIME_STATE_RUNTIME");

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
  await test("buildRuntimeStateCtx flattens grouped host", () => {
    const getStreamState = () => ({ gifts: 1 });
    const ctx = buildRuntimeStateCtx({
      core: {
        upper: (v) => String(v || "").toUpperCase(),
        extractSupportPayload: (n) => n.support,
        extractCommunityImpact: () => ({}),
        runtimeConfig: {},
        gameConfig: {},
        writeLog: () => {}
      },
      modules: {
        streamStateModule: {},
        kojnozoutModule: {},
        kojnozoutPersistenceModule: {},
        kojnozoutWorldPersistenceModule: {}
      },
      state: {
        getStreamState,
        setStreamState: () => {},
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getKojnozoutBackpackState: () => ({}),
        getDuelState: () => ({})
      }
    });
    assert.equal(ctx.getStreamState, getStreamState);
    assert.equal(ctx.gameConfig, ctx.gameConfig);
  });

  await test("createRuntimeStateRuntime accepts buildRuntimeStateCtx shape", () => {
    const api = createRuntimeStateRuntime(
      buildRuntimeStateCtx({
        core: {
          upper: (v) => String(v || "").toUpperCase(),
          extractSupportPayload: (n) => n.support,
          extractCommunityImpact: () => ({}),
          runtimeConfig: {},
          gameConfig: {},
          writeLog: () => {}
        },
        modules: {
          streamStateModule: {},
          kojnozoutModule: {},
          kojnozoutPersistenceModule: {},
          kojnozoutWorldPersistenceModule: {}
        },
        state: {
          getStreamState: () => ({}),
          setStreamState: () => {},
          getKojnozoutState: () => ({}),
          setKojnozoutState: () => {},
          getKojnozoutBackpackState: () => ({}),
          getDuelState: () => ({})
        }
      })
    );
    assert.equal(typeof api.applyRuntimeStateImpact, "function");
    assert.equal(typeof api.scheduleWorldSave, "function");
  });

  await test("index.js uses collectRuntimeStateHost and buildRuntimeStateCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRuntimeStateHost\(\)/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_CTX/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_HOST/);
    assert.match(indexSrc, /buildHost\(collectRuntimeStateBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createRuntimeStateRuntime\(\{\s*upper,/);
  });

  console.log("runtime_state_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
