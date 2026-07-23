"use strict";

const assert = require("assert/strict");
const testMode = require("../scripts/MIA_KOJNOZROUT_TEST_MODE");

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

console.log("\n---- KOJNOZROUT TEST MODE CONTRACT ----\n");

test("parseKojStreamerCommand recognizes probud and duel", () => {
  assert.equal(testMode.parseKojStreamerCommand("probud koj")?.type, "probud");
  assert.equal(testMode.parseKojStreamerCommand("!probud")?.type, "probud");
  assert.equal(testMode.parseKojStreamerCommand("zacni duel")?.type, "duel_start");
  assert.equal(testMode.parseKojStreamerCommand("!duel")?.type, "duel_start");
  assert.equal(testMode.parseKojStreamerCommand("ahoj")?.type, undefined);
});

test("applyKojTestModeToState wakes koj and lifts bowl", () => {
  const next = testMode.applyKojTestModeToState({
    bowlPercent: 0,
    hunger: 80,
    isSleeping: true,
    vitals: { sleepDepth: 90 }
  });
  assert.equal(next.isSleeping, false);
  assert.ok(next.bowlPercent >= testMode.MIN_BOWL_TEST_PCT);
  assert.ok(next.vitals.sleepDepth <= 5);
});

test("isKojTestModeEnabled respects env and override", () => {
  testMode.setKojTestModeOverride(null);
  assert.equal(testMode.isKojTestModeEnabled({ MIA_KOJ_TEST_MODE: "1" }), true);
  assert.equal(testMode.isKojTestModeEnabled({}), false);
  testMode.setKojTestModeOverride(true);
  assert.equal(testMode.isKojTestModeEnabled({}), true);
  testMode.setKojTestModeOverride(null);
});

console.log("\n---- KOJNOZROUT TEST MODE CONTRACT SUMMARY ----\n");
