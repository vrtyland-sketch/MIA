"use strict";

const assert = require("assert/strict");
const { summarizeVision, buildHeadline } = require("../scripts/obs_stream_ready");

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

console.log("\n---- SPRINT N CONTRACT ----\n");

test("summarizeVision treats disabled vision as ok", () => {
  const v = summarizeVision(null);
  assert.equal(v.ok, true);
  assert.equal(v.enabled, false);
});

test("summarizeVision requires running when enabled", () => {
  const on = summarizeVision({
    layoutMode: "idle",
    vision: { enabled: true, running: true, lastMode: "idle", lastPlatform: "tiktok" }
  });
  assert.equal(on.ok, true);
  const off = summarizeVision({
    vision: { enabled: true, running: false }
  });
  assert.equal(off.ok, false);
});

test("buildHeadline includes vision mode when active", () => {
  const line = buildHeadline(
    { online: true, readinessPercent: 100, streamReadyLabel: "Připravena streamovat" },
    { ok: true, summary: { browserOverlays: "13/13" } },
    { enabled: true, running: true, layoutMode: "idle", platform: "kick" }
  );
  assert.match(line, /Vision idle/);
});

if (process.exitCode) {
  throw new Error("sprint_n_contract failed");
}
console.log("\nsprint_n_contract OK\n");
