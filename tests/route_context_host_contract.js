"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRouteContextHost } = require("../scripts/MIA_ROUTE_CONTEXT_HOST");
const { buildRouteContextCtx } = require("../scripts/MIA_ROUTE_CONTEXT_CTX");

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
  await test("buildRouteContextHost assembles grouped host from bindings", () => {
    const executeOverlay = async () => ({});
    const host = buildRouteContextHost({
      overlayStateModule: { id: "overlay" },
      platformArenaModule: { id: "arena" },
      miaPaintBridge: { id: "paint" },
      miaPaintWs: { id: "ws" },
      getOverlayState: () => ({ chatFeed: [] }),
      getPort: () => 3000,
      executeOverlay,
      safeRequire: () => ({}),
      runtimeConfig: {},
      writeLog: () => {},
      safeString: (v) => String(v ?? "")
    });

    assert.equal(host.modules.overlayStateModule.id, "overlay");
    assert.equal(host.routes.executeOverlay, executeOverlay);
    assert.equal(host.state.getPort(), 3000);
  });

  await test("buildRouteContextHost chains into buildRouteContextCtx", () => {
    const ctx = buildRouteContextCtx(
      buildRouteContextHost({
        overlayStateModule: { id: "overlay" },
        platformArenaModule: { id: "arena" },
        miaPaintBridge: { id: "paint" },
        miaPaintWs: { id: "ws" },
        getOverlayState: () => ({}),
        getPort: () => 3000,
        safeRequire: () => ({}),
        runtimeConfig: {},
        writeLog: () => {},
        safeString: (v) => String(v ?? "")
      })
    );

    assert.equal(ctx.paintBridge.id, "paint");
    assert.equal(ctx.getPort(), 3000);
  });

  await test("buildRouteContextHost resolves interpreter via getter", () => {
    const interpreter = { id: "interpreter" };
    const host = buildRouteContextHost({
      getInterpreterRuntime: () => interpreter,
      safeRequire: () => ({}),
      runtimeConfig: {},
      writeLog: () => {},
      safeString: (v) => String(v ?? "")
    });

    assert.equal(host.modules.translationRuntime.id, "interpreter");
    assert.equal(host.modules.getInterpreterRuntime(), interpreter);
  });

  await test("index.js uses collectRouteContextBindingsHost and buildRouteContextHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRouteContextBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_HOST/);
    assert.match(indexSrc, /buildHost\(collectRouteContextBindingsHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /modules: \{\s*overlayStateModule,\s*platformArenaModule,/);
    assert.match(indexSrc, /getInterpreterRuntime: interpreterRuntime/);
  });

  console.log("route_context_host_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
