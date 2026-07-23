"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildStartupOverlayCtx } = require("../scripts/MIA_STARTUP_OVERLAY_CTX");
const { createStartupOverlayRuntime } = require("../scripts/MIA_STARTUP_OVERLAY_RUNTIME");

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
  await test("buildStartupOverlayCtx flattens grouped host", () => {
    const getObsConnected = () => true;
    const ctx = buildStartupOverlayCtx({
      core: {
        writeLog: () => {},
        runtimeConfig: {},
        getPort: () => 3000,
        getBindHost: () => "127.0.0.1",
        voiceHoldUntilTs: (n) => n,
        projectRoot: ROOT
      },
      modules: {
        startupCheckModule: {},
        mediaCatalogModule: {},
        ttsEngine: null,
        kickBridgeModule: {},
        runtimeSecurityModule: {},
        preflightTestsModule: {}
      },
      state: { getObsConnected, getObs: () => null },
      media: { videoEngine: null, MIA_SPLIT_OVERLAYS: () => ({}) },
      obs: {
        flashStartupCheckBrowserSource: async () => ({}),
        obsBrowserRefreshOnConnectEnabled: () => false,
        refreshObsMiaBrowserSources: async () => ({})
      },
      handlers: {
        executeOverlay: async () => ({}),
        deliveryRuntime: () => ({}),
        mirrorSpeechOverlayFromVoice: () => {},
        invalidateOverlayStateCache: () => {}
      }
    });
    assert.equal(ctx.getObsConnected, getObsConnected);
    assert.equal(ctx.getPort(), 3000);
  });

  await test("createStartupOverlayRuntime accepts buildStartupOverlayCtx shape", () => {
    const api = createStartupOverlayRuntime(
      buildStartupOverlayCtx({
        core: {
          writeLog: () => {},
          runtimeConfig: {},
          getPort: () => 3000,
          getBindHost: () => "127.0.0.1",
          voiceHoldUntilTs: (n) => n,
          projectRoot: ROOT
        },
        modules: {
          startupCheckModule: { buildStartupCheck: () => ({ ok: true, checks: [] }) },
          mediaCatalogModule: {},
          ttsEngine: null,
          kickBridgeModule: {},
          runtimeSecurityModule: {},
          preflightTestsModule: {}
        },
        state: { getObsConnected: () => false, getObs: () => null },
        media: { videoEngine: null, MIA_SPLIT_OVERLAYS: () => ({ startupCheck: "/x" }) },
        obs: {
          flashStartupCheckBrowserSource: async () => ({}),
          obsBrowserRefreshOnConnectEnabled: () => false,
          refreshObsMiaBrowserSources: async () => ({})
        },
        handlers: {
          executeOverlay: async () => ({}),
          deliveryRuntime: () => ({}),
          mirrorSpeechOverlayFromVoice: () => {},
          invalidateOverlayStateCache: () => {}
        }
      })
    );
    assert.equal(typeof api.buildStartupCheckPayload, "function");
  });

  await test("buildStartupOverlayCtx resolves videoEngine via getter", () => {
    const video = { id: "video" };
    const ctx = buildStartupOverlayCtx({
      media: { getVideoEngine: () => video }
    });
    assert.equal(ctx.videoEngine.id, "video");
  });

  await test("index.js uses collectStartupOverlayHost and buildStartupOverlayCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectStartupOverlayHost\(\)/);
    assert.match(indexSrc, /MIA_STARTUP_OVERLAY_CTX/);
    assert.match(indexSrc, /MIA_STARTUP_OVERLAY_HOST/);
    assert.match(indexSrc, /buildHost\(collectStartupOverlayBindingsHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /createStartupOverlayRuntime\(\{\s*writeLog,/);
  });

  console.log("startup_overlay_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
