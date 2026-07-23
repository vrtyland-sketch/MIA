"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createWorldModeRuntime } = require("../scripts/MIA_WORLD_MODE_RUNTIME");

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
  await test("createWorldModeRuntime exposes applyWorldModeChange", () => {
    const api = createWorldModeRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      writeLog: () => {},
      awayModeModule: {},
      safeObsCall: async () => ({}),
      runtimeConfig: {},
      getOutputState: () => ({}),
      getEcosystemState: () => ({}),
      overlayStateCache: null
    });
    assert.equal(typeof api.applyWorldModeChange, "function");
  });

  await test("applyWorldModeChange updates world mode state", async () => {
    const outputState = { worldMode: "default" };
    const ecosystemState = { worldMode: "default" };
    const events = [];

    const result = await createWorldModeRuntime({
      safeString: (v, d) => String(v ?? d ?? ""),
      writeLog: (_file, payload) => events.push(payload),
      awayModeModule: {
        normalizeWorldMode: (mode) => String(mode).toLowerCase(),
        applyWorldModeTransition: async (mode) => ({ scene: mode })
      },
      safeObsCall: async () => ({}),
      runtimeConfig: {},
      getOutputState: () => outputState,
      getEcosystemState: () => ecosystemState,
      overlayStateCache: { invalidate: () => {} }
    }).applyWorldModeChange("NEJSEM_TU", "test");

    assert.equal(result.ok, true);
    assert.equal(outputState.worldMode, "nejsem_tu");
    assert.equal(ecosystemState.worldMode, "nejsem_tu");
    assert.equal(events[0].stage, "world_mode_changed");
  });

  await test("index.js wires worldModeRuntime without inline applyWorldModeTransition call", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initWorldModeRuntime/);
    assert.match(indexSrc, /MIA_WORLD_MODE_RUNTIME/);
    assert.match(indexSrc, /MIA_WORLD_MODE_CTX/);
    assert.match(indexSrc, /function applyWorldModeChange/);
    assert.doesNotMatch(indexSrc, /awayModeModule\.applyWorldModeTransition\(/);
  });

  console.log("world_mode_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
