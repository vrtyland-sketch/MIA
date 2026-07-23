"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createStartupOverlayRuntime exposes startup API", () => {
    const api = createStartupOverlayRuntime({
      writeLog: () => {},
      startupCheckModule: {
        buildStartupCheck: () => ({
          ok: true,
          streamReady: true,
          readinessPercent: 100,
          summary: { readinessPercent: 100 },
          checks: []
        })
      },
      mediaCatalogModule: {},
      ttsEngine: null,
      runtimeConfig: {},
      kickBridgeModule: {},
      runtimeSecurityModule: {},
      getPort: () => 3000,
      getBindHost: () => "127.0.0.1",
      getObsConnected: () => true,
      getObs: () => null,
      videoEngine: null,
      MIA_SPLIT_OVERLAYS: () => ({ startupCheck: "/startup-check.html", speech: "/speech" }),
      flashStartupCheckBrowserSource: async () => ({ ok: true }),
      executeOverlay: async () => ({}),
      deliveryRuntime: () => ({}),
      mirrorSpeechOverlayFromVoice: () => {},
      invalidateOverlayStateCache: () => {},
      voiceHoldUntilTs: (now) => now + 3000,
      obsBrowserRefreshOnConnectEnabled: () => false,
      refreshObsMiaBrowserSources: async () => ({}),
      projectRoot: ROOT,
      preflightTestsModule: {}
    });

    for (const key of [
      "buildStartupCheckPayload",
      "emitStartupCheckSlide",
      "emitStartupOverlay",
      "runPreflightTestsAsync"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("buildStartupCheckPayload caches last payload", () => {
    let built = 0;
    const api = createStartupOverlayRuntime({
      writeLog: () => {},
      startupCheckModule: {
        buildStartupCheck: () => {
          built += 1;
          return { ok: true, readinessPercent: 80, checks: [{ ok: true, label: "server" }] };
        }
      },
      mediaCatalogModule: {},
      ttsEngine: null,
      runtimeConfig: {},
      kickBridgeModule: {},
      runtimeSecurityModule: {},
      getPort: () => 3000,
      getBindHost: () => "127.0.0.1",
      getObsConnected: () => false,
      getObs: () => null,
      videoEngine: null,
      MIA_SPLIT_OVERLAYS: () => ({ startupCheck: "/startup-check.html" }),
      flashStartupCheckBrowserSource: async () => ({}),
      executeOverlay: async () => ({}),
      deliveryRuntime: () => ({}),
      mirrorSpeechOverlayFromVoice: () => {},
      invalidateOverlayStateCache: () => {},
      voiceHoldUntilTs: (now) => now,
      obsBrowserRefreshOnConnectEnabled: () => false,
      refreshObsMiaBrowserSources: async () => ({}),
      projectRoot: ROOT,
      preflightTestsModule: {}
    });

    const first = api.buildStartupCheckPayload();
    const second = api.getLastStartupCheck();
    assert.equal(first.ok, true);
    assert.equal(second, first);
    assert.equal(built, 1);
  });

  await test("emitStartupCheckSlide executes overlay headline", async () => {
    let overlayPayload = null;

    await createStartupOverlayRuntime({
      writeLog: () => {},
      startupCheckModule: {
        buildStartupCheck: () => ({
          ok: true,
          streamReady: true,
          readinessPercent: 95,
          streamReadyLabel: "OK",
          summary: { readinessPercent: 95 },
          checks: []
        })
      },
      mediaCatalogModule: {},
      ttsEngine: null,
      runtimeConfig: {},
      kickBridgeModule: {},
      runtimeSecurityModule: {},
      getPort: () => 3000,
      getBindHost: () => "127.0.0.1",
      getObsConnected: () => false,
      getObs: () => null,
      videoEngine: null,
      MIA_SPLIT_OVERLAYS: () => ({ startupCheck: "/startup-check.html" }),
      flashStartupCheckBrowserSource: async () => ({}),
      executeOverlay: async (payload) => {
        overlayPayload = payload;
      },
      deliveryRuntime: () => ({}),
      mirrorSpeechOverlayFromVoice: () => {},
      invalidateOverlayStateCache: () => {},
      voiceHoldUntilTs: (now) => now,
      obsBrowserRefreshOnConnectEnabled: () => false,
      refreshObsMiaBrowserSources: async () => ({}),
      projectRoot: ROOT,
      preflightTestsModule: {}
    }).emitStartupCheckSlide();

    assert.equal(overlayPayload.stage, "startup_check");
    assert.match(overlayPayload.text, /95%/);
  });

  await test("index.js wires startupOverlayRuntime without inline buildStartupCheck", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initStartupOverlayRuntime/);
    assert.match(indexSrc, /MIA_STARTUP_OVERLAY_RUNTIME/);
    assert.match(indexSrc, /MIA_STARTUP_OVERLAY_CTX/);
    assert.match(indexSrc, /function buildStartupCheckPayload/);
    assert.doesNotMatch(indexSrc, /startupCheckModule\.buildStartupCheck\(/);
  });

  console.log("startup_overlay_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
