"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { pingHealth, waitForHealth } = require("../scripts/mia_health");
const { formatHealthLine } = require("../scripts/mia_restart");

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
  console.log("\n---- SPRINT J CONTRACT ----\n");

  await test("mia_health exports pingHealth and waitForHealth", () => {
    assert.equal(typeof pingHealth, "function");
    assert.equal(typeof waitForHealth, "function");
  });

  await test("mia_restart waits for health after spawn", () => {
    const restart = fs.readFileSync(path.join(ROOT, "scripts", "mia_restart.js"), "utf8");
    assert.match(restart, /waitForHealth/);
    assert.match(restart, /formatHealthLine/);
  });

  await test("formatHealthLine includes obsConnected when present", () => {
    const line = formatHealthLine(3000, {
      waitedMs: 120,
      data: { ok: true, obsConnected: true }
    });
    assert.match(line, /Health OK/);
    assert.match(line, /obsConnected: true/);
  });

  await test("waitForHealth returns quickly on free port", async () => {
    const result = await waitForHealth(31998, { timeoutMs: 600, intervalMs: 150 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "health_timeout");
  });

  await test(".env.example documents MIA_RESTART_HEALTH_MS", () => {
    const env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    assert.match(env, /MIA_RESTART_HEALTH_MS/);
  });

  await test("mia_stop only runs CLI when executed directly", () => {
    const stop = fs.readFileSync(path.join(ROOT, "scripts", "mia_stop.js"), "utf8");
    const mainIdx = stop.indexOf("async function main()");
    const guardIdx = stop.indexOf("require.main === module");
    assert.ok(guardIdx > mainIdx, "mia_stop must guard main()");
  });

  if (process.exitCode) {
    throw new Error("sprint_j_contract failed");
  }
  console.log("\nsprint_j_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
