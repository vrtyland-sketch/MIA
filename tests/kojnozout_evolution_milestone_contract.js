"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  applySupportToKojnozout,
  createKojnozoutState
} = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const {
  buildEvolutionDelivery,
  buildEvolutionMoment
} = require("../scripts/MIA_KOJNOZROUT_EVOLUTION");
const {
  extractPersistedState,
  loadPersistedSeed
} = require("../scripts/MIA_KOJNOZROUT_PERSISTENCE");

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

test("applySupportToKojnozout reports evolutionLevelUp across tier boundary", () => {
  let state = createKojnozoutState({ feedPoints: 20 });

  const result = applySupportToKojnozout(state, {
    miaPoints: 8,
    coins: 1,
    repeatCount: 1,
    giftName: "Rose"
  });

  assert.ok(result.evolutionLevelUp);
  assert.equal(result.evolutionLevelUp.fromTier, "egg");
  assert.equal(result.evolutionLevelUp.toTier, "hatchling");
  assert.equal(result.state.evolutionTier, "hatchling");
});

test("buildEvolutionDelivery uses MIA companion on gift events", () => {
  const levelUp = {
    fromTier: "egg",
    toTier: "hatchling",
    label: "Mládě",
    feedPoints: 28,
    nextTier: "sprout",
    nextTierLabel: "Pučící",
    pointsToNext: 222
  };

  const giftDelivery = buildEvolutionDelivery(levelUp, {
    userLabel: "Tester",
    eventType: "GIFT"
  });
  assert.ok(giftDelivery.miaCompanion);
  assert.equal(giftDelivery.kojPrimary, null);
  assert.ok(giftDelivery.moment.until > Date.now());

  const chatDelivery = buildEvolutionDelivery(levelUp, {
    userLabel: "Tester",
    eventType: "COMMENT"
  });
  assert.ok(chatDelivery.kojPrimary);
  assert.equal(chatDelivery.miaCompanion, null);
});

test("persistence round-trips feedPoints and bowl state", () => {
  const tempFile = path.join(
    os.tmpdir(),
    `mia-koj-persist-${Date.now()}.json`
  );

  const state = createKojnozoutState({
    feedPoints: 133,
    bowlPercent: 42,
    evolutionTier: "hatchling"
  });

  const saved = extractPersistedState(state);
  fs.writeFileSync(tempFile, JSON.stringify(saved, null, 2), "utf8");

  try {
    const loaded = loadPersistedSeed(tempFile);
    assert.equal(loaded.feedPoints, 133);
    assert.equal(loaded.bowlPercent, 42);
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
});

test("buildEvolutionMoment includes subtext progress", () => {
  const moment = buildEvolutionMoment(
    {
      toTier: "hatchling",
      label: "Mládě",
      nextTier: "sprout",
      nextTierLabel: "Pučící",
      pointsToNext: 150
    },
    { userLabel: "Tester" }
  );

  assert.equal(moment.tier, "hatchling");
  assert.match(moment.subtext, /150 bodů do Pučící/);
  assert.equal(moment.actor, "Tester");
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("");
console.log("---- KOJNOZROUT EVOLUTION MILESTONE CONTRACT ----");
console.log("passed");
