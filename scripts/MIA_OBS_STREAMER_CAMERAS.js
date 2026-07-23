"use strict";

/**
 * OBS ensure — 6-kamerový matting rig + MIA_IMMERSIVE_SCENE browser overlay.
 */

const { listCameraSlots } = require("../shared/mia-scene-engine/streamerCameraRig");
const {
  IMMERSIVE_OVERLAY,
  buildCameraEnsurePlans,
  buildInputSettingsForPlan,
  resolvePrimaryLegacyName
} = require("../shared/mia-scene-engine/obsCameraLayout");
const obsHands = require("./MIA_OBS_HANDS");
const {
  listNdiSourcesFromInputs,
  suggestNdiCameraMapping,
  buildNdiManifest
} = require("../shared/mia-scene-engine/ndiDiscovery");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isCameraKind(inputKind = "") {
  return /dshow_input|av_capture_input|video_capture|ndi_source/i.test(String(inputKind));
}

async function getSceneItem(obsCall, sceneName, sourceName) {
  const list = await obsCall("GetSceneItemList", { sceneName });
  return (list?.sceneItems || []).find((item) => item?.sourceName === sourceName) || null;
}

async function ensureSceneItemTransform(obsCall, sceneName, sceneItemId, transform) {
  if (!transform || sceneItemId == null) return false;
  try {
    await obsCall("SetSceneItemTransform", {
      sceneName,
      sceneItemId,
      sceneItemTransform: transform
    });
    return true;
  } catch (_err) {
    return false;
  }
}

async function ensureCameraInput(obsCall, sceneName, plan, options = {}) {
  const report = {
    cameraId: plan.cameraId,
    sourceName: plan.sourceName,
    created: false,
    sceneAdded: false,
    configured: false,
    aliased: plan.aliased === true,
    skipped: false,
    reason: ""
  };

  const inputs = options.inputs || [];
  const inputSet = new Set(inputs.map((row) => row.inputName));
  const layoutLocked = options.layoutLocked === true;

  if (plan.aliased) {
    const sceneItem = await getSceneItem(obsCall, sceneName, plan.sourceName);
    if (sceneItem && !layoutLocked) {
      await ensureSceneItemTransform(obsCall, sceneName, sceneItem.sceneItemId, plan.transform);
    }
    report.configured = true;
    return report;
  }

  if (!inputSet.has(plan.sourceName)) {
    await obsCall("CreateInput", {
      sceneName,
      inputName: plan.sourceName,
      inputKind: plan.inputKind,
      inputSettings: buildInputSettingsForPlan(plan, options),
      sceneItemEnabled: plan.sceneItemEnabled === true
    });
    report.created = true;
    inputs.push({ inputName: plan.sourceName, inputKind: plan.inputKind });
    inputSet.add(plan.sourceName);
  } else if (options.updateExisting === true) {
    await obsCall("SetInputSettings", {
      inputName: plan.sourceName,
      inputSettings: buildInputSettingsForPlan(plan, options),
      overlay: true
    });
    report.configured = true;
  }

  let sceneItem = await getSceneItem(obsCall, sceneName, plan.sourceName);
  if (!sceneItem) {
    const created = await obsCall("CreateSceneItem", {
      sceneName,
      sourceName: plan.sourceName,
      sceneItemEnabled: plan.sceneItemEnabled === true
    });
    report.sceneAdded = true;
    sceneItem = {
      sourceName: plan.sourceName,
      sceneItemId: created?.sceneItemId,
      sceneItemEnabled: plan.sceneItemEnabled === true
    };
  } else {
    try {
      await obsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: sceneItem.sceneItemId,
        sceneItemEnabled: plan.sceneItemEnabled === true
      });
    } catch (_err) {
      // ignore
    }
  }

  if (!layoutLocked && sceneItem?.sceneItemId != null) {
    await ensureSceneItemTransform(obsCall, sceneName, sceneItem.sceneItemId, plan.transform);
  }

  return report;
}

