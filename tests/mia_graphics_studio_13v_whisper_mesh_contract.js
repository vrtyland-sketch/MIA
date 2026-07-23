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
  await test("catalog lists whisper_lip_mesh_warp as 13v", () => {
    const def = graphicsStudio.getCommand("whisper_lip_mesh_warp");
    assert.equal(def.phase, "13v");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "whisper_lip_mesh_warp" && m.phase === "13v"));
  });

  await test("smart lip falls back to amplitude without API key", async () => {
    const wav = makeToneWav();
    const built = await paintCore.buildVisemeTrackFromAudioSmart(wav, {
      startMs: 0,
      stepMs: 40,
      useStt: true,
      env: {}
    });
    assert.equal(built.ok, true);
    assert.equal(built.provider, "audio_amplitude_v1");
    assert.ok(built.stt);
    assert.equal(built.stt.ok, false);
    assert.ok(built.keyframes.length >= 2);
  });

  await test("useStt false keeps amplitude 13u path", async () => {
    const wav = makeToneWav();
    const built = await paintCore.buildVisemeTrackFromAudioSmart(wav, {
      useStt: false,
      env: { OPENAI_API_KEY: "should-not-call" }
    });
    assert.equal(built.ok, true);
    assert.equal(built.provider, "audio_amplitude_v1");
    assert.equal(built.phase, "13u");
  });

  await test("sampleBoneRig exposes soft skew warp", () => {
    const doc = paintCore.createDocument({ width: 64, height: 64, name: "13v" });
    paintCore.ensureMotion(doc.timeline);
    const layer = paintCore.getActiveLayer(doc);
    const rigRes = paintCore.createBonesRig(doc.timeline, { layerId: layer.id, deformScale: 1 });
    assert.equal(rigRes.ok, true);
    const rig = doc.timeline.motion.rigs[0];
    paintCore.addBoneKeyframe(doc.timeline, rig.id, "mid", 0, 0);
    paintCore.addBoneKeyframe(doc.timeline, rig.id, "mid", 400, 35);
    const bent = paintCore.sampleBoneRig(rig, 400);
    assert.ok(typeof bent.skewX === "number");
    assert.ok(typeof bent.skewY === "number");
    assert.ok(Math.abs(bent.skewX) + Math.abs(bent.skewY) > 0.001);
    const sample = paintCore.sampleMotion(doc.timeline, 400);
    assert.ok(sample.layers[layer.id]);
    assert.ok(typeof sample.layers[layer.id].skewX === "number");
  });

  await test("motion lip-sync audio uses smart builder", async () => {
    const doc = paintCore.createDocument({ width: 48, height: 48, name: "13v-lip" });
    const layerId = doc.activeLayerId;
    const wav = makeToneWav();
    const result = await graphicsStudio.runMotionOnDocument(doc, "lip_sync", {
      layerId,
      audioBase64: wav.toString("base64"),
      audioExt: "wav",
      startMs: 0,
      useStt: true,
      env: {}
    });
    assert.equal(result.ok, true);
    assert.equal(result.source, "audio");
    assert.ok(result.visemeCount >= 2);
    assert.ok(result.provider === "audio_amplitude_v1" || result.provider === "whisper_viseme_v1");
  });

  await test("paint GPU applies skew + Lip♪ wires Whisper title", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /Whisper STT/);
    const gpu = fs.readFileSync(path.join(PAINT, "lib", "mia-paint-gpu.js"), "utf8");
    assert.match(gpu, /skewX/);
    assert.match(gpu, /soft skew/);
    const core = fs.readFileSync(path.join(PAINT, "lib", "mia-paint-core.js"), "utf8");
    assert.match(core, /buildVisemeTrackFromAudioSmart/);
    assert.match(core, /skewX/);
    const dash = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    assert.match(dash, /12x[–-]13[v-z]|12x-13[v-z]/);
  });

  console.log("mia_graphics_studio_13v_whisper_mesh_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
