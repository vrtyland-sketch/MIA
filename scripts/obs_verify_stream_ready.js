"use strict";

/**
 * Diagnostika před TikTok live (+ volitelná oprava přes MIA OBS ruce).
 * Usage:
 *   npm run obs:verify-stream-ready
 *   npm run obs:verify-stream-ready -- --fix
 *   npm run obs:verify-stream-ready -- --fix --wait
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const OBSWebSocket = require("obs-websocket-js").default;
const { buildStreamReadyReport } = require("./MIA_OBS_VERIFY");
const { requestObsHands } = require("./mia_admin_client");
const { triggerExternalRestart } = require("./MIA_SELF_RESTART");
const obsHands = require("./MIA_OBS_HANDS");
const { buildSplitUrls } = require("./MIA_OBS_VERIFY");

const PROJECT_ROOT = path.resolve(__dirname, "..");

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

const { pingHealth, waitForHealth } = require("./mia_health");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyDirectObsHands(obs, port, options = {}) {
  const sceneName =
    options.sceneName ||
    process.env.MIA_OBS_CAMERA_SCENE ||
    process.env.MIA_SOLO_STREAM_MAIN_SCENE ||
    "SPINAK_ENGINE_GIFTS";
  const { resolveHandsBodySyncMode } = require("./MIA_OBS_BODY_SYNC");
  const bodySyncMode = resolveHandsBodySyncMode(options, process.env);
  const splitUrls = buildSplitUrls(port, { bodySync: bodySyncMode });
  return obsHands.ensureObsOverlayHands(obs.call.bind(obs), {
    sceneName,
    splitUrls,
    bodySyncMode,
    layoutLocked: process.env.MIA_OBS_LAYOUT_LOCKED !== "false"
  });
}

async function runVerify(obs, port, miaOk) {
  const report = await buildStreamReadyReport({
    obsCall: obs.call.bind(obs),
    miaOk,
    port,
    env: process.env
  });
  report.mia = miaOk ? "running" : "OFFLINE — npm run restart";
  report.obs = "connected";
  return report;
}

async function applyFixes({ mia, obs, port, report }) {
  const fixLog = [];
  const browserFailed = (report.checks || []).some(
    (row) => row.group === "browser_overlay" && !row.ok
  );
  const giftFailed = (report.checks || []).some(
    (row) => row.group === "gift_video" && !row.ok
  );
  const bodyFailed = (report.checks || []).some(
    (row) => row.group === "graphics_body" && !row.ok && row.id !== "graphics_body_sync"
  );

  if (browserFailed || bodyFailed) {
    if (mia.ok) {
      const hands = await requestObsHands(port, { reason: "obs_verify_fix" });
      fixLog.push({ step: "obs_hands_api", ...hands });
      if (!hands.ok || hands.status === 404) {
        const direct = await applyDirectObsHands(obs, port);
        fixLog.push({ step: "obs_hands_direct_fallback", ...direct });
        if ((direct.created || []).length || (direct.sceneAdded || []).length) {
          triggerExternalRestart("obs_verify_fix", { delayMs: 1500 });
          fixLog.push({ step: "restart", scheduled: true, mode: "external" });
        }
      }
    } else {
      const hands = await applyDirectObsHands(obs, port);
      fixLog.push({ step: "obs_hands_direct", ...hands });
      triggerExternalRestart("obs_verify_fix_offline", { delayMs: 1200 });
      fixLog.push({ step: "restart", scheduled: true, mode: "external" });
    }
  }

  if (giftFailed) {
    const { applyCatalogToObs } = require("./media_apply_obs");
    const media = await applyCatalogToObs();
    fixLog.push({ step: "media_apply_obs", ...media });
    if ((media.applied || []).length > 0) {
      if (mia.ok) {
        const { requestRestart } = require("./mia_admin_client");
        const restart = await requestRestart(port, "obs_verify_media_fix");
        fixLog.push({ step: "restart_api", ...restart });
      } else {
        triggerExternalRestart("obs_verify_media_fix", { delayMs: 1200 });
        fixLog.push({ step: "restart", scheduled: true, mode: "external" });
      }
    }
  }

  if (!fixLog.length) {
    fixLog.push({ step: "none", detail: "žádná automatická oprava pro tento report" });
  }

  return fixLog;
}

async function runObsVerifyStreamReady(options = {}) {
  const argv = options.argv || process.argv;
  const fix = options.fix ?? argv.includes("--fix");
  const wait = options.wait ?? argv.includes("--wait");
  const env = options.env || process.env;

  if (!options.skipEnvLoad) {
    loadLocalEnv();
  }

  const port = Number(options.port || env.PORT || 3000);
  let mia = await pingHealth(port);
  const obs = new OBSWebSocket();
  const password = env.OBS_WS_PASSWORD || "";
  const wsUrl = env.OBS_WS_URL || "ws://127.0.0.1:4455";

  try {
    await obs.connect(wsUrl, password ? { password } : undefined);
  } catch (err) {
    return {
      ok: false,
      exitCode: 1,
      report: {
        ok: false,
        reason: "obs_not_connected",
        error: err.message,
        mia: mia.ok ? "running" : "offline",
        hint: "Spusť OBS + WebSocket (port 4455) a npm run restart"
      }
    };
  }

  let report = await runVerify(obs, port, mia.ok);
  let waitingMs = null;

  if (fix && !report.ok) {
    report.fixesApplied = await applyFixes({ mia, obs, port, report });
    if (wait) {
      await obs.disconnect();
      waitingMs = Number(env.MIA_VERIFY_FIX_WAIT_MS || 8000);
      await sleep(waitingMs);
      mia = await pingHealth(port, 12000);
      if (mia.ok) {
        await obs.connect(wsUrl, password ? { password } : undefined);
        report = await runVerify(obs, port, true);
        report.afterFix = true;
        report.fixesApplied = report.fixesApplied || [];
      } else {
        report.afterFix = false;
        report.afterFixHint = "MIA se restartuje — spusť verify znovu za pár sekund";
      }
    }
  }

  await obs.disconnect();

  return {
    ok: report.ok === true,
    exitCode: report.ok ? 0 : 1,
    report,
    fixesApplied: report.fixesApplied,
    afterFix: report.afterFix,
    afterFixHint: report.afterFixHint,
    waitingMs
  };
}

async function main() {
  const result = await runObsVerifyStreamReady();
  if (result.waitingMs) {
    console.log(JSON.stringify({ waitingMs: result.waitingMs, reason: "restart_after_fix" }, null, 2));
  }
  console.log(JSON.stringify(result.report, null, 2));
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  });
}

module.exports = {
  loadLocalEnv,
  pingHealth,
  pingMia: pingHealth,
  applyDirectObsHands,
  runVerify,
  applyFixes,
  runObsVerifyStreamReady
};
