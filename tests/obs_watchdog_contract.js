"use strict";

const assert = require("assert");
const { createObsWatchdog } = require("../scripts/MIA_OBS_WATCHDOG");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("\u2705 " + name);
  } catch (err) {
    failed += 1;
    console.log("\u274c " + name + " \u2014 " + (err && err.message));
  }
}

function makeWatchdog(overrides = {}) {
  const calls = { spawn: 0 };
  let processRunning = overrides.processRunning || false;
  let clock = 0;
  const wd = createObsWatchdog({
    config: {
      enabled: overrides.enabled !== false,
      // platná cesta není potřeba — exePath injektujeme přes fakeExe
      exePath: overrides.exePath || __filename,
      cooldownMs: overrides.cooldownMs != null ? overrides.cooldownMs : 60000,
      maxAttempts: overrides.maxAttempts != null ? overrides.maxAttempts : 5
    },
    isProcessRunning: () => processRunning,
    spawn: () => {
      calls.spawn += 1;
      return { unref() {} };
    },
    now: () => clock,
    log: () => {}
  });
  return {
    wd,
    calls,
    setRunning: (v) => {
      processRunning = v;
    },
    advance: (ms) => {
      clock += ms;
    }
  };
}

test("does nothing when OBS process is already running", () => {
  const { wd, calls } = makeWatchdog({ processRunning: true });
  const r = wd.ensureRunning();
  assert.equal(r.action, "noop");
  assert.equal(calls.spawn, 0);
});

test("launches OBS when process is not running", () => {
  const { wd, calls } = makeWatchdog({ processRunning: false });
  const r = wd.ensureRunning();
  assert.equal(r.action, "launched");
  assert.equal(calls.spawn, 1);
});

test("respects cooldown between launch attempts", () => {
  const ctx = makeWatchdog({ processRunning: false, cooldownMs: 60000 });
  assert.equal(ctx.wd.ensureRunning().action, "launched");
  // hned podruhé → cooldown blokuje
  assert.equal(ctx.wd.ensureRunning().reason, "cooldown");
  assert.equal(ctx.calls.spawn, 1);
  // po cooldownu jde znovu
  ctx.advance(61000);
  assert.equal(ctx.wd.ensureRunning().action, "launched");
  assert.equal(ctx.calls.spawn, 2);
});

test("stops after max attempts", () => {
  const ctx = makeWatchdog({ processRunning: false, cooldownMs: 0, maxAttempts: 3 });
  for (let i = 0; i < 3; i += 1) {
    ctx.advance(1);
    assert.equal(ctx.wd.ensureRunning().action, "launched");
  }
  ctx.advance(1);
  assert.equal(ctx.wd.ensureRunning().reason, "max_attempts");
  assert.equal(ctx.calls.spawn, 3);
});

test("noteConnected resets the attempt counter", () => {
  const ctx = makeWatchdog({ processRunning: false, cooldownMs: 0, maxAttempts: 2 });
  ctx.advance(1);
  ctx.wd.ensureRunning();
  ctx.advance(1);
  ctx.wd.ensureRunning();
  ctx.advance(1);
  assert.equal(ctx.wd.ensureRunning().reason, "max_attempts");
  // OBS se připojí → reset
  ctx.wd.noteConnected();
  ctx.advance(1);
  assert.equal(ctx.wd.ensureRunning().action, "launched");
});

test("disabled watchdog never launches", () => {
  const ctx = makeWatchdog({ processRunning: false, enabled: false });
  assert.equal(ctx.wd.ensureRunning().reason, "disabled");
  assert.equal(ctx.calls.spawn, 0);
});

console.log("\n---- OBS WATCHDOG CONTRACT SUMMARY ----\n");
console.log("passed:", passed);
console.log("failed:", failed);
process.exit(failed > 0 ? 1 : 0);
