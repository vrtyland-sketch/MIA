"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsOverlayRendererCtx } = require("../scripts/MIA_OBS_OVERLAY_RENDERER_CTX");
const { createObsOverlayRenderer } = require("../renderers/obs_overlay_render");

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
  await test("buildObsOverlayRendererCtx passes live obs getters", () => {
    let connected = false;
    const getObs = () => ({ id: "obs" });
    const ctx = buildObsOverlayRendererCtx({
      core: { runtimeConfig: {} },
      obs: {
        getObs,
        isObsConnected: () => connected,
        safeObsCall: async () => ({ ok: true })
      }
    });
    assert.equal(ctx.getObs().id, "obs");
    assert.equal(ctx.isObsConnected(), false);
    connected = true;
    assert.equal(ctx.isObsConnected(), true);
  });

  await test("createObsOverlayRenderer accepts buildObsOverlayRendererCtx shape", () => {
    const api = createObsOverlayRenderer(
      buildObsOverlayRendererCtx({
        core: { runtimeConfig: {} },
        obs: {
          getObs: () => null,
          isObsConnected: () => false,
          safeObsCall: async () => ({ ok: true })
        }
      })
    );
    assert.equal(typeof api.render, "function");
  });

  await test("index.js uses collectObsOverlayRendererBindingsHost and buildObsOverlayRendererHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsOverlayRendererBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_RENDERER_HOST/);
    assert.match(indexSrc, /buildCtx\(collectObsOverlayRendererHost\(\)\)/);
    assert.match(indexSrc, /function initObsOverlayRendererRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initObsOverlayRenderer\(\)/);
    assert.doesNotMatch(indexSrc, /createObsOverlayRenderer\(\{\s*runtimeConfig,/);
  });

  console.log("obs_overlay_renderer_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
