"use strict";

/**
 * One-shot OBS setup for Genesis dual-scene (first launch).
 * Does NOT patch Stream Core / index.js / live manifest.
 *
 * Usage:
 *   node scripts/mia_genesis_obs_setup.js
 *   node scripts/mia_genesis_obs_setup.js --set-program
 *
 * Creates:
 *   MIA_GENESIS      — public genesis-* browser sources
 *   MIA_STREAM_TEST  — internal Core overlays (never for stream output)
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

const BASE = process.env.MIA_OVERLAY_BASE || "http://127.0.0.1:3000";
const GENESIS_SCENE = "MIA_GENESIS";
const TEST_SCENE = "MIA_STREAM_TEST";
const SET_PROGRAM = process.argv.includes("--set-program");

const GENESIS_SOURCES = [
  { name: "GENESIS_FX", url: `${BASE}/genesis-fx.html`, enabled: true, w: 1080, h: 1920 },
  { name: "GENESIS_OVERLAY", url: `${BASE}/genesis-overlay.html`, enabled: true, w: 1080, h: 1920 },
    { name: "GENESIS_COMMUNITY", url: `${BASE}/genesis-community.html`, enabled: false, w: 1080, h: 1920 }
];

/** Core overlays only on TEST scene — not on public Genesis */
const TEST_SOURCES = [
  { name: "TEST_SPEECH", url: `${BASE}/speech-overlay.html`, enabled: true },
  { name: "TEST_VOICE", url: `${BASE}/mia-voice-overlay.html`, enabled: true },
  { name: "TEST_CHAT", url: `${BASE}/chat-overlay.html`, enabled: true },
  { name: "TEST_GIFT_ANIM", url: `${BASE}/gift-animation-overlay.html`, enabled: true },
  { name: "TEST_COMBO", url: `${BASE}/combo-overlay.html`, enabled: true },
  { name: "TEST_BOWL", url: `${BASE}/kojnozrout-bowl-overlay.html`, enabled: true },
  { name: "TEST_KOJ_RUNTIME", url: `${BASE}/kojnozrout-runtime.html`, enabled: true }
];

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

async function ensureScene(obs, sceneName) {
  try {
    await obs.call("CreateScene", { sceneName });
    return { sceneName, created: true };
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (/already|exist/i.test(msg)) return { sceneName, created: false };
    // Some OBS builds return 601 if exists
    try {
      await obs.call("GetSceneItemList", { sceneName });
      return { sceneName, created: false };
    } catch (_e2) {
      throw err;
    }
  }
}

async function inputExists(obs, inputName) {
  try {
    await obs.call("GetInputSettings", { inputName });
    return true;
  } catch (_err) {
    return false;
  }
}

async function ensureBrowserInScene(obs, sceneName, spec) {
  const report = { inputName: spec.name, sceneName, created: false, linked: false, configured: false };
  const settings = {
    url: spec.url,
    width: spec.w || 1080,
    height: spec.h || 1920,
    fps: 30,
    css: "body { background-color: rgba(0,0,0,0); margin: 0px; overflow: hidden; }",
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
      sceneItemEnabled: spec.enabled !== false
    });
    report.created = true;
    report.linked = true;
    report.configured = true;
    return report;
  }

  await obs.call("SetInputSettings", {
    inputName: spec.name,
    inputSettings: settings,
    overlay: true
  });
  report.configured = true;

  const list = await obs.call("GetSceneItemList", { sceneName });
  const item = (list.sceneItems || []).find((i) => i.sourceName === spec.name);
  if (!item) {
    await obs.call("CreateSceneItem", {
      sceneName,
      sourceName: spec.name,
      sceneItemEnabled: spec.enabled !== false
    });
    report.linked = true;
  } else {
    await obs.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: spec.enabled !== false
    });
    // Full canvas
    try {
      await obs.call("SetSceneItemTransform", {
        sceneName,
        sceneItemId: item.sceneItemId,
        sceneItemTransform: {
          positionX: 0,
          positionY: 0,
          scaleX: 1,
          scaleY: 1,
          boundsType: "OBS_BOUNDS_NONE"
        }
      });
    } catch (_t) {
      // optional
    }
  }
  return report;
}

async function assertNoCoreOnGenesis(obs) {
  const list = await obs.call("GetSceneItemList", { sceneName: GENESIS_SCENE });
  const bad = (list.sceneItems || []).filter((i) => {
    const n = String(i.sourceName || "");
    return /TEST_|GIFT|CHAT_OVERLAY|KOJNOZROUT|SPEECH|SPINAK|COMBO|BOWL|VOICE/i.test(n) &&
      !/^GENESIS_/i.test(n);
  });
  return bad.map((i) => i.sourceName);
}

async function main() {
  loadEnv();
  const obs = new OBSWebSocket();
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";
  const password = process.env.OBS_WS_PASSWORD || "";

  console.log("[genesis-obs] connecting", wsUrl);
  await obs.connect(wsUrl, password ? { password } : undefined);

  const out = {
    ok: true,
    genesis: null,
    test: null,
    genesisSources: [],
    testSources: [],
    programSet: false,
    genesisContamination: [],
    note: "Operator Mode: open " + BASE + "/genesis-operator.html on 2nd monitor"
  };

  out.genesis = await ensureScene(obs, GENESIS_SCENE);
  out.test = await ensureScene(obs, TEST_SCENE);

  for (const spec of GENESIS_SOURCES) {
    out.genesisSources.push(await ensureBrowserInScene(obs, GENESIS_SCENE, spec));
  }
  for (const spec of TEST_SOURCES) {
    out.testSources.push(await ensureBrowserInScene(obs, TEST_SCENE, spec));
  }

  out.genesisContamination = await assertNoCoreOnGenesis(obs);
  if (out.genesisContamination.length) {
    out.ok = false;
    out.warning =
      "MIA_GENESIS contains non-genesis sources — remove manually: " +
      out.genesisContamination.join(", ");
  }

  if (SET_PROGRAM) {
    await obs.call("SetCurrentProgramScene", { sceneName: GENESIS_SCENE });
    out.programSet = true;
  }

  try {
    const prog = await obs.call("GetCurrentProgramScene");
    out.currentProgramScene = prog.currentProgramSceneName || prog.sceneName;
  } catch (_e) {
    out.currentProgramScene = null;
  }

  await obs.disconnect();
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exitCode = 2;
}

main().catch((err) => {
  console.error("[genesis-obs] FAILED", err.message || err);
  console.error(
    "Tip: Start OBS with WebSocket enabled (Tools → WebSocket Server). Password from .env OBS_WS_PASSWORD."
  );
  process.exit(1);
});
