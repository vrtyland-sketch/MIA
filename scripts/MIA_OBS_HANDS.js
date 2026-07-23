"use strict";

/**
 * MIA ruce — vytváří a doplňuje OBS browser overlay zdroje podle kanonického manifestu.
 * Nevytváří duplicity: nejdřív hledá existující zdroj podle URL nebo aliasu jména.
 */

const startupCheckModule = require("./MIA_STARTUP_CHECK");
const { BODY_PARTS, getBodyPartObsTransform } = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const { resolveObsInputNames } = require("./MIA_OBS_LIVE_MANIFEST");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const OVERLAY_HANDS_SPECS = [
  {
    id: "startup",
    inputName: "MIA_STARTUP_CHECK",
    nameAliases: [],
    urlKey: "startupCheck",
    urlPattern: /startup-check/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "speech",
    inputName: "MIA_SPEECH",
    nameAliases: ["MIA_BUBBLE", "MIA_SPEECH_OVERLAY", "SPEECH_OVERLAY"],
    urlKey: "speech",
    urlPattern: /speech-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: true
  },
  {
    id: "entity",
    inputName: "MIA_ENTITY",
    nameAliases: ["MIA_STATUS", "MIA_LIVE_BADGE"],
    urlKey: "status",
    urlPattern: /entity-overlay/i,
    width: 300,
    height: 130,
    rerouteAudio: false,
    sceneItemEnabled: true
  },
  {
    id: "combo",
    inputName: "MIA_COMBO",
    nameAliases: ["MIA_COMBO_OVERLAY"],
    urlKey: "combo",
    urlPattern: /combo-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "boss_cinematic",
    inputName: "MIA_BOSS_CINEMATIC",
    nameAliases: ["MIA_BOSS_CINEMATIC_OVERLAY", "BOSS_CINEMATIC"],
    urlKey: "bossCinematic",
    urlPattern: /boss-cinematic-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "immersive_scene",
    inputName: "MIA_IMMERSIVE_SCENE",
    nameAliases: ["IMMERSIVE_SCENE", "MIA_IMMERSIVE"],
    urlKey: "immersiveScene",
    urlPattern: /immersive-scene/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "host_mode",
    inputName: "MIA_HOST_MODE",
    nameAliases: ["MIA_HOST", "HOST_MODE", "NEJSEM_TU"],
    urlKey: "hostMode",
    urlPattern: /host-mode-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "bowl",
    inputName: "MIA_BOWL",
    nameAliases: ["KOJNOZROUT_BOWL", "KOJNOZROUT_BOWL_V2", "KOJ_MISKA"],
    urlKey: "bowl",
    urlPattern: /bowl-overlay|kojnozrout-bowl/i,
    width: 320,
    height: 240,
    rerouteAudio: false,
    sceneItemEnabled: true,
    transform: { positionX: 1479, positionY: 134, scaleX: 0.84, scaleY: 0.84, alignment: 6 }
  },
  {
    id: "runtime",
    inputName: "MIA_KOJ_RUNTIME",
    nameAliases: ["KOJNOZROUT_RUNTIME", "KOJ_RUNTIME", "KOJ_SPRITE"],
    urlKey: "runtime",
    urlPattern: /kojnozrout-runtime/i,
    width: 400,
    height: 400,
    rerouteAudio: false,
    sceneItemEnabled: true,
    transform: { positionX: 1872, positionY: 788, scaleX: 0.74, scaleY: 0.74, alignment: 10 }
  },
  {
    id: "voice",
    inputName: "MIA_VOICE",
    nameAliases: ["MIA_TTS", "MIA_VOICE_OVERLAY"],
    urlKey: "voice",
    urlPattern: /voice-overlay|mia-voice-overlay/i,
    width: 200,
    height: 80,
    rerouteAudio: true,
    sceneItemEnabled: true,
    isVoice: true,
    transform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, alignment: 5 }
  },
  {
    id: "gift_moment",
    inputName: "MIA_GIFT_MOMENT",
    nameAliases: ["GIFT_MOMENT"],
    urlKey: "giftMoment",
    urlPattern: /gift-moment/i,
    width: 960,
    height: 540,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "gift_animation",
    inputName: "MIA_GIFT_ANIMATION",
    nameAliases: ["GIFT_ANIMATION", "MIA_GIFT_ANIM"],
    urlKey: "giftAnimation",
    urlPattern: /gift-animation-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    // Always on — overlay opacity self-hides; disabled source stops polling.
    sceneItemEnabled: true
  },
  {
    id: "evolution",
    inputName: "MIA_EVOLUTION",
    nameAliases: ["MIA_EVOLUTION_TOAST", "EVOLUTION_TOAST"],
    urlKey: "evolutionToast",
    urlPattern: /evolution-toast/i,
    width: 420,
    height: 140,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "backpack",
    inputName: "MIA_BACKPACK",
    nameAliases: ["KOJNOZROUT_BACKPACK", "KOJ_BACKPACK"],
    urlKey: "backpack",
    urlPattern: /backpack-overlay/i,
    width: 320,
    height: 240,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "story",
    inputName: "MIA_STORY",
    nameAliases: ["MIA_STORY_MOMENT", "STORY_MOMENT"],
    urlKey: "storyMoment",
    urlPattern: /story-moment/i,
    width: 960,
    height: 540,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "t0_flyby",
    inputName: "MIA_T0_FLYBY",
    nameAliases: ["T0_FLYBY", "MIA_FLYBY"],
    urlKey: "t0Flyby",
    urlPattern: /t0-flyby/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "duel",
    inputName: "MIA_DUEL",
    nameAliases: ["KOJNOZROUT_DUEL", "DUEL_BAR"],
    urlKey: "duel",
    urlPattern: /duel-overlay/i,
    width: 1920,
    height: 1080,
    rerouteAudio: false,
    sceneItemEnabled: false
  },
  {
    id: "viewer_strip",
    inputName: "MIA_VIEWER_STRIP",
    nameAliases: ["VIEWER_STRIP", "MIA_VIEWERS"],
    urlKey: "viewerStrip",
    urlPattern: /viewer-strip/i,
    width: 720,
    height: 120,
    rerouteAudio: false,
    sceneItemEnabled: true,
    transform: { positionX: 28, positionY: 940, scaleX: 1, scaleY: 1, alignment: 1 }
  },
  {
    id: "graphics_preview",
    inputName: "MIA_GRAPHICS_PREVIEW",
    nameAliases: ["GRAPHICS_PREVIEW", "MIA_PAINT_PREVIEW"],
    urlKey: "graphicsPreview",
    urlPattern: /mia-graphics-preview/i,
    width: 512,
    height: 512,
    rerouteAudio: false,
    sceneItemEnabled: false,
    transform: { positionX: 1680, positionY: 120, scaleX: 0.45, scaleY: 0.45, alignment: 6 }
  },
  ...BODY_PARTS.map((row) => ({
    id: row.id,
    inputName: row.inputName,
    nameAliases: [row.inputName, row.part.toUpperCase(), `MIA_${row.part.toUpperCase()}`],
    urlKey: row.urlKey,
    urlPattern: new RegExp(`mia-body-part.*part=${row.part}|${row.inputName}`, "i"),
    width: row.width,
    height: row.height,
    rerouteAudio: false,
    sceneItemEnabled: row.defaultVisible === true,
    transform: getBodyPartObsTransform(row.part)
  }))
];

