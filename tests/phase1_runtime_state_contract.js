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

try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (_err) {
  /* ignore */
}

console.log("phase1_runtime_state_contract: all passed");
