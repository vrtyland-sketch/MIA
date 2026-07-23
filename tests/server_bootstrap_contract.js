"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createMiaServerStarter } = require("../scripts/MIA_SERVER_BOOTSTRAP");
const {
  shadowProducedAction,
  resolvePipelineAction
} = require("../MIA_NEXT/engine_shadow_runtime");

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
  await test("server.js is thin entrypoint with require.main guard", () => {
    const serverSrc = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
    assert.match(serverSrc, /require\("\.\/index\.js"\)/);
    assert.match(serverSrc, /require\.main === module/);
    assert.match(serverSrc, /startMiaServer/);
  });

  await test("index.js exports startMiaServer and guards direct execution", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /module\.exports[\s\S]*startMiaServer/);
    assert.match(indexSrc, /if \(require\.main === module\)/);
    assert.match(indexSrc, /bootstrapPlatformBridges\(\)/);
    assert.match(indexSrc, /MIA_SERVER_BOOTSTRAP_CTX/);
    assert.match(indexSrc, /serverBootstrapRuntime\(\)\.startMiaServer/);
  });

  await test("package.json start uses server.js", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.match(pkg.scripts.start, /server\.js/);
  });

  await test("createMiaServerStarter exposes startMiaServer", () => {
    const api = createMiaServerStarter({
      app: { listen() {} },
      PORT: 3000,
      BIND_HOST: "127.0.0.1",
      portGuardModule: {},
      runtimeSecurityModule: {},
      overlayStaticDir: "/tmp",
      MIA_SPLIT_OVERLAYS: () => ({}),
      warnOnDeadObsSceneFiles: () => {},
      connectObs: async () => {},
      selfRestartModule: {},
      emitStartupOverlay: async () => {},
      miaPaintWs: {},
      miaPaintBridge: {},
      markStreamSessionEnded: () => {}
    });
    assert.equal(typeof api.startMiaServer, "function");
  });

  await test("resolvePipelineAction uses fallback when shadow empty", async () => {
    const resolved = await resolvePipelineAction({
      shadowResult: { ok: false },
      eventType: "GIFT",
      normalized: { giftName: "Rose" },
      buildSupportAction: () => ({ ok: true, tier: "T1" }),
      buildDirectChatAction: async () => null,
      normalizeActionResult: (_shadow, fallback) => fallback
    });
    assert.equal(resolved.fallbackUsed, true);
    assert.equal(resolved.actionResult.tier, "T1");
  });

  await test("shadowProducedAction detects actionResult", () => {
    assert.equal(shadowProducedAction({ ok: true, actionResult: { tier: "T1" } }), true);
    assert.equal(shadowProducedAction({ ok: false }), false);
  });

  console.log("server_bootstrap_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