function buildOverlayHandsSpecs(splitUrls = {}) {
  return OVERLAY_HANDS_SPECS.map((spec) => ({
    ...spec,
    targetUrl: safeString(splitUrls[spec.urlKey])
  })).filter((spec) => spec.targetUrl);
}

function buildObsRecommendedSpecs(splitUrls = {}) {
  const obsIds = new Set(
    (startupCheckModule.OVERLAY_MANIFEST || [])
      .filter((row) => row.obs === true)
      .map((row) => row.id)
  );
  return buildOverlayHandsSpecs(splitUrls).filter((spec) => obsIds.has(spec.id));
}

function normalizeName(value = "") {
  return safeString(value).toUpperCase();
}

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

function resolveExistingInputName(spec, inputs, urlByInput) {
  const wanted = normalizeName(spec.inputName);
  const aliasList = [
    ...(spec.nameAliases || []),
    ...resolveObsInputNames(spec.inputName).slice(1)
  ];
  const aliases = new Set([wanted, ...aliasList.map(normalizeName)]);

  for (const input of inputs) {
    if (input?.inputKind !== "browser_source") continue;
    if (aliases.has(normalizeName(input.inputName))) {
      return input.inputName;
    }
  }

  for (const input of inputs) {
    if (input?.inputKind !== "browser_source") continue;
    const url = safeString(urlByInput[input.inputName]);
    if (spec.urlPattern.test(url)) {
      return input.inputName;
    }
  }

  return null;
}

