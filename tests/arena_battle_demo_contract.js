"use strict";

const assert = require("assert/strict");
const { createArenaBattleDemo, DEMO_SCRIPT } = require("../scripts/MIA_ARENA_BATTLE_DEMO");
const platformArena = require("../scripts/MIA_PLATFORM_ARENA");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err?.stack || err);
    process.exitCode = 1;
  }
}

console.log("\n---- ARENA BATTLE DEMO CONTRACT ----\n");

test("demo script covers all four platforms", () => {
  const platforms = new Set(DEMO_SCRIPT.map((s) => s.platform));
  assert.equal(platforms.size, 4);
  assert.ok(DEMO_SCRIPT.length >= 4);
});

test("demo start pushes battle actions", () => {
  const demo = createArenaBattleDemo(platformArena);
  let state = platformArena.createArenaState();
  const status = demo.start({ intervalMs: 999999, durationSec: 120 }, {
    getState: () => state,
    setState: (next) => {
      state = next;
    }
  });
  assert.equal(status.active, true);
  assert.ok(state.duel?.active);
  assert.ok((state.battle?.actions || []).length >= 1);
  demo.stop();
  assert.equal(demo.status().active, false);
});

if (!process.exitCode) {
  console.log("\narena_battle_demo_contract: all passed\n");
}
