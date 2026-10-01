"use strict";

/**
 * Vynutí portrait 9:16 pro MIA_GENESIS — canvas + browser sources + bounds.
 *   node scripts/mia_genesis_portrait_fix.js
 */

const OBSWebSocket = require("obs-websocket-js").default;

const SCENE = "MIA_GENESIS";
const W = 1080;
const H = 1920;
const BASE = process.env.MIA_OVERLAY_BASE || "http://127.0.0.1:3000";

const SOURCES = [
  { name: "GENESIS_FX", url: `${BASE}/genesis-fx.html` },
  {
    name: "GENESIS_OVERLAY",
    url: `${BASE}/genesis-overlay.html?birth=auto&v=${Date.now()}`
  },
  { name: "GENESIS_COMMUNITY", url: `${BASE}/genesis-community.html` }
];

async function main() {
  const obs = new OBSWebSocket();
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455");

  const vcam = await obs.call("GetVirtualCamStatus");
  if (vcam?.outputActive) {
    try {
      await obs.call("StopVirtualCam");
    } catch {
      await obs.call("ToggleVirtualCam");
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  await obs.call("SetVideoSettings", {
    baseWidth: W,
    baseHeight: H,
    outputWidth: W,
    outputHeight: H
  });

  for (const spec of SOURCES) {
    await obs.call("SetInputSettings", {
      inputName: spec.name,
      inputSettings: {
        url: spec.url,
        width: W,
        height: H,
        fps: 30,
        css: "html,body{margin:0;padding:0;width:1080px;height:1920px;overflow:hidden;background:transparent;}",
        shutdown: false,
        restart_when_active: false
      },
      overlay: true
    });

    const list = await obs.call("GetSceneItemList", { sceneName: SCENE });
    const item = (list.sceneItems || []).find((i) => i.sourceName === spec.name);
    if (!item) continue;

    await obs.call("SetSceneItemEnabled", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: spec.name !== "GENESIS_COMMUNITY"
    });

    await obs.call("SetSceneItemTransform", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: {
        positionX: 0,
        positionY: 0,
        scaleX: 1,
        scaleY: 1,
        alignment: 0,
        rotation: 0,
        boundsType: "OBS_BOUNDS_NONE"
      }
    });

    try {
      await obs.call("PressInputPropertiesButton", {
        inputName: spec.name,
        propertyName: "refreshnocache"
      });
    } catch {
      /* ignore */
    }
  }

  await obs.call("SetCurrentProgramScene", { sceneName: SCENE });

  try {
    await obs.call("StartVirtualCam");
  } catch {
    await obs.call("ToggleVirtualCam");
  }

  const v = await obs.call("GetVideoSettings");
  await obs.disconnect();

  console.log(
    JSON.stringify(
      {
        ok: true,
        scene: SCENE,
        canvas: `${v.baseWidth}x${v.baseHeight}`,
        orientation: v.baseHeight > v.baseWidth ? "PORTRAIT" : "LANDSCAPE",
        virtualCamera: true,
        hint: "OBS preview musí být 9:16. TikTok LIVE Studio → Portrait + OBS Virtual Camera."
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
