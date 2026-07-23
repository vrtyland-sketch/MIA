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

function makeToneWav(durationSec = 0.35, sampleRate = 8000) {
  const samples = Math.floor(sampleRate * durationSec);
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const amp = t > 0.08 && t < 0.28 ? Math.sin(2 * Math.PI * 220 * t) * 0.55 : 0;
    buf.writeInt16LE(Math.round(amp * 32767), 44 + i * 2);
  }
  return buf;
}

(async () => {
  await test("catalog lists live_audio_lip as 13x", () => {
    const def = graphicsStudio.getCommand("live_audio_lip");
    assert.equal(def.phase, "13x");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "live_audio_lip" && m.phase === "13x"));
  });

  await test("buildLiveLipTrackSmart uses audio amplitude", () => {
    const wav = makeToneWav();
    const track = paintCore.buildLiveLipTrackSmart({
      text: "AHOJ",
      audioBuffer: wav,
      durationMs: 400
    });
    assert.equal(track.phase, "13x");
    assert.equal(track.provider, "audio_amplitude_live_v1");
    assert.ok(track.keyframes.length >= 2);
    assert.ok(track.keyframes.some((k) => {
      const v = String(k.viseme || "").toUpperCase();
      return v !== "SIL" && v !== "M";
    }));
  });

  await test("buildLiveLipTrackSmart falls back to text without audio", () => {
    const track = paintCore.buildLiveLipTrackSmart({
      text: "AHOJ",
      durationMs: 900
    });
    assert.equal(track.provider, "text_viseme_v1");
    assert.equal(track.phase, "13w");
  });

  await test("browser live-lip exposes sample amp helper", () => {
    assert.equal(typeof liveLip.buildVisemeTrackFromSamples, "function");
    const samples = new Float32Array(4000);
    for (let i = 800; i < 2400; i += 1) samples[i] = Math.sin(i / 18) * 0.4;
    const built = liveLip.buildVisemeTrackFromSamples(samples, 8000, { stepMs: 40 });
    assert.equal(built.ok, true);
    assert.equal(built.phase, "13x");
  });

  await test("delivery + overlay wire amp upgrade", () => {
    const delivery = fs.readFileSync(path.join(ROOT, "scripts", "MIA_DELIVERY_RUNTIME.js"), "utf8");
    assert.match(delivery, /buildLiveLipTrackSmart/);
    assert.match(delivery, /audio_amplitude_live_v1/);
    assert.match(delivery, /setImmediate/);
    const tts = fs.readFileSync(path.join(ROOT, "scripts", "MIA_TTS_ENGINE.js"), "utf8");
    assert.match(tts, /filePath/);
    const html = fs.readFileSync(path.join(OVERLAY, "speech-overlay.html"), "utf8");
    assert.match(html, /applyMiaPresencePose|MIA_SPEAK|speakFace/);
    assert.match(html, /MiaHoloMotion|mia-holo-motion/);
    assert.doesNotMatch(html, /upgradeMiaLipFromAudioUrl/);
    const runtime = fs.readFileSync(path.join(OVERLAY, "lib", "mia-body-part-runtime.js"), "utf8");
    assert.match(runtime, /sampleLipFrameUrl|lipTrack/);
    const dash = fs.readFileSync(path.join(OVERLAY, "mia-streamer-dashboard.html"), "utf8");
    assert.match(dash, /12x[–-]13[x-z]|12x-13[x-z]/);
  });

  console.log("mia_graphics_studio_13x_live_audio_lip_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
