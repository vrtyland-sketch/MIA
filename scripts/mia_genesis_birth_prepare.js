"use strict";

/**
 * Připraví MIA_GENESIS pro birth show (portrait TikTok) + spustí birth sekvenci v overlayi.
 *
 *   node scripts/mia_genesis_birth_prepare.js
 *   node scripts/mia_genesis_birth_prepare.js --no-birth   (jen OBS, bez auto-start v URL)
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const OBSWebSocket = require("obs-websocket-js").default;

const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.MIA_OVERLAY_BASE || "http://127.0.0.1:3000";
const GENESIS_SCENE = "MIA_GENESIS";
const NO_BIRTH = process.argv.includes("--no-birth");

const GENESIS_SOURCES = [
  { name: "GENESIS_FX", url: `${BASE}/genesis-fx.html`, w: 1080, h: 1920 },
  {
    name: "GENESIS_OVERLAY",
    url: `${BASE}/genesis-overlay.html?birth=auto&v=${Date.now()}`,
    w: 1080,
    h: 1920
  },
  { name: "GENESIS_COMMUNITY", url: `${BASE}/genesis-community.html`, w: 1080, h: 1920 },
  { name: "GENESIS_VOICE", url: `${BASE}/mia-voice-overlay.html`, w: 200, h: 80 }
];

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
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

function pingHealth() {
  return new Promise((resolve) => {
    http
      .get(`${BASE}/health`, { timeout: 8000 }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve({ ok: res.statusCode === 200, data: JSON.parse(d) });
          } catch {
            resolve({ ok: false });
          }
        });
      })
      .on("error", () => resolve({ ok: false }));
  });
}

async function ensureScene(obs, sceneName) {
  try {
    await obs.call("CreateScene", { sceneName });
    return true;
  } catch {
    return false;
  }
}

async function inputExists(obs, name) {
  try {
    await obs.call("GetInputSettings", { inputName: name });
    return true;
  } catch {
    return false;
  }
}

async function ensureBrowser(obs, sceneName, spec) {
  const settings = {
    url: spec.url,
    width: spec.w || 1080,
    height: spec.h || 1920,
    fps: 30,
    css: "body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }",
    shutdown: false,
    restart_when_active: false
  };
  const exists = await inputExists(obs, spec.name);
  if (!exists) {
    await obs.call("CreateInput", {
      sceneName,
      inputName: spec.name,
      inputKind: "browser_source",
      inputSettings: settings,
      sceneItemEnabled: true
    });
  } else {
    await obs.call("SetInputSettings", {
      inputName: spec.name,
      inputSettings: settings,
      overlay: true
    });
    const list = await obs.call("GetSceneItemList", { sceneName });
    const item = (list.sceneItems || []).find((i) => i.sourceName === spec.name);
    if (!item) {
      await obs.call("CreateSceneItem", { sceneName, sourceName: spec.name, sceneItemEnabled: true });
    }
  }
  const list = await obs.call("GetSceneItemList", { sceneName });
  const item = (list.sceneItems || []).find((i) => i.sourceName === spec.name);
  if (item) {
    await obs.call("SetSceneItemTransform", {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: {
        positionX: 0,
        positionY: 0,
        scaleX: 1,
        scaleY: 1,
        alignment: 0,
        boundsType: "OBS_BOUNDS_NONE"
      }
    });
    await obs.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: true
    });
  }
  if (spec.name === "GENESIS_VOICE" && item) {
    try {
      await obs.call("SetInputAudioMonitorType", {
        inputName: spec.name,
        monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
      });
    } catch {
      /* optional */
    }
  }
  return spec.name;
}

async function setPortraitCanvas(obs) {
  const vcam = await obs.call("GetVirtualCamStatus");
  const vcamWasOn = Boolean(vcam?.outputActive);
  if (vcamWasOn) {
    try {
      await obs.call("StopVirtualCam");
    } catch {
      try {
        await obs.call("ToggleVirtualCam");
      } catch {
        /* ignore */
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  try {
    await obs.call("SetVideoSettings", {
      baseWidth: 1080,
      baseHeight: 1920,
      outputWidth: 1080,
      outputHeight: 1920
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/output is active/i.test(msg)) throw err;
  }
  return { vcamWasOn };
}

async function main() {
  loadEnv();

  const health = await pingHealth();
  if (!health.ok) {
    console.error(JSON.stringify({ ok: false, error: "mia_not_running", fix: "npm run restart" }));
    process.exit(1);
  }

  spawnSync("node", ["scripts/mia_genesis_obs_setup.js", "--set-program"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env
  });

  const obs = new OBSWebSocket();
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(wsUrl, password ? { password } : undefined);

  const canvasInfo = await setPortraitCanvas(obs);
  await ensureScene(obs, GENESIS_SCENE);

  const applied = [];
  for (const spec of GENESIS_SOURCES) {
    applied.push(await ensureBrowser(obs, GENESIS_SCENE, spec));
  }

  await obs.call("SetCurrentProgramScene", { sceneName: GENESIS_SCENE });

  const vcam = await obs.call("GetVirtualCamStatus");
  if (!vcam?.outputActive) {
    try {
      await obs.call("StartVirtualCam");
    } catch {
      await obs.call("ToggleVirtualCam");
    }
  }

  for (const name of ["GENESIS_OVERLAY", "GENESIS_FX", "GENESIS_VOICE"]) {
    try {
      await obs.call("PressInputPropertiesButton", {
        inputName: name,
        propertyName: "refreshnocache"
      });
    } catch {
      /* ignore */
    }
  }

  await obs.disconnect();

  const out = {
    ok: true,
    scene: GENESIS_SCENE,
    canvas: "1080x1920",
    sources: applied,
    program: GENESIS_SCENE,
    virtualCamera: true,
    birthAutoStart: !NO_BIRTH,
    operator: `${BASE}/genesis-operator.html`,
    overlay: `${BASE}/genesis-overlay.html?birth=auto`,
    hint:
      "Birth sekvence startuje ~6 s po načtení overlaye. Operátor může ručně TEST/ENABLE moduly na druhém monitoru."
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
