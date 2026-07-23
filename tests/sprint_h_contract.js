"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { describePortListener, waitForPortFree } = require("../scripts/MIA_PORT_GUARD");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(err && err.stack ? err.stack : err);
      process.exitCode = 1;
    }
  })();
}

async function run() {
  console.log("\n---- SPRINT H CONTRACT ----\n");

  await test("package.json exposes obs:apply-hands", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.scripts["obs:apply-hands"]);
  });

  await test("mia_stop uses describePortListener export", () => {
    const stop = fs.readFileSync(path.join(ROOT, "scripts", "mia_stop.js"), "utf8");
    assert.match(stop, /describePortListener/);
    assert.doesNotMatch(stop, /isPortAvailable\(PORT\)/);
  });

  await test("mia_restart waits for port free", () => {
    const restart = fs.readFileSync(path.join(ROOT, "scripts", "mia_restart.js"), "utf8");
    assert.match(restart, /waitForPortFree/);
    assert.match(restart, /stopMia/);
  });

  await test("MIA_PORT_GUARD exports waitForPortFree", async () => {
    const free = await waitForPortFree(30999, 500);
    assert.equal(free.ok, true);
  });

  await test("obs_apply_hands module exports applyObsHands", () => {
    const mod = require("../scripts/obs_apply_hands");
    assert.equal(typeof mod.applyObsHands, "function");
  });

  await test("describePortListener is a function", () => {
    assert.equal(typeof describePortListener, "function");
  });

  if (process.exitCode) {
    throw new Error("sprint_h_contract failed");
  }
  console.log("\nsprint_h_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
