"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildObsOverlaySyncWrappersCtx } = require("../scripts/MIA_OBS_OVERLAY_SYNC_WRAPPERS_CTX");
const { createObsOverlaySyncWrappers } = require("../scripts/MIA_OBS_OVERLAY_SYNC_RUNTIME");

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
  await test("buildObsOverlaySyncWrappersCtx passes live getApi getter", () => {
    let mode = "split";
    const getApi = () => ({
      resolveObsOverlayMode: () => mode
    });
    const ctx = buildObsOverlaySyncWrappersCtx({
      sync: { getApi }
    });
    assert.equal(ctx.getApi().resolveObsOverlayMode(), "split");
    mode = "single";
    assert.equal(ctx.getApi().resolveObsOverlayMode(), "single");
  });

  await test("createObsOverlaySyncWrappers accepts buildObsOverlaySyncWrappersCtx shape", () => {
    const wrappers = createObsOverlaySyncWrappers(
      buildObsOverlaySyncWrappersCtx({
        sync: {
          getApi: () => ({
            resolveObsOverlayMode: () => "split",
            auditObsMiaBrowserSources: async () => ({ ok: true })
          })
        }
      }).getApi
    );
    assert.equal(wrappers.resolveObsOverlayMode(), "split");
  });

  await test("index.js uses collectObsOverlaySyncWrappersBindingsHost and initObsOverlaySyncRuntime", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectObsOverlaySyncWrappersBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_WRAPPERS_HOST/);
    assert.match(indexSrc, /function initObsOverlaySyncRuntime\(\)/);
    assert.match(indexSrc, /obsOverlaySyncRuntime\(\)\.resolveObsOverlayMode/);
    assert.match(indexSrc, /getApi: obsOverlaySyncCoreRuntime/);
    assert.doesNotMatch(indexSrc, /createObsOverlaySyncWrappers\(obsOverlaySync\)/);
    assert.doesNotMatch(indexSrc, /function initObsOverlaySync\(\)/);
  });

  console.log("obs_overlay_sync_wrappers_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
