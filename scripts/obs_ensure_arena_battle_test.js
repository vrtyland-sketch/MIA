"use strict";

/**
 * OBS: přidá Browser Source MIA_ARENA_BATTLE_TEST (2×2 grid všech 4 Kojů).
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const SCENE = "SPINAK_ENGINE_GIFTS";
const INPUT_NAME = "MIA_ARENA_BATTLE_TEST";
const URL = "http://127.0.0.1:3000/arena-battle-test-overlay.html";

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) process.env[k] = v;
  }
}

async function ensureBrowserSource(obs, inputName, url, width, height, transform) {
  let created = false;
  try {
    await obs.call("GetInputSettings", { inputName });
  } catch (_err) {
    await obs.call("CreateInput", {
      sceneName: SCENE,
      inputName,
      inputKind: "browser_source",
      inputSettings: {
        url,
        width,
        height,
        css: "body { background-color: rgba(0,0,0,0); margin: 0px; overflow: hidden; }",
        shutdown: false,
        restart_when_active: true
      },
      sceneItemEnabled: true
    });
    created = true;
  }
  await obs.call("SetInputSettings", {
    inputName,
    inputSettings: { url, width, height, shutdown: false, restart_when_active: true },
    overlay: true
  });
  const list = await obs.call("GetSceneItemList", { sceneName: SCENE });
  const item = (list.sceneItems || []).find((i) => i.sourceName === inputName);
  if (item) {
    await obs.call("SetSceneItemEnabled", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: true
    });
    await obs.call("SetSceneItemTransform", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: transform
    });
  }
  return { created, inputName, url };
}

async function main() {
  loadEnv();
  const obs = new OBSWebSocket();
  await obs.connect(
    process.env.OBS_WS_URL || "ws://127.0.0.1:4455",
    process.env.OBS_WS_PASSWORD ? { password: process.env.OBS_WS_PASSWORD } : undefined
  );

  const test = await ensureBrowserSource(obs, INPUT_NAME, URL, 1080, 960, {
    positionX: 0,
    positionY: 420,
    alignment: 5,
    scaleX: 1,
    scaleY: 1
  });

  console.log(
    JSON.stringify({
      ok: true,
      ...test,
      hint: "Spusť npm run battle:demo — uvidíš rotaci póz na všech 4 Kojích."
    })
  );
  await obs.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
