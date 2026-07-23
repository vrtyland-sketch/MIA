"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  SUITES,
  FAST_SUITE_NAMES,
  SLOW_SUITE_NAMES,
  resolvePreflightMode,
  selectSuites,
  runAllSuites
} = require("../scripts/run_preflight_tests");

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
  console.log("\n---- SPRINT G CONTRACT ----\n");

  await test("fast mode excludes slow video suites", () => {
    const fast = selectSuites("fast");
    const fastNames = new Set(fast.map((row) => row.name));
    assert.ok(!fastNames.has("video_timing"));
    assert.ok(!fastNames.has("video_rotation"));
    assert.ok(fastNames.has("runtime_smoke"));
    assert.ok(fastNames.has("mia_obs_hands"));
    assert.strictEqual(fast.length, FAST_SUITE_NAMES.length);
  });

  await test("full mode keeps all suites", () => {
    assert.strictEqual(selectSuites("full").length, SUITES.length);
  });

  await test("resolvePreflightMode honors flags", () => {
    assert.strictEqual(resolvePreflightMode(["node", "x", "--fast"], {}), "fast");
    assert.strictEqual(resolvePreflightMode(["node", "x", "--full"], {}), "full");
    assert.strictEqual(resolvePreflightMode(["node", "x"], { MIA_PREFLIGHT_MODE: "fast" }), "fast");
  });

  await test("runAllSuites fast parallel finishes with metadata", async () => {
    const report = await runAllSuites({ mode: "fast", parallel: true });
    assert.strictEqual(report.mode, "fast");
    assert.strictEqual(report.parallel, true);
    assert.ok(Array.isArray(report.skippedSlow));
    assert.ok(report.skippedSlow.includes("video_timing"));
    assert.strictEqual(report.total, FAST_SUITE_NAMES.length);
  });

  await test("package.json has fast and full preflight scripts", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.match(pkg.scripts["test:preflight"], /--full/);
    assert.match(pkg.scripts["test:preflight:fast"], /--fast/);
  });

  await test(".env.example documents MIA_PREFLIGHT_MODE", () => {
    const env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    assert.match(env, /MIA_PREFLIGHT_MODE/);
  });

  await test("index startup uses fast preflight by default", () => {
    const index = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(index, /resolveStartupPreflightArgs/);
    assert.match(index, /--fast/);
  });

  if (process.exitCode) {
    throw new Error("sprint_g_contract failed");
  }
  console.log("\nsprint_g_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
