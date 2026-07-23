"use strict";

/**
 * Přepne OBS plátno (base + output rozlišení) a přerovná MIA overlaye.
 *
 * TikTok LIVE je 9:16 na výšku → plátno musí být portrait (1080×1920),
 * jinak se overlaye rozloží na šířku. FPS se zachová.
 *
 *   npm run obs:portrait              → 1080×1920 (TikTok na výšku)
 *   npm run obs:landscape            → 1920×1080 (na šířku)
 *   node scripts/obs_set_canvas.js 1080 1920
 */

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { applyObsOverlayLayout } = require("./obs_fix_overlay_layout");

const ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = val;
  }
}

function parseDims(argv) {
  const named = argv.find((a) => /^--?(portrait|landscape)$/i.test(a));
  if (named && /portrait/i.test(named)) return { w: 1080, h: 1920 };
  if (named && /landscape/i.test(named)) return { w: 1920, h: 1080 };
  const nums = argv.filter((a) => /^\d+$/.test(a)).map(Number);
  if (nums.length >= 2) return { w: nums[0], h: nums[1] };
  return { w: 1080, h: 1920 }; // default: TikTok na výšku
}

async function main() {
  loadLocalEnv();
  const { w, h } = parseDims(process.argv.slice(2));
  if (w < 320 || h < 320 || w > 4096 || h > 4096) {
    throw new Error(`Nepřípustné rozlišení ${w}×${h}`);
  }

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  await obs.connect(process.env.OBS_WS_URL || "ws://127.0.0.1:4455", password ? { password } : undefined);

  const before = await obs.call("GetVideoSettings");
  const fpsNumerator = before.fpsNumerator || 30;
  const fpsDenominator = before.fpsDenominator || 1;

  // OBS nedovolí měnit plátno za běhu výstupu — virtuální kameru / stream / nahrávání
  // dočasně vypneme a po přepnutí vrátíme do původního stavu.
  const stopped = { vcam: false, stream: false, record: false };
  try {
    const vc = await obs.call("GetVirtualCamStatus");
    if (vc?.outputActive) {
      await obs.call("StopVirtualCam");
      stopped.vcam = true;
    }
  } catch (_e) {}
  try {
    const st = await obs.call("GetStreamStatus");
    if (st?.outputActive) {
      await obs.call("StopStream");
      stopped.stream = true;
    }
  } catch (_e) {}
  try {
    const rc = await obs.call("GetRecordStatus");
    if (rc?.outputActive) {
      await obs.call("StopRecord");
      stopped.record = true;
    }
  } catch (_e) {}

  if (stopped.vcam || stopped.stream || stopped.record) {
    await new Promise((r) => setTimeout(r, 800));
  }

  await obs.call("SetVideoSettings", {
    fpsNumerator,
    fpsDenominator,
    baseWidth: w,
    baseHeight: h,
    outputWidth: w,
    outputHeight: h
  });

  // Vrátíme výstupy, které jsme kvůli přepnutí vypnuli.
  if (stopped.vcam) {
    try {
      await obs.call("StartVirtualCam");
    } catch (_e) {}
  }
  if (stopped.record) {
    try {
      await obs.call("StartRecord");
    } catch (_e) {}
  }

  const after = await obs.call("GetVideoSettings");

  // Přerovnej overlaye na nové plátno (kód se řídí canvasem z OBS).
  let layout = { ok: false };
  try {
    layout = await applyObsOverlayLayout(obs, {
      sceneName: process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS",
      platform: process.env.MIA_STREAM_PLATFORM || "auto",
      kickBridge: String(process.env.MIA_KICK_BRIDGE_ENABLED || "").toLowerCase() === "1"
    });
  } catch (err) {
    layout = { ok: false, error: err.message };
  }

  const orientation = after.baseHeight > after.baseWidth ? "na výšku (portrait)" : "na šířku (landscape)";
  console.log(JSON.stringify({
    ok: true,
    before: { base: `${before.baseWidth}×${before.baseHeight}` },
    after: { base: `${after.baseWidth}×${after.baseHeight}`, output: `${after.outputWidth}×${after.outputHeight}`, fps: fpsNumerator / fpsDenominator, orientation },
    restartedOutputs: stopped,
    overlaysRealigned: layout.ok === true,
    overlayPositions: layout.applied || 0,
    hint: "Zkontroluj v OBS Preview, pak: npm run display:self-check"
  }, null, 2));

  await obs.disconnect();
  process.exitCode = 0;
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
