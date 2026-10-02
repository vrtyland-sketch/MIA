"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createHealthRuntime } = require("../scripts/MIA_HEALTH_RUNTIME");

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
  await test("createHealthRuntime exposes health API", () => {
    const api = createHealthRuntime({
      kojnozoutModule: {},
      getKojnozoutState: () => ({ bowlPercent: 42 }),
      getStreamState: () => ({}),
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      getPort: () => 3000,
      getObsConnected: () => true,
      nowIso: () => "2026-01-01T00:00:00.000Z",
      getLastIngestSummary: () => ({ type: "chat" }),
      resolveObsOverlayMode: () => "split",
      MIA_SPLIT_OVERLAYS: () => ({ speech: "/speech-overlay.html" }),
      overlayStateModule: {},
      getOverlayState: () => ({}),
      buildObsHealthSnapshot: async () => ({ ok: true }),
      ttsEngine: null,
      runtimeConfig: {},
      getVoicePlaybackSnapshot: () => ({}),
      llmAdapterModule: null,
      videoEngine: null,
      overlayTiming: null,
      voicePriorityLayer: null,
      overlayQueue: null
    });

    assert.equal(typeof api.buildHealthPayload, "function");
    assert.equal(typeof api.buildDiagnosePayload, "function");
  });

  await test("buildHealthPayload includes koj bowl percent", () => {
    const payload = createHealthRuntime({
      kojnozoutModule: {
        getKojnozoutSnapshot: (koj, stream) => ({ ...koj, stream })
      },
      getKojnozoutState: () => ({ bowlPercent: 77 }),
      getStreamState: () => ({ live: true }),
      kickBridgeModule: {
        getKickBridgeStatus: () => ({ connected: true })
      },
      twitchBridgeModule: {
        getTwitchBridgeStatus: () => ({ connected: false })
      },
      telegramBridgeModule: {},
      getPort: () => 3000,
      getObsConnected: () => false,
      nowIso: () => "2026-01-01T00:00:00.000Z",
      getLastIngestSummary: () => null,
      resolveObsOverlayMode: () => "split",
      MIA_SPLIT_OVERLAYS: () => ({ speech: "/speech" }),
      overlayStateModule: {},
      getOverlayState: () => ({}),
      buildObsHealthSnapshot: async () => ({}),
      ttsEngine: null,
      runtimeConfig: {},
      getVoicePlaybackSnapshot: () => ({}),
      llmAdapterModule: null,
      videoEngine: null,
      overlayTiming: null,
      voicePriorityLayer: null,
      overlayQueue: null
    }).buildHealthPayload();

    assert.equal(payload.ok, true);
    assert.equal(payload.port, 3000);
    assert.equal(payload.bowlPercent, 77);
    assert.equal(payload.kickBridge.connected, true);
  });

  await test("buildDiagnosePayload strips api key from tts config", async () => {
    const payload = await createHealthRuntime({
      kojnozoutModule: {},
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      kickBridgeModule: {},
      twitchBridgeModule: {},
      telegramBridgeModule: {},
      getPort: () => 3000,
      getObsConnected: () => true,
      nowIso: () => "2026-01-01T00:00:00.000Z",
      getLastIngestSummary: () => null,
      resolveObsOverlayMode: () => "split",
      MIA_SPLIT_OVERLAYS: () => ({ speech: "/speech" }),
      overlayStateModule: {
        getOverlaySnapshot: (state) => ({
          ...state,
          miaOverlay: { text: "hello", holdUntilTs: 1 },
          chatFeed: [{ text: "a" }, { text: "b" }]
        })
      },
      getOverlayState: () => ({}),
      buildObsHealthSnapshot: async () => ({ connected: true }),
      ttsEngine: {
        resolveConfig: () => ({ enabled: true, apiKey: "secret", speaker: "mia" })
      },
      runtimeConfig: {},
      getVoicePlaybackSnapshot: () => ({ speaker: "mia" }),
      llmAdapterModule: null,
      videoEngine: { getSnapshot: () => ({ started: 1 }) },
      overlayTiming: { getSnapshot: () => ({ holdMs: 1000 }) },
      voicePriorityLayer: { getSnapshot: () => ({}) },
      overlayQueue: { size: () => 2 }
    }).buildDiagnosePayload();

    assert.equal(payload.ok, true);
    assert.equal(payload.activeOverlays.mia, "hello");
    assert.equal(payload.tts.apiKey, undefined);
    assert.equal(payload.tts.apiKeyConfigured, true);
    assert.equal(payload.overlay.queueSize, 2);
    assert.equal(payload.overlay.chatFeed.length, 2);
    assert.equal(payload.youtubeBridge.status, "unavailable");
  });

  await test("health and diagnose expose compact YouTube status without secrets", async () => {
    const runtime = createHealthRuntime({
      getPort: () => 3000,
      nowIso: () => "2026-10-02T00:00:00.000Z",
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      youtubeBridgeModule: {
        getYouTubePollSnapshot: () => ({
          enabled: true,
          started: false,
          ready: false,
          status: "missing_api_key",
          inFlight: false,
          liveChatId: "",
          videoId: "vid-1",
          pollMs: 0,
          pageToken: "tok-secret-page",
          lastPollAt: 0,
          lastSuccessAt: 0,
          lastErrorAt: 10,
          lastError: "quotaExceeded",
          lastHttpStatus: 403,
          lastDeliveredAt: 20,
          deliveredCount: 4,
          lastMessageId: "m1",
          lastMessageUser: "Viewer",
          lastMessagePreview: "ahoj",
          dedupeSize: 4,
          dedupe: [{ id: "m1" }],
          apiKey: "super-secret-key",
          ingestSecret: "ingest-secret-value",
          authorization: "Bearer abc"
        })
      },
      runtimeConfig: {
        youtube: { apiKey: "super-secret-key", ingestSecret: "ingest-secret-value" }
      }
    });
    const health = runtime.buildHealthPayload();
    const diagnose = await runtime.buildDiagnosePayload();
    assert.equal(health.youtubeBridge.status, "missing_api_key");
    assert.equal(health.youtubeBridge.ready, false);
    assert.equal(health.youtubeBridge.enabled, true);
    assert.equal(health.youtubeBridge.dedupe, undefined);
    assert.equal(health.youtubeBridge.pageToken, undefined);
    assert.equal(health.ingestRouting.youtube.mode, "live_chat_poll");
    assert.equal(health.ingestRouting.youtube.route, "YouTube bridge → /ingest");
    assert.equal(health.ingestRouting.youtube.status, "missing_api_key");
    assert.equal(diagnose.youtubeBridge.lastError, "quotaExceeded");
    assert.equal(diagnose.youtubeBridge.lastHttpStatus, 403);
    assert.equal(diagnose.youtubeBridge.pageToken, "tok-secret-page");
    assert.equal(diagnose.youtubeBridge.lastMessagePreview, "ahoj");
    assert.equal(diagnose.youtubeBridge.dedupe, undefined);
    const packed = JSON.stringify({ health, diagnose });
    assert.equal(packed.includes("super-secret-key"), false);
    assert.equal(packed.includes("ingest-secret-value"), false);
    assert.equal(packed.includes("Bearer abc"), false);
    assert.equal(packed.includes("apiKey"), false);
  });

  await test("index.js wires healthRuntime with thin buildHealthPayload wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initHealthRuntime/);
    assert.match(indexSrc, /MIA_HEALTH_RUNTIME/);
    assert.match(
      indexSrc,
      /const youtubeBridgeModule = safeRequire\("\.\/scripts\/MIA_YOUTUBE_BRIDGE", \{\}\);/
    );
    assert.match(indexSrc, /youtubeBridgeModule,/);
    assert.match(indexSrc, /MIA_HEALTH_CTX/);
    assert.match(
      indexSrc,
      /function buildHealthPayload\(\) \{\s*return healthRuntime\(\)\.buildHealthPayload\(\);/
    );
    assert.match(
      indexSrc,
      /async function buildDiagnosePayload\(\) \{\s*return healthRuntime\(\)\.buildDiagnosePayload\(\);/
    );
  });

  console.log("health_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
