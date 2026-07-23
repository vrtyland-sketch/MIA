"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { formatHumanReport } = require("../scripts/obs_stream_ready");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- SPRINT K CONTRACT ----\n");

test("obs:stream-ready supports --human in source", () => {
  const src = fs.readFileSync(path.join(ROOT, "scripts", "obs_stream_ready.js"), "utf8");
  assert.match(src, /--human/);
  assert.match(src, /formatHumanReport/);
});

test("formatHumanReport prints Czech go-live summary", () => {
  const text = formatHumanReport({
    ok: true,
    headline: "100% · Připravena streamovat · OBS OK · browser 13/13",
    mia: { readinessPercent: 100, streamReadyLabel: "Připravena streamovat" },
    obs: { summary: { passed: 53, failed: 0, browserOverlays: "13/13" } },
    fixes: []
  });
  assert.match(text, /GO-LIVE/);
  assert.match(text, /PŘIPRAVENO/);
  assert.match(text, /13\/13/);
});

if (process.exitCode) {
  throw new Error("sprint_k_contract failed");
}
console.log("\nsprint_k_contract OK\n");
