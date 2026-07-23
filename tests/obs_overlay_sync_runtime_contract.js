"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
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
  await test("createObsOverlaySyncWrappers delegates to sync api", async () => {
    let called = "";
    const wrappers = createObsOverlaySyncWrappers(() => ({
      resolveObsOverlayMode: () => {
        called = "mode";
        return "split";
      },
      auditObsMiaBrowserSources: async () => ({ ok: true }),
      refreshObsMiaBrowserSources: async () => ({ refreshed: [] })
    }));

    assert.equal(wrappers.resolveObsOverlayMode(), "split");
    assert.equal(called, "mode");
    assert.deepEqual(await wrappers.auditObsMiaBrowserSources(), { ok: true });
  });

  await test("index.js uses initObsOverlaySyncRuntime for overlay helpers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function initObsOverlaySyncRuntime\(\)/);
    assert.match(indexSrc, /MIA_OBS_OVERLAY_SYNC_RUNTIME/);
    assert.match(indexSrc, /obsOverlaySyncRuntime\(\)\.resolveObsOverlayMode/);
    assert.doesNotMatch(indexSrc, /function obsOverlaySyncWrappers\(\)/);
    assert.doesNotMatch(indexSrc, /function initObsOverlaySync\(\)/);
    assert.doesNotMatch(indexSrc, /return obsOverlaySync\(\)\.resolveObsOverlayMode/);
  });

  console.log("obs_overlay_sync_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
