"use strict";

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PRIMARY_NAME = process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA";
const TARGET_SCENE =
  process.env.MIA_OBS_CAMERA_SCENE ||
  process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
  "SPINAK_ENGINE_GIFTS";
const RESOLUTION = process.env.MIA_OBS_CAMERA_RESOLUTION || "1280x720";

const CAMERA_PRIORITY = [
  process.env.MIA_OBS_CAMERA_DEVICE,
  "FaceCam 1000X",
  "Integrated Camera"
].filter(Boolean);

function loadLocalEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

function isCameraInput(input = {}) {
  return /dshow_input|av_capture_input|video_capture/i.test(String(input.inputKind || ""));
}

function deviceId(name = "") {
  return `${String(name).replace(/:$/, "")}:`;
}

async function setSceneItemEnabled(obs, sceneName, sourceName, enabled) {
  const list = await obs.call("GetSceneItemList", { sceneName });
  const item = (list?.sceneItems || []).find((i) => i?.sourceName === sourceName);
  if (!item) return { ok: false, reason: "not_in_scene" };
  await obs.call("SetSceneItemEnabled", {
    sceneName,
    sceneItemId: item.sceneItemId,
    sceneItemEnabled: enabled
  });
  return { ok: true, enabled, sceneItemId: item.sceneItemId };
}

async function applyTransform(obs, sceneName, sceneItemId) {
  await obs.call("SetSceneItemTransform", {
    sceneName,
    sceneItemId,
    sceneItemTransform: {
      positionX: 40,
      positionY: 520,
      alignment: 5,
      boundsType: "OBS_BOUNDS_SCALE_INNER",
      boundsWidth: 320,
      boundsHeight: 180,
      scaleX: 1,
      scaleY: 1
    }
  });
}

async function restartSource(obs, sceneName, sourceName) {
  const off = await setSceneItemEnabled(obs, sceneName, sourceName, false);
  if (!off.ok) return off;
  await new Promise((r) => setTimeout(r, 350));
  return setSceneItemEnabled(obs, sceneName, sourceName, true);
}

async function main() {
  loadLocalEnv();

  const chosenDevice = CAMERA_PRIORITY[0];
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const inputs = (await obs.call("GetInputList"))?.inputs || [];
  const cameraInputs = inputs.filter(isCameraInput);
  const programScene = (await obs.call("GetCurrentProgramScene")).currentProgramSceneName;
  const sceneName = TARGET_SCENE || programScene;

  let primary = inputs.find((i) => i.inputName === PRIMARY_NAME);

  if (!primary) {
    await obs.call("CreateInput", {
      sceneName,
      inputName: PRIMARY_NAME,
      inputKind: "dshow_input",
      inputSettings: {
        video_device_id: deviceId(chosenDevice),
        last_video_device_id: deviceId(chosenDevice),
        resolution: RESOLUTION,
        res_type: 1,
        video_format: 400,
        flip_v: false
      },
      sceneItemEnabled: true
    });
    primary = { inputName: PRIMARY_NAME, inputKind: "dshow_input" };
  } else {
    await obs.call("SetInputSettings", {
      inputName: PRIMARY_NAME,
      inputSettings: {
        video_device_id: deviceId(chosenDevice),
        last_video_device_id: deviceId(chosenDevice),
        resolution: RESOLUTION,
        res_type: 1,
        video_format: 400,
        flip_v: false
      },
      overlay: true
    });
  }

  const disabled = [];
  for (const cam of cameraInputs) {
    if (cam.inputName === PRIMARY_NAME) continue;
    const result = await setSceneItemEnabled(obs, sceneName, cam.inputName, false);
    if (result.ok) {
      disabled.push(cam.inputName);
    }
  }

  const enabled = await setSceneItemEnabled(obs, sceneName, PRIMARY_NAME, true);
  if (enabled.sceneItemId) {
    await applyTransform(obs, sceneName, enabled.sceneItemId);
  }
  await restartSource(obs, sceneName, PRIMARY_NAME);

  const settings = await obs.call("GetInputSettings", { inputName: PRIMARY_NAME });

  console.log(
    JSON.stringify(
      {
        ok: true,
        activeCamera: PRIMARY_NAME,
        device: chosenDevice,
        resolution: RESOLUTION,
        scene: sceneName,
        disabledOtherCamerasInScene: disabled,
        allCameraInputsInObs: cameraInputs.map((c) => c.inputName),
        settings: settings?.inputSettings || null,
        availableDevices: ["FaceCam 1000X", "Integrated Camera"],
        hint: `Zapnutá jen ${PRIMARY_NAME} (${chosenDevice}). Druhá kamera ve scéně vypnutá.`
      },
      null,
      2
    )
  );

  await obs.disconnect();
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
