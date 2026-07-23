"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  buildMotionKeyframes,
  CHARACTER_MOTION_PRESETS
} = require("../shared/mia-animation-engine/ProceduralMotion");
const { motionStylePresets, generateAiMotionKeyframes } = require("../shared/mia-graphics-studio/aiMotionCommands");
const paintCore = require("../shared/mia-paint-core");
const { applyMiaIdentityTintBuffer } = require("../shared/mia-paint-ai/visualIdentity");

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

(async () => {
  await test("catalog lists character_motion_identity as 13o", () => {
    const def = graphicsStudio.getCommand("character_motion_identity");
    assert.equal(def.phase, "13o");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "character_motion_identity"));
  });

  await test("character motion presets include hair_eyes / blink / breath", () => {
    assert.ok(CHARACTER_MOTION_PRESETS.includes("hair_eyes"));
    assert.ok(CHARACTER_MOTION_PRESETS.includes("blink"));
    assert.ok(motionStylePresets().includes("sway"));
    const hair = buildMotionKeyframes({ style: "hair_eyes_subtle", intensity: 0.6 });
    assert.equal(hair.style, "hair_eyes");
    assert.equal(hair.character, true);
    assert.ok(hair.keyframes.length >= 4);
    const blink = buildMotionKeyframes({ style: "blink", intensity: 0.5 });
    assert.ok(blink.keyframes.some((k) => k.scaleY < 1));
  });

  await test("generateAiMotionKeyframes applies hair_eyes to timeline", () => {
    const doc = paintCore.createDocument({ width: 64, height: 64, name: "13o" });
    paintCore.ensureMotion(doc.timeline);
    const layer = paintCore.getActiveLayer(doc);
    const result = generateAiMotionKeyframes(doc.timeline, layer.id, {
      style: "hair_eyes",
      intensity: 0.7,
      durationMs: 1000,
      startMs: 0
    });
    assert.equal(result.ok, true);
    assert.equal(result.phase, "13o");
    assert.equal(result.character, true);
    assert.ok(result.keyframeCount >= 4);
  });

  await test("applyMiaIdentityTintBuffer shifts opaque pixels toward cyan", async () => {
    const src = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: { r: 200, g: 80, b: 80, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const tint = await applyMiaIdentityTintBuffer(src, { mood: "idle", mix: 0.3 });
    assert.equal(tint.ok, true);
    assert.equal(tint.phase, "13o");
    const { data } = await sharp(tint.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.ok(data[1] > 80, `green should rise from 80, got ${data[1]}`);
    assert.ok(data[2] > 80, `blue should rise from 80, got ${data[2]}`);
    assert.ok(data[0] < 200, `red should drop from 200, got ${data[0]}`);
  });

  await test("paint UI + build script wire 13o", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /motionAiStyle/);
    assert.match(html, /hair_eyes/);
    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /hair_eyes/);
    const build = fs.readFileSync(path.join(ROOT, "scripts", "build_mia_body_parts.js"), "utf8");
    assert.match(build, /--identity/);
    assert.match(build, /applyMiaIdentityTintBuffer/);
  });

  console.log("mia_graphics_studio_13o_character_motion_identity_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
