"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("buildRouteContextCtx flattens grouped host", () => {
    const executeOverlay = async () => ({});
    const ctx = buildRouteContextCtx({
      modules: {
        overlayStateModule: { id: "overlay" },
        platformArenaModule: { id: "arena" },
        miaPaintBridge: { id: "paint" },
        miaPaintWs: { id: "ws" }
      },
      state: {
        getOverlayState: () => ({ chatFeed: [] }),
        getPort: () => 3000
      },
      routes: { executeOverlay, buildHealthPayload: () => ({ ok: true }) },
      obs: { safeObsCall: async () => ({}) },
      media: { videoEngine: { id: "video" } },
      koj: { scheduleWorldSave: () => {} },
      core: {
        safeRequire: () => ({}),
        runtimeConfig: {},
        writeLog: () => {},
        safeString: (v) => String(v ?? "")
      }
    });

    assert.equal(ctx.overlayStateModule.id, "overlay");
    assert.equal(ctx.platformArenaModule.id, "arena");
    assert.equal(ctx.paintBridge.id, "paint");
    assert.equal(ctx.executeOverlay, executeOverlay);
    assert.equal(ctx.getPort(), 3000);
  });

  await test("index.js uses collectRouteContextBindingsHost and buildRouteContextHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectRouteContextBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_CTX/);
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_HOST/);
    assert.match(indexSrc, /buildHost\(collectRouteContextBindingsHost\(\)\)/);
    assert.match(indexSrc, /buildCtx\(collectRouteContextHost\(\)\)/);
    assert.doesNotMatch(indexSrc, /function getRouteContextCtx\(\)/);
    assert.match(indexSrc, /getStreamState,/);
    assert.match(indexSrc, /getInterpreterRuntime: interpreterRuntime/);
    assert.doesNotMatch(indexSrc, /streamState: getStreamState\(\)/);
    assert.doesNotMatch(indexSrc, /paintBridge: miaPaintBridge/);
  });

  console.log("route_context_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
