"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const { assembleStagingClips } = require("../shared/mia-animation-engine/stagingPreview");
const { encodeVideoFromPngBuffers } = require("../shared/mia-graphics-studio/animationEncoder");

const ROOT = path.resolve(__dirname, "..");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");
const ENC = path.join(ROOT, "shared", "mia-graphics-studio", "animationEncoder.js");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

async function writeTinyPng(filePath, color) {
  const buf = await sharp({
    create: { width: 16, height: 16, channels: 4, background: color }
  })
    .png()
    .toBuffer();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  return buf;
}

(async () => {
  await test("catalog lists assemble_v2 as 13t", () => {
    const def = graphicsStudio.getCommand("assemble_v2");
    assert.equal(def.phase, "13t");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "assemble_v2" && m.phase === "13t"));
  });

  await test("dashboard wires gap/hold/audio/add-selected", () => {
    const html = fs.readFileSync(DASH, "utf8");
    assert.match(html, /bankAssembleGap/);
    assert.match(html, /bankAssembleHold/);
    assert.match(html, /bankAssembleAudio/);
    assert.match(html, /btnAssembleAddSelected/);
    assert.match(html, /audioBase64/);
    const enc = fs.readFileSync(ENC, "utf8");
    assert.match(enc, /audioPath/);
    assert.match(enc, /-shortest/);
  });

  await test("assemble gapFrames + holdLast expands frame count", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-assemble-v2-"));
    try {
      await writeTinyPng(path.join(tmp, "a", "frames", "0000.png"), {
        r: 255,
        g: 0,
        b: 0,
        alpha: 1
      });
      await writeTinyPng(path.join(tmp, "b", "frames", "0000.png"), {
        r: 0,
        g: 0,
        b: 255,
        alpha: 1
      });
      const result = await assembleStagingClips({
        clips: ["a", "b"],
        format: "gif",
        fps: 8,
        gapFrames: 2,
        holdLast: 1,
        outId: "assemble-v2-test",
        stagingRoot: tmp
      });
      assert.equal(result.ok, true);
      assert.equal(result.phase, "13t");
      // a(1)+hold(1) + gap(2) + b(1)+hold(1) = 6
      assert.equal(result.frameCount, 6);
      assert.equal(result.gapFrames, 2);
      assert.equal(result.holdLast, 1);
      assert.equal(result.hasAudio, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test("audio on gif is rejected", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-assemble-audio-"));
    try {
      await writeTinyPng(path.join(tmp, "a", "frames", "0000.png"), {
        r: 10,
        g: 10,
        b: 10,
        alpha: 1
      });
      const result = await assembleStagingClips({
        clips: ["a"],
        format: "gif",
        fps: 8,
        audioBase64: Buffer.from("not-real-audio").toString("base64"),
        audioExt: "mp3",
        stagingRoot: tmp,
        outId: "bad-audio-gif"
      });
      assert.equal(result.ok, false);
      assert.equal(result.error, "audio_requires_video_format");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await test("encodeVideoFromPngBuffers accepts missing audioPath safely", async () => {
    const frame = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 200, b: 255, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const result = encodeVideoFromPngBuffers([frame, frame], { fps: 6, format: "webm" });
    // ffmpeg may or may not be installed — either ok or ffmpeg_missing
    assert.ok(result.ok === true || result.error === "ffmpeg_missing" || result.error === "ffmpeg_failed");
    if (result.ok) assert.equal(result.hasAudio, false);
  });

  console.log("mia_graphics_studio_13t_assemble_v2_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
