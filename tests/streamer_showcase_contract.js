"use strict";

const assert = require("assert/strict");
const showcase = require("../scripts/MIA_STREAMER_SHOWCASE");
const media = require("../scripts/MIA_STREAMER_MEDIA_COMMAND");

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

console.log("\n---- STREAMER SHOWCASE CONTRACT ----\n");

test("parseStreamerShowcaseCommand recognizes mia pust testy", () => {
  const parsed = showcase.parseStreamerShowcaseCommand("mia pust testy");
  assert.equal(parsed?.mode, "full");
  assert.equal(media.parseStreamerMediaCommand("mia pust testy"), null);
});

test("showcase does not collide with media play video", () => {
  assert.equal(showcase.parseStreamerShowcaseCommand("mia prehraj video"), null);
  assert.ok(media.parseStreamerMediaCommand("mia prehraj video"));
});

test("forced koj mood is exposed for display layer", () => {
  showcase.clearShowcaseKojForce();
  showcase.setShowcaseKojForce("dance", 2000);
  const forced = showcase.getShowcaseKojForce();
  assert.equal(forced.mood, "dance");
  assert.equal(forced.spriteAsset, "dance");
});

test("catalog marks visible and logic-only items", () => {
  const rows = showcase.listCatalog();
  assert.ok(rows.length >= 9);
  const logic = rows.find((row) => row.id === "text_bank_registry");
  assert.equal(logic.visible, false);
  assert.ok(logic.contractTests.length > 0);
  const dance = rows.find((row) => row.id === "koj_dance");
  assert.equal(dance.visible, true);
});

test("single item mode resolves one showcase step", () => {
  const parsed = showcase.parseStreamerShowcaseCommand("mia pust demo koj dance");
  assert.equal(parsed?.mode, "single");
  assert.equal(parsed?.itemId, "koj_dance");
});

test("koj state slide command is recognized and isolated from generic showcase", () => {
  const parsed = showcase.parseKojStateShowcaseCommand("kojnozrout test slide");
  assert.equal(parsed?.mode, "koj_states");
  assert.ok(showcase.parseKojStateShowcaseCommand("mia ukaz vsechny stavy koje"));
  assert.equal(showcase.parseKojStateShowcaseCommand("mia pust testy"), null);
  assert.equal(showcase.parseStreamerShowcaseCommand("kojnozrout test slide"), null);
});

test("koj state slide covers all core moods with czech voice lines", () => {
  const states = showcase.listKojStateShowcase();
  assert.ok(states.length >= 10);
  for (const wanted of ["sleepy", "eating", "happy", "sad", "dance"]) {
    const row = states.find((s) => s.mood === wanted);
    assert.ok(row, `missing state ${wanted}`);
    assert.ok(row.line && row.line.length > 0);
  }
  const sleepy = states.find((s) => s.mood === "sleepy");
  assert.ok(/spí/i.test(sleepy.line));
});

console.log("\n---- STREAMER SHOWCASE CONTRACT SUMMARY ----\n");
