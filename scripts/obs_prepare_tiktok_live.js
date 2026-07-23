"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const OBSWebSocket = require("obs-websocket-js").default;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCENE = process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS";
const CAMERA_SOURCE = process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA";

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

function pingMia(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:3000/health", { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, reason: "timeout" });
    });
  });
}

async function setSceneItemEnabled(obs, sceneName, sourceName, enabled) {
  const list = await obs.call("GetSceneItemList", { sceneName });
  const item = (list?.sceneItems || []).find((i) => i?.sourceName === sourceName);
  if (!item) return { ok: false, reason: "missing" };
  await obs.call("SetSceneItemEnabled", {
    sceneName,
    sceneItemId: item.sceneItemId,
    sceneItemEnabled: enabled
  });
  return { ok: true, enabled };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureVirtualCam(obs) {
  const before = await obs.call("GetVirtualCamStatus");
  if (before?.outputActive === true) {
    return { ok: true, already: true, outputActive: true };
  }

  for (const action of ["StartVirtualCam", "ToggleVirtualCam"]) {
    try {
      await obs.call(action);
    } catch (_err) {
      // try next action
    }
    await sleep(1200);
    const mid = await obs.call("GetVirtualCamStatus");
    if (mid?.outputActive === true) {
      return { ok: true, outputActive: true, action };
    }
  }

  const after = await obs.call("GetVirtualCamStatus");
  return {
    ok: after?.outputActive === true,
    outputActive: after?.outputActive === true,
    manualHint: "OBS → Tools → Start Virtual Camera"
  };
}

async function main() {
  loadLocalEnv();

  const mia = await pingMia();
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const vcam = await ensureVirtualCam(obs);
  const stream = await obs.call("GetStreamStatus");

  let cameraDisabled = null;
  try {
    cameraDisabled = await setSceneItemEnabled(obs, SCENE, CAMERA_SOURCE, false);
  } catch (_err) {
    cameraDisabled = { ok: false, reason: "skip" };
  }

  const programScene = (await obs.call("GetCurrentProgramScene")).currentProgramSceneName;

  const report = {
    ok: vcam.outputActive === true && mia.ok === true,
    mia: mia.ok ? "running" : "OFFLINE — spusť npm run restart",
    obsVirtualCamera: vcam.outputActive ? "ON" : "OFF — spusť v OBS: Start Virtual Camera",
    obsStreaming: stream?.outputActive ? "ON (vypni — stream jde přes TikTok Studio)" : "OFF (správně)",
    programScene,
    scene: SCENE,
    notebookCameraInScene: cameraDisabled?.enabled === false ? "disabled (kvůli konfliktu zařízení)" : "unchanged",
    tiktokSteps: [
      "1. V OBS: Virtual Camera ZAPNUTÁ (tento skript ji zapíná)",
      "2. V OBS: NEKlikej Start Streaming — live jde přes TikTok Studio",
      "3. TikTok LIVE Studio → zdroj videa → OBS Virtual Camera",
      "4. FaceCam/Integrated nepoužívej v TikToku zároveň s OBS Virtual Camera",
      "5. Před live: npm run restart (MIA overlaye na portu 3000)"
    ]
  };

  console.log(JSON.stringify(report, null, 2));
  await obs.disconnect();
  process.exitCode = report.ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
