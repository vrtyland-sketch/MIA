"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildBossMissionCtx } = require("../scripts/MIA_BOSS_MISSION_CTX");
const { createBossMissionRuntime } = require("../scripts/MIA_BOSS_MISSION_RUNTIME");

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
  await test("buildBossMissionCtx flattens grouped host", () => {
    const getOverlayState = () => ({ miaOverlay: null });
    const ctx = buildBossMissionCtx({
      core: { runtimeConfig: {}, safeString: String, getUserLabel: () => "Viewer", writeLog: () => {} },
      modules: { bossMissionModule: {} },
      state: { getOverlayState },
      media: { videoEngine: null }
    });
    assert.equal(ctx.getOverlayState, getOverlayState);
    assert.equal(ctx.bossMissionModule, ctx.bossMissionModule);
  });

  await test("createBossMissionRuntime accepts buildBossMissionCtx shape", () => {
    const api = createBossMissionRuntime(
      buildBossMissionCtx({
        core: { runtimeConfig: {}, safeString: String, getUserLabel: () => "Viewer", writeLog: () => {} },
        modules: { bossMissionModule: {} },
        state: { getOverlayState: () => ({}) },
        media: { videoEngine: null }
      })
    );
    assert.equal(typeof api.tryAutoBossMissionFromGift, "function");
  });

  await test("index.js uses collectBossMissionBindingsHost and buildBossMissionHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectBossMissionBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_BOSS_MISSION_HOST/);
    assert.match(indexSrc, /buildCtx\(collectBossMissionHost\(\)\)/);
    assert.match(indexSrc, /getVideoEngine: videoEngineRuntime/);
    assert.doesNotMatch(indexSrc, /createBossMissionRuntime\(\{\s*runtimeConfig,/);
  });

  console.log("boss_mission_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
