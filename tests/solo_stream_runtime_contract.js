"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createSoloStreamRuntime } = require("../scripts/MIA_SOLO_STREAM_RUNTIME");

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
  await test("createSoloStreamRuntime exposes solo stream API", () => {
    const api = createSoloStreamRuntime({
      soloStreamModule: {},
      videoEngine: null,
      streamState: {},
      getOutputState: () => ({}),
      getOverlayState: () => ({}),
      runtimeConfig: {},
      serverStartedAt: Date.now(),
      getKojnozoutState: () => ({}),
      obsConnected: false,
      isVoicePlaybackActive: () => false,
      safeObsCall: async () => ({}),
      writeLog: () => {},
      executeOverlay: async () => ({}),
      maybeDeliverMiaVoice: async () => ({}),
      safeString: (v) => String(v ?? "")
    });

    assert.equal(typeof api.buildSoloStreamSceneCtx, "function");
    assert.equal(typeof api.syncSoloStreamObsScene, "function");
    assert.equal(typeof api.handleSoloStreamChatActivity, "function");
    assert.equal(typeof api.deliverProactiveHostMoment, "function");
  });

  await test("buildSoloStreamSceneCtx includes voice and video flags", () => {
    const ctx = createSoloStreamRuntime({
      videoEngine: { getSnapshot: () => ({ processing: true }) },
      streamState: { phase: "live" },
      getOutputState: () => ({ solo: true }),
      getOverlayState: () => ({}),
      runtimeConfig: {},
      serverStartedAt: 1000,
      getKojnozoutState: () => ({}),
      obsConnected: true,
      isVoicePlaybackActive: () => true,
      safeString: (v) => String(v ?? "")
    }).buildSoloStreamSceneCtx(42);

    assert.equal(ctx.tick, 42);
    assert.equal(ctx.voiceActive, true);
    assert.equal(ctx.supportRouteActive, true);
    assert.equal(ctx.obsConnected, true);
  });

  await test("syncSoloStreamObsScene returns null when module missing", async () => {
    const result = await createSoloStreamRuntime({
      soloStreamModule: {},
      getOutputState: () => ({}),
      getOverlayState: () => ({}),
      isVoicePlaybackActive: () => false,
      safeString: (v) => String(v ?? "")
    }).syncSoloStreamObsScene();

    assert.equal(result, null);
  });

  await test("index.js wires soloStreamRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initSoloStreamRuntime/);
    assert.match(indexSrc, /MIA_SOLO_STREAM_RUNTIME/);
    assert.match(indexSrc, /MIA_SOLO_STREAM_CTX/);
    assert.match(
      indexSrc,
      /function buildSoloStreamSceneCtx\(tick = null\) \{\s*return soloStreamRuntime\(\)\.buildSoloStreamSceneCtx\(tick\);/
    );
    assert.doesNotMatch(indexSrc, /intent: "proactive_host"/);
  });

  console.log("solo_stream_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
