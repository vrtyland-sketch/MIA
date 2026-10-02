"use strict";

const assert = require("assert/strict");
const {
  buildStartupCheck,
  computeReadiness,
  READINESS_WEIGHTS
} = require("../scripts/MIA_STARTUP_CHECK");
const { inspectLiveKojVisuals } = require("../scripts/MIA_KOJNOZROUT_ASSETS");

const READY_VISUALS = {
  ok: true,
  liveProductionArtReady: true,
  fallbackAvailable: true,
  detail: "live production art ready"
};

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
    includePreflight: false,
    kojVisuals: READY_VISUALS
  });

  assert.equal(report.phase, "done");
  assert.equal(report.preflightSuites.length, 0);
  assert.ok(report.readinessPercent >= 80);
  assert.equal(report.streamReady, true);
  assert.match(report.streamReadyLabel, /Připravena/);
  const visuals = report.checks.find((row) => row.id === "koj_visuals");
  assert.equal(visuals.ok, true);
  assert.equal(visuals.detail, "live production art ready");
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

test("stream not ready when live Koj art is missing", () => {
  const report = buildStartupCheck({
    port: 3000,
    obsConnected: true,
    ttsEnabled: true,
    videoSnapshot: { tierSources: { T1: [1, 2, 3, 4] }, pendingJobs: 0 },
    mediaCatalog: { obsAssignments: new Array(31), totalPhotos: 10, totalVideos: 10 },
    includePreflight: false,
    kojVisuals: {
      ok: false,
      liveProductionArtReady: false,
      fallbackAvailable: true,
      detail: "Koj visuals missing: moods, pose catalog, props"
    }
  });
  const visuals = report.checks.find((row) => row.id === "koj_visuals");
  assert.equal(visuals.ok, false);
  assert.equal(visuals.detail, "Koj visuals missing: moods, pose catalog, props");
  assert.equal(report.streamReady, false);
  assert.match(report.streamReadyLabel, /ne připravena/);
});

test("startup koj_visuals follows the live asset inspector", () => {
  const live = inspectLiveKojVisuals();
  const report = buildStartupCheck({
    port: 3000,
    obsConnected: true,
    ttsEnabled: true,
    videoSnapshot: { tierSources: { T1: [1, 2, 3, 4] }, pendingJobs: 0 },
    mediaCatalog: { obsAssignments: new Array(31), totalPhotos: 10, totalVideos: 10 },
    includePreflight: false
  });
  const visuals = report.checks.find((row) => row.id === "koj_visuals");
  assert.equal(visuals.ok, live.ok === true);
  assert.equal(visuals.detail, live.detail);
  if (live.ok !== true) {
    assert.equal(report.streamReady, false);
    assert.equal(live.liveProductionArtReady, false);
    assert.equal(live.fallbackAvailable, true);
  }
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
    { id: "ingest_auth", label: "Auth", ok: true, detail: "" },
    { id: "koj_visuals", label: "Koj visuals", ok: true, detail: "live production art ready" }
  ];
  const weightSum = Object.values(READINESS_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.equal(weightSum, 100);
  const readiness = computeReadiness(checks, { kickBridgeEnabled: false });
  assert.equal(readiness.readinessPercent, 100);
  assert.equal(readiness.streamReady, true);
});

if (process.exitCode) {
  throw new Error("startup_readiness_contract failed");
}
console.log("\nstartup_readiness_contract OK\n");
