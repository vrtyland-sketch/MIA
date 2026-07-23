"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const {
  writeAiStagingFrames,
  getAiStagingClip
} = require("../shared/mia-animation-engine/promoteAiAnimation");

const ROOT = path.resolve(__dirname, "..");
const STAGING_ROOT = path.join(ROOT, "data", "mia-ai-animations");
const DASH = path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html");
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

async function tinyPngBase64(alpha = 255) {
  const buf = await sharp({
    create: {
      width: 24,
      height: 24,
      channels: 4,
      background: { r: 0, g: 220, b: 255, alpha: alpha / 255 }
    }
  })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

(async () => {
  await test("catalog lists paint_staging_writeback as 13k", () => {
    const def = graphicsStudio.getCommand("paint_staging_writeback");
    assert.equal(def.phase, "13k");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    const row = mods.find((m) => m.id === "paint_staging_writeback");
    assert.ok(row);
    assert.match(row.route, /staging\/:stagingId\/save/);
  });

  await test("writeAiStagingFrames rebuilds frames + sheet for promote", async () => {
    const stagingId = `test-13k-${Date.now().toString(36)}`;
    const framesBase64 = [await tinyPngBase64(255), await tinyPngBase64(200), await tinyPngBase64(180)];
    const saved = await writeAiStagingFrames({
      stagingId,
      framesBase64,
      fps: 8,
      prompt: "13k polish",
      motion: "wave"
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.phase, "13k");
    assert.equal(saved.frameCount, 3);
    assert.ok(saved.sheet?.ok);
    assert.match(saved.sheetUrl, /\/sheet/);

    const framesDir = path.join(STAGING_ROOT, stagingId, "frames");
    const files = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png"));
    assert.equal(files.length, 3);
    assert.ok(fs.existsSync(path.join(STAGING_ROOT, stagingId, "built", "sprite_sheet.png")));

    const meta = JSON.parse(fs.readFileSync(path.join(STAGING_ROOT, stagingId, "metadata.json"), "utf8"));
    assert.equal(meta.source, "paint_polish");
    assert.equal(meta.polishSource, "paint_timeline");
    assert.equal(meta.motion, "wave");

    const reloaded = getAiStagingClip({ stagingId, includeFramesBase64: true });
    assert.equal(reloaded.ok, true);
    assert.equal(reloaded.frameCount, 3);
    assert.equal(reloaded.framesBase64.length, 3);

    // overwrite with fewer frames — promote must see polished set only
    const again = await writeAiStagingFrames({
      stagingId,
      framesBase64: [await tinyPngBase64(255), await tinyPngBase64(255)],
      fps: 10
    });
    assert.equal(again.frameCount, 2);
    assert.equal(fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).length, 2);

    fs.rmSync(path.join(STAGING_ROOT, stagingId), { recursive: true, force: true });
  });

  await test("paint + dashboard wire 13k write-back + thumb", () => {
    const html = fs.readFileSync(path.join(PAINT, "index.html"), "utf8");
    assert.match(html, /btnExportStaging/);

    const app = fs.readFileSync(path.join(PAINT, "app.js"), "utf8");
    assert.match(app, /saveToStaging/);
    assert.match(app, /currentStagingId/);
    assert.match(app, /saveStagingFrames/);

    const client = fs.readFileSync(path.join(PAINT, "lib", "mia-graphics-client.js"), "utf8");
    assert.match(client, /saveStagingFrames/);

    const dash = fs.readFileSync(DASH, "utf8");
    assert.match(dash, /bankStagingThumb/);
    assert.match(dash, /12x[–-]13[a-z]/);

    const routes = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
    assert.match(routes, /staging\/:stagingId\/save/);
    assert.match(routes, /writeAiStagingFrames/);
  });

  console.log("mia_graphics_studio_13k_staging_writeback_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