async function ensureImmersiveSceneOverlay(obsCall, options = {}) {
  const splitUrls = options.splitUrls || {};
  if (!safeString(splitUrls.immersiveScene)) {
    return { ok: false, reason: "missing_immersive_scene_url" };
  }

  const result = await obsHands.ensureObsOverlayHands(obsCall, {
    sceneName: safeString(options.sceneName, "SPINAK_ENGINE_GIFTS"),
    splitUrls,
    onlyIds: ["immersive_scene"],
    layoutLocked: options.layoutLocked === true
  });

  const overlay = (result.results || []).find((row) => row.id === "immersive_scene") || null;
  return {
    ok: result.ok !== false,
    overlay,
    inputName: overlay?.resolvedInputName || IMMERSIVE_OVERLAY.inputName,
    created: result.created || [],
    configured: result.configured || []
  };
}

async function ensureStreamerCameraSlots(obsCall, options = {}) {
  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const inputList = await obsCall("GetInputList");
  const inputs = [...(inputList?.inputs || [])];
  const legacyPrimary = resolvePrimaryLegacyName(options.legacyPrimaryName);

  const plans = buildCameraEnsurePlans({
    existingInputNames: inputs.map((row) => row.inputName),
    legacyPrimaryName: legacyPrimary,
    inputKinds: options.inputKinds || {},
    ndiNames: options.ndiNames || {}
  });

  const results = [];
  for (const plan of plans) {
    results.push(await ensureCameraInput(obsCall, sceneName, plan, { ...options, inputs }));
  }

  return {
    ok: true,
    sceneName,
    legacyPrimary,
    slots: listCameraSlots(),
    results,
    created: results.filter((row) => row.created).map((row) => row.sourceName),
    aliased: results.filter((row) => row.aliased).map((row) => row.sourceName)
  };
}

async function ensureObsStreamerRig(obsCall, options = {}) {
  if (typeof obsCall !== "function") {
    return { ok: false, reason: "obs_call_missing" };
  }

  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const inputList = await obsCall("GetInputList");
  const inputs = [...(inputList?.inputs || [])];

  let ndi = null;
  if (options.ndiAutoMap !== false) {
    ndi = buildNdiManifest(inputs, { explicitMap: options.ndiExplicitMap || {} });
    for (const row of ndi.mapping || []) {
      if (!row.mapped || !row.ndiSourceName) continue;
      process.env[row.envKey] = row.ndiSourceName;
    }
  }

  const cameraOptions = {
    ...options,
    inputs,
    inputKinds: options.inputKinds || {},
    ndiNames: Object.fromEntries(
      (ndi?.mapping || [])
        .filter((row) => row.mapped)
        .map((row) => [row.cameraId, row.ndiSourceName])
    )
  };

  if (ndi?.mappedCount > 0) {
    for (const row of ndi.mapping) {
      if (row.mapped) {
        cameraOptions.inputKinds[row.cameraId] = "ndi_source";
      }
    }
  }

  const cameras = await ensureStreamerCameraSlots(obsCall, cameraOptions);
  let overlay = { ok: false, skipped: true, reason: "overlay_disabled" };

  if (options.ensureOverlay !== false) {
    overlay = await ensureImmersiveSceneOverlay(obsCall, { ...options, sceneName });
  }

  return {
    ok: cameras.ok !== false && overlay.ok !== false,
    sceneName,
    ndi,
    cameras,
    overlay,
    hint:
      "CAM_01 alias NOTEBOOK_CAMERA pokud existuje. NDI auto-map na CAM_02..06 když jsou ndi_source ve scéně."
  };
}

module.exports = {
  IMMERSIVE_OVERLAY,
  ensureCameraInput,
  ensureStreamerCameraSlots,
  ensureImmersiveSceneOverlay,
  ensureObsStreamerRig,
  isCameraKind,
  buildNdiManifest,
  suggestNdiCameraMapping,
  listNdiSourcesFromInputs
};
