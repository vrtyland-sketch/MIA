"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  saveRuntimeState,
  loadRuntimeState,
  composeKojSeed,
  scheduleSaveRuntimeState,
  flushRuntimeState,
  KOJ_REF
} = require("../core/runtime-state");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-rs-"));
const filePath = path.join(tmpDir, "runtime-state.json");

test("save and load runtime state with kojRef", () => {
  const result = saveRuntimeState(
    {
      koj: {
        bowlPercent: 42,
        hunger: 0.3,
        mood: "happy",
        stage: "idle"
      },
      streamState: {},
      queueSnapshot: { size: 0, items: [] }
    },
    { filePath }
  );
  assert.equal(result.ok, true);

  const loaded = loadRuntimeState(filePath);
  assert.ok(loaded);
  assert.equal(loaded.kojRef, KOJ_REF);
  assert.equal(loaded.bowl.bowlPercent, 42);
  assert.equal(loaded.koj.mood, "happy");
  assert.equal(loaded.queue.size, 0);
});

test("composeKojSeed merges without wiping seed identity fields", () => {
  const composed = composeKojSeed(
    { totalFeedEvents: 9, bowlPercent: 10 },
    {
      updatedAt: Date.now() + 1000,
      koj: { bowlPercent: 55, hunger: 0.1 },
      bowl: { bowlPercent: 55 }
    }
  );
  assert.equal(composed.totalFeedEvents, 9);
  assert.equal(composed.bowlPercent, 55);
  assert.equal(composed.hunger, 0.1);
});

test("newer explicit zero bowl beats an older runtime snapshot", () => {
  const composed = composeKojSeed(
    {
      bowlPercent: 0,
      bowlFillPercent: 0,
      hunger: 80,
      mood: "hungry",
      energy: 12,
      feedPoints: 99,
      updatedAt: 2000,
      totalFeedEvents: 7,
      lastFedAt: 100
    },
    {
      updatedAt: 1000,
      koj: {
        bowlPercent: 100,
        bowlFillPercent: 100,
        hunger: 1,
        mood: "happy",
        energy: 90,
        feedPoints: 10,
        lastFedAt: 1000
      },
      bowl: { bowlPercent: 100, bowlFillPercent: 100, bowlState: "full" }
    }
  );
  assert.equal(composed.bowlPercent, 0);
  assert.equal(composed.bowlFillPercent, 0);
  assert.equal(composed.hunger, 80);
  assert.equal(composed.mood, "hungry");
  assert.equal(composed.energy, 12);
  assert.equal(composed.feedPoints, 99);
  assert.equal(composed.lastFedAt, 100);
  assert.equal(composed.totalFeedEvents, 7);
  assert.equal(composed.bowlState, undefined);
});

test("newer runtime non-zero still wins every critical field", () => {
  const composed = composeKojSeed(
    {
      bowlPercent: 40,
      hunger: 80,
      mood: "hungry",
      energy: 12,
      feedPoints: 99,
      updatedAt: 1000,
      totalFeedEvents: 4
    },
    {
      updatedAt: 2000,
      koj: {
        bowlPercent: 55,
        hunger: 1,
        mood: "happy",
        energy: 90,
        feedPoints: 10
      },
      bowl: { bowlPercent: 55 }
    }
  );
  assert.equal(composed.bowlPercent, 55);
  assert.equal(composed.hunger, 1);
  assert.equal(composed.mood, "happy");
  assert.equal(composed.energy, 90);
  assert.equal(composed.feedPoints, 10);
  assert.equal(composed.totalFeedEvents, 4);
});

test("newer persisted non-zero still wins every critical field", () => {
  const composed = composeKojSeed(
    {
      bowlPercent: 40,
      hunger: 80,
      mood: "hungry",
      energy: 12,
      updatedAt: 2000,
      totalFeedEvents: 4
    },
    {
      updatedAt: 1000,
      koj: { bowlPercent: 100, hunger: 1, mood: "happy", energy: 90 },
      bowl: { bowlPercent: 100 }
    }
  );
  assert.equal(composed.bowlPercent, 40);
  assert.equal(composed.hunger, 80);
  assert.equal(composed.mood, "hungry");
  assert.equal(composed.energy, 12);
  assert.equal(composed.totalFeedEvents, 4);
});

