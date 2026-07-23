"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  runObsStreamReady,
  summarizeStartup,
  buildHeadline
} = require("../scripts/obs_stream_ready");
const { runObsVerifyStreamReady } = require("../scripts/obs_verify_stream_ready");

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
  console.log("\n---- SPRINT I CONTRACT ----\n");

  await test("package.json exposes obs:stream-ready", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.scripts["obs:stream-ready"]);
  });

  await test("obs_stream_ready exports runObsStreamReady", () => {
    assert.equal(typeof runObsStreamReady, "function");
  });

  await test("obs_verify_stream_ready exports runObsVerifyStreamReady", () => {
    assert.equal(typeof runObsVerifyStreamReady, "function");
  });

  await test("summarizeStartup maps readiness fields", () => {
    const mia = summarizeStartup({
      online: true,
      readinessPercent: 95,
      streamReady: true,
      streamReadyLabel: "Připravena streamovat",
      summary: { passed: 8, total: 9 }
    });
    assert.equal(mia.readinessPercent, 95);
    assert.equal(mia.streamReady, true);
    assert.match(mia.streamReadyLabel, /Připravena/);
  });

  await test("buildHeadline combines MIA and OBS summary", () => {
    const headline = buildHeadline(
      {
        online: true,
        readinessPercent: 100,
        streamReady: true,
        streamReadyLabel: "Připravena streamovat"
      },
      { ok: true, summary: { browserOverlays: "13/13" } }
    );
    assert.match(headline, /100%/);
    assert.match(headline, /13\/13/);
  });

  const kanon = fs.readFileSync(path.join(ROOT, "docs", "KANON_MIA_ALIGNMENT.md"), "utf8");
  await test("KANON_MIA_ALIGNMENT mentions obs:stream-ready", () => {
    assert.match(kanon, /obs:stream-ready/);
  });

  if (process.exitCode) {
    throw new Error("sprint_i_contract failed");
  }
  console.log("\nsprint_i_contract OK\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
