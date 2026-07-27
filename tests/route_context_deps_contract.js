"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildRouteContextDeps } = require("../scripts/MIA_ROUTE_CONTEXT_DEPS");

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
  await test("buildRouteContextDeps adds delivery voice bridges", () => {
    let bumped = false;
    let voiceState = null;

    const deps = buildRouteContextDeps({
      deliveryRuntime: () => ({
        bumpVoicePlaybackSeq: () => {
          bumped = true;
          return 7;
        },
        setVoicePlaybackState: (next) => {
          voiceState = next;
        }
      }),
      getDuelState: () => ({ active: true })
    });

    assert.equal(deps.bumpVoicePlaybackSeq(), 7);
    assert.equal(bumped, true);
    deps.setVoicePlaybackState({ speaker: "mia" });
    assert.deepEqual(voiceState, { speaker: "mia" });
    assert.equal(deps.getDuelStateActive(), true);
  });

  await test("buildRouteContextDeps resolves interpreter via getter", () => {
    const interpreter = { id: "interpreter" };
    const deps = buildRouteContextDeps({
      getInterpreterRuntime: () => interpreter,
      deliveryRuntime: () => ({
        bumpVoicePlaybackSeq: () => 1,
        setVoicePlaybackState: () => {}
      }),
      getDuelState: () => ({ active: false })
    });

    assert.equal(deps.translationRuntime.id, "interpreter");
    assert.equal(deps.getInterpreterRuntime(), interpreter);
  });

  await test("index.js uses MIA_ROUTE_CONTEXT_BOOT and buildRouteContextDeps", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    const bootSrc = fs.readFileSync(path.join(ROOT, "scripts/MIA_ROUTE_CONTEXT_BOOT.js"), "utf8");
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_BOOT/);
    assert.match(indexSrc, /MIA_ROUTE_CONTEXT_DEPS/);
    assert.match(bootSrc, /buildDeps\(buildCtx\(collectHost\(\)\)\)/);
    assert.doesNotMatch(indexSrc, /function getRouteContextCtx\(\)/);
    assert.doesNotMatch(indexSrc, /getDuelStateActive: \(\) => Boolean\(kojnozoutDuelState/);
  });

  console.log("route_context_deps_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
