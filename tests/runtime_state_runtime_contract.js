"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createRuntimeStateRuntime } = require("../scripts/MIA_RUNTIME_STATE_RUNTIME");

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
  await test("createRuntimeStateRuntime exposes state impact API", () => {
    const api = createRuntimeStateRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      extractSupportPayload: (n) => n.support || n,
      extractCommunityImpact: () => ({}),
      streamStateModule: {},
      getStreamState: () => ({}),
      setStreamState: () => {},
      kojnozoutModule: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      runtimeConfig: {},
      gameConfig: {},
      kojnozoutPersistenceModule: {},
      kojnozoutWorldPersistenceModule: {},
      getKojnozoutBackpackState: () => ({}),
      getDuelState: () => ({}),
      writeLog: () => {}
    });
    assert.equal(typeof api.applyRuntimeStateImpact, "function");
    assert.equal(typeof api.scheduleWorldSave, "function");
  });

  await test("applyRuntimeStateImpact applies gift support and returns evolution", () => {
    let stream = { gifts: 0 };
    let koj = { feed: 0 };
    const result = createRuntimeStateRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      extractSupportPayload: (n) => n.support,
      extractCommunityImpact: () => ({}),
      streamStateModule: {
        applySupportImpact: (state, support) => ({
          state: { ...state, gifts: state.gifts + (support.miaPoints || 0) }
        })
      },
      getStreamState: () => stream,
      setStreamState: (next) => {
        stream = next;
      },
      kojnozoutModule: {
        applySupportToKojnozout: (state, support) => ({
          state: { ...state, feed: state.feed + (support.miaPoints || 0) },
          evolutionLevelUp: { tier: 2 }
        })
      },
      getKojnozoutState: () => koj,
      setKojnozoutState: (next) => {
        koj = next;
      },
      runtimeConfig: {},
      gameConfig: {},
      kojnozoutPersistenceModule: {
        scheduleSaveKojnozoutState: () => {}
      },
      writeLog: () => {}
    }).applyRuntimeStateImpact({
      eventType: "GIFT",
      support: { miaPoints: 5 }
    });

    assert.equal(stream.gifts, 5);
    assert.equal(koj.feed, 5);
    assert.equal(result.eventType, "GIFT");
    assert.equal(result.evolutionLevelUp.tier, 2);
  });

  await test("scheduleWorldSave delegates to world persistence module", () => {
    let saved = null;
    createRuntimeStateRuntime({
      kojnozoutWorldPersistenceModule: {
        scheduleSaveWorld: (payload) => {
          saved = payload;
        }
      },
      getKojnozoutBackpackState: () => ({ items: [1] }),
      getDuelState: () => ({ active: true })
    }).scheduleWorldSave();

    assert.deepEqual(saved, {
      backpack: { items: [1] },
      duel: { active: true }
    });
  });

  await test("index.js wires runtimeStateRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initRuntimeStateRuntime/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_RUNTIME/);
    assert.match(indexSrc, /MIA_RUNTIME_STATE_CTX/);
    assert.doesNotMatch(indexSrc, /source: "runtime_state_impact"/);
    assert.doesNotMatch(
      indexSrc,
      /kojnozoutWorldPersistenceModule\.scheduleSaveWorld\(\{\s*backpack: kojnozoutBackpackState/
    );
  });

  console.log("runtime_state_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
