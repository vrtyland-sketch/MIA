"use strict";

const assert = require("assert/strict");
const { createKojnozoutState, applySupportToKojnozout } = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const {
  syncVitals,
  resolveExpressiveMood,
  isSleeping,
  describeVitals
} = require("../scripts/MIA_KOJNOZROUT_VITALS");
const {
  addItemToBackpack,
  createBackpackState,
  resolveItemFromEvent
} = require("../scripts/MIA_KOJNOZROUT_BACKPACK");
const {
  createDuelState,
  ingestDuelContribution,
  startDuel,
  getDuelSnapshot
} = require("../scripts/MIA_KOJNOZROUT_DUEL");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("default hunger bias leans hungry on fresh state", () => {
  const state = createKojnozoutState({});
  syncVitals(state, { moodState: 0, engagementState: 0, chat: {} }, { minutesElapsed: 0 });
  assert.ok(state.hunger >= 65);
  assert.equal(resolveExpressiveMood(state, state.vitals), "hungry");
});

test("quiet low-energy stream puts kojnozout to sleep", () => {
  const state = createKojnozoutState({
    energy: 15,
    hunger: 72,
    lastPingAt: Date.now() - 8 * 60000,
    lastFedAt: Date.now() - 8 * 60000,
    vitals: { sleepDepth: 42, wellbeing: 0, affliction: null, communityVibe: 0 }
  });
  syncVitals(
    state,
    { moodState: -5, engagementState: 0, chat: { lastMessageAt: Date.now() - 8 * 60000 } },
    { minutesElapsed: 4 }
  );
  assert.ok(isSleeping(state.vitals));
  assert.equal(state.mood, "sleepy");
});

test("gift while sleeping still feeds and wakes partially", () => {
  let state = createKojnozoutState({
    energy: 12,
    hunger: 80,
    vitals: { sleepDepth: 80, wellbeing: -10, affliction: null, communityVibe: 0 }
  });
  const result = applySupportToKojnozout(state, { miaPoints: 12, coins: 1, repeatCount: 1 }, { streamState: {} });
  assert.ok(result.state.bowlPercent > 0);
  assert.ok(result.state.vitals.sleepDepth < 80);
});

test("backpack collects gift and comment items", () => {
  let backpack = createBackpackState();
  const giftItem = resolveItemFromEvent("GIFT", { tier: "T1", miaPoints: 10 });
  backpack = addItemToBackpack(backpack, "Tester", giftItem, { source: "gift" });
  const chatItem = resolveItemFromEvent("COMMENT", {});
  backpack = addItemToBackpack(backpack, "Tester", chatItem, { source: "comment" });
  assert.equal(backpack.users.tester.items.length, 2);
});

test("duel scores local MIA points race not deathmatch", () => {
  let duel = startDuel(createDuelState(), {
    opponentLabel: "Stream B",
    durationMs: 120000
  });
  assert.equal(duel.active, true);

  const gift = ingestDuelContribution(duel, {
    eventType: "GIFT",
    userLabel: "Gifter",
    miaPoints: 25,
    itemPower: 6,
    side: "local"
  });
  duel = gift.state;

  const chat = ingestDuelContribution(duel, {
    eventType: "COMMENT",
    userLabel: "Chatter",
    miaPoints: 0,
    itemPower: 4,
    side: "local"
  });
  duel = chat.state;

  const snap = getDuelSnapshot(duel);
  assert.ok(snap.local.miaPoints > 0);
  assert.equal(snap.opponent.miaPoints, 0);
  assert.equal(snap.lead, "local");
});

test("negative community vibe can mark sad affliction", () => {
  const state = createKojnozoutState({ socialState: -35, hunger: 70, bowlPercent: 10 });
  syncVitals(state, { moodState: -40, engagementState: -20, chat: { lastMessageAt: Date.now() - 60000 } }, { minutesElapsed: 1 });
  assert.equal(state.vitals.affliction, "sad");
  assert.match(describeVitals(state), /smutný/i);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("\n---- KOJNOZROUT VITALS DUEL CONTRACT ----\npassed");
