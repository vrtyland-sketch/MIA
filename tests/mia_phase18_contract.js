"use strict";

const assert = require("assert");
const paintAi = require("../shared/mia-paint-ai");
const {
  listCameraSlots,
  resolveCameraId,
  selectPrimaryMatteCamera
} = require("../shared/mia-scene-engine/streamerCameraRig");
const { processFrameMatting } = require("../shared/mia-scene-engine/mattingPipeline");
const streamerMatting = require("../scripts/MIA_STREAMER_MATTING");
const immersiveScene = require("../scripts/MIA_IMMERSIVE_SCENE");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");

async function makeGreenScreenFrame() {
  const svg = `<svg width="128" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#00ff00"/>
    <ellipse cx="64" cy="52" rx="28" ry="32" fill="#e8b796"/>
    <rect x="36" y="84" width="56" height="64" rx="12" fill="#4466aa"/>
  </svg>`;
  const sharp = require("sharp");
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function testCameraRig() {
  const slots = listCameraSlots();
  assert.equal(slots.length, 6);
  assert.equal(resolveCameraId("NOTEBOOK_CAMERA"), "CAM_01");
  const primary = selectPrimaryMatteCamera(["CAM_06", "CAM_02", "CAM_01"]);
  assert.equal(primary.id, "CAM_01");
}

async function testChromaMatting() {
  const frame = await makeGreenScreenFrame();
  const result = await processFrameMatting(frame, { mode: "chroma_green" });
  assert.ok(result.ok);
  assert.ok(result.width > 0);
  const sharp = require("sharp");
  const meta = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < meta.data.length; i += 4) {
    if (meta.data[i] < 16) transparent += 1;
  }
  assert.ok(transparent > meta.data.length / 16, "background should be mostly transparent");
}

async function testIngestAndComposite() {
  streamerMatting.clearMatteState();
  const frame = await makeGreenScreenFrame();
  const ingested = await streamerMatting.ingestCameraFrame({
    cameraId: "CAM_01",
    frameBase64: frame.toString("base64"),
    mode: "chroma_green"
  });
  assert.ok(ingested.ok, ingested.error);
  const matte = streamerMatting.getMatteState();
  assert.equal(matte.active, true);
  assert.ok(matte.matteDataUrl.startsWith("data:image/png;base64,"));
  assert.equal(matte.cameraId, "CAM_01");
}

async function testCombatMatteWithCreatureTint() {
  streamerMatting.clearMatteState();
  const frame = await makeGreenScreenFrame();
  const ingested = await streamerMatting.ingestCameraFrame({
    cameraId: "CAM_05",
    frameBase64: frame.toString("base64"),
    mode: "chroma_green",
    creatureParams: {
      skinTint: [38, 120, 88],
      edgeGlow: [0, 255, 180],
      plateStrength: 0.7
    }
  });
  assert.ok(ingested.ok);
  const matte = streamerMatting.getMatteState();
  assert.ok(matte.active);
}

function testCatalogIncludesCameras() {
  const catalog = immersiveScene.getSceneCatalog();
  assert.ok(Array.isArray(catalog.cameras));
  assert.equal(catalog.cameras.length, 6);
  assert.equal(catalog.mattingProvider, "mia_matting_v1");
}

function testOverlayMatteIntegration() {
  const state = overlayState.createOverlayState();
  immersiveScene.applyImmersiveScene(state, { mode: "combat", chatText: "boj" });
  const snap = overlayState.getImmersiveSceneSnapshot(state);
  assert.equal(snap.segmentation.provider, "mia_matting_v1");
  assert.equal(snap.segmentation.multiCam, true);
}

async function main() {
  await testCameraRig();
  await testChromaMatting();
  await testIngestAndComposite();
  await testCombatMatteWithCreatureTint();
  testCatalogIncludesCameras();
  testOverlayMatteIntegration();
  console.log("mia_phase18_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
