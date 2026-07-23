"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");
const liveLip = require("../mia-output-overlay/lib/mia-live-lip");

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
  await test("catalog lists live_viseme_speech as 13w", () => {
    const def = graphicsStudio.getCommand("live_viseme_speech");
    assert.equal(def.phase, "13w");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "live_viseme_speech" && m.phase === "13w"));
  });

  await test("visemeToSpeakFrameIndex maps closed→open", () => {
    assert.equal(paintCore.visemeToSpeakFrameIndex({ mouthOpen: 0 }, 4), 0);
    assert.equal(paintCore.visemeToSpeakFrameIndex({ mouthOpen: 0.1 }, 4), 0);
    assert.equal(paintCore.visemeToSpeakFrameIndex({ mouthOpen: 0.5 }, 4), 2);
    assert.equal(paintCore.visemeToSpeakFrameIndex({ mouthOpen: 0.95 }, 4), 3);
    assert.equal(liveLip.visemeToSpeakFrameIndex({ mouthOpen: 0.95 }, 4), 3);
  });

  await test("buildLiveLipTrackFromText yields timed keyframes", () => {
    const track = paintCore.buildLiveLipTrackFromText("AHOJ MIA", { durationMs: 1200 });
    assert.equal(track.phase, "13w");
    assert.equal(track.provider, "text_viseme_v1");
    assert.ok(track.keyframes.length >= 4);
    assert.ok(track.keyframes.some((k) => k.viseme === "SIL" || k.viseme === "sil" || k.viseme === "M"));
    const mid = paintCore.sampleVisemeKeyframes(track.keyframes, 200);
    assert.ok(typeof mid.mouthOpen === "number");
    const browser = liveLip.buildLiveLipTrackFromText("AHOJ", { durationMs: 800 });
    assert.equal(browser.phase, "13w");
    assert.ok(browser.keyframes.length >= 2);
  });

  await test("speech overlay wires live lip lib + living-robot pose (no carousel)", () => {
    const html = fs.readFileSync(path.join(OVERLAY, "speech-overlay.html"), "utf8");
    assert.match(html, /mia-live-lip\.js/);
    assert.match(html, /applyMiaPresencePose|speakFace|MIA_SPEAK/);
    assert.match(html, /mia-live-presence\.js|MiaLivePresence/);
    assert.match(html, /MiaHoloMotion|mia-holo-motion/);
    assert.doesNotMatch(html, /startMiaSpeakLoop/);
    const lib = fs.readFileSync(path.join(OVERLAY, "lib", "mia-live-lip.js"), "utf8");
    assert.match(lib, /buildLiveLipTrackFromText/);
    assert.match(lib, /visemeToSpeakFrameIndex/);
    const runtime = fs.readFileSync(path.join(OVERLAY, "lib", "mia-body-part-runtime.js"), "utf8");
    assert.match(runtime, /sampleLipFrameUrl|lipTrack/);
  });

  await test("delivery attaches lipTrack on TTS playback", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "MIA_DELIVERY_RUNTIME.js"), "utf8");
    assert.match(src, /buildLiveLipTrackFromText/);
    assert.match(src, /lipTrack/);
  });

  await test("dashboard bank label includes 13w", () => {
    const dash = fs.readFileSync(path.join(OVERLAY, "mia-streamer-dashboard.html"), "utf8");
    assert.match(dash, /12x[–-]13[w-z]|12x-13[w-z]/);
  });

  console.log("mia_graphics_studio_13w_live_viseme_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
