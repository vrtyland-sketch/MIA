"use strict";

const assert = require("assert/strict");
const {
  normalizeToMiaEvent,
  fromLegacyNormalized,
  toOverlaySafe,
  coinsToMiaPoints,
  MIA_POINTS_PER_COIN
} = require("../core/event-normalizer");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("TikFinity gift → unified shape with miaPoints from coins", () => {
  const event = normalizeToMiaEvent({
    source: "tikfinity",
    giftName: "Rose",
    coins: 1,
    repeatCount: 2,
    nickname: "Pepa",
    uniqueId: "pepa1",
    type: "gift"
  });

  assert.equal(event.type, "gift");
  assert.equal(event.platform, "tiktok");
  assert.equal(event.user.name, "Pepa");
  assert.ok(event.id);
  assert.ok(event.timestamp > 0);
  assert.ok(event.gift);
  assert.equal(event.gift.name, "Rose");
  assert.equal(event.gift.coins, 1);
  assert.equal(event.gift.count, 2);
  assert.equal(event.gift.miaPoints, coinsToMiaPoints(1, 2));
  assert.equal(event.miaPoints, event.gift.miaPoints);
  assert.equal(MIA_POINTS_PER_COIN, 7.5);
});

test("preserves enriched support.miaPoints (no remap break)", () => {
  const event = fromLegacyNormalized({
    eventId: "tiktok_gift_abc",
    eventType: "GIFT",
    platform: "tiktok",
    ts: 1784580000000,
    user: { userId: "456", nickname: "Pepa" },
    support: {
      giftName: "Rose",
      coins: 1,
      repeatCount: 1,
      totalCoins: 1,
      miaPoints: 99.5,
      streamTier: "T1"
    }
  });

  assert.equal(event.id, "tiktok_gift_abc");
  assert.equal(event.type, "gift");
  assert.equal(event.gift.miaPoints, 99.5);
  assert.equal(event.miaPoints, 99.5);
  assert.equal(event.gift.tier, "T1");
});

test("chat / Kick comment → text field", () => {
  const event = normalizeToMiaEvent({
    platform: "kick",
    type: "chat",
    message: "ahoj MIA",
    username: "kickfan",
    chatroomId: "123"
  });

  assert.equal(event.type, "chat");
  assert.equal(event.platform, "kick");
  assert.equal(event.text, "ahoj MIA");
  assert.equal(event.user.name, "kickfan");
});

test("overlay-safe projection strips coins", () => {
  const event = normalizeToMiaEvent({
    type: "gift",
    giftName: "Lion",
    coins: 5000,
    nickname: "Tomino",
    source: "tikfinity"
  });
  const safe = toOverlaySafe(event);
  assert.equal(safe.gift.miaPoints, event.gift.miaPoints);
  assert.equal(safe.gift.coins, undefined);
  assert.ok(!("coins" in (safe.gift || {})));
  const blob = JSON.stringify(safe);
  assert.equal(blob.includes('"coins"'), false);
});

test("test panel style payload", () => {
  const event = normalizeToMiaEvent({
    platform: "tiktok",
    type: "gift",
    giftName: "Ice Cream Cone",
    coins: 1,
    count: 1,
    displayName: "Tester"
  });
  assert.equal(event.type, "gift");
  assert.ok(event.miaPoints > 0);
  assert.equal(event.user.name, "Tester");
});

console.log("phase1_event_normalizer_contract: all passed");
