"use strict";

const assert = require("assert");
const reward = require("../scripts/MIA_KOJNOZROUT_CARE_REWARD");
const opportunities = require("../scripts/MIA_KOJNOZROUT_CARE_OPPORTUNITIES");
const { createBackpackState } = require("../scripts/MIA_KOJNOZROUT_BACKPACK");
const bond = require("../scripts/MIA_KOJNOZROUT_BOND");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const originalRandom = Math.random;
  Math.random = () => 0.05;

  try {
    const item = reward.rollCareReward("podrbat");
    assert.equal(item?.id, "kartac");
    pass("care reward rolls kartac for podrbat");

    let backpack = createBackpackState();
    const granted = reward.applyCareReward(backpack, "Alice", "podrbat");
    assert.equal(granted.granted, true);
    assert.ok(granted.item);
    assert.ok(granted.state.users.alice.items.length > 0);
    pass("care reward adds item to backpack");
  } finally {
    Math.random = originalRandom;
  }

  const op = opportunities.buildCareOpportunities({
    kojnozoutState: {
      hunger: 70,
      mood: "hungry",
      bond: bond.createBondState({ neglect: 78, careBond: 14 })
    },
    backpackState: createBackpackState()
  });

  assert.ok(op.bond);
  assert.equal(op.bond.neglectLevel, "critical");
  assert.ok(op.behaviorHint.includes("kritické"));
  pass("care opportunities expose bond and neglect hints");

  console.log("\n---- KOJNOZROUT CARE REWARD CONTRACT ----");
  console.log("passed");
}

run();
