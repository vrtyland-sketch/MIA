"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const paintCore = require("../shared/mia-paint-core");

const ROOT = path.resolve(__dirname, "..");
const PAINT = path.join(ROOT, "mia-output-overlay", "mia-paint");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function makeSilentWav(durationSec = 0.4, sampleRate = 8000) {
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
  // tone burst in the middle
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const amp = t > 0.1 && t < 0.3 ? Math.sin(2 * Math.PI * 220 * t) * 0.6 : 0;
    buf.writeInt16LE(Math.round(amp * 32767), 44 + i * 2);
  }
  return buf;
}

(async () => {
  await test("catalog lists lip_audio_bone_deform as 13u", () => {
    const def = graphicsStudio.getCommand("lip_audio_bone_deform");
    assert.equal(def.phase, "13u");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "lip_audio_bone_deform" && m.phase === "13u"));
  });

  await test("buildVisemeTrackFromSamples maps energy to visemes", () => {
    const samples = new Float32Array(8000);
    for (let i = 2000; i < 5000; i += 1) samples[i] = Math.sin(i / 20) * 0.5;
    const built = paintCore.buildVisemeTrackFromSamples(samples, 8000, {
      startMs: 100,
      stepMs: 50
    });
    assert.equal(built.ok, true);
    assert.equal(built.phase, "13u");
    assert.ok(built.keyframes.length >= 3);
    assert.ok(built.keyframes.some((k) => k.viseme !== "SIL" && k.viseme !== "sil"));
  });

  await test("buildVisemeTrackFromAudio decodes WAV", () => {
    const wav = makeSilentWav(0.35, 8000);
    const built = paintCore.buildVisemeTrackFromAudio(wav, { startMs: 0, stepMs: 40 });
    assert.equal(built.ok, true);
    assert.ok(built.keyframes.length >= 2);
    assert.equal(built.provider, "audio_amplitude_v1");
  });

  await test("sampleBoneRig tip deform moves layer vs rest", () => {
    const doc = paintCore.createDocument({ width: 64, height: 64, name: "13u" });
    paintCore.ensureMotion(doc.timeline);
    const layer = paintCore.getActiveLayer(doc);
    const rigRes = paintCore.createBonesRig(doc.timeline, { layerId: layer.id, deformScale: 1 });
    assert.equal(rigRes.ok, true);
    const rig = doc.timeline.motion.rigs[0];
    paintCore.addBoneKeyframe(doc.timeline, rig.id, "mid", 0, 0);
    paintCore.addBoneKeyframe(doc.timeline, rig.id, "mid", 500, 40);
    const atRest = paintCore.sampleBoneRig(rig, 0);
    const bent = paintCore.sampleBoneRig(rig, 500);
    assert.ok(Math.abs(bent.x) + Math.abs(bent.y) + Math.abs(bent.rotation) > 0.5);
    assert.ok(Math.abs(atRest.x) + Math.abs(atRest.y) < Math.abs(bent.x) + Math.abs(bent.y) + 1);
  });

  await test("paint wires Lip audio button + samples helper", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /btnMotionLipAudio/);
    assert.match(html, /fileLipAudio/);
    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /motionLipSyncFromAudioFile/);
    assert.match(app, /buildVisemeTrackFromSamples/);
    const core = fs.readFileSync(path.join(PAINT, "lib", "mia-paint-core.js"), "utf8");
    assert.match(core, /buildVisemeTrackFromSamples/);
    assert.match(core, /deformScale/);
  });

  console.log("mia_graphics_studio_13u_lip_audio_bone_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
