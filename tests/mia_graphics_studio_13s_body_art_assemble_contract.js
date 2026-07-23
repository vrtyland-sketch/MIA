"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  PART_CROP_FRACTIONS,
  resolveHeadAsset,
  REQUIRED_PART_FILES
} = require("../shared/mia-graphics-studio/bodyPartsAssets");
const { assembleStagingClips } = require("../shared/mia-animation-engine/stagingPreview");

const ROOT = path.resolve(__dirname, "..");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");
const BUILD = path.join(ROOT, "scripts", "build_mia_body_parts.js");
const EYES = path.join(ROOT, "routes", "eyes.js");

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
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: color
    }
  })
    .png()
    .toBuffer();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
}

(async () => {
  await test("catalog lists body_art_assemble as 13s", () => {
    const def = graphicsStudio.getCommand("body_art_assemble");
    assert.equal(def.phase, "13s");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    assert.ok(mods.some((m) => m.id === "body_art_assemble" && m.phase === "13s"));
  });

  await test("body crop polish keeps head.h and tightens sides", () => {
    assert.ok(PART_CROP_FRACTIONS.head.h >= 0.22);
    assert.ok(PART_CROP_FRACTIONS.head.w <= 1.08);
    assert.ok(PART_CROP_FRACTIONS.hands.w <= 1.8);
    assert.ok(PART_CROP_FRACTIONS.feet.w <= 0.82);
    assert.ok(REQUIRED_PART_FILES.includes("head/combo.png"));
    assert.equal(resolveHeadAsset("combo"), "/assets/mia/parts/head/combo.png");
  });

  await test("build script prefers faces/combo.png", () => {
    const src = fs.readFileSync(BUILD, "utf8");
    assert.match(src, /faces\/combo\.png/);
    assert.match(src, /copyFileSync/);
  });

  await test("dashboard + route wire assemble", () => {
    const html = fs.readFileSync(DASH, "utf8");
    assert.match(html, /btnStagingAssemble/);
    assert.match(html, /\/mia\/animation\/assemble/);
    assert.match(html, /bankAssembleClips/);
    const eyes = fs.readFileSync(EYES, "utf8");
    assert.match(eyes, /POST \/mia\/animation\/assemble/);
    assert.match(eyes, /assembleStagingClips/);
  });

  await test("assembleStagingClips concatenates frames to gif", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-assemble-"));
    try {
      await writeTinyPng(path.join(tmp, "clip-a", "frames", "0000.png"), {
        r: 255,
        g: 0,
        b: 0,
        alpha: 1
      });
      await writeTinyPng(path.join(tmp, "clip-a", "frames", "0001.png"), {
        r: 200,
        g: 0,
        b: 0,
        alpha: 1
      });
      await writeTinyPng(path.join(tmp, "clip-b", "frames", "0000.png"), {
        r: 0,
        g: 0,
        b: 255,
        alpha: 1
      });
      const result = await assembleStagingClips({
        clips: ["clip-a", "clip-b"],
        format: "gif",
        fps: 8,
        outId: "assemble-test",
        stagingRoot: tmp
      });
      assert.equal(result.ok, true);
      assert.ok(result.phase === "13s" || result.phase === "13t");
      assert.equal(result.frameCount, 3);
      assert.equal(result.liveSheetEligible, false);
      assert.equal(result.format, "gif");
      const outFrames = fs.readdirSync(path.join(tmp, "assemble-test", "frames"));
      assert.equal(outFrames.length, 3);
      assert.ok(fs.existsSync(path.join(tmp, "assemble-test", "built", "preview.gif")));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  console.log("mia_graphics_studio_13s_body_art_assemble_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
