"use strict";

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) process.env[k] = v;
  }
}

async function main() {
  loadEnv();
  const obs = new OBSWebSocket();
  await obs.connect(
    process.env.OBS_WS_URL || "ws://127.0.0.1:4455",
    process.env.OBS_WS_PASSWORD
      ? { password: process.env.OBS_WS_PASSWORD }
      : undefined
  );

  const scene = "SPINAK_ENGINE_GIFTS";
  const name = "NOTEBOOK_CAMERA";
  const list = await obs.call("GetSceneItemList", { sceneName: scene });
  const item = (list.sceneItems || []).find((i) => i.sourceName === name);
  if (!item) {
    console.log(JSON.stringify({ ok: false, error: "camera_missing" }));
    process.exit(1);
  }

  await obs.call("SetSceneItemEnabled", {
    sceneName: scene,
    sceneItemId: item.sceneItemId,
    sceneItemEnabled: true
  });

  // TikTok portrait: kamera vlevo nahoře, viditelná.
  await obs.call("SetSceneItemTransform", {
    sceneName: scene,
    sceneItemId: item.sceneItemId,
    sceneItemTransform: {
      positionX: 40,
      positionY: 520,
      alignment: 5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      boundsType: "OBS_BOUNDS_SCALE_INNER",
      boundsAlignment: 0,
      boundsWidth: 360,
      boundsHeight: 640,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0
    }
  });

  // Toggle device to force renegotiate if source is 0x0.
  try {
    const cur = await obs.call("GetInputSettings", { inputName: name });
    const settings = cur.inputSettings || {};
    await obs.call("SetInputSettings", {
      inputName: name,
      inputSettings: { ...settings, active: false },
      overlay: true
    });
    await new Promise((r) => setTimeout(r, 400));
    await obs.call("SetInputSettings", {
      inputName: name,
      inputSettings: { ...settings, active: true },
      overlay: true
    });
  } catch (_err) {
    /* ignore */
  }

  const list2 = await obs.call("GetSceneItemList", { sceneName: scene });
  const item2 = (list2.sceneItems || []).find((i) => i.sourceName === name);
  const tr = item2?.sceneItemTransform || {};

  console.log(
    JSON.stringify(
      {
        ok: true,
        enabled: item2?.sceneItemEnabled,
        positionX: tr.positionX,
        positionY: tr.positionY,
        width: tr.width,
        height: tr.height,
        sourceWidth: tr.sourceWidth,
        sourceHeight: tr.sourceHeight,
        boundsWidth: tr.boundsWidth,
        boundsHeight: tr.boundsHeight
      },
      null,
      2
    )
  );

  await obs.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
