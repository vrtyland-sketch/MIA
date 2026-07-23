"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildKojMomentsCtx } = require("../scripts/MIA_KOJ_MOMENTS_CTX");
const { createKojMomentsRuntime } = require("../scripts/MIA_KOJ_MOMENTS_RUNTIME");

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
  await test("buildKojMomentsCtx flattens grouped host", () => {
    const executeOverlay = async () => ({});
    const ctx = buildKojMomentsCtx({
      core: { upper: (v) => String(v).toUpperCase(), safeString: String, runtimeConfig: {}, writeLog: () => {} },
      modules: {
        careQuestModule: {},
        careOpportunitiesModule: {},
        kojnozoutPersistenceModule: {},
        kojnozoutDuelBridgeModule: {},
        kojnozoutDuelModule: {},
        kojnozoutEvolutionModule: {}
      },
      state: {
        getKojnozoutState: () => ({}),
        setKojnozoutState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {},
        setLastDuelSyncSummary: () => {},
        getOutputState: () => ({})
      },
      handlers: { getUserLabel: () => "Viewer", executeOverlay, scheduleWorldSave: () => {} }
    });

    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(typeof ctx.setLastDuelSyncSummary, "function");
  });

  await test("createKojMomentsRuntime accepts buildKojMomentsCtx shape", () => {
    const api = createKojMomentsRuntime(
      buildKojMomentsCtx({
        core: { upper: (v) => String(v).toUpperCase(), safeString: String, writeLog: () => {} },
        handlers: { getUserLabel: () => "Viewer", executeOverlay: async () => ({}) },
        state: { getKojnozoutState: () => ({}), setKojnozoutState: () => {}, getOutputState: () => ({}) }
      })
    );
    assert.equal(typeof api.applyCareQuestProgress, "function");
  });

  await test("index.js uses collectKojMomentsHost and buildKojMomentsCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectKojMomentsHost\(\)/);
    assert.match(indexSrc, /MIA_KOJ_MOMENTS_CTX/);
    assert.match(indexSrc, /MIA_KOJ_MOMENTS_HOST/);
    assert.match(indexSrc, /buildHost\(collectKojMomentsBindingsHost\(\)\)/);
    assert.match(indexSrc, /initKojMomentsRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createKojMomentsRuntime\(\{\s*upper,/);
  });

  console.log("koj_moments_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
