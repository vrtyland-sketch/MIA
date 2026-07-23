"use strict";

const assert = require("assert/strict");
const normalizer = require("../shared/platform_normalizers/normalize_event");
const ledger = require("../scripts/MIA_GIFT_USER_LEDGER");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const normalized = normalizer.normalizeEvent({
    type: "gift",
    giftName: "Rose",
    coins: "5",
    repeatCount: "2",
    userId: "0",
    username: "fan_one",
    nickname: "Fan One",
    profilePictureUrl: "https://example.com/fan.png",
    tikfinityUserId: "2743946",
    tikfinityUsername: "fan_one_tt"
  });

  assert.equal(normalized.eventType, "GIFT");
  assert.equal(normalized.user.userId, "2743946");
  assert.equal(normalized.user.avatarUrl, "https://example.com/fan.png");
  assert.equal(normalized.support.giftCount, 2);
  assert.equal(normalized.support.giftValue, 10);
  pass("tikfinity gift resolves stable userId and canon support fields");

  let state = ledger.createGiftUserLedger();
  normalized.support.tier = "T2";
  normalized.support.miaPoints = 120;
  state = ledger.recordGiftUser(state, normalized);

  const snap = ledger.getGiftUserLedgerSnapshot(state);
  assert.equal(snap.entries.length, 1);
  assert.equal(snap.entries[0].userId, "2743946");
  assert.equal(snap.entries[0].nickname, "Fan One");
  assert.equal(snap.entries[0].giftName, "Rose");
  assert.equal(snap.entries[0].giftCount, 2);
  assert.equal(snap.entries[0].tier, "T2");
  assert.equal(snap.entries[0].avatarUrl, "https://example.com/fan.png");
  pass("gift user ledger stores precise donor row");

  const second = normalizer.normalizeEvent({
    type: "gift",
    giftName: "Heart",
    giftCount: 3,
    giftValue: 30,
    nickname: "Fan Two",
    avatarUrl: "https://example.com/two.png",
    tikfinityUserId: "998877"
  });
  state = ledger.recordGiftUser(state, second);
  state = ledger.recordGiftUser(state, normalized);
  snap.entries = ledger.getGiftUserLedgerSnapshot(state).entries;
  assert.equal(snap.entries.length, 2);
  assert.equal(snap.entries[0].nickname, "Fan One");
  assert.equal(snap.entries[1].nickname, "Fan Two");
  pass("ledger dedupes by user and keeps latest gift first");

  console.log("\n---- GIFT USER METADATA CONTRACT ----");
  console.log("passed");
}

run();
