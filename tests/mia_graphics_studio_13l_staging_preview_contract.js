"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");
const { writeAiStagingFrames } = require("../shared/mia-animation-engine/promoteAiAnimation");
const {
  previewStagingClip,
  pushStagingClipPreview,
  publicStagingSheetUrl
} = require("../shared/mia-animation-engine/stagingPreview");

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
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 0, g: 220, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
  return buf.toString("base64");
}

(async () => {
  await test("catalog lists staging_studio_preview as 13l", () => {
    const def = graphicsStudio.getCommand("staging_studio_preview");
    assert.equal(def.phase, "13l");
    assert.equal(def.status, "implemented");
    const mods = graphicsStudio.listAiAnimationModules();
    const row = mods.find((m) => m.id === "staging_studio_preview");
    assert.ok(row);
    assert.match(row.route, /staging\/:stagingId\/preview/);
    assert.match(row.publicSheetPrefix, /mia-ai-staging/);
  });

  await test("previewStagingClip is studio-only and uses public sheet URL", async () => {
    const stagingId = `test-13l-${Date.now().toString(36)}`;
    const saved = await writeAiStagingFrames({
      stagingId,
      framesBase64: [await tinyPngBase64(), await tinyPngBase64()],
      fps: 8,
      motion: "wave",
      prompt: "13l preview"
    });
    assert.equal(saved.ok, true);

    const preview = previewStagingClip({ stagingId });
    assert.equal(preview.ok, true);
    assert.equal(preview.phase, "13l");
    assert.equal(preview.stagingPreview, true);
    assert.equal(preview.liveSheetEligible, false);
    assert.equal(preview.reaction.studioPreview, true);
    assert.equal(preview.reaction.stagingPreview, true);
    assert.equal(preview.clip.sheetUrl, publicStagingSheetUrl(stagingId));
    assert.match(preview.clip.sheetUrl, /\/assets\/mia-ai-staging\//);
    assert.ok(fs.existsSync(path.join(STAGING_ROOT, stagingId, "built", "sprite_sheet.png")));

    const pushed = pushStagingClipPreview(
      { stagingId, syncBody: true },
      { overlayStateModule: null }
    );
    assert.equal(pushed.ok, true);
    assert.equal(pushed.pushed, false);
    assert.equal(pushed.error, "overlay_state_unavailable");

    fs.rmSync(path.join(STAGING_ROOT, stagingId), { recursive: true, force: true });
  });

  await test("dashboard + routes wire 13l staging preview", () => {
    const dash = fs.readFileSync(DASH, "utf8");
    assert.match(dash, /btnStagingPreview/);
    assert.match(dash, /staging\/\$\{encodeURIComponent\(stagingId\)\}\/preview|staging\/.*preview/);
    assert.match(dash, /12x[–-]13[a-z]/);

    const routes = fs.readFileSync(path.join(ROOT, "routes", "eyes.js"), "utf8");
    assert.match(routes, /\/assets\/mia-ai-staging/);
    assert.match(routes, /pushStagingClipPreview/);
    assert.match(routes, /staging\/:stagingId\/preview/);
  });

  console.log("mia_graphics_studio_13l_staging_preview_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
