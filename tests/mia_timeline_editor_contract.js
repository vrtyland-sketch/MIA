"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createTimeline,
  addFrame,
  addLayerKeyframe,
  addCameraKeyframe,
  createBonesRig,
  motionAddBoneKeyframe,
  listMotionTracks,
  deleteLayerKeyframe,
  updateLayerKeyframe,
  unifiedDurationMs,
  timeMsToFrameIndex,
  setUnifiedPlayhead,
  exportSampleTimes
} = require("../shared/mia-paint-core");
const { exportPaintFramesToBank } = require("../scripts/export_paint_to_animation_bank");
const { renderKojnozoutMood } = require("../scripts/kojnozrout_sprite_renderer");

function pass(label) {
  console.log(`✅ ${label}`);
}

async function run() {
  const tl = createTimeline({ fps: 12 });
  addFrame(tl);
  addFrame(tl);
  assert.ok(tl.motion);
  pass("timeline includes motion");

  const duration = unifiedDurationMs(tl);
  assert.ok(duration >= 1000);
  pass("unifiedDurationMs");

  setUnifiedPlayhead(tl, 120);
  assert.equal(timeMsToFrameIndex(tl, 120), 1);
  pass("timeMsToFrameIndex");

  const times = exportSampleTimes(tl, { fps: 12 });
  assert.ok(times.length >= 2);
  pass("exportSampleTimes");

  addLayerKeyframe(tl, "layer_test", { timeMs: 0, x: 0 });
  addLayerKeyframe(tl, "layer_test", { timeMs: 500, x: 100 });
  const tracks = listMotionTracks(tl, [{ id: "layer_test", name: "Test" }]);
  assert.ok(tracks.some((t) => t.kind === "layer"));
  pass("listMotionTracks");

  const upd = updateLayerKeyframe(tl, "layer_test", 500, { x: 80 });
  assert.equal(upd.ok, true);
  assert.equal(upd.keyframe.x, 80);
  pass("updateLayerKeyframe");

  const del = deleteLayerKeyframe(tl, "layer_test", 0);
  assert.equal(del.ok, true);
  pass("deleteLayerKeyframe");

  addCameraKeyframe(tl, { timeMs: 0, zoom: 1 });
  addCameraKeyframe(tl, { timeMs: 800, zoom: 1.2 });
  pass("camera keyframes");

  const rigRes = createBonesRig(tl, { layerId: "layer_test" });
  motionAddBoneKeyframe(tl, rigRes.rig.id, "root", { timeMs: 0, angle: 0 });
  motionAddBoneKeyframe(tl, rigRes.rig.id, "root", { timeMs: 600, angle: 30 });
  pass("bone keyframes FK");

  const editorJs = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "timeline-editor.js"),
    "utf8"
  );
  assert.match(editorJs, /MiaTimelineEditor/);
  assert.match(editorJs, /select-kf/);
  pass("timeline editor module");

  const paintHtml = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "index.html"),
    "utf8"
  );
  assert.match(paintHtml, /motionTimelineHost/);
  assert.match(paintHtml, /btnExportBank/);
  assert.match(paintHtml, /timeline-editor\.js/);
  pass("paint timeline UI");

  const gpuJs = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),
    "utf8"
  );
  assert.match(gpuJs, /collectMotionExportCanvases/);
  assert.match(gpuJs, /bakeParticlesToCanvas/);
  pass("gpu motion export");

  const soundJs = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "assets", "mia-sound-cues.js"),
    "utf8"
  );
  assert.match(soundJs, /playSoundCue/);
  pass("sound cues module");

  const runtimeHtml = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.match(runtimeHtml, /mia-sound-cues/);
  assert.match(runtimeHtml, /anim-sheet-active #vectorHost/);
  pass("runtime sound + vector suppress");

  const frame = renderKojnozoutMood("happy");
  const exported = await exportPaintFramesToBank({
    clipId: "test/paint_export",
    label: "Paint Export Test",
    fps: 8,
    frames: [frame, frame]
  });
  assert.equal(exported.ok, true);
  assert.ok(fs.existsSync(path.join(__dirname, "..", "mia-output-overlay", "assets", "animation-bank", "test", "paint_export", "built", "sprite_sheet.png")));
  pass("export paint → animation bank");

  console.log("\n---- MIA TIMELINE EDITOR CONTRACT (Phase 14) ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
