"use strict";

const assert = require("assert/strict");
const { createOverlayTiming } = require("../scripts/MIA_OVERLAY_TIMING");

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

function createClock(start = 1000) {
  let current = start;
  return {
    now() {
      return current;
    },
    advance(ms) {
      current += Number(ms || 0);
    },
    set(value) {
      current = Number(value || 0);
    }
  };
}

(async () => {
  await test("allows immediate emit before first markEmitted", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now()
    });

    assert.equal(timing.canEmitNow(), true);

    const snapshot = timing.getSnapshot();
    assert.equal(snapshot.active, false);
    assert.equal(snapshot.canEmitNow, true);
    assert.equal(snapshot.delayMs, 500);
    assert.equal(snapshot.remainingMs, 0);
  });

  await test("blocks emit immediately after markEmitted", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now()
    });

    const marked = timing.markEmitted();

    assert.equal(marked.active, true);
    assert.equal(marked.canEmitNow, false);
    assert.equal(marked.delayMs, 500);
    assert.equal(marked.lastEmitTs, 1000);
    assert.equal(marked.remainingMs, 500);

    assert.equal(timing.canEmitNow(), false);
  });

  await test("unblocks emit after default delay passes", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now()
    });

    timing.markEmitted();
    clock.advance(499);

    assert.equal(timing.canEmitNow(), false);
    assert.equal(timing.getSnapshot().remainingMs, 1);

    clock.advance(1);

    assert.equal(timing.canEmitNow(), true);
    assert.equal(timing.getSnapshot().remainingMs, 0);
    assert.equal(timing.getSnapshot().active, false);
  });

  await test("respects custom delay", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now(),
      baseDelayMs: 1200
    });

    timing.markEmitted();

    assert.equal(timing.canEmitNow(), false);
    assert.equal(timing.getSnapshot().delayMs, 1200);
    assert.equal(timing.getSnapshot().remainingMs, 1200);

    clock.advance(1199);
    assert.equal(timing.canEmitNow(), false);

    clock.advance(1);
    assert.equal(timing.canEmitNow(), true);
  });

  await test("clamps invalid delay to fallback 500ms", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now(),
      baseDelayMs: "bad"
    });

    timing.markEmitted();

    assert.equal(timing.getSnapshot().delayMs, 500);
    assert.equal(timing.canEmitNow(), false);

    clock.advance(500);
    assert.equal(timing.canEmitNow(), true);
  });

  await test("clamps negative delay to 0", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now(),
      baseDelayMs: -100
    });

    timing.markEmitted();

    assert.equal(timing.getSnapshot().delayMs, 0);
    assert.equal(timing.canEmitNow(), true);
    assert.equal(timing.getSnapshot().remainingMs, 0);
  });

  await test("clamps extremely large delay to 15000ms", async () => {
    const clock = createClock();
    const timing = createOverlayTiming({
      nowTs: () => clock.now(),
      baseDelayMs: 999999
    });

    timing.markEmitted();

    assert.equal(timing.getSnapshot().delayMs, 15000);
    assert.equal(timing.canEmitNow(), false);

    clock.advance(15000);
    assert.equal(timing.canEmitNow(), true);
  });

  console.log("\n---- OVERLAY TIMING SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
})();