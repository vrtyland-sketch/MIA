"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { runLivePrep } = require("../scripts/live_prep");

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
  console.log("\n---- SPRINT L CONTRACT ----\n");

  await test("package.json exposes live:prep", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.scripts["live:prep"]);
  });

  await test("live_prep exports runLivePrep", () => {
    assert.equal(typeof runLivePrep, "function");
  });

  await test("live_prep script defines sequential steps", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "live_prep.js"), "utf8");
    assert.match(src, /obs:prepare-tiktok/);
    assert.match(src, /obs:ensure-voice/);
    assert.match(src, /obs:stream-ready/);
    assert.match(src, /--skip-restart/);
  });

  if (process.exitCode) {
    throw new Error("sprint_l_contract failed");
  }
  console.log("\nsprint_l_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
