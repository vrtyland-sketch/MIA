"use strict";

const assert = require("assert/strict");
const {
  stripValueFieldsForPublic,
  createOverlayPublicResponse
} = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("stripValueFieldsForPublic removes coin/value keys recursively", () => {
  const input = {
    miaPoints: 42,
    giftCount: 2,
    giftValue: 100,
    coins: 50,
    coinValue: 77,
    nested: {
      totalCoins: 999,
      nickname: "Fan",
      rawValue: 10,
      coin_value: 12,
      totalFedCoins: 88
    },
    recentGifts: [{ user: "A", giftValue: 5, miaPoints: 3, coinValue: 9 }]
  };
  const out = stripValueFieldsForPublic(input);
  assert.equal(out.miaPoints, 42);
  assert.equal(out.giftCount, 2);
  assert.equal(out.giftValue, undefined);
  assert.equal(out.coins, undefined);
  assert.equal(out.coinValue, undefined);
  assert.equal(out.nested.nickname, "Fan");
  assert.equal(out.nested.totalCoins, undefined);
  assert.equal(out.nested.coin_value, undefined);
  assert.equal(out.nested.totalFedCoins, undefined);
  assert.equal(out.recentGifts[0].miaPoints, 3);
  assert.equal(out.recentGifts[0].giftValue, undefined);
  assert.equal(out.recentGifts[0].coinValue, undefined);
});

test("stripValueFieldsForPublic sanitizes full koj snapshot coin metrics", () => {
  const kojSnapshot = {
    mood: "happy",
    bowlPercent: 40,
    totalFedCoins: 1200,
    metrics: {
      totalFedCoins: 1200,
      coinValue: 50,
      feedEvents: 9
    },
    lastSupport: {
      miaPoints: 15,
      coins: 100,
      giftValue: 100
    }
  };
  const out = stripValueFieldsForPublic(kojSnapshot);
  assert.equal(out.mood, "happy");
  assert.equal(out.bowlPercent, 40);
  assert.equal(out.totalFedCoins, undefined);
  assert.equal(out.metrics.feedEvents, 9);
  assert.equal(out.metrics.totalFedCoins, undefined);
  assert.equal(out.metrics.coinValue, undefined);
  assert.equal(out.lastSupport.miaPoints, 15);
  assert.equal(out.lastSupport.coins, undefined);
  assert.equal(out.lastSupport.giftValue, undefined);
});

test("buildOverlayStateCacheKey tracks voice and video fields", () => {
  const api = createOverlayPublicResponse({
    getVoicePlaybackSeq: () => 7,
    getVoiceSpeakQueueLength: () => 2,
    getOverlayLastAcceptedAt: () => 100,
    getOutputLastStreamerMediaAt: () => 200,
    videoEngine: {
      getSnapshot: () => ({
        currentPlayback: { playbackId: "pb_1" },
        processing: true
      })
    }
  });
  assert.equal(api.buildOverlayStateCacheKey(), "7|2|100|200|pb_1|1");
});

test("buildPublicOverlayStateResponse returns sanitized snapshot shape", () => {
  const api = createOverlayPublicResponse({
    cloneJson: (v) => JSON.parse(JSON.stringify(v)),
    overlayStateModule: {
      getOverlaySnapshot: (state) => ({ ...state, chatFeed: [] })
    },
    getOverlayState: () => ({ miaOverlay: { text: "Ahoj" }, coins: 999 }),
    kojnozoutModule: {
      getKojnozoutSnapshot: (state) => ({ ...state, mood: "happy" })
    },
    getKojnozoutStateForSnapshot: () => ({ hunger: 80 }),
    getKojnozoutState: () => ({ hunger: 80 }),
    streamState: { counters: { gifts: 1 }, coins: 500 },
    kojnozoutDuelModule: {},
    getDuelState: () => null,
    kojnozoutBackpackModule: {},
    getBackpackState: () => null,
    videoEngine: { getSnapshot: () => ({}) },
    spamSessionEngine: { getSpamSessionState: () => null },
    careOpportunitiesModule: {},
    kojnozoutBondModule: {},
    platformArenaModule: {},
    getArenaState: () => null,
    kojDisplayModule: {},
    giftUserLedgerModule: {
      getGiftUserLedgerSnapshot: () => ({
        entries: [{ user: "X", miaPoints: 5, giftValue: 99 }]
      })
    },
    getGiftUserLedger: () => ({}),
    capybaraFlowModule: {},
    getOutputState: () => ({}),
    giftSupporterProfileModule: {},
    getGiftSupporterProfile: () => ({}),
    kojnozoutVitalsModule: {},
    ecosystemOrchestratorModule: {},
    getEcosystemState: () => ({}),
    runtimeConfig: { overlay: {}, tts: {}, outputPolicy: {} },
    obsConnected: true,
    getVoicePlaybackSnapshot: () => null,
    translationRuntime: { getState: () => ({}) }
  });

  const body = api.buildPublicOverlayStateResponse();
  assert.equal(body.miaOverlay.text, "Ahoj");
  assert.equal(body.coins, undefined);
  assert.equal(body.streamState.counters.gifts, 1);
  assert.equal(body.streamState.coins, undefined);
  assert.equal(body.recentGifts[0].miaPoints, 5);
  assert.equal(body.recentGifts[0].giftValue, undefined);
  assert.ok(body.updatedAt > 0);
});

console.log("overlay_public_response_contract: all passed");
