"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildDeliveryCtx } = require("../scripts/MIA_DELIVERY_CTX");
const { createDeliveryRuntime } = require("../scripts/MIA_DELIVERY_RUNTIME");

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
  await test("buildDeliveryCtx flattens grouped host", () => {
    const setOverlay = () => ({ accepted: true });
    const ctx = buildDeliveryCtx({
      core: { runtimeConfig: {}, writeLog: () => {}, safeString: String, cloneJson: (v) => v, voiceHoldUntilTs: (n) => n },
      overlay: { setOverlay, getOverlayState: () => ({}), overlayStateModule: {} },
      obs: { obsBrowserRefreshOnOverlayEnabled: () => false, scheduleObsBrowserRefresh: () => {} },
      media: { videoEngine: null, videoEngineModule: {}, bowlFullVideoModule: {} },
      state: { getOutputState: () => ({}), getKojnozoutState: () => ({}), getObsConnected: () => false },
      obsConnect: { forceReconnectObs: async () => {}, ensureObsConnectedWithRetry: async () => ({}) },
      handlers: { getUserLabel: () => "x", tryAutoBossMissionFromGift: async () => null },
      modules: { speakerRoutingModule: {}, ttsEngine: null, languageModule: {}, sessionMemoryModule: {} }
    });

    assert.equal(ctx.setOverlay, setOverlay);
    assert.equal(typeof ctx.getOutputState, "function");
  });

  await test("createDeliveryRuntime accepts buildDeliveryCtx shape", () => {
    const api = createDeliveryRuntime(
      buildDeliveryCtx({
        core: { runtimeConfig: {}, writeLog: () => {}, safeString: String, cloneJson: (v) => v, voiceHoldUntilTs: (n) => n },
        overlay: { setOverlay: () => ({}), getOverlayState: () => ({}), overlayStateModule: {}, invalidateOverlayStateCache: () => {} },
        state: { getOutputState: () => ({}), getKojnozoutState: () => ({}), getObsConnected: () => false },
        handlers: { getUserLabel: () => "x", tryAutoBossMissionFromGift: async () => null }
      })
    );
    assert.equal(typeof api.executeOverlay, "function");
  });

  await test("index.js uses collectDeliveryHost and buildDeliveryCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectDeliveryHost\(\)/);
    assert.match(indexSrc, /MIA_DELIVERY_CTX/);
    assert.match(indexSrc, /MIA_DELIVERY_HOST/);
    assert.match(indexSrc, /buildHost\(collectDeliveryBindingsHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /createDeliveryRuntime\(\{\s*runtimeConfig,/);
  });

  console.log("delivery_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
