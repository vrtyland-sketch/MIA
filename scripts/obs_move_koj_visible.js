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
  const list = await obs.call("GetSceneItemList", { sceneName: scene });
  const koj = list.sceneItems.find((i) => i.sourceName === "KOJNOZROUT_RUNTIME");
  if (!koj) {
    console.log(JSON.stringify({ ok: false, error: "koj_missing" }));
    process.exit(1);
  }

  await obs.call("SetSceneItemEnabled", {
    sceneName: scene,
    sceneItemId: koj.sceneItemId,
    sceneItemEnabled: true
  });

  // Portrait 1080x1920 — Koj doprostřed dole, alignment top-left.
  await obs.call("SetSceneItemTransform", {
    sceneName: scene,
    sceneItemId: koj.sceneItemId,
    sceneItemTransform: {
      positionX: 280,
      positionY: 1100,
      alignment: 5,
      scaleX: 1.15,
      scaleY: 1.15,
      boundsType: "OBS_BOUNDS_NONE",
      rotation: 0
    }
  });

  console.log(JSON.stringify({ ok: true, koj: "280,1100 scale 1.15" }));
  await obs.disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