test("equal timestamps still prefer the runtime snapshot", () => {
  const composed = composeKojSeed(
    { bowlPercent: 0, hunger: 80, mood: "hungry", updatedAt: 2000 },
    {
      updatedAt: 2000,
      koj: { bowlPercent: 100, hunger: 1, mood: "happy" },
      bowl: { bowlPercent: 100 }
    }
  );
  assert.equal(composed.bowlPercent, 100);
  assert.equal(composed.hunger, 1);
  assert.equal(composed.mood, "happy");
});

test("missing clocks still prefer the runtime snapshot", () => {
  const composed = composeKojSeed(
    { bowlPercent: 40, hunger: 80, mood: "hungry" },
    { koj: { bowlPercent: 55, hunger: 1, mood: "happy" }, bowl: { bowlPercent: 55 } }
  );
  assert.equal(composed.bowlPercent, 55);
  assert.equal(composed.hunger, 1);
  assert.equal(composed.mood, "happy");
});

test("missing bowl stays absent when the persisted seed is newer", () => {
  const composed = composeKojSeed(
    { hunger: 80, mood: "hungry", energy: 12, updatedAt: 2000, totalFeedEvents: 3 },
    {
      updatedAt: 1000,
      koj: { bowlPercent: 100, bowlFillPercent: 100, hunger: 1, mood: "happy", energy: 90 },
      bowl: { bowlPercent: 100, bowlFillPercent: 100 }
    }
  );
  assert.equal(Object.prototype.hasOwnProperty.call(composed, "bowlPercent"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(composed, "bowlFillPercent"), false);
  assert.equal(composed.hunger, 80);
  assert.equal(composed.mood, "hungry");
  assert.equal(composed.energy, 12);
  assert.equal(composed.totalFeedEvents, 3);
});

test("lastFedAt is not the persistence clock", () => {
  const composed = composeKojSeed(
    { bowlPercent: 0, hunger: 80, mood: "hungry", lastFedAt: 5000 },
    {
      updatedAt: 1000,
      koj: { bowlPercent: 100, hunger: 1, mood: "happy" },
      bowl: { bowlPercent: 100 }
    }
  );
  assert.equal(composed.bowlPercent, 100);
  assert.equal(composed.hunger, 1);
  assert.equal(composed.mood, "happy");
});

test("empty runtime koj keeps the persisted seed", () => {
  const composed = composeKojSeed(
    { bowlPercent: 0, hunger: 80, mood: "hungry", updatedAt: 1000 },
    { updatedAt: 5000, koj: {}, bowl: { bowlPercent: 100 } }
  );
  assert.equal(composed.bowlPercent, 0);
  assert.equal(composed.hunger, 80);
  assert.equal(composed.mood, "hungry");
});

test("schedule + flush writes file", () => {
  const p = path.join(tmpDir, "runtime-state-flush.json");
  loadRuntimeState(p);
  scheduleSaveRuntimeState(
    { koj: { bowlPercent: 7, energy: 1 }, queueSnapshot: null },
    { delayMs: 60 }
  );
  const flushed = flushRuntimeState();
  assert.equal(flushed.ok, true);
  const loaded = loadRuntimeState(p);
  assert.equal(loaded.bowl.bowlPercent, 7);
});

test("missing runtime file keeps the persisted seed", () => {
  const missing = path.join(tmpDir, "absent-runtime.json");
  assert.equal(loadRuntimeState(missing), null);
  const composed = composeKojSeed({
    bowlPercent: 0,
    hunger: 80,
    mood: "hungry",
    updatedAt: 2000
  });
  assert.equal(composed.bowlPercent, 0);
  assert.equal(composed.hunger, 80);
  assert.equal(composed.mood, "hungry");
});

test("corrupt runtime json keeps the persisted seed", () => {
  const bad = path.join(tmpDir, "bad-runtime.json");
  fs.writeFileSync(bad, "{nope");
  assert.equal(loadRuntimeState(bad), null);
  const composed = composeKojSeed({
    bowlPercent: 0,
    hunger: 44,
    mood: "hungry",
    updatedAt: 2000
  });
  assert.equal(composed.bowlPercent, 0);
  assert.equal(composed.hunger, 44);
  assert.equal(composed.mood, "hungry");
});

try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (_err) {
  /* ignore */
}

console.log("phase1_runtime_state_contract: all passed");
