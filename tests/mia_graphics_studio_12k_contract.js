"use strict";

const assert = require("assert/strict");
const graphicsStudio = require("../shared/mia-graphics-studio");
const { createOverlayPublicResponse } = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");
const fs = require("fs");
const path = require("path");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("resolveMoodFromOverlay maps duel and gift moments", () => {
    const now = Date.now();
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay(
        { duel: { active: true, holdUntilTs: now + 5000 } },
        now
      ),
      "duel"
    );
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay(
        { miaOverlay: { route: "support", giftName: "Rose" } },
        now
      ),
      "gift"
    );
    assert.equal(
      graphicsStudio.resolveMoodFromOverlay({ miaOverlay: { action: "wave" } }, now),
      "wave"
    );
  });

  await test("syncFromOverlayPublic publishes live body state", () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.resetLiveSyncSignature();
    const now = Date.now();
    const synced = graphicsStudio.syncFromOverlayPublic(
      { comboMoment: { active: true, holdUntilTs: now + 4000 } },
      now
    );
    assert.ok(synced);
    assert.equal(synced.mood, "combo");
    assert.equal(synced.source, "live");
    assert.ok(synced.liveSyncedAt > 0);
    const again = graphicsStudio.syncFromOverlayPublic(
      { comboMoment: { active: true, holdUntilTs: now + 4000 } },
      now
    );
    assert.equal(again, null);
  });

  await test("studio lock blocks live overlay sync", () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.resetLiveSyncSignature();
    graphicsStudio.publishBodyState({
      mood: "think",
      source: "studio",
      lockStudioMs: 60000
    });
    const synced = graphicsStudio.syncFromOverlayPublic({
      duel: { active: true, holdUntilTs: Date.now() + 5000 }
    });
    assert.equal(synced.mood, "think");
    assert.equal(graphicsStudio.getBodyState().mood, "think");
  });

  await test("overlay public response mirrors live body state", () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.resetLiveSyncSignature();
    const overlayPublic = createOverlayPublicResponse({
      getOverlayState: () => ({
        miaOverlay: { route: "support", giftName: "Galaxy" }
      }),
      overlayStateModule: {
        getOverlaySnapshot: (state) => state
      },
      getKojnozoutState: () => ({}),
      getStreamState: () => ({}),
      getDuelState: () => null,
      getBackpackState: () => null,
      getArenaState: () => null,
      getOutputState: () => ({}),
      getEcosystemState: () => null,
      getGiftUserLedger: () => null,
      getGiftSupporterProfile: () => null,
      kojnozoutModule: {},
      kojnozoutDuelModule: {},
      kojnozoutBackpackModule: {},
      videoEngine: { getSnapshot: () => ({}) },
      spamSessionEngine: { getSpamSessionState: () => null },
      careOpportunitiesModule: {},
      kojnozoutBondModule: {},
      platformArenaModule: {},
      kojDisplayModule: {},
      giftUserLedgerModule: {},
      capybaraFlowModule: {},
      giftSupporterProfileModule: {},
      kojnozoutVitalsModule: {},
      ecosystemOrchestratorModule: {},
      runtimeConfig: {},
      obsConnected: false,
      getVoicePlaybackSnapshot: () => null,
      translationRuntime: null
    });
    overlayPublic.buildPublicOverlayStateResponse();
    assert.equal(graphicsStudio.getBodyState().mood, "gift");
    assert.equal(graphicsStudio.getBodyState().source, "live");
  });

  await test("hybrid sync urls and runtime mode", () => {
    const urls = graphicsStudio.buildBodyPartUrls("http://127.0.0.1:3000", { syncHybrid: true });
    assert.match(urls.miaHead, /sync=hybrid/);
    const hook = graphicsStudio.getObsHook(3000);
    assert.equal(hook.phase, "12u");
    assert.ok(hook.hybridSyncUrls);
    const src = fs.readFileSync(
      path.join(__dirname, "..", "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    assert.match(src, /SYNC_HYBRID/);
    assert.match(src, /pollHybrid/);
  });

  console.log("mia_graphics_studio_12k_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
