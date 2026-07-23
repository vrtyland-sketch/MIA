"use strict";

const OBSWebSocket = require("obs-websocket-js").default;
const obsHands = require("./MIA_OBS_HANDS");
const { buildSplitUrls } = require("./MIA_OBS_LIVE_MANIFEST");
const {
  BODY_PARTS,
  getBodyPartObsTransform
} = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const {
  normalizeBodyLayout,
  getHeroObsTransform,
  HERO_BROWSER_SIZE
} = require("../shared/mia-graphics-studio/bodyHeroPortrait");

const SPEECH_REFRESH_INPUTS = ["MIA_BUBBLE", "MIA_SPEECH"];

async function refreshBrowserNoCache(obsCall, inputName) {
  try {
    await obsCall("PressInputPropertiesButton", {
      inputName,
      propertyName: "refreshnocache"
    });
    return true;
  } catch (_err) {
    return false;
  }
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveSceneName(options = {}, env = process.env) {
  return (
    safeString(options.sceneName) ||
    safeString(env.MIA_OBS_CAMERA_SCENE) ||
    safeString(env.MIA_SOLO_STREAM_MAIN_SCENE) ||
    "SPINAK_ENGINE_GIFTS"
  );
}

function buildBodyPartSpecs() {
  return BODY_PARTS.map((row) => ({
    id: row.id,
    part: row.part,
    inputName: row.inputName,
    urlKey: row.urlKey,
    nameAliases: [row.inputName, row.part.toUpperCase(), `MIA_${row.part.toUpperCase()}`],
    urlPattern: new RegExp(`mia-body-part.*part=${row.part}|${row.inputName}`, "i")
  }));
}

const BODY_PART_SPECS = buildBodyPartSpecs();

async function readBrowserInputSettings(obsCall, inputs) {
  const cache = {};
  for (const input of inputs) {
    if (input?.inputKind !== "browser_source") continue;
    try {
      const resp = await obsCall("GetInputSettings", { inputName: input.inputName });
      cache[input.inputName] = safeString(
        resp?.inputSettings?.url || resp?.inputSettings?.local_file || ""
      );
    } catch (_err) {
      cache[input.inputName] = "";
    }
  }
  return cache;
}

async function getSceneItem(obsCall, sceneName, sourceName) {
  const list = await obsCall("GetSceneItemList", { sceneName });
  return (list?.sceneItems || []).find((item) => item?.sourceName === sourceName) || null;
}

async function ensureHybridUrl(obsCall, inputName, targetUrl, inputSettings = {}, size = {}) {
  const currentUrl = safeString(inputSettings.url);
  const width = Number(size.width) || Number(inputSettings.width) || 512;
  const height = Number(size.height) || Number(inputSettings.height) || 512;
  const transparentCss =
    "html, body { background-color: rgba(0,0,0,0) !important; margin:0; overflow:hidden; }";
  const needsUrl = targetUrl && currentUrl !== targetUrl;
  const needsSize =
    Number(inputSettings.width) !== width || Number(inputSettings.height) !== height;
  const needsCss = safeString(inputSettings.css) !== transparentCss;
  if (!needsUrl && !needsSize && !needsCss) {
    return { ok: true, configured: false, inputName, url: currentUrl || targetUrl };
  }
  await obsCall("SetInputSettings", {
    inputName,
    inputSettings: {
      ...inputSettings,
      url: targetUrl || currentUrl,
      width,
      height,
      css: transparentCss,
      fps: inputSettings.fps || 30,
      shutdown: false,
      restart_when_active: true
    },
    overlay: true
  });
  return { ok: true, configured: true, inputName, url: targetUrl || currentUrl };
}

async function setBodyPartSceneItem(obsCall, sceneName, sourceName, enabled, options = {}) {
  const sceneItem = await getSceneItem(obsCall, sceneName, sourceName);
  if (!sceneItem || sceneItem.sceneItemId == null) {
    return { ok: false, reason: "scene_item_missing", sourceName, enabled };
  }

  await obsCall("SetSceneItemEnabled", {
    sceneName,
    sceneItemId: sceneItem.sceneItemId,
    sceneItemEnabled: !!enabled
  });

  if (enabled && options.applyTransform !== false) {
    try {
      const partKey = String(sourceName || "")
        .toLowerCase()
        .replace(/^mia_/, "");
      const layout = normalizeBodyLayout(options.layout, "hero");
      const transform =
        layout === "hero" && partKey === "head"
          ? getHeroObsTransform()
          : getBodyPartObsTransform(partKey);
      await obsCall("SetSceneItemTransform", {
        sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemTransform: transform
      });
    } catch (_err) {
      // ignore transform errors — visibility is primary
    }
  }

  return { ok: true, sourceName, enabled, sceneItemId: sceneItem.sceneItemId };
}

async function syncObsBodyPreviewVisibility(options = {}) {
  const parts = options.parts && typeof options.parts === "object" ? options.parts : {};
  const layout = normalizeBodyLayout(options.layout, "hero");
  const sceneName = resolveSceneName(options);
  const port = Number(options.port || process.env.PORT || 3000);
  const splitUrls = buildSplitUrls(port, { bodySync: options.bodySync || "hybrid" });
  const handsSpecById = new Map(
    (obsHands.OVERLAY_HANDS_SPECS || []).filter((row) => row.id).map((row) => [row.id, row])
  );

  return withObsCall(async (obsCall) => {
    const inputList = await obsCall("GetInputList");
    const inputs = [...(inputList?.inputs || [])];
    const urlByInput = await readBrowserInputSettings(obsCall, inputs);
    const results = [];

    // Startup check překryje celý Program — při body preview ho schovej.
    if (options.hideStartupCheck !== false) {
      try {
        await setBodyPartSceneItem(obsCall, sceneName, "MIA_STARTUP_CHECK", false, {
          applyTransform: false
        });
      } catch (_err) {
        // ignore
      }
    }

    for (const spec of BODY_PART_SPECS) {
      const enabled = parts[spec.part] === true;
      const handsSpec = handsSpecById.get(spec.id) || {
        inputName: spec.inputName,
        nameAliases: spec.nameAliases,
        urlPattern: spec.urlPattern,
        urlKey: spec.urlKey
      };
      const resolvedInput =
        obsHands.resolveExistingInputName(handsSpec, inputs, urlByInput) || spec.inputName;
      const targetUrl = splitUrls[spec.urlKey] || "";

      let inputSettings = {};
      try {
        const settingsResp = await obsCall("GetInputSettings", { inputName: resolvedInput });
        inputSettings = settingsResp?.inputSettings || {};
      } catch (_err) {
        results.push({
          id: spec.id,
          part: spec.part,
          inputName: resolvedInput,
          ok: false,
          reason: "input_missing"
        });
        continue;
      }

      const partMeta = BODY_PARTS.find((row) => row.id === spec.id) || {};
      const size =
        layout === "hero" && spec.part === "head"
          ? HERO_BROWSER_SIZE
          : {
              width: partMeta.width || 512,
              height: partMeta.height || 512
            };
      const urlResult = enabled
        ? await ensureHybridUrl(obsCall, resolvedInput, targetUrl, inputSettings, size)
        : { ok: true, configured: false, inputName: resolvedInput };

      const visResult = await setBodyPartSceneItem(obsCall, sceneName, resolvedInput, enabled, {
        applyTransform: options.applyTransform !== false,
        layout
      });

      let refreshed = false;
      if (enabled && options.refreshBrowsers !== false) {
        refreshed = await refreshBrowserNoCache(obsCall, resolvedInput);
      }

      results.push({
        id: spec.id,
        part: spec.part,
        inputName: resolvedInput,
        enabled,
        ok: visResult.ok === true,
        configuredUrl: urlResult.configured === true,
        refreshed,
        reason: visResult.reason || null
      });
    }

    const speechRefreshed = [];
    if (options.refreshSpeech !== false && options.refreshBrowsers !== false) {
      for (const inputName of SPEECH_REFRESH_INPUTS) {
        if (await refreshBrowserNoCache(obsCall, inputName)) {
          speechRefreshed.push(inputName);
        }
      }
    }

    const ok = results.some((row) => row.ok && row.enabled) || results.every((row) => row.ok);
    return {
      ok,
      phase: "13e",
      sceneName,
      bodySync: options.bodySync || "hybrid",
      transformMode: layout,
      layout,
      speechRefreshed,
      results
    };
  }, options);
}

async function hideAllObsBodyParts(options = {}) {
  const parts = Object.fromEntries(BODY_PARTS.map((row) => [row.part, false]));
  return syncObsBodyPreviewVisibility({ ...options, parts });
}

async function withObsCall(fn, options = {}) {
  if (typeof options.obsCall === "function") {
    return fn(options.obsCall);
  }

  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  try {
    await obs.connect(wsUrl, password ? { password } : undefined);
    return await fn(obs.call.bind(obs));
  } catch (err) {
    return {
      ok: false,
      reason: "obs_connect_failed",
      error: String(err?.message || err),
      hint: "Spusť OBS + WebSocket (port 4455)"
    };
  } finally {
    try {
      await obs.disconnect();
    } catch (_err) {
      // ignore
    }
  }
}

module.exports = {
  BODY_PART_SPECS,
  resolveSceneName,
  syncObsBodyPreviewVisibility,
  hideAllObsBodyParts,
  withObsCall
};
