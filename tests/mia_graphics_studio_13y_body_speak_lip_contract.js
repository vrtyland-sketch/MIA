"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");

const ROOT = path.resolve(__dirname, "..");
const OVERLAY = path.join(ROOT, "mia-output-overlay");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("catalog lists body_speak_lip_parity as 13y", () => {
    const def = graphicsStudio.getCommand("body_speak_lip_parity");
    assert.equal(def.phase, "13y");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "body_speak_lip_parity" && m.phase === "13y"));
  });

  await test("bodyLiveSync publishes lipTrack into body state", () => {
    graphicsStudio.resetBodyState();
    graphicsStudio.resetLiveSyncSignature();
    const track = paintCore.buildLiveLipTrackFromText("AHOJ", { durationMs: 1000 });
    const now = Date.now();
    const synced = graphicsStudio.syncFromOverlayPublic({
      voicePlayback: {
        speaker: "mia",
        playbackId: 42,
        textPreview: "AHOJ",
        updatedAt: now,
        holdUntilTs: now + 5000,
        lipTrack: track
      }
    });
    assert.ok(synced);
    assert.equal(synced.speaking, true);
    assert.ok(synced.lipTrack?.keyframes?.length >= 2);
    assert.equal(synced.lipPlaybackId, 42);

    // provider upgrade must re-publish
    const ampTrack = {
      ...track,
      provider: "audio_amplitude_live_v1",
      phase: "13x"
    };
    const upgraded = graphicsStudio.syncFromOverlayPublic({
      voicePlayback: {
        speaker: "mia",
        playbackId: 42,
        textPreview: "AHOJ",
        updatedAt: now,
        holdUntilTs: now + 5000,
        lipTrack: ampTrack
      }
    });
    assert.ok(upgraded);
    assert.equal(upgraded.lipTrack.provider, "audio_amplitude_live_v1");
  });

  await test("body overlay + runtime wire 13y lip", () => {
    const html = fs.readFileSync(path.join(OVERLAY, "mia-body-part-overlay.html"), "utf8");
    assert.match(html, /mia-live-lip\.js/);
    const runtime = fs.readFileSync(path.join(OVERLAY, "lib", "mia-body-part-runtime.js"), "utf8");
    assert.match(runtime, /sampleLipFrameUrl/);
    assert.match(runtime, /applyLipFromPayload/);
    assert.match(runtime, /eyes\.lip/);
    assert.match(runtime, /MiaLivePresence/);
    const liveSync = fs.readFileSync(
      path.join(ROOT, "shared", "mia-graphics-studio", "bodyLiveSync.js"),
      "utf8"
    );
    assert.match(liveSync, /resolveLipTrackFromOverlay/);
    const dash = fs.readFileSync(path.join(OVERLAY, "mia-streamer-dashboard.html"), "utf8");
    assert.match(dash, /12x[–-]13y|12x[–-]13z/);
  });

  console.log("mia_graphics_studio_13y_body_speak_lip_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
