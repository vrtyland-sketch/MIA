"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createOverlayStateRuntime } = require("../scripts/MIA_OVERLAY_STATE_RUNTIME");
const { createVisionContextRuntime } = require("../scripts/MIA_VISION_CONTEXT_RUNTIME");
const { createStatusRuntime } = require("../scripts/MIA_STATUS_RUNTIME");

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
  await test("setOverlay updates overlay and invalidates cache", () => {
    let state = { miaOverlay: null };
    let output = {};
    let invalidated = false;

    const api = createOverlayStateRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      overlayStateModule: {
        setOverlay: (s, payload) => {
          s.miaOverlay = payload;
          return { ...payload, accepted: true };
        }
      },
      getOverlayState: () => state,
      outputStateModule: {
        setLastOverlay: (o, overlay) => {
          output.last = overlay;
        }
      },
      getOutputState: () => output,
      overlayStateCache: { invalidate: () => { invalidated = true; } }
    });

    const result = api.setOverlay({ owner: "mia", text: "hi" });
    assert.equal(result.accepted, true);
    assert.equal(state.miaOverlay.text, "hi");
    assert.equal(invalidated, true);
  });

  await test("buildVisionContext reports active combo moment", () => {
    const ctx = createVisionContextRuntime({
      overlayStateModule: {
        getOverlaySnapshot: () => ({
          comboMoment: { id: "c1", text: "COMBO" },
          giftVisual: {}
        })
      },
      getOverlayState: () => ({}),
      runtimeConfig: { overlay: { maxChatFeedItems: 4 } },
      kojnozoutDuelModule: {},
      getDuelState: () => ({}),
      kickBridgeModule: { getKickBridgeStatus: () => ({ started: true }) },
      miaEyes: { getSnapshot: () => ({ lastView: { playingNow: [{ media: { playing: true } }] } }) },
      isStartupSlideActive: () => true
    }).buildVisionContext();

    assert.equal(ctx.startupSlideActive, true);
    assert.equal(ctx.comboMoment.active, true);
    assert.equal(ctx.playingGiftVideo, true);
    assert.equal(ctx.kickBridgeEnabled, true);
  });

  await test("buildMiaStatusResponse returns core status fields", () => {
    const payload = createStatusRuntime({
      videoEngine: { getSnapshot: () => ({ queueLength: 2, playing: true }) },
      spamSessionEngine: { getSpamSessionState: () => ({ active: false }) },
      kojnozoutModule: {
        getKojnozoutSnapshot: () => ({ bowlPercent: 55, mood: "happy", stage: "walk" })
      },
      getKojnozoutStateForSnapshot: () => ({}),
      getKojnozoutState: () => ({}),
      getStreamState: () => ({ audience: { viewerCount: 12 }, counters: { totalEvents: 3 } }),
      cloneJson: (v) => v,
      overlayStateModule: {
        getOverlaySnapshot: () => ({ miaOverlay: { text: "Ahoj", accepted: true }, chatFeed: [{}] })
      },
      getOverlayState: () => ({}),
      runtimeConfig: { obs: { url: "ws://test", giftScene: "SCENE" } },
      kickBridgeModule: { getKickBridgeStatus: () => ({ started: true, connected: true }) },
      getPort: () => 3000,
      nowIso: () => "2026-01-01T00:00:00.000Z",
      getServerStartedAt: () => Date.now() - 60000,
      streamSessionModule: { getSnapshot: () => ({ phase: "LIVE" }) },
      getStreamSession: () => ({}),
      streamEconomyConfig: {
        getConfig: () => ({ version: "1.0.0" }),
        getTierConfig: () => ({ miaPointsPerCoin: 10 })
      },
      getObsConnected: () => true,
      giftMapEnterprise: {},
      getLastGiftMapping: () => null,
      getOutputState: () => ({}),
      getHostTeamScoreState: () => ({}),
      awayModeModule: {},
      getEcosystemState: () => ({}),
      kojnozoutVitalsModule: {},
      kojnozoutDuelModule: {},
      getDuelState: () => ({}),
      getLastDuelSyncSummary: () => null,
      kojnozoutBackpackModule: {},
      getBackpackState: () => ({}),
      kojnozoutAssetsModule: {},
      ecosystemOrchestratorModule: {},
      getLastIngestSummary: () => null,
      chatLexiconModule: {},
      sessionMemoryModule: {},
      llmAdapterModule: null,
      statusSnapshotModule: {},
      getLastShadowPipelineSummary: () => null,
      proactiveHostModule: {},
      supportPolicyModule: {},
      soloStreamModule: {},
      logRotationModule: { getRetentionDays: () => 7, getMaxBytes: () => 5 * 1024 * 1024 }
    }).buildMiaStatusResponse();

    assert.equal(payload.ok, true);
    assert.equal(payload.port, 3000);
    assert.equal(payload.streamSession.phase, "LIVE");
    assert.equal(payload.kojnozout.bowlPercent, 55);
    assert.equal(payload.overlay.miaText, "Ahoj");
    assert.equal(payload.audience.viewerCount, 12);
  });

  await test("index.js wires wave19 runtimes with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initOverlayStateRuntime/);
    assert.match(indexSrc, /initVisionContextRuntime/);
    assert.match(indexSrc, /initStatusRuntime/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_RUNTIME/);
    assert.match(indexSrc, /MIA_OVERLAY_STATE_CTX/);
    assert.match(indexSrc, /MIA_VISION_CONTEXT_RUNTIME/);
    assert.match(indexSrc, /MIA_VISION_CONTEXT_CTX/);
    assert.match(indexSrc, /MIA_STATUS_RUNTIME/);
    assert.doesNotMatch(indexSrc, /overlayStateModule\.setOverlay\(overlayState, payload, options\)/);
  });

  console.log("status_overlay_vision_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
