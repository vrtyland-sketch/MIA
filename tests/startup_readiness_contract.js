"use strict";

const assert = require("assert/strict");
const { buildStartupCheck, computeReadiness } = require("../scripts/MIA_STARTUP_CHECK");

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

console.log("\n---- STARTUP READINESS CONTRACT ----\n");

test("buildStartupCheck returns readiness percent without preflight", () => {
  const report = buildStartupCheck({
    port: 3000,
    obsConnected: true,
    ttsEnabled: true,
    videoSnapshot: { tierSources: { T1: [1, 2, 3, 4] }, pendingJobs: 0 },
    mediaCatalog: { obsAssignments: new Array(31), totalPhotos: 10, totalVideos: 10 },
    kickBridgeEnabled: false,
    includePreflight: false
  });

  assert.equal(report.phase, "done");
  assert.equal(report.preflightSuites.length, 0);
  assert.ok(report.readinessPercent >= 80);
  assert.equal(report.streamReady, true);
  assert.match(report.streamReadyLabel, /Připravena/);
});

test("stream not ready when OBS offline", () => {
  const report = buildStartupCheck({
    port: 3000,
    obsConnected: false,
    ttsEnabled: true,
    videoSnapshot: { tierSources: { T1: [1, 2, 3, 4] }, pendingJobs: 0 },
    mediaCatalog: { obsAssignments: new Array(31), totalPhotos: 10, totalVideos: 10 },
    includePreflight: false
  });

  assert.equal(report.streamReady, false);
  assert.ok(report.readinessPercent < 100);
});

test("computeReadiness weights sum to 100", () => {
  const checks = [
    { id: "server", label: "MIA", ok: true, detail: "" },
    { id: "obs", label: "OBS", ok: true, detail: "" },
    { id: "video_engine", label: "Video", ok: true, detail: "" },
    { id: "media_catalog", label: "Media", ok: true, detail: "" },
    { id: "overlays", label: "Overlay", ok: true, detail: "" },
    { id: "tts", label: "TTS", ok: true, detail: "" },
    { id: "media_files", label: "Files", ok: true, detail: "" },
    { id: "kick_bridge", label: "Kick", ok: true, detail: "" },
    { id: "ingest_auth", label: "Auth", ok: true, detail: "" }
  ];
  const readiness = computeReadiness(checks, { kickBridgeEnabled: false });
  assert.equal(readiness.readinessPercent, 100);
  assert.equal(readiness.streamReady, true);
});

if (process.exitCode) {
  throw new Error("startup_readiness_contract failed");
}
console.log("\nstartup_readiness_contract OK\n");
