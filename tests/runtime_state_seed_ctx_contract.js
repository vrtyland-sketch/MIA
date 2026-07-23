"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRuntimeStateSeedCtx } = require("../scripts/MIA_RUNTIME_STATE_SEED_CTX");

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
