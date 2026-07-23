"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRuntimeLoopsCtx } = require("../scripts/MIA_RUNTIME_LOOPS_CTX");
const { createRuntimeLoops } = require("../scripts/MIA_RUNTIME_LOOPS");

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
  await test("buildRuntimeLoopsCtx flattens grouped host", () => {
    const executeOverlay = () => ({});
    const ctx = buildRuntimeLoopsCtx({
      core: { runtimeConfig: {}, writeLog: () => {}, serverStartedAt: 1 },
      modules: { bowlEngine: {}, videoEngine: null, bowlFullVideoModule: {}, capybaraFlowModule: {}, proactiveHostModule: {} },
      state: {
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getStreamState: () => ({}),
        getOutputState: () => ({}),
        getEcosystemState: () => ({}),
        getOverlayState: () => ({}),
        getObsConnected: () => false,
        getMiaEyes: () => null,
        getMattingIngestBridge: () => null
      },
      handlers: {
        executeOverlay,
        deliverCapybaraWaitPrompt: async () => {},
        syncSoloStreamObsScene: async () => {},
        deliverProactiveHostMoment: async () => {},
        runDuelPeerSync: async () => null
      }
    });

    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(ctx.serverStartedAt, 1);
  });

  await test("createRuntimeLoops accepts buildRuntimeLoopsCtx shape", () => {
    const api = createRuntimeLoops(
      buildRuntimeLoopsCtx({
        core: { runtimeConfig: {}, writeLog: () => {}, serverStartedAt: Date.now() },
        modules: { bowlEngine: {}, capybaraFlowModule: {}, proactiveHostModule: {} },
        state: {
          getKojnozoutState: () => ({}),
          setKojnozoutState: () => {},
          getStreamState: () => ({}),
          getOutputState: () => ({}),
          getEcosystemState: () => ({}),
          getOverlayState: () => ({}),
          getObsConnected: () => false,
          getMiaEyes: () => null,
          getMattingIngestBridge: () => null
        },
        handlers: {
          executeOverlay: () => {},
          deliverCapybaraWaitPrompt: async () => {},
          syncSoloStreamObsScene: async () => {},
          deliverProactiveHostMoment: async () => {},
          runDuelPeerSync: async () => null
        }
      })
    );
    assert.equal(typeof api.stop, "function");
    api.stop();
  });

  await test("buildRuntimeLoopsCtx resolves videoEngine via getter", () => {
    const video = { id: "video" };
    const ctx = buildRuntimeLoopsCtx({
      modules: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("index.js uses collectRuntimeLoopsHost and buildRuntimeLoopsCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRuntimeLoopsHost\(\)/);
    assert.match(indexSrc, /MIA_RUNTIME_LOOPS_CTX/);
    assert.match(indexSrc, /MIA_RUNTIME_LOOPS_HOST/);
    assert.match(indexSrc, /buildHost\(collectRuntimeLoopsBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initRuntimeLoopsRuntime\(\)/);
    assert.match(indexSrc, /runtimeLoopsRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /runtimeLoopsApi/);
    assert.match(indexSrc, /function initAppRuntimesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createRuntimeLoops\(\{\s*runtimeConfig,/);
  });

  console.log("runtime_loops_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
