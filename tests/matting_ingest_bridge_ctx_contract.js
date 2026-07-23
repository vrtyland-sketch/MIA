"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildMattingIngestBridgeCtx } = require("../scripts/MIA_MATTING_INGEST_BRIDGE_CTX");
const { createMattingIngestBridge } = require("../scripts/MIA_MATTING_INGEST_BRIDGE");

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
  await test("buildMattingIngestBridgeCtx passes live getImmersiveSceneSnapshot getter", () => {
    let count = 0;
    const ctx = buildMattingIngestBridgeCtx({
      core: { runtimeConfig: {}, writeLog: () => {} },
      obs: { safeObsCall: async () => ({ ok: true }) },
      modules: { streamerMattingModule: {} },
      state: {
        getImmersiveSceneSnapshot: () => ({ sceneId: ++count })
      }
    });
    assert.equal(ctx.getImmersiveSceneSnapshot().sceneId, 1);
    assert.equal(ctx.getImmersiveSceneSnapshot().sceneId, 2);
  });

  await test("createMattingIngestBridge accepts buildMattingIngestBridgeCtx shape", () => {
    const api = createMattingIngestBridge(
      buildMattingIngestBridgeCtx({
        core: { runtimeConfig: { mattingIngest: { enabled: false } }, writeLog: () => {} },
        obs: { safeObsCall: async () => ({ ok: true }) },
        modules: { streamerMattingModule: {} },
        state: { getImmersiveSceneSnapshot: () => null }
      })
    );
    assert.equal(typeof api.getStatus, "function");
  });

  await test("index.js uses collectMattingIngestBridgeBindingsHost and buildMattingIngestBridgeHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectMattingIngestBridgeBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_MATTING_INGEST_BRIDGE_HOST/);
    assert.match(indexSrc, /buildCtx\(collectMattingIngestBridgeHost\(\)\)/);
    assert.match(indexSrc, /function initMattingIngestBridgeRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initMattingIngestBridge\(\)/);
    assert.doesNotMatch(indexSrc, /createMattingIngestBridge\(\{\s*runtimeConfig,/);
  });

  console.log("matting_ingest_bridge_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
