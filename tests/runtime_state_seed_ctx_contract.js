"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const runtimeState = require("../core/runtime-state");
const kojPersistence = require("../scripts/MIA_KOJNOZROUT_PERSISTENCE");
const { buildRuntimeStateSeedCtx, bootPersistedWorld } = require("../scripts/MIA_RUNTIME_STATE_SEED_CTX");

const ROOT = path.resolve(__dirname, "..");

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
  await test("buildRuntimeStateSeedCtx loads persisted seeds from modules", () => {
    let worldCalls = 0;
    let kojCalls = 0;
    const ctx = buildRuntimeStateSeedCtx({
      // Isolate from live data/runtime-state.json so CI/local hunger drift cannot fail this contract.
      phase1RuntimeState: null,
      core: { runtimeConfig: { ecosystem: { worldMode: "night" } } },
      modules: {
        kojnozoutWorldPersistenceModule: {
          loadWorldSeed: () => {
            worldCalls += 1;
            return { backpack: { users: {} }, duel: { active: true } };
          }
        },
        kojnozoutPersistenceModule: {
          loadPersistedSeed: () => {
            kojCalls += 1;
            return { hunger: 50 };
          }
        }
      }
    });
    assert.equal(worldCalls, 1);
    assert.equal(kojCalls, 1);
    assert.equal(ctx.runtimeConfig.ecosystem.worldMode, "night");
    assert.deepEqual(ctx.worldSeed.backpack, { users: {} });
    assert.equal(ctx.kojnozoutPersistedSeed.hunger, 50);
    assert.equal(typeof ctx.kojnozoutPersistedSeed, "object");
  });

  await test("buildRuntimeStateSeedCtx composes when phase1RuntimeState injected", () => {
    const ctx = buildRuntimeStateSeedCtx({
      phase1RuntimeState: {
        updatedAt: Date.now(),
        koj: { hunger: 71.24, energy: 40 }
      },
      core: { runtimeConfig: {} },
      modules: {
        kojnozoutWorldPersistenceModule: { loadWorldSeed: () => ({}) },
        kojnozoutPersistenceModule: {
          loadPersistedSeed: () => ({ hunger: 50, energy: 10 })
        }
      }
    });
    assert.equal(ctx.kojnozoutPersistedSeed.hunger, 71.24);
    assert.equal(ctx.kojnozoutPersistedSeed.energy, 40);
  });

  function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  function bootFromFiles(kojFile, runtimeFile) {
    runtimeState.loadRuntimeState(runtimeFile);
    return buildRuntimeStateSeedCtx({
      modules: {
        kojnozoutPersistenceModule: {
          loadPersistedSeed: () => kojPersistence.loadPersistedSeed(kojFile)
        },
        kojnozoutWorldPersistenceModule: {
          loadWorldSeed: () => ({ backpack: null, duel: null })
        }
      }
    }).kojnozoutPersistedSeed;
  }

  await test("boot keeps explicit bowl 0 from a newer persisted file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-bowl-boot-"));
    const kojFile = path.join(dir, "kojnozout-state.json");
    const runtimeFile = path.join(dir, "runtime-state.json");
    try {
      writeJson(kojFile, {
        version: 1,
        updatedAt: 2000,
        bowlPercent: 0,
        bowlFillPercent: 0,
        hunger: 80,
        mood: "hungry",
        energy: 12,
        feedPoints: 99
      });
      writeJson(runtimeFile, {
        version: 1,
        updatedAt: 1000,
        koj: {
          bowlPercent: 100,
          bowlFillPercent: 100,
          hunger: 1,
          mood: "happy",
          energy: 90,
          feedPoints: 10
        },
        bowl: { bowlPercent: 100, bowlFillPercent: 100, bowlState: "full" }
      });
      const loaded = kojPersistence.loadPersistedSeed(kojFile);
      assert.equal(loaded.updatedAt, 2000);
      assert.equal(loaded.bowlPercent, 0);
      const composed = bootFromFiles(kojFile, runtimeFile);
      assert.equal(composed.bowlPercent, 0);
      assert.equal(composed.bowlFillPercent, 0);
      assert.equal(composed.hunger, 80);
      assert.equal(composed.mood, "hungry");
      assert.equal(composed.energy, 12);
      assert.equal(composed.feedPoints, 99);
      assert.equal(composed.updatedAt, 2000);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("boot keeps bowl 0 recovered from a newer bak", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-bowl-bak-"));
    const kojFile = path.join(dir, "kojnozout-state.json");
    const runtimeFile = path.join(dir, "runtime-state.json");
    try {
      fs.writeFileSync(kojFile, "{not-json");
      writeJson(`${kojFile}.bak`, {
        version: 1,
        updatedAt: 2000,
        bowlPercent: 0,
        hunger: 70,
        mood: "hungry",
        energy: 8,
        feedPoints: 40
      });
      writeJson(runtimeFile, {
        version: 1,
        updatedAt: 1000,
        koj: { bowlPercent: 100, hunger: 1, mood: "happy", energy: 90, feedPoints: 10 },
        bowl: { bowlPercent: 100 }
      });
      const loaded = kojPersistence.loadPersistedSeed(kojFile);
      assert.equal(loaded.bowlPercent, 0);
      assert.equal(loaded.updatedAt, 2000);
      const composed = bootFromFiles(kojFile, runtimeFile);
      assert.equal(composed.bowlPercent, 0);
      assert.equal(composed.hunger, 70);
      assert.equal(composed.mood, "hungry");
      assert.equal(composed.energy, 8);
      assert.equal(composed.feedPoints, 40);
      assert.equal(composed.updatedAt, 2000);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("boot keeps a missing bowl distinct from explicit zero", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-bowl-missing-"));
    const kojFile = path.join(dir, "kojnozout-state.json");
    const runtimeFile = path.join(dir, "runtime-state.json");
    try {
      writeJson(kojFile, {
        version: 1,
        updatedAt: 2000,
        hunger: 80,
        mood: "hungry",
        energy: 12
      });
      writeJson(runtimeFile, {
        version: 1,
        updatedAt: 1000,
        koj: { bowlPercent: 100, bowlFillPercent: 100, hunger: 1, mood: "happy" },
        bowl: { bowlPercent: 100, bowlFillPercent: 100 }
      });
      const composed = bootFromFiles(kojFile, runtimeFile);
      assert.equal(Object.prototype.hasOwnProperty.call(composed, "bowlPercent"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(composed, "bowlFillPercent"), false);
      assert.equal(composed.hunger, 80);
      assert.equal(composed.mood, "hungry");
      assert.equal(composed.energy, 12);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("boot still lets a newer runtime snapshot win", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-bowl-runtime-"));
    const kojFile = path.join(dir, "kojnozout-state.json");
    const runtimeFile = path.join(dir, "runtime-state.json");
    try {
      writeJson(kojFile, {
        version: 1,
        updatedAt: 1000,
        bowlPercent: 40,
        hunger: 80,
        mood: "hungry",
        energy: 12,
        feedPoints: 99
      });
      writeJson(runtimeFile, {
        version: 1,
        updatedAt: 2000,
        koj: {
          bowlPercent: 55,
          hunger: 1,
          mood: "happy",
          energy: 90,
          feedPoints: 10
        },
        bowl: { bowlPercent: 55 }
      });
      const composed = bootFromFiles(kojFile, runtimeFile);
      assert.equal(composed.bowlPercent, 55);
      assert.equal(composed.hunger, 1);
      assert.equal(composed.mood, "happy");
      assert.equal(composed.energy, 90);
      assert.equal(composed.feedPoints, 10);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("boot keeps the persisted seed when runtime-state is missing or corrupt", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-bowl-no-runtime-"));
    const kojFile = path.join(dir, "kojnozout-state.json");
    const missingRuntime = path.join(dir, "missing-runtime.json");
    const corruptRuntime = path.join(dir, "corrupt-runtime.json");
    try {
      writeJson(kojFile, {
        version: 1,
        updatedAt: 2000,
        bowlPercent: 0,
        hunger: 80,
        mood: "hungry"
      });
      const missing = bootFromFiles(kojFile, missingRuntime);
      assert.equal(missing.bowlPercent, 0);
      assert.equal(missing.hunger, 80);
      assert.equal(missing.mood, "hungry");
      fs.writeFileSync(corruptRuntime, "{nope");
      const corrupt = bootFromFiles(kojFile, corruptRuntime);
      assert.equal(corrupt.bowlPercent, 0);
      assert.equal(corrupt.hunger, 80);
      assert.equal(corrupt.mood, "hungry");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  await test("corrupt world boot stays degraded", () => {
    const booted = bootPersistedWorld({
      ok: false,
      reason: "world_state_corrupt"
    });
    assert.equal(booted.degraded, true);
    assert.equal(booted.worldEnabled, false);
    assert.equal(booted.reason, "world_state_corrupt");
    assert.equal(booted.ok, false);
    assert.equal(booted.backpack, null);
    assert.equal(booted.duel, null);
  });

  await test("index.js uses collectRuntimeStateSeedHost and initRuntimeStateSeedRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRuntimeStateSeedHost\(\)/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_SEED_CTX/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_SEED_HOST/);
    assert.match(indexSrc, /buildHost\(collectRuntimeStateSeedBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initRuntimeStateSeedRuntime\(\)/);
    assert.match(indexSrc, /runtimeStateSeedRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initRuntimeStateSeeds\(\)/);
    assert.doesNotMatch(indexSrc, /const worldSeed\s*=/);
    assert.doesNotMatch(indexSrc, /const outputState\s*=\s*\n\s*typeof outputStateModule/);
  });

  console.log("runtime_state_seed_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
