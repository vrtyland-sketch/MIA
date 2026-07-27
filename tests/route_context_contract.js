"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createRouteContextRuntime } = require("../scripts/MIA_ROUTE_CONTEXT");

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
  await test("createRouteContextRuntime exposes route context API", () => {
    const api = createRouteContextRuntime({
      overlayStateModule: { createOverlayState: () => ({ chatFeed: [] }) },
      getOverlayState: () => ({}),
      setOverlayState: () => {},
      safeRequire: () => ({}),
      getPort: () => 3000
    });
    assert.equal(typeof api.buildMiaRouteContext, "function");
    assert.equal(typeof api.resetOverlayState, "function");
  });

  await test("resetOverlayState replaces overlay state", () => {
    let state = { miaOverlay: { text: "old" } };
    createRouteContextRuntime({
      overlayStateModule: {
        createOverlayState: () => ({ miaOverlay: null, kojnozoutOverlay: null, chatFeed: [] })
      },
      getOverlayState: () => state,
      setOverlayState: (next) => {
        state = next;
      },
      safeRequire: () => ({}),
      getPort: () => 3000
    }).resetOverlayState();

    assert.equal(state.miaOverlay, null);
    assert.deepEqual(state.chatFeed, []);
  });

  await test("buildMiaRouteContext wires core handlers", () => {
    const handleIngest = async () => ({ ok: true });
    const ctx = createRouteContextRuntime({
      overlayStateModule: {},
      getOverlayState: () => ({}),
      setOverlayState: () => {},
      safeRequire: () => ({}),
      getPort: () => 3000,
      getObsConnected: () => true,
      getObs: () => ({}),
      buildStartupCheckPayload: () => ({ ok: true }),
      buildHealthPayload: () => ({ ok: true }),
      buildDiagnosePayload: async () => ({ ok: true }),
      handleIngest,
      handleAudienceIngest: handleIngest,
      ingestAuthGuard: () => {},
      localAdminGuard: () => {},
      debugRouteGuard: () => {},
      resetOverlayState: () => {}
    }).buildMiaRouteContext();

    assert.equal(ctx.PORT, 3000);
    assert.equal(ctx.handleIngest, handleIngest);
    assert.equal(typeof ctx.resetOverlayState, "function");
    assert.equal(typeof ctx.buildObsLiveManifest, "function");
  });

  await test("index.js wires routeContextBoot with thin buildMiaRouteContext wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_BOOT/);
    assert.match(indexSrc, /createRouteContextBoot/);
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT/);
    assert.match(
      indexSrc,
      /function buildMiaRouteContext\(\) \{\s*return routeContextBoot\.buildMiaRouteContext\(\);/
    );
    assert.doesNotMatch(indexSrc, /speakMiaShowcaseLine\s*\n\s*\};\s*\n\}\s*\n\nlet obsPostConnectRuntimeApi/);
  });

  console.log("route_context_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
