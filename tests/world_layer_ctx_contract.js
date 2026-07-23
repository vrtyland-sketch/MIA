"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildWorldLayerCtx } = require("../scripts/MIA_WORLD_LAYER_CTX");
const { createWorldLayerRuntime } = require("../scripts/MIA_WORLD_LAYER_RUNTIME");

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
  await test("buildWorldLayerCtx flattens grouped host", () => {
    const scheduleWorldSave = () => {};
    const ctx = buildWorldLayerCtx({
      core: { upper: (v) => String(v).toUpperCase(), safeString: String, writeLog: () => {} },
      modules: { kojnozoutModule: {}, kojnozoutBackpackModule: {}, kojnozoutDuelModule: {}, platformArenaModule: {}, chatRewardModule: {}, kojRosterModule: {} },
      state: {
        getKojnozoutBackpackState: () => ({}),
        setKojnozoutBackpackState: () => {},
        getDuelState: () => ({}),
        setDuelState: () => {},
        getArenaState: () => ({}),
        setArenaState: () => {}
      },
      handlers: {
        getUserLabel: () => "Viewer",
        extractSupportPayload: (n) => n.support || {},
        setOverlay: () => ({}),
        invalidateOverlayStateCache: () => {},
        scheduleWorldSave
      }
    });
    assert.equal(ctx.scheduleWorldSave, scheduleWorldSave);
  });

  await test("createWorldLayerRuntime accepts buildWorldLayerCtx shape", () => {
    const api = createWorldLayerRuntime(
      buildWorldLayerCtx({
        core: { upper: (v) => String(v).toUpperCase(), safeString: String, writeLog: () => {} },
        handlers: { getUserLabel: () => "x", extractSupportPayload: () => ({}), setOverlay: () => ({}), invalidateOverlayStateCache: () => {}, scheduleWorldSave: () => {} },
        state: { getKojnozoutBackpackState: () => ({}), setKojnozoutBackpackState: () => {}, getDuelState: () => ({}), setDuelState: () => {}, getArenaState: () => ({}), setArenaState: () => {} }
      })
    );
    assert.equal(typeof api.applyWorldLayer, "function");
  });

  await test("index.js uses collectWorldLayerHost and buildWorldLayerCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectWorldLayerHost\(\)/);
    assert.match(indexSrc, /MIA_WORLD_LAYER_CTX/);
    assert.match(indexSrc, /MIA_WORLD_LAYER_HOST/);
    assert.match(indexSrc, /buildHost\(collectWorldLayerBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /createWorldLayerRuntime\(\{\s*upper,/);
  });

  console.log("world_layer_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
