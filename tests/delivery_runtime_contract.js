"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createDeliveryRuntime exposes delivery API", () => {
    const api = createDeliveryRuntime({
      runtimeConfig: {},
      writeLog: () => {},
      safeString: (v, d) => (v == null || v === "" ? d || "" : String(v)),
      cloneJson: (v, f) => v || f,
      setOverlay: () => ({ accepted: true }),
      getOverlayState: () => ({}),
      overlayStateModule: {},
      overlayStateCache: null,
      invalidateOverlayStateCache: () => {},
      overlayTiming: null,
      overlayQueue: null,
      voicePriorityLayer: null,
      obsOverlayRenderer: null,
      obsBrowserRefreshOnOverlayEnabled: () => false,
      scheduleObsBrowserRefresh: () => {},
      overlayEmitResultModule: {},
      videoEngine: null,
      videoEngineModule: {},
      bowlFullVideoModule: {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({}),
      getObsConnected: () => false,
      forceReconnectObs: async () => {},
      ensureObsConnectedWithRetry: async () => ({ ok: false }),
      getUserLabel: () => "Viewer",
      tryAutoBossMissionFromGift: async () => null,
      speakerRoutingModule: {},
      ttsEngine: null,
      languageModule: {},
      sessionMemoryModule: {},
      voiceHoldUntilTs: (now, ms) => now + (ms || 3000)
    });

    for (const key of [
      "executeOverlay",
      "executeGiftPresentationOverlays",
      "attachGiftVideoPlan",
      "executeVideo",
      "deliverActionVoice",
      "maybeDeliverMiaVoice",
      "getVoicePlaybackSnapshot",
      "activateComboMoment",
      "mirrorSpeechOverlayFromVoice"
    ]) {
      assert.equal(typeof api[key], "function", `missing ${key}`);
    }
  });

  await test("attachGiftVideoPlan skips when shouldPlayVideo is false", async () => {
    const api = createDeliveryRuntime({
      runtimeConfig: {},
      writeLog: () => {},
      safeString: String,
      cloneJson: (v) => v,
      setOverlay: () => ({}),
      getOverlayState: () => ({}),
      overlayStateModule: {},
      invalidateOverlayStateCache: () => {},
      getOutputState: () => ({}),
      getKojnozoutState: () => ({}),
      getObsConnected: () => false,
      getUserLabel: () => "x",
      tryAutoBossMissionFromGift: async () => null,
      voiceHoldUntilTs: (n) => n
    });

    const result = await api.attachGiftVideoPlan({ shouldPlayVideo: false, tier: "T1" });
    assert.equal(result.shouldPlayVideo, false);
  });

  await test("index.js wires initDeliveryRuntime and delivery wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initDeliveryRuntime\(\)/);
    assert.match(indexSrc, /MIA_DELIVERY_RUNTIME/);
    assert.match(indexSrc, /MIA_DELIVERY_CTX/);
    assert.match(indexSrc, /function executeOverlay\(/);
    assert.doesNotMatch(indexSrc, /async function executeOverlayImmediate\(/);
  });

  console.log("delivery_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
