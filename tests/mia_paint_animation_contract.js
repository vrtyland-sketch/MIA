"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createDocument,
  createTimeline,
  addFrame,
  getActiveFrame,
  onionFrameIndices,
  layoutSpriteSheet,
  spriteSheetManifest
} = require("../shared/mia-paint-core");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const doc = createDocument({ width: 192, height: 108 });
  assert.ok(doc.timeline);
  assert.equal(doc.timeline.frames.length, 1);
  pass("document includes timeline");

  const tl = createTimeline({ fps: 12 });
  addFrame(tl);
  addFrame(tl);
  assert.equal(tl.frames.length, 3);
  assert.equal(getActiveFrame(tl).label, "3");
  pass("addFrame + getActiveFrame");

  const onion = onionFrameIndices({ ...tl, activeFrameIndex: 1, onionBefore: 1, onionAfter: 1 });
  assert.deepEqual(onion.before, [0]);
  assert.deepEqual(onion.after, [2]);
  pass("onionFrameIndices");

  const layout = layoutSpriteSheet(tl.frames, { frameWidth: 48, frameHeight: 48, cols: 4, rows: 8 });
  assert.equal(layout.frameCount, 3);
  assert.equal(layout.sheetWidth, 192);
  assert.equal(layout.placements[2].col, 2);
  pass("layoutSpriteSheet");

  const manifest = spriteSheetManifest(layout, { documentId: doc.id });
  assert.equal(manifest.kind, "mia_paint_sprite_sheet");
  assert.equal(manifest.frameWidth, 48);
  assert.equal(manifest.frames.length, 3);
  pass("spriteSheetManifest");

  const gpuJs = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),
    "utf8"
  );
  assert.match(gpuJs, /captureTimelineFrame/, "frame capture");
  assert.match(gpuJs, /applyTimelineFrame/, "frame apply");
  assert.match(gpuJs, /exportSpriteSheetManifest/, "sheet export");
  pass("GPU animation API");

  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /timelineBar/, "timeline UI");
  assert.match(html, /btnExportSheet/, "sheet export button");
  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /renderFrameList/, "timeline wiring");
  pass("editor animation UI");

  console.log("\n---- MIA PAINT ANIMATION CONTRACT ----");
  console.log("passed");
}

run();
