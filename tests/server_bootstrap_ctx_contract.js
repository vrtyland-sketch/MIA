"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildServerBootstrapCtx } = require("../scripts/MIA_SERVER_BOOTSTRAP_CTX");
const { createMiaServerStarter } = require("../scripts/MIA_SERVER_BOOTSTRAP");

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
  await test("buildServerBootstrapCtx flattens grouped host", () => {
    const app = { listen() {} };
    const connectObs = async () => ({ ok: true });
    const ctx = buildServerBootstrapCtx({
      core: {
        app,
        PORT: 3000,
        BIND_HOST: "127.0.0.1",
        overlayStaticDir: "/tmp",
        MIA_SPLIT_OVERLAYS: () => ({})
      },
      modules: {
        portGuardModule: {},
        runtimeSecurityModule: {},
        selfRestartModule: {},
        miaPaintWs: {},
        miaPaintBridge: {}
      },
      handlers: {
        emitStartupOverlay: async () => {},
        markStreamSessionEnded: () => ({ phase: "ENDED" })
      },
      obs: {
        warnOnDeadObsSceneFiles: () => {},
        connectObs
      }
    });
    assert.equal(ctx.app, app);
    assert.equal(ctx.PORT, 3000);
    assert.equal(ctx.connectObs, connectObs);
  });

  await test("createMiaServerStarter accepts buildServerBootstrapCtx shape", () => {
    const api = createMiaServerStarter(
      buildServerBootstrapCtx({
        core: {
          app: { listen() {} },
          PORT: 3000,
          BIND_HOST: "127.0.0.1",
          overlayStaticDir: "/tmp",
          MIA_SPLIT_OVERLAYS: () => ({})
        },
        modules: {
          portGuardModule: {},
          runtimeSecurityModule: {},
          selfRestartModule: {},
          miaPaintWs: {},
          miaPaintBridge: {}
        },
        handlers: {
          emitStartupOverlay: async () => {},
          markStreamSessionEnded: () => ({})
        },
        obs: {
          warnOnDeadObsSceneFiles: () => {},
          connectObs: async () => ({})
        }
      })
    );
    assert.equal(typeof api.startMiaServer, "function");
  });

  await test("index.js uses collectServerBootstrapHost and buildServerBootstrapCtx", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectServerBootstrapHost\(\)/);
    assert.match(indexSrc, /MIA_SERVER_BOOTSTRAP_CTX/);
    assert.match(indexSrc, /MIA_SERVER_BOOTSTRAP_HOST/);
    assert.match(indexSrc, /buildHost\(collectServerBootstrapBindingsHost\(\)\)/);
    assert.match(indexSrc, /function initServerBootstrapRuntime\(\)/);
    assert.match(indexSrc, /serverBootstrapRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /miaServerStarterApi/);
    assert.match(indexSrc, /function initAppRuntimesRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /createMiaServerStarter\(\{\s*app,/);
  });

  console.log("server_bootstrap_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
