"use strict";

/**
 * AWAY video smyčka — ffmpeg MP4 nebo browser CSS loop ve scéně SPINAK_NEJSEM_TU.
 */

const fs = require("fs");
const path = require("path");

const hostModeConfig = require("./MIA_HOST_MODE_CONFIG");
const obsHands = require("./MIA_OBS_HANDS");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const DEFAULT_LOOP = Object.freeze({
  inputName: "MIA_AWAY_LOOP",
  legacyInputNames: ["nejsem tu smyčka", "NEJSEM TU SMYCKA"],
  browserFile: "away-loop-overlay.html",
  videoRelPath: "incoming-images/videos/away/nejsem_tu_loop.mp4",
  mode: "auto",
  looping: true,
  width: 1920,
  height: 1080
});

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePath(filePath = "") {
  return String(filePath || "").trim().replace(/\\/g, "/");
}

function getAwayLoopConfig() {
  const raw = hostModeConfig.getConfig()?.awayLoop || {};
  return {
    ...DEFAULT_LOOP,
    ...raw,
    legacyInputNames: [
      ...(raw.legacyInputNames || DEFAULT_LOOP.legacyInputNames),
      ...(Array.isArray(raw.legacyInputName) ? raw.legacyInputName : raw.legacyInputName ? [raw.legacyInputName] : [])
    ]
  };
}

function resolveAwayLoopVideoAbs(env = process.env) {
  const config = getAwayLoopConfig();
  const explicit = safeString(env.MIA_AWAY_LOOP_VIDEO);
  const rel = explicit || config.videoRelPath;
  if (!rel) return null;
  if (/^[a-z]:\\|^\/|^\\\\/i.test(rel)) {
    return path.normalize(rel);
  }
  return path.join(PROJECT_ROOT, rel);
}

function awayLoopVideoExists(env = process.env) {
  const abs = resolveAwayLoopVideoAbs(env);
  return Boolean(abs && fs.existsSync(abs));
}

function resolveAwayLoopMode(env = process.env) {
  const config = getAwayLoopConfig();
  const raw = safeString(env.MIA_AWAY_LOOP_MODE || config.mode, "auto").toLowerCase();
  if (raw === "browser") return "browser";
  if (raw === "video" || raw === "ffmpeg") return "video";
  return awayLoopVideoExists(env) ? "video" : "browser";
}

function buildAwayLoopBrowserUrl(port = 3000) {
  return `http://127.0.0.1:${port}/${getAwayLoopConfig().browserFile}`;
}

function normalizeInputName(value = "") {
  return safeString(value).toUpperCase();
}

function resolveExistingLoopInputName(inputs = [], config = getAwayLoopConfig()) {
  const wanted = new Set([
    normalizeInputName(config.inputName),
    ...config.legacyInputNames.map(normalizeInputName)
  ]);

  for (const input of inputs) {
    if (!input?.inputName) continue;
    if (wanted.has(normalizeInputName(input.inputName))) {
      return input.inputName;
    }
  }
  return null;
}

async function getSceneItem(obsCall, sceneName, sourceName) {
  const list = await obsCall("GetSceneItemList", { sceneName });
  return (list?.sceneItems || list?.response?.sceneItems || []).find(
    (item) => item?.sourceName === sourceName
  );
}

async function sendSceneItemToBack(obsCall, sceneName, sourceName) {
  const item = await getSceneItem(obsCall, sceneName, sourceName);
  if (!item?.sceneItemId) {
    return { ok: false, reason: "scene_item_missing" };
  }

  await obsCall("SetSceneItemIndex", {
    sceneName,
    sceneItemId: item.sceneItemId,
    sceneItemIndex: 0
  });

  return { ok: true, sceneItemId: item.sceneItemId };
}