async function getSceneItem(obsCall, sceneName, sourceName) {
  const list = await obsCall("GetSceneItemList", { sceneName });
  return (list?.sceneItems || []).find((item) => item?.sourceName === sourceName) || null;
}

async function ensureSceneExists(obsCall, sceneName) {
  const target = safeString(sceneName);
  if (!target) {
    return { ok: false, reason: "missing_scene_name" };
  }

  try {
    const list = await obsCall("GetSceneList");
    const scenes = list?.scenes || [];
    if (scenes.some((row) => safeString(row?.sceneName) === target)) {
      return { ok: true, created: false, sceneName: target };
    }
    await obsCall("CreateScene", { sceneName: target });
    return { ok: true, created: true, sceneName: target };
  } catch (err) {
    return { ok: false, sceneName: target, reason: err.message || "create_scene_failed" };
  }
}

function resolveSpecLayout(spec, resolveLayout, inputName, currentUrl) {
  if (typeof resolveLayout === "function") {
    const layout = resolveLayout(inputName, currentUrl || spec.targetUrl);
    if (layout) {
      return {
        targetUrl: layout.targetUrl || spec.targetUrl,
        width: layout.width || spec.width,
        height: layout.height || spec.height,
        rerouteAudio:
          typeof layout.rerouteAudio === "boolean" ? layout.rerouteAudio : spec.rerouteAudio
      };
    }
  }

  return {
    targetUrl: spec.targetUrl,
    width: spec.width,
    height: spec.height,
    rerouteAudio: spec.rerouteAudio
  };
}

async function applyBrowserInputSettings(obsCall, inputName, layout) {
  await obsCall("SetInputSettings", {
    inputName,
    inputSettings: {
      url: layout.targetUrl,
      width: layout.width,
      height: layout.height,
      fps: 30,
      reroute_audio: Boolean(layout.rerouteAudio),
      shutdown: false,
      restart_when_active: false
    },
    overlay: true
  });
}

async function ensureSceneItem(obsCall, sceneName, sourceName, spec, layoutLocked) {
  let sceneItem = await getSceneItem(obsCall, sceneName, sourceName);
  let sceneAdded = false;

  if (!sceneItem) {
    const created = await obsCall("CreateSceneItem", {
      sceneName,
      sourceName,
      sceneItemEnabled: spec.sceneItemEnabled === true
    });
    sceneAdded = true;
    sceneItem = {
      sourceName,
      sceneItemId: created?.sceneItemId,
      sceneItemEnabled: spec.sceneItemEnabled === true
    };
  }

  if (sceneItem?.sceneItemId != null && spec.sceneItemEnabled === false) {
    try {
      await obsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemEnabled: false
      });
    } catch (_err) {
      // ignore
    }
  }

  if (!layoutLocked && spec.transform && sceneItem?.sceneItemId != null) {
    try {
      await obsCall("SetSceneItemTransform", {
        sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemTransform: spec.transform
      });
    } catch (_err) {
      // ignore
    }
  }

  return { sceneItem, sceneAdded };
}

