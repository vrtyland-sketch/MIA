"use strict";

const assert = require("assert/strict");
const {
  applySupportToKojnozout,
  createKojnozoutState,
  formatEvolutionSubtext,
  getEvolutionMeta,
  resolveEvolutionTier
} = require("../scripts/MIA_KOJNOZROUT_ENGINE");

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

test("resolveEvolutionTier maps feedPoints thresholds", () => {
  assert.equal(resolveEvolutionTier(0), "egg");
  assert.equal(resolveEvolutionTier(24), "egg");
  assert.equal(resolveEvolutionTier(25), "hatchling");
  assert.equal(resolveEvolutionTier(249), "hatchling");
  assert.equal(resolveEvolutionTier(250), "sprout");
  assert.equal(resolveEvolutionTier(2499), "sprout");
  assert.equal(resolveEvolutionTier(2500), "guardian");
  assert.equal(resolveEvolutionTier(24999), "guardian");
  assert.equal(resolveEvolutionTier(25000), "legend");
});

test("getEvolutionMeta exposes next tier progress", () => {
  const meta = getEvolutionMeta(100);
  assert.equal(meta.tier, "hatchling");
  assert.equal(meta.nextTier, "sprout");
  assert.equal(meta.pointsToNext, 150);
  assert.ok(meta.scale > 0);
});

test("formatEvolutionSubtext describes progress to next tier", () => {
  const meta = getEvolutionMeta(100);
  const text = formatEvolutionSubtext(meta);
  assert.match(text, /Mládě/);
  assert.match(text, /150 bodů do Pučící/);
});

test("support feeding updates evolutionTier in snapshot", () => {
  let state = createKojnozoutState({ feedPoints: 0 });

  for (let i = 0; i < 4; i += 1) {
    state = applySupportToKojnozout(state, {
      miaPoints: 8,
      coins: 1,
      repeatCount: 1,
      giftName: "Rose"
    }).state;
  }

  assert.ok(state.feedPoints >= 25);
  assert.equal(state.evolutionTier, "hatchling");
  assert.equal(state.evolution.tier, "hatchling");
  assert.ok(state.evolution.scale >= 0.28);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("");
console.log("---- KOJNOZROUT EVOLUTION CONTRACT ----");
console.log("passed");
