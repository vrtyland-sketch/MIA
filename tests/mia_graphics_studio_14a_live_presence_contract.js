"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const presence = require("../mia-output-overlay/lib/mia-live-presence.js");

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
  await test("catalog lists live_presence as 14a", () => {
    const def = graphicsStudio.getCommand("live_presence");
    assert.equal(def.phase, "14a");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "live_presence" && m.phase === "14a"));
  });

  await test("live presence config — idle↔speak only (no wave carousel)", () => {
    assert.equal(presence.idleFace, presence.lipLadder[0]);
    assert.equal(presence.speakFace, presence.lipLadder[1]);
    assert.equal(presence.faces.idle, presence.lipLadder[0]);
    assert.equal(presence.faces.gift, presence.idleFace);
    assert.equal(presence.faces.wave, presence.idleFace);
    assert.equal(presence.lipLadder.length, 2);
    assert.ok(presence.lipTickMs >= 220);
    assert.ok(presence.lipHoldMs >= 280);
    assert.ok(presence.poseCrossfadeMs >= 200 && presence.poseCrossfadeMs <= 400);
    assert.match(String(presence.bust), /36-koj-unify/);
  });

  await test("speech + head runtime use shared presence", () => {
    const speech = fs.readFileSync(path.join(OVERLAY, "speech-overlay.html"), "utf8");
    const runtime = fs.readFileSync(path.join(OVERLAY, "lib", "mia-body-part-runtime.js"), "utf8");
    const partHtml = fs.readFileSync(path.join(OVERLAY, "mia-body-part-overlay.html"), "utf8");
    const motion = fs.readFileSync(path.join(OVERLAY, "lib", "mia-holo-motion.js"), "utf8");
    assert.match(speech, /mia-live-presence\.js/);
    assert.match(speech, /MiaLivePresence/);
    assert.match(speech, /mia-holo-motion\.js/);
    assert.match(speech, /MiaHoloMotion/);
    assert.match(speech, /holo-motion|miaMotion/);
    assert.match(speech, /body-hero-active[\s\S]*visibility:\s*hidden/);
    assert.match(speech, /PRESENCE\.bustUrl/);
    assert.match(speech, /holo-pose|miaPoseA/);
    assert.match(speech, /poseCrossfadeMs|POSE_FADE_MS/);
    assert.doesNotMatch(speech, /speak-face:not\(\.body-hero-active\)/);
    assert.doesNotMatch(speech, /holoBreatheSpeak/);
    assert.doesNotMatch(speech, /animation:\s*holoBreathe/);
    assert.doesNotMatch(speech, /animation:\s*holoFloat/);
    assert.doesNotMatch(speech, /startMiaSpeakLoop|speakTimer\s*=\s*setInterval/);
    assert.match(speech, /applyMiaPresencePose|speakFace|MIA_SPEAK/);
    assert.match(motion, /create\s*\(/);
    assert.match(motion, /servo|speakAmp|TICK_MS|LIVE_AMP/);
    assert.match(motion, /pulseGift|pulse\s*:/);
    assert.match(runtime, /MiaLivePresence/);
    assert.match(partHtml, /mia-live-presence\.js/);
    assert.match(runtime, /PRESENCE\.bustUrl/);
    assert.match(partHtml, /spriteB/);
  });

  await test("mood stays idle during normal speech (no auto-happy flip)", () => {
    const speech = fs.readFileSync(path.join(OVERLAY, "speech-overlay.html"), "utf8");
    const fn = speech.match(/function syncMiaHoloMood[\s\S]*?^}/m);
    assert.ok(fn, "syncMiaHoloMood missing");
    assert.doesNotMatch(fn[0], /mood\s*=\s*"happy"/);
  });

  console.log("mia_graphics_studio_14a_live_presence_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
