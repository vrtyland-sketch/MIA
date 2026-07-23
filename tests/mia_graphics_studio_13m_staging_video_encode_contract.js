"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const { writeAiStagingFrames } = require("../shared/mia-animation-engine/promoteAiAnimation");
const { encodeAiStagingPreview } = require("../shared/mia-animation-engine/stagingPreview");

const ROOT = path.resolve(__dirname, "..");
const STAGING_ROOT = path.join(ROOT, "data", "mia-ai-animations");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

async function tinyPngBase64() {
  const buf = await sharp({
    create: {
      width: 24,
      height: 24,
      channels: 4,
      background: { r: 0, g: 220, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

(async () => {
  await test("catalog lists staging_video_encode as 13m", () => {
    const def = graphicsStudio.getCommand("staging_video_encode");
    assert.equal(def.phase, "13m");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    const row = mods.find((m) => m.id === "staging_video_encode");
    assert.ok(row);
    assert.match(row.route, /encode/);
    assert.ok(row.formats.includes("gif"));
  });

  await test("encodeAiStagingPreview writes public GIF", async () => {
    const stagingId = `test-13m-${Date.now().toString(36)}`;
    const saved = await writeAiStagingFrames({
      stagingId,
      framesBase64: [await tinyPngBase64(), await tinyPngBase64()],
      fps: 8,
      motion: "idle"
    });
    assert.equal(saved.ok, true);

    const enc = await encodeAiStagingPreview({ stagingId, format: "gif" });
    assert.equal(enc.ok, true);
    assert.equal(enc.phase, "13m");
    assert.equal(enc.format, "gif");
    assert.equal(enc.liveSheetEligible, false);
    assert.match(enc.downloadUrl, /preview\.gif/);
    assert.ok(fs.existsSync(path.join(STAGING_ROOT, stagingId, "built", "preview.gif")));
    assert.ok(enc.byteLength > 20);

    fs.rmSync(path.join(STAGING_ROOT, stagingId), { recursive: true, force: true });
  });

  await test("dashboard wires GIF/WEBM encode buttons", () => {
    const dash = fs.readFileSync(DASH, "utf8");
    assert.match(dash, /btnStagingGif/);
    assert.match(dash, /btnStagingWebm/);
    assert.match(dash, /staging\/.*encode/);
    assert.match(dash, /12x[–-]13[a-z]/);

    const routes = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
    assert.match(routes, /staging\/:stagingId\/encode/);
    assert.match(routes, /encodeAiStagingPreview/);
  });

  console.log("mia_graphics_studio_13m_staging_video_encode_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
