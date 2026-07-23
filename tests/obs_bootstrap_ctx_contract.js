"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsBootstrapCtx } = require("../scripts/MIA_OBS_BOOTSTRAP_CTX");
const { createObsBootstrap } = require("../scripts/MIA_OBS_BOOTSTRAP");

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
  await test("buildObsBootstrapCtx flattens grouped host", () => {
    const state = { obs: null, obsConnected: false };
    const onAfterConnect = async () => ({ ok: true });
    const ctx = buildObsBootstrapCtx({
      state: { obsSharedState: state },
      core: { runtimeConfig: {}, writeLog: () => {}, getPort: () => 3000, reconnectMs: 5000 },
      modules: { OBSWebSocket: class {}, obsSceneGuardModule: {} },
      handlers: { getObsWatchdog: () => null, onAfterConnect, onConnectionClosed: () => {}, onMediaPlaybackEnded: () => {} }
    });
    assert.equal(ctx.state, state);
    assert.equal(ctx.port, 3000);
    assert.equal(ctx.onAfterConnect, onAfterConnect);
  });

  await test("createObsBootstrap accepts buildObsBootstrapCtx shape", async () => {
    const api = createObsBootstrap(
      buildObsBootstrapCtx({
        state: { obsSharedState: { obs: null, obsConnected: false, connectingPromise: null, reconnectTimer: null, lastFailLogAt: 0 } },
        core: { runtimeConfig: {}, writeLog: () => {}, getPort: () => 3000, reconnectMs: 5000 },
        modules: { OBSWebSocket: null, obsSceneGuardModule: {} },
        handlers: { getObsWatchdog: () => null, onAfterConnect: async () => ({}), onConnectionClosed: () => {}, onMediaPlaybackEnded: () => {} }
      })
    );
    assert.equal(typeof api.ensureObsConnected, "function");
    const result = await api.ensureObsConnected("test");
    assert.equal(result.obsConnected, false);
  });

  await test("index.js uses collectObsBootstrapHost and buildObsBootstrapCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsBootstrapHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_BOOTSTRAP_CTX/);
    assert.match(indexSrc, /MIA_OBS_BOOTSTRAP_HOST/);
    assert.match(indexSrc, /buildHost\(collectObsBootstrapBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initObsBootstrapRuntime\(\)/);
    assert.match(indexSrc, /obsBootstrapRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /obsBootstrapApi/);
    assert.doesNotMatch(indexSrc, /createObsBootstrap\(\{\s*state: obsSharedState,/);
  });

  console.log("obs_bootstrap_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
