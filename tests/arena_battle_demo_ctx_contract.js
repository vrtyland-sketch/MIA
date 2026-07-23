"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { buildArenaBattleDemoCtx } = require("../scripts/MIA_ARENA_BATTLE_DEMO_CTX");
const { createArenaBattleDemo } = require("../scripts/MIA_ARENA_BATTLE_DEMO");

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
  await test("buildArenaBattleDemoCtx flattens grouped host", () => {
    const platformArenaModule = { id: "arena" };
    const ctx = buildArenaBattleDemoCtx({
      modules: { platformArenaModule }
    });
    assert.equal(ctx.platformArenaModule, platformArenaModule);
  });

  await test("createArenaBattleDemo accepts module from buildArenaBattleDemoCtx", () => {
    const platformArenaModule = {
      createArenaState: () => ({ teams: [] })
    };
    const api = createArenaBattleDemo(
      buildArenaBattleDemoCtx({ modules: { platformArenaModule } }).platformArenaModule
    );
    assert.equal(typeof api.start, "function");
  });

  await test("index.js uses collectArenaBattleDemoBindingsHost and buildArenaBattleDemoHost", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /function collectArenaBattleDemoBindingsHost\(\)/);
    assert.match(indexSrc, /MIA_ARENA_BATTLE_DEMO_HOST/);
    assert.match(indexSrc, /function initArenaBattleDemoRuntime\(\)/);
    assert.doesNotMatch(indexSrc, /function initArenaBattleDemo\(\)/);
    assert.doesNotMatch(indexSrc, /createArenaBattleDemo\(platformArenaModule\)/);
  });

  console.log("arena_battle_demo_ctx_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