async function ensureOverlaySpec(obsCall, sceneName, spec, options = {}) {
  const report = {
    id: spec.id,
    inputName: spec.inputName,
    resolvedInputName: null,
    created: false,
    sceneAdded: false,
    configured: false,
    skipped: false,
    reason: ""
  };

  if (!spec.targetUrl) {
    report.skipped = true;
    report.reason = "missing_url";
    return report;
  }

  const inputs = options.inputs || [];
  const urlByInput = options.urlByInput || {};
  const existingName = resolveExistingInputName(spec, inputs, urlByInput);
  const inputName = existingName || spec.inputName;
  report.resolvedInputName = inputName;

  const currentUrl = safeString(urlByInput[inputName]);
  const layout = resolveSpecLayout(spec, options.resolveLayout, inputName, currentUrl);

  if (!existingName) {
    await obsCall("CreateInput", {
      sceneName,
      inputName,
      inputKind: "browser_source",
      inputSettings: {
        url: layout.targetUrl,
        width: layout.width,
        height: layout.height,
        fps: 30,
        reroute_audio: Boolean(layout.rerouteAudio),
        shutdown: false,
        restart_when_active: false
      },
      sceneItemEnabled: spec.sceneItemEnabled === true
    });
    report.created = true;
    urlByInput[inputName] = layout.targetUrl;
    inputs.push({ inputName, inputKind: "browser_source" });
  } else if (typeof options.applyProfile === "function") {
    const profile = await options.applyProfile(inputName, currentUrl || layout.targetUrl);
    report.configured = profile?.ok === true && profile?.skippedSettings !== true;
  } else {
    const needsUpdate =
      safeString(currentUrl) !== safeString(layout.targetUrl) ||
      !currentUrl;
    if (needsUpdate) {
      await applyBrowserInputSettings(obsCall, inputName, layout);
      report.configured = true;
      urlByInput[inputName] = layout.targetUrl;
    }
  }

  const sceneResult = await ensureSceneItem(
    obsCall,
    sceneName,
    inputName,
    spec,
    options.layoutLocked === true
  );
  report.sceneAdded = sceneResult.sceneAdded === true;

  return report;
}

async function ensureObsOverlayHands(obsCall, options = {}) {
  if (typeof obsCall !== "function") {
    return { ok: false, reason: "obs_call_missing" };
  }

  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const splitUrls = options.splitUrls || {};
  const onlyIds = Array.isArray(options.onlyIds) ? new Set(options.onlyIds) : null;

  if (options.ensureScene === true) {
    const sceneResult = await ensureSceneExists(obsCall, sceneName);
    if (sceneResult.ok !== true) {
      return { ok: false, sceneName, reason: sceneResult.reason || "scene_create_failed" };
    }
  }

  let specs = buildObsRecommendedSpecs(splitUrls);
  if (onlyIds && onlyIds.size > 0) {
    specs = specs.filter((spec) => onlyIds.has(spec.id));
  }

  const visibilityOverrides = options.visibilityOverrides || null;
  if (visibilityOverrides && typeof visibilityOverrides === "object") {
    specs = specs.map((spec) => ({
      ...spec,
      sceneItemEnabled:
        typeof visibilityOverrides[spec.id] === "boolean"
          ? visibilityOverrides[spec.id]
          : spec.sceneItemEnabled
    }));
  }

  if (options.overlayMode === "hub") {
    return { ok: true, skipped: true, reason: "hub_mode", results: [] };
  }

  if (!specs.length) {
    return { ok: true, skipped: true, reason: "no_specs", results: [] };
  }

  const results = [];
  const created = [];
  const sceneAdded = [];
  const configured = [];

  try {
    const inputList = await obsCall("GetInputList");
    const inputs = [...(inputList?.inputs || [])];
    const urlByInput = await readBrowserInputSettings(obsCall, inputs);

    for (const spec of specs) {
      const row = await ensureOverlaySpec(obsCall, sceneName, spec, {
        inputs,
        urlByInput,
        resolveLayout: options.resolveLayout,
        applyProfile: options.applyProfile,
        layoutLocked: options.layoutLocked === true
      });
      results.push(row);
      if (row.created) created.push(row.resolvedInputName || row.inputName);
      if (row.sceneAdded) sceneAdded.push(row.resolvedInputName || row.inputName);
      if (row.configured) configured.push(row.resolvedInputName || row.inputName);
    }

    return {
      ok: true,
      sceneName,
      created,
      sceneAdded,
      configured,
      results
    };
  } catch (err) {
    return { ok: false, sceneName, error: err.message, results };
  }
}

module.exports = {
  OVERLAY_HANDS_SPECS,
  buildOverlayHandsSpecs,
  buildObsRecommendedSpecs,
  resolveExistingInputName,
  ensureSceneExists,
  ensureObsOverlayHands
};
