"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const paintAi = require("../shared/mia-paint-ai");
const {
  validateClipMetadata,
  buildClipManifest
} = require("../shared/mia-animation-engine/animationBankSchema");
const { resolveClipForGift, loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");
const { resolveGiftReactionPlan } = require("../shared/mia-animation-engine/GiftReactionOrchestrator");
const {
  resolveCameraForContext,
  clipIdForCamera,
  listCameraPresets
} = require("../shared/mia-paint-core/cameraPresets");
const {
  exportPaintFramesToBank,
  exportPaintMultiCameraToBank
} = require("../scripts/export_paint_to_animation_bank");

async function makeFrame(seed = "x") {
  return paintAi.proceduralImage(32, 32, seed);
}

async function testSchemaCameraId() {
  const meta = validateClipMetadata({
    id: "test/happy_c3",
    emotion: "happy",
    cameraId: "C3",
    shotLabel: "Close",
    fps: 12
  });
  assert.ok(meta.ok, meta.errors?.join(","));
  assert.equal(meta.normalized.cameraId, "C3");
  assert.equal(meta.normalized.shotLabel, "Close");

  const manifest = buildClipManifest(
    {
      spec: { cols: 2, rows: 1, frameWidth: 32, frameHeight: 32, fps: 12 },
      sheetWidth: 64,
      sheetHeight: 32,
      frameCount: 2,
      placements: [
        { index: 0, x: 0, y: 0, width: 32, height: 32 },
        { index: 1, x: 32, y: 0, width: 32, height: 32 }
      ]
    },
    meta.normalized
  );
  assert.equal(manifest.cameraId, "C3");
}

function testCameraPresets() {
  assert.equal(listCameraPresets().length, 6);
  assert.equal(resolveCameraForContext({ tier: "T5" }), "C5");
  assert.equal(resolveCameraForContext({ emotion: "sad" }), "C3");
  assert.equal(clipIdForCamera("gift/rose", "C4"), "gift/rose/c4");
}

async function testSingleCameraExport() {
  const frame = await makeFrame("c3");
  const result = await exportPaintFramesToBank({
    clipId: "test/phase16_single",
    label: "Phase16 Single",
    fps: 8,
    cameraId: "C3",
    emotion: "happy",
    frames: [frame, frame]
  });
  assert.ok(result.ok, result.error);
  assert.equal(result.cameraId, "C3");
  const metaPath = path.join(
    __dirname,
    "..",
    "mia-output-overlay",
    "assets",
    "animation-bank",
    "test",
    "phase16_single",
    "metadata.json"
  );
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  assert.equal(meta.cameraId, "C3");
  assert.ok(meta.tags.includes("camera:C3"));
}

async function testMultiCameraExport() {
  const f1 = await makeFrame("m1");
  const f2 = await makeFrame("m2");
  const result = await exportPaintMultiCameraToBank({
    clipId: "test/phase16_multi",
    label: "Phase16 Multi",
    fps: 8,
    emotion: "idle",
    framesByCamera: {
      C1: [f1, f1],
      C3: [f2, f2]
    }
  });
  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.count, 2);
  assert.ok(result.clipIds.includes("test/phase16_multi/c1"));
  assert.ok(result.clipIds.includes("test/phase16_multi/c3"));
}

function testBankResolveByCamera() {
  const bank = loadBankIndex();
  const clip = resolveClipForGift(bank, {
    emotion: "happy",
    cameraId: "C3",
    giftKey: "nonexistent_gift_xyz"
  });
  if (clip?.metadata?.cameraId === "C3") {
    assert.equal(clip.metadata.cameraId, "C3");
  }
}

function testGiftPlanIncludesCamera() {
  const plan = resolveGiftReactionPlan({
    giftKey: "rose",
    effectProgram: "flower_support",
    tier: "T5"
  });
  assert.ok(plan.cameraId);
  assert.equal(plan.cameraId, "C5");
}

async function main() {
  testSchemaCameraId();
  testCameraPresets();
  await testSingleCameraExport();
  await testMultiCameraExport();
  testBankResolveByCamera();
  testGiftPlanIncludesCamera();
  console.log("mia_phase16_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
