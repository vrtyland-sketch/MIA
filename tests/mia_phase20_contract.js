"use strict";

const assert = require("assert");
const {
  buildCameraEnsurePlans,
  resolvePrimaryLegacyName,
  IMMERSIVE_OVERLAY
} = require("../shared/mia-scene-engine/obsCameraLayout");
const {
  ensureStreamerCameraSlots,
  ensureObsStreamerRig
} = require("../scripts/MIA_OBS_STREAMER_CAMERAS");
const { buildSplitUrls } = require("../scripts/MIA_OBS_LIVE_MANIFEST");

function testCameraEnsurePlansAliasPrimary() {
  const plans = buildCameraEnsurePlans({
    existingInputNames: ["NOTEBOOK_CAMERA", "MIA_VOICE"],
    legacyPrimaryName: "NOTEBOOK_CAMERA"
  });
  const cam01 = plans.find((row) => row.cameraId === "CAM_01");
  assert.equal(cam01.sourceName, "NOTEBOOK_CAMERA");
  assert.equal(cam01.aliased, true);
  assert.equal(cam01.sceneItemEnabled, true);

  const cam02 = plans.find((row) => row.cameraId === "CAM_02");
  assert.equal(cam02.sourceName, "MIA_CAM_02_SIDE_L");
  assert.equal(cam02.sceneItemEnabled, false);
  assert.ok(cam02.transform.positionX < 0, "matting cam off-screen");
}

function testSplitUrlsIncludeImmersiveScene() {
  const urls = buildSplitUrls(3000);
  assert.ok(urls.immersiveScene.includes("immersive-scene-overlay.html"));
}

function testImmersiveOverlaySpec() {
  assert.equal(IMMERSIVE_OVERLAY.inputName, "MIA_IMMERSIVE_SCENE");
  assert.equal(IMMERSIVE_OVERLAY.defaultVisible, false);
}

async function testMockObsEnsureRig() {
  const calls = [];
  const inputs = [{ inputName: "NOTEBOOK_CAMERA", inputKind: "dshow_input" }];
  const sceneItems = [{ sourceName: "NOTEBOOK_CAMERA", sceneItemId: 11, sceneItemEnabled: true }];

  async function obsCall(type, data = {}) {
    calls.push({ type, data });
    switch (type) {
      case "GetInputList":
        return { inputs: [...inputs] };
      case "GetSceneItemList":
        return { sceneItems: [...sceneItems] };
      case "GetSceneItemTransform":
        return { sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } };
      case "CreateInput": {
        inputs.push({ inputName: data.inputName, inputKind: data.inputKind });
        sceneItems.push({
          sourceName: data.inputName,
          sceneItemId: 100 + inputs.length,
          sceneItemEnabled: data.sceneItemEnabled
        });
        return { sceneItemId: 100 + inputs.length };
      }
      case "CreateSceneItem":
        sceneItems.push({
          sourceName: data.sourceName,
          sceneItemId: 200 + sceneItems.length,
          sceneItemEnabled: data.sceneItemEnabled
        });
        return { sceneItemId: 200 + sceneItems.length };
      case "SetSceneItemEnabled":
      case "SetSceneItemTransform":
      case "SetInputSettings":
        return { ok: true };
      case "GetInputSettings":
        return { inputSettings: { url: "" } };
      default:
        return { ok: true };
    }
  }

  const cameras = await ensureStreamerCameraSlots(obsCall, {
    sceneName: "TEST_SCENE",
    primaryDevice: "FaceCam 1000X",
    legacyPrimaryName: "NOTEBOOK_CAMERA"
  });

  assert.equal(cameras.ok, true);
  assert.ok(cameras.aliased.includes("NOTEBOOK_CAMERA"));
  assert.ok(cameras.created.length >= 4, "should create missing matting cams");

  const createdNames = cameras.created;
  assert.ok(createdNames.includes("MIA_CAM_02_SIDE_L"));
  assert.ok(!createdNames.includes("NOTEBOOK_CAMERA"));
}

async function testEnsureRigWithoutOverlayUrl() {
  async function obsCall(type) {
    if (type === "GetInputList") return { inputs: [] };
    if (type === "GetSceneItemList") return { sceneItems: [] };
    return { ok: true, sceneItemId: 1 };
  }

  const rig = await ensureObsStreamerRig(obsCall, {
    sceneName: "TEST_SCENE",
    splitUrls: {},
    ensureOverlay: true
  });
  assert.equal(rig.cameras.ok, true);
  assert.equal(rig.overlay.ok, false);
}

function testLegacyPrimaryName() {
  const prev = process.env.MIA_OBS_CAMERA_NAME;
  process.env.MIA_OBS_CAMERA_NAME = "MY_CAM";
  assert.equal(resolvePrimaryLegacyName(), "MY_CAM");
  process.env.MIA_OBS_CAMERA_NAME = prev;
}

async function main() {
  testCameraEnsurePlansAliasPrimary();
  testSplitUrlsIncludeImmersiveScene();
  testImmersiveOverlaySpec();
  await testMockObsEnsureRig();
  await testEnsureRigWithoutOverlayUrl();
  testLegacyPrimaryName();
  console.log("mia_phase20_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
