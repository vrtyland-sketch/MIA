"use strict";

const assert = require("assert/strict");
const {
  computeVoiceHoldUntilTs,
  createOverlayStateCache
} = require("../scripts/MIA_RUNTIME_PERF");

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

console.log("\n---- RUNTIME PERF CONTRACT ----\n");

test("voice hold uses duration + buffer instead of fixed 18s minimum", () => {
  const now = 1_700_000_000_000;
  const hold = computeVoiceHoldUntilTs(now, 4200, {
    MIA_VOICE_HOLD_MIN_MS: "3500",
    MIA_VOICE_HOLD_BUFFER_MS: "1200"
  });

  assert.equal(hold, now + 5400);
  assert.ok(hold - now < 18000, "short TTS must not lock for 18s");
});

test("voice hold respects minimum floor for very short clips", () => {
  const now = 1_700_000_000_000;
  const hold = computeVoiceHoldUntilTs(now, 800, {
    MIA_VOICE_HOLD_MIN_MS: "3500",
    MIA_VOICE_HOLD_BUFFER_MS: "1200"
  });

  assert.equal(hold, now + 3500);
});

test("voice hold fallback when duration unknown", () => {
  const now = 1_700_000_000_000;
  const hold = computeVoiceHoldUntilTs(now, 0, {
    MIA_VOICE_HOLD_FALLBACK_MS: "8500"
  });

  assert.equal(hold, now + 8500);
});

test("overlay state cache returns same object within ttl", () => {
  let buildCount = 0;
  const cache = createOverlayStateCache({ ttlMs: 500 });
  const first = cache.get("a|1", () => {
    buildCount += 1;
    return { ok: true, n: buildCount };
  });
  const second = cache.get("a|1", () => {
    buildCount += 1;
    return { ok: true, n: buildCount };
  });

  assert.equal(first, second);
  assert.equal(buildCount, 1);
});

test("overlay state cache rebuilds after key change", () => {
  let buildCount = 0;
  const cache = createOverlayStateCache({ ttlMs: 500 });
  cache.get("a|1", () => {
    buildCount += 1;
    return { key: "a" };
  });
  const next = cache.get("b|1", () => {
    buildCount += 1;
    return { key: "b" };
  });

  assert.equal(next.key, "b");
  assert.equal(buildCount, 2);
});

test("overlay state cache invalidate forces rebuild", () => {
  let buildCount = 0;
  const cache = createOverlayStateCache({ ttlMs: 5000 });
  cache.get("same", () => {
    buildCount += 1;
    return { n: buildCount };
  });
  cache.invalidate();
  const rebuilt = cache.get("same", () => {
    buildCount += 1;
    return { n: buildCount };
  });

  assert.equal(rebuilt.n, 2);
  assert.equal(buildCount, 2);
});
