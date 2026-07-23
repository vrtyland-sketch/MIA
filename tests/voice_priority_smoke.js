"use strict";

const assert = require("assert/strict");
const { createVoicePriorityLayer } = require("../scripts/MIA_VOICE_PRIORITY");

const results = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function createClock(start = 1_000) {
  let current = start;
  return {
    now() {
      return current;
    },
    set(value) {
      current = Number(value);
    },
    advance(ms) {
      current += Number(ms || 0);
    }
  };
}

(async () => {
  await test("returns inactive snapshot by default", async () => {
    const clock = createClock();
    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    const snapshot = layer.getSnapshot();

    assert.equal(snapshot.active, false);
    assert.equal(snapshot.lockOwner, "");
    assert.equal(snapshot.lockStage, "");
    assert.equal(snapshot.lockSource, "");
    assert.equal(snapshot.lockUntilTs, 0);
  });

  await test("activates voice priority lock with owner and holdMs", async () => {
    const clock = createClock(5_000);
    const logs = [];

    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog(prefix, payload) {
        logs.push({ prefix, payload });
      }
    });

    const snapshot = layer.activateVoicePriority({
      owner: "kojnozout",
      stage: "voice",
      source: "voice_command",
      holdMs: 3000
    });

    assert.equal(snapshot.active, true);
    assert.equal(snapshot.lockOwner, "kojnozout");
    assert.equal(snapshot.lockStage, "voice");
    assert.equal(snapshot.lockSource, "voice_command");
    assert.equal(snapshot.lockUntilTs, 8000);
    assert.equal(snapshot.lastActivatedAt, 5000);

    assert.equal(logs.length, 1);
    assert.equal(logs[0].prefix, "mia-events");
    assert.equal(logs[0].payload.stage, "voice_priority_activated");
    assert.equal(logs[0].payload.owner, "kojnozout");
  });

  await test("allows voice overlay during active lock", async () => {
    const clock = createClock();
    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    layer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "voice_command",
      holdMs: 2500
    });

    const verdict = layer.shouldBlockOverlay({
      owner: "kojnozout",
      stage: "voice",
      text: "Sedím."
    });

    assert.equal(verdict.blocked, false);
    assert.equal(verdict.reason, "voice_overlay_allowed");
    assert.equal(verdict.snapshot.active, true);
  });

  await test("allows same owner non-voice overlay during active lock", async () => {
    const clock = createClock();
    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    layer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "voice_command",
      holdMs: 2500
    });

    const verdict = layer.shouldBlockOverlay({
      owner: "mia",
      stage: "support",
      text: "Děkuju za gift."
    });

    assert.equal(verdict.blocked, false);
    assert.equal(verdict.reason, "same_owner_allowed");
    assert.equal(verdict.snapshot.active, true);
  });

  await test("blocks foreign non-voice overlay during active lock", async () => {
    const clock = createClock();
    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    layer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "voice_command",
      holdMs: 2500
    });

    const verdict = layer.shouldBlockOverlay({
      owner: "kojnozout",
      stage: "support",
      text: "Ham ham."
    });

    assert.equal(verdict.blocked, true);
    assert.equal(verdict.reason, "voice_priority_lock_active");
    assert.equal(verdict.snapshot.active, true);
    assert.equal(verdict.snapshot.lockOwner, "mia");
  });

  await test("expires lock automatically after hold window", async () => {
    const clock = createClock(10_000);
    const logs = [];

    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog(prefix, payload) {
        logs.push({ prefix, payload });
      }
    });

    layer.activateVoicePriority({
      owner: "mia",
      stage: "voice",
      source: "voice_command",
      holdMs: 1000
    });

    clock.advance(1001);

    const verdict = layer.shouldBlockOverlay({
      owner: "kojnozout",
      stage: "support"
    });

    assert.equal(verdict.blocked, false);
    assert.equal(verdict.reason, "no_active_voice_lock");
    assert.equal(verdict.snapshot.active, false);

    const clearEvent = logs.find(
      (item) => item.payload && item.payload.stage === "voice_priority_cleared"
    );

    assert.ok(clearEvent);
    assert.equal(clearEvent.payload.reason, "expired");
  });

  await test("clearLock disables active lock immediately", async () => {
    const clock = createClock();
    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    layer.activateVoicePriority({
      owner: "kojnozout",
      holdMs: 3000
    });

    const cleared = layer.clearLock("manual_test");

    assert.equal(cleared.active, false);
    assert.equal(cleared.lockOwner, "");
    assert.equal(cleared.lockStage, "");
    assert.equal(cleared.lockSource, "");
    assert.equal(cleared.lockUntilTs, 0);

    const verdict = layer.shouldBlockOverlay({
      owner: "mia",
      stage: "support"
    });

    assert.equal(verdict.blocked, false);
    assert.equal(verdict.reason, "no_active_voice_lock");
  });

  await test("clamps too small and too large holdMs values", async () => {
    const clock = createClock();

    const layer = createVoicePriorityLayer({
      nowTs: () => clock.now(),
      appendJsonLog() {}
    });

    const small = layer.activateVoicePriority({
      owner: "mia",
      holdMs: 1
    });

    assert.equal(small.lockUntilTs, clock.now() + 250);

    const large = layer.activateVoicePriority({
      owner: "mia",
      holdMs: 999999
    });

    assert.equal(large.lockUntilTs, clock.now() + 15000);
  });

  console.log("\n---- VOICE PRIORITY SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
})();