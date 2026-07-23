"use strict";

const assert = require("assert/strict");
const {
  getPublicKojSnapshot,
  stripValueFieldsForPublic
} = require("../scripts/MIA_OVERLAY_PUBLIC_RESPONSE");
const { getKojnozoutSnapshot, createKojnozoutState } = require("../scripts/MIA_KOJNOZROUT_ENGINE");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const FIXTURE_RAW = {
  mood: "happy",
  bowlPercent: 42,
  totalFedCoins: 1500,
  totalFeedEvents: 9,
  metrics: {
    totalFedCoins: 1500,
    coinValue: 88,
    feedEvents: 9
  },
  lastSupport: {
    miaPoints: 12,
    coins: 100,
    giftValue: 100,
    coinValue: 100
  },
  walkActive: true,
  behavior: "walking"
};

test("getPublicKojSnapshot strips coin metrics from fixture", () => {
  const out = getPublicKojSnapshot(FIXTURE_RAW);
  assert.equal(out.mood, "happy");
  assert.equal(out.bowlPercent, 42);
  assert.equal(out.totalFeedEvents, 9);
  assert.equal(out.walkActive, true);
  assert.equal(out.totalFedCoins, undefined);
  assert.equal(out.metrics.feedEvents, 9);
  assert.equal(out.metrics.totalFedCoins, undefined);
  assert.equal(out.metrics.coinValue, undefined);
  assert.equal(out.lastSupport.miaPoints, 12);
  assert.equal(out.lastSupport.coins, undefined);
  assert.equal(out.lastSupport.giftValue, undefined);
  assert.equal(out.lastSupport.coinValue, undefined);
});

test("engine snapshot through getPublicKojSnapshot omits totalFedCoins", () => {
  const state = createKojnozoutState({
    mood: "idle",
    bowlPercent: 10,
    totalFedCoins: 777,
    metrics: { totalFedCoins: 777 }
  });
  const raw = getKojnozoutSnapshot(state, { support: { totalCoins: 999 } });
  assert.ok(raw.totalFedCoins === 777 || raw.metrics?.totalFedCoins === 777);
  const pub = getPublicKojSnapshot(raw);
  assert.equal(pub.totalFedCoins, undefined);
  if (pub.metrics) {
    assert.equal(pub.metrics.totalFedCoins, undefined);
  }
});

test("getPublicKojSnapshot matches stripValueFieldsForPublic", () => {
  assert.deepEqual(getPublicKojSnapshot(FIXTURE_RAW), stripValueFieldsForPublic(FIXTURE_RAW));
});

console.log("koj_public_snapshot_contract: all passed");
