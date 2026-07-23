"use strict";

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT_NAME = process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA";
const SCENE = process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS";

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

async function main() {
  loadLocalEnv();
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const settings = await obs.call("GetInputSettings", { inputName: INPUT_NAME });
  const list = await obs.call("GetSceneItemList", { sceneName: SCENE });
  const item = (list?.sceneItems || []).find((i) => i?.sourceName === INPUT_NAME);

  if (item && item.sceneItemEnabled !== true) {
    await obs.call("SetSceneItemEnabled", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: true
    });
  }

  if (item) {
    await obs.call("SetSceneItemTransform", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
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

  console.log(
    JSON.stringify(
      {
        ok: Boolean(item),
        inputName: INPUT_NAME,
        sceneName: SCENE,
        enabled: item?.sceneItemEnabled !== false,
        settings: settings?.inputSettings || null,
        transform: item?.sceneItemTransform || null
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
