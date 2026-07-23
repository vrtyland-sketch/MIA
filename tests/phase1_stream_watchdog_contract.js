"use strict";

const assert = require("assert/strict");
const {
  createStreamWatchdog,
  isWatchdogEnabled,
  resetSharedStreamWatchdogForTest
} = require("../core/stream-watchdog");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  resetSharedStreamWatchdogForTest();

  await test("watchdog enabled by default", () => {
    const prev = process.env.MIA_STREAM_WATCHDOG;
    delete process.env.MIA_STREAM_WATCHDOG;
    assert.equal(isWatchdogEnabled({}), true);
    assert.equal(isWatchdogEnabled({ phase1: { watchdog: { enabled: false } } }), false);
    process.env.MIA_STREAM_WATCHDOG = "0";
    assert.equal(isWatchdogEnabled({}), false);
    if (prev === undefined) delete process.env.MIA_STREAM_WATCHDOG;
    else process.env.MIA_STREAM_WATCHDOG = prev;
  });

  await test("tick reports obs health and does not kill processes", async () => {
    let ensureCalls = 0;
    const wd = createStreamWatchdog({
      getObsConnected: () => false,
      getLastIngestSummary: () => ({ at: Date.now() - 1000 }),
      ensureObsConnected: async () => {
        ensureCalls += 1;
        return { ok: false };
      },
      forceReconnectObs: async () => {
        throw new Error("should_not_force_on_first");
      },
      writeLog: () => {},
      reconnectCooldownMs: 1000,
      ingestStaleMs: 60000
    });

    const snap = await wd.tick();
    assert.equal(snap.obsConnected, false);
    assert.equal(ensureCalls, 1);
    assert.equal(snap.reconnect.mode, "ensure");
    wd.stop();
  });

  await test("watchdog does not create runtime-state from empty", async () => {
    const fs = require("fs");
    const path = require("path");
    const runtimeState = require("../core/runtime-state");
    const target = runtimeState.getRuntimeStatePath();
    const existed = fs.existsSync(target);
    const before = existed ? fs.readFileSync(target, "utf8") : null;

    const wd = createStreamWatchdog({
      getObsConnected: () => true,
      getLastIngestSummary: () => null,
      writeLog: () => {}
    });
    await wd.tick();
    wd.stop();

    if (!existed) {
      assert.equal(fs.existsSync(target), false);
    } else {
      assert.equal(fs.readFileSync(target, "utf8"), before);
    }
  });

  await test("stale ingest flagged without reconnect spam", async () => {
    const wd = createStreamWatchdog({
      getObsConnected: () => true,
      getLastIngestSummary: () => ({ at: Date.now() - 999999 }),
      ensureObsConnected: async () => ({ ok: true }),
      writeLog: () => {},
      ingestStaleMs: 1000
    });
    const snap = await wd.tick();
    assert.equal(snap.obsConnected, true);
    assert.equal(snap.ingest.stale, true);
    assert.equal(snap.ok, false);
    assert.equal(snap.reconnect.attempted, false);
    wd.stop();
  });

  console.log("phase1_stream_watchdog_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
