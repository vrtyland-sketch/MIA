"use strict";

/**
 * Přidá / obnoví Browser Source MIA_ARENA_BATTLE (Pokémon-styl souboj žroutů).
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const SCENE = "SPINAK_ENGINE_GIFTS";
const INPUT_NAME = "MIA_ARENA_BATTLE";
const URL = "http://127.0.0.1:3000/arena-battle-overlay.html";

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

  let created = false;
  try {
    await obs.call("GetInputSettings", { inputName: INPUT_NAME });
  } catch (_err) {
    await obs.call("CreateInput", {
      sceneName: SCENE,
      inputName: INPUT_NAME,
      inputKind: "browser_source",
      inputSettings: {
        url: URL,
        width: 1080,
        height: 1920,
        css: "body { background-color: rgba(0,0,0,0); margin: 0px; overflow: hidden; }",
        shutdown: false,
        restart_when_active: true
      },
      sceneItemEnabled: true
    });
    created = true;
  }

  await obs.call("SetInputSettings", {
    inputName: INPUT_NAME,
    inputSettings: {
      url: URL,
      width: 1080,
      height: 1920,
      shutdown: false,
      restart_when_active: true
    },
    overlay: true
  });

  const list = await obs.call("GetSceneItemList", { sceneName: SCENE });
  const item = (list.sceneItems || []).find((i) => i.sourceName === INPUT_NAME);
  if (item) {
    await obs.call("SetSceneItemEnabled", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: true
    });
    await obs.call("SetSceneItemTransform", {
      sceneName: SCENE,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: {
        positionX: 0,
        positionY: 0,
        alignment: 5,
        scaleX: 1,
        scaleY: 1,
        boundsType: "OBS_BOUNDS_NONE"
      }
    });
    // Nahoru ve stacku (nad gift videa, pod voice pokud existuje).
    try {
      await obs.call("SetSceneItemIndex", {
        sceneName: SCENE,
        sceneItemId: item.sceneItemId,
        sceneItemIndex: Math.max(0, (list.sceneItems || []).length - 2)
      });
    } catch (_err) {
      /* ignore */
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      created,
      inputName: INPUT_NAME,
      url: URL,
      hint: "Battle se ukáže při aktivním /arena/duel/start nebo turnaji."
    })
  );
  await obs.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