async function ensureBrowserLoop(obsCall, sceneName, options = {}) {
  const config = getAwayLoopConfig();
  const port = Number(options.port || process.env.PORT || 3000);
  const targetUrl = safeString(options.targetUrl, buildAwayLoopBrowserUrl(port));

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const existing = resolveExistingLoopInputName(inputs, config);
  const inputName = existing || config.inputName;

  let created = false;
  if (!existing) {
    await obsCall("CreateInput", {
      sceneName,
      inputName,
      inputKind: "browser_source",
      inputSettings: {
        url: targetUrl,
        width: config.width,
        height: config.height,
        fps: 30,
        reroute_audio: false,
        shutdown: false,
        restart_when_active: false
      },
      sceneItemEnabled: true
    });
    created = true;
  } else {
    await obsCall("SetInputSettings", {
      inputName,
      inputSettings: {
        url: targetUrl,
        width: config.width,
        height: config.height,
        fps: 30,
        reroute_audio: false,
        shutdown: false,
        restart_when_active: false
      },
      overlay: true
    });

    const sceneItem = await getSceneItem(obsCall, sceneName, inputName);
    if (!sceneItem) {
      await obsCall("CreateSceneItem", {
        sceneName,
        sourceName: inputName,
        sceneItemEnabled: true
      });
    }
  }

  await sendSceneItemToBack(obsCall, sceneName, inputName);

  return {
    ok: true,
    mode: "browser",
    inputName,
    created,
    url: targetUrl
  };
}

async function ensureFfmpegLoop(obsCall, sceneName, options = {}) {
  const config = getAwayLoopConfig();
  const env = options.env || process.env;
  const videoAbs = resolveAwayLoopVideoAbs(env);

  if (!videoAbs || !fs.existsSync(videoAbs)) {
    return {
      ok: false,
      reason: "away_loop_video_missing",
      hint: "npm run media:generate-away-loop  nebo  MIA_AWAY_LOOP_MODE=browser"
    };
  }

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const existing = resolveExistingLoopInputName(inputs, config);
  const inputName = existing || config.inputName;
  const obsPath = normalizePath(videoAbs);

  let created = false;
  if (!existing) {
    await obsCall("CreateInput", {
      sceneName,
      inputName,
      inputKind: "ffmpeg_source",
      inputSettings: {
        local_file: obsPath,
        looping: config.looping !== false,
        restart_on_activate: false,
        close_when_inactive: false,
        clear_on_media_end: false
      },
      sceneItemEnabled: true
    });
    created = true;
  } else {
    await obsCall("SetInputSettings", {
      inputName,
      inputSettings: {
        local_file: obsPath,
        looping: config.looping !== false,
        restart_on_activate: false
      },
      overlay: true
    });

    const sceneItem = await getSceneItem(obsCall, sceneName, inputName);
    if (!sceneItem) {
      await obsCall("CreateSceneItem", {
        sceneName,
        sourceName: inputName,
        sceneItemEnabled: true
      });
    }
  }

  const sceneItem = await getSceneItem(obsCall, sceneName, inputName);
  if (sceneItem?.sceneItemId != null) {
    try {
      await obsCall("SetSceneItemTransform", {
        sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemTransform: {
          boundsType: "OBS_BOUNDS_SCALE_INNER",
          boundsAlignment: 0,
          boundsWidth: config.width,
          boundsHeight: config.height,
          alignment: 5
        }
      });
    } catch (_err) {
      // ignore layout errors
    }
  }

  await sendSceneItemToBack(obsCall, sceneName, inputName);

  return {
    ok: true,
    mode: "video",
    inputName,
    created,
    localFile: obsPath
  };
}

async function ensureAwayLoopInScene(obsCall, sceneName, options = {}) {
  if (typeof obsCall !== "function") {
    return { ok: false, reason: "obs_call_missing" };
  }

  const targetScene = safeString(sceneName);
  if (!targetScene) {
    return { ok: false, reason: "missing_scene_name" };
  }

  const env = options.env || process.env;
  let mode = resolveAwayLoopMode(env);

  if (mode === "video") {
    const videoResult = await ensureFfmpegLoop(obsCall, targetScene, options);
    if (videoResult.ok) return videoResult;
    mode = "browser";
  }

  return ensureBrowserLoop(obsCall, targetScene, options);
}

function buildAwayLoopStatus(env = process.env) {
  const config = getAwayLoopConfig();
  const videoAbs = resolveAwayLoopVideoAbs(env);
  const mode = resolveAwayLoopMode(env);
  return {
    mode,
    inputName: config.inputName,
    browserUrl: buildAwayLoopBrowserUrl(Number(env.PORT || 3000)),
    videoRelPath: config.videoRelPath,
    videoAbs,
    videoExists: Boolean(videoAbs && fs.existsSync(videoAbs)),
    browserFile: config.browserFile
  };
}

module.exports = {
  DEFAULT_LOOP,
  getAwayLoopConfig,
  resolveAwayLoopVideoAbs,
  awayLoopVideoExists,
  resolveAwayLoopMode,
  buildAwayLoopBrowserUrl,
  ensureAwayLoopInScene,
  buildAwayLoopStatus,
  sendSceneItemToBack
};
