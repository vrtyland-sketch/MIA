"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const runtimeState = require("../core/runtime-state");
const kojPersistence = require("../scripts/MIA_KOJNOZROUT_PERSISTENCE");
const { buildRuntimeStateSeedCtx, bootPersistedWorld } = require("../scripts/MIA_RUNTIME_STATE_SEED_CTX");
const {
  createStreamWatchdog,
  isWatchdogEnabled,
  resetSharedStreamWatchdogForTest
} = require("../core/stream-watchdog");

const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-wd-contract-"));
runtimeState.loadRuntimeState(path.join(scratchRoot, "absent-runtime.json"));

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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  function runtimeSnapshot(bowlPercent, updatedAt, extra = {}) {
    return {
      version: 1,
      updatedAt,
      kojRef: "data/kojnozout-state.json",
      bowl: { bowlPercent, bowlFillPercent: bowlPercent, bowlState: bowlPercent > 0 ? "full" : "empty" },
      koj: {
        bowlPercent,
        bowlFillPercent: bowlPercent,
        hunger: extra.hunger == null ? 1 : extra.hunger,
        mood: extra.mood || "happy",
        energy: extra.energy == null ? 90 : extra.energy
      },
      queue: extra.queue || { size: 0, items: [] }
    };
  }

  function healthWatchdog() {
    return createStreamWatchdog({
      getObsConnected: () => true,
      getLastIngestSummary: () => null,
      writeLog: () => {},
      runtimeConfig: { phase1: { watchdog: { enabled: true } } }
    });
  }

  const realNow = Date.now;
  let clock = 1000;
  Date.now = () => clock;

  try {
    await test("watchdog annotation does not promote a stale runtime clock", async () => {
      const dir = fs.mkdtempSync(path.join(scratchRoot, "promote-"));
      const runtimeFile = path.join(dir, "runtime-state.json");
      const kojFile = path.join(dir, "kojnozout-state.json");
      writeJson(runtimeFile, runtimeSnapshot(100, 1000, { hunger: 1, mood: "happy", energy: 90 }));
      writeJson(kojFile, {
        version: 1,
        updatedAt: 2000,
        bowlPercent: 0,
        hunger: 80,
        mood: "hungry",
        energy: 12
      });
      runtimeState.loadRuntimeState(runtimeFile);
      clock = 3000;
      const wd = healthWatchdog();
      await wd.tick();
      wd.stop();
      await sleep(1000);
      const after = readJson(runtimeFile);
      assert.equal(after.bowl.bowlPercent, 100);
      assert.equal(after.koj.bowlPercent, 100);
      assert.equal(after.koj.hunger, 1);
      assert.equal(after.updatedAt, 1000);
      assert.equal(after.watchdog.at, 3000);
      assert.equal(after.kojRef, "data/kojnozout-state.json");
      const booted = buildRuntimeStateSeedCtx({
        phase1RuntimeState: after,
        modules: {
          kojnozoutPersistenceModule: {
            loadPersistedSeed: () => kojPersistence.loadPersistedSeed(kojFile)
          },
          kojnozoutWorldPersistenceModule: {
            loadWorldSeed: () => ({ backpack: null, duel: null })
          }
        }
      }).kojnozoutPersistedSeed;
      assert.equal(booted.bowlPercent, 0);
      assert.equal(booted.hunger, 80);
      assert.equal(booted.mood, "hungry");
      assert.equal(booted.updatedAt, 2000);
    });

    await test("pending live state keeps its clock when watchdog annotates", async () => {
      const dir = fs.mkdtempSync(path.join(scratchRoot, "pending-"));
      const runtimeFile = path.join(dir, "runtime-state.json");
      writeJson(runtimeFile, runtimeSnapshot(100, 1000));
      runtimeState.loadRuntimeState(runtimeFile);
      clock = 2500;
      runtimeState.scheduleSaveRuntimeState(
        {
          koj: { bowlPercent: 0, hunger: 80, mood: "hungry", energy: 12 },
          streamState: { bowlPercent: 0 },
          queueSnapshot: { size: 1, items: ["live"] }
        },
        { delayMs: 400, filePath: runtimeFile }
      );
      clock = 3000;
      const wd = healthWatchdog();
      await wd.tick();
      wd.stop();
      const pending = runtimeState.getLastRuntimeState();
      assert.equal(pending.bowl.bowlPercent, 0);
      assert.equal(pending.koj.bowlPercent, 0);
      assert.equal(pending.koj.hunger, 80);
      assert.equal(pending.updatedAt, 2500);
      assert.equal(pending.watchdog.at, 3000);
      assert.equal(readJson(runtimeFile).bowl.bowlPercent, 100);
      await sleep(550);
      const after = readJson(runtimeFile);
      assert.equal(after.bowl.bowlPercent, 0);
      assert.equal(after.koj.hunger, 80);
      assert.equal(after.updatedAt, 2500);
      assert.equal(after.watchdog.at, 3000);
    });

    await test("a later real runtime schedule replaces the watchdog annotation", async () => {
      const dir = fs.mkdtempSync(path.join(scratchRoot, "real-after-"));
      const runtimeFile = path.join(dir, "runtime-state.json");
      writeJson(runtimeFile, runtimeSnapshot(100, 1000));
      runtimeState.loadRuntimeState(runtimeFile);
      clock = 3000;
      const wd = healthWatchdog();
      await wd.tick();
      wd.stop();
      clock = 3500;
      runtimeState.scheduleSaveRuntimeState(
        {
          koj: { bowlPercent: 0, hunger: 80, mood: "hungry", energy: 12 },
          streamState: { bowlPercent: 0 },
          queueSnapshot: { size: 1, items: ["live"] }
        },
        { filePath: runtimeFile }
      );
      await sleep(1000);
      const after = readJson(runtimeFile);
      assert.equal(after.bowl.bowlPercent, 0);
      assert.equal(after.koj.bowlPercent, 0);
      assert.equal(after.koj.hunger, 80);
      assert.equal(after.updatedAt, 3500);
      assert.equal(after.watchdog, undefined);
    });

    await test("loadRuntimeState does not discard a dirty pending snapshot", async () => {
      const dir = fs.mkdtempSync(path.join(scratchRoot, "load-pending-"));
      const runtimeFile = path.join(dir, "runtime-state.json");
      const otherFile = path.join(dir, "other-runtime.json");
      writeJson(runtimeFile, runtimeSnapshot(100, 1000));
      writeJson(otherFile, runtimeSnapshot(7, 50, { hunger: 3, mood: "idle" }));
      runtimeState.loadRuntimeState(runtimeFile);
      clock = 2500;
      runtimeState.scheduleSaveRuntimeState(
        {
          koj: { bowlPercent: 0, hunger: 80, mood: "hungry", energy: 12 },
          streamState: { bowlPercent: 0 },
          queueSnapshot: { size: 1, items: ["live"] }
        },
        { delayMs: 400, filePath: runtimeFile }
      );
      const disk = runtimeState.loadRuntimeState(runtimeFile);
      assert.equal(disk.bowl.bowlPercent, 100);
      assert.equal(disk.updatedAt, 1000);
      const pending = runtimeState.getLastRuntimeState();
      assert.equal(pending.bowl.bowlPercent, 0);
      assert.equal(pending.koj.hunger, 80);
      assert.equal(pending.updatedAt, 2500);
      const other = runtimeState.loadRuntimeState(otherFile);
      assert.equal(other.bowl.bowlPercent, 7);
      assert.equal(runtimeState.getLastRuntimeState().bowl.bowlPercent, 0);
      assert.equal(runtimeState.getLastRuntimeState().updatedAt, 2500);
      clock = 3000;
      const wd = healthWatchdog();
      await wd.tick();
      wd.stop();
      const annotated = runtimeState.getLastRuntimeState();
      assert.equal(annotated.bowl.bowlPercent, 0);
      assert.equal(annotated.koj.hunger, 80);
      assert.equal(annotated.updatedAt, 2500);
      assert.equal(annotated.watchdog.at, 3000);
      await sleep(550);
      const after = readJson(runtimeFile);
      assert.equal(after.bowl.bowlPercent, 0);
      assert.equal(after.koj.hunger, 80);
      assert.equal(after.updatedAt, 2500);
      assert.equal(after.watchdog.at, 3000);
      const untouched = readJson(otherFile);
      assert.equal(untouched.bowl.bowlPercent, 7);
      assert.equal(untouched.updatedAt, 50);
      assert.equal(untouched.watchdog, undefined);
    });

    await test("watchdog does not invent runtime-state when none exists", async () => {
      const missing = path.join(scratchRoot, "missing-runtime.json");
      runtimeState.loadRuntimeState(missing);
      clock = 3000;
      const wd = healthWatchdog();
      await wd.tick();
      wd.stop();
      await sleep(1000);
      assert.equal(fs.existsSync(missing), false);
    });

    await test("corrupt world boot stays degraded", () => {
      const booted = bootPersistedWorld({
        ok: false,
        reason: "world_state_corrupt"
      });
      assert.equal(booted.degraded, true);
      assert.equal(booted.worldEnabled, false);
      assert.equal(booted.reason, "world_state_corrupt");
    });
  } finally {
    Date.now = realNow;
  }

  console.log("phase1_stream_watchdog_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
