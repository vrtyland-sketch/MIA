"use strict";

/**
 * Obnoví MIA browser overlay v OBS (refresh cache + cache-bust URL).
 * Usage: npm run obs:refresh-overlays
 */

const OBSWebSocket = require("obs-websocket-js").default;
const {
  GFX_CACHE_BUST,
  GIFT_ANIM_CACHE_BUST,
  resolveObsInputNames
} = require("./MIA_OBS_LIVE_MANIFEST");

const MIA_URL =
  /127\.0\.0\.1:3000|localhost:3000|speech-overlay|kojnozrout|entity-overlay|combo-overlay|startup-check|chat-overlay/i;
const MIA_NAME = /^MIA_|^KOJNOZROUT_|^CHAT_OVERLAY/i;

async function enableSceneSource(obs, sceneName, sourceName, reenabled) {
  try {
    const idResp = await obs.call("GetSceneItemId", { sceneName, sourceName });
    await obs.call("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: idResp.sceneItemId,
      sceneItemEnabled: true
    });
    reenabled.push(sourceName);
    return true;
  } catch (_err) {
    return false;
  }
}

async function main() {
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";
  const wsUrl = process.env.OBS_WS_URL || "ws://127.0.0.1:4455";

  await obs.connect(wsUrl, password ? { password } : undefined);

  const inputList = await obs.call("GetInputList");
  const refreshed = [];
  const skipped = [];

  for (const input of inputList?.inputs || []) {
    if (input?.inputKind !== "browser_source") continue;
    const inputName = String(input.inputName || "");

    if (/^MIA_VOICE/i.test(inputName)) {
      skipped.push({ inputName, reason: "voice_skip" });
      continue;
    }

    let url = "";
    try {
      const settingsResp = await obs.call("GetInputSettings", { inputName });
      url = String(settingsResp?.inputSettings?.url || "");
    } catch (_err) {
      continue;
    }

    if (!MIA_URL.test(url) && !MIA_NAME.test(inputName)) {
      continue;
    }

    try {
      await obs.call("PressInputPropertiesButton", {
        inputName,
        propertyName: "refreshnocache"
      });
    } catch (_err) {
      // continue to URL bust below
    }

    // Vždy cache-bust URL — refreshnocache samotný nestačí (uživatel „nic se nezměnilo“).
    const baseUrl = (url.split("?")[0] || url).trim();
    if (!baseUrl) continue;
    // Gift anim keeps its own bust (37); do not stamp GFX v36 onto MIA_GIFT_ANIMATION.
    const isGiftAnim =
      /gift-animation-overlay/i.test(baseUrl) || /GIFT_ANIM/i.test(inputName);
    const bust = isGiftAnim ? GIFT_ANIM_CACHE_BUST : GFX_CACHE_BUST;
    const bustUrl = `${baseUrl}?v=${bust}&_mia=${Date.now()}`;
    await obs.call("SetInputSettings", {
      inputName,
      inputSettings: { url: bustUrl },
      overlay: true
    });
    refreshed.push({ inputName, mode: "refresh+url_bust", url: bustUrl, bust });
  }

  const sceneName = process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS";
  const reenabled = [];
  const hiddenBodyParts = [];
  const bodyPartsAudit = [];
  const coreSourcesAudit = [];
  /** Preferred live names first; aliases tried via resolveObsInputNames. */
  const core = [
    "KOJNOZROUT_RUNTIME",
    "MIA_BUBBLE",
    "MIA_ENTITY",
    "KOJNOZROUT_BOWL_V2",
    "CHAT_OVERLAY",
    "MIA_GIFT_ANIMATION"
  ];
  const hideNames =
    /^(MIA_HEAD|MIA_TORSO|MIA_EYES|MIA_HANDS|MIA_FEET|MIA_GRAPHICS_PREVIEW|MIA_RIG_DESK|RIG_DESK)$/i;

  let sceneItems = [];
  try {
    const listResp = await obs.call("GetSceneItemList", { sceneName });
    sceneItems = listResp?.sceneItems || [];
    for (const item of sceneItems) {
      const sourceName = String(item?.sourceName || "");
      if (!hideNames.test(sourceName)) continue;
      const wasEnabled = item?.sceneItemEnabled === true;
      bodyPartsAudit.push({
        sourceName,
        enabledBefore: wasEnabled,
        enabledAfter: false
      });
      if (!wasEnabled) continue;
      try {
        await obs.call("SetSceneItemEnabled", {
          sceneName,
          sceneItemId: item.sceneItemId,
          sceneItemEnabled: false
        });
        hiddenBodyParts.push(sourceName);
      } catch (_err) {
        bodyPartsAudit[bodyPartsAudit.length - 1].enabledAfter = true;
      }
    }
  } catch (_err) {
    // scene may differ
  }

  for (const sourceName of core) {
    const candidates = resolveObsInputNames(sourceName);
    let matched = null;
    let ok = false;
    for (const candidate of candidates) {
      const onScene = sceneItems.find(
        (item) => String(item?.sourceName || "") === candidate
      );
      if (onScene) {
        matched = {
          preferred: sourceName,
          matched: candidate,
          enabled: onScene.sceneItemEnabled === true
        };
      }
      if (reenabled.includes(candidate)) {
        ok = true;
        matched = matched || {
          preferred: sourceName,
          matched: candidate,
          enabled: true
        };
        break;
      }
      ok = await enableSceneSource(obs, sceneName, candidate, reenabled);
      if (ok) {
        matched = {
          preferred: sourceName,
          matched: candidate,
          enabled: true
        };
        break;
      }
    }
    coreSourcesAudit.push(
      matched || { preferred: sourceName, matched: null, enabled: false }
    );
  }

  const bodyPartsAllOff =
    bodyPartsAudit.length === 0 ||
    bodyPartsAudit.every((row) => row.enabledAfter === false);
  const corePresent = coreSourcesAudit.filter((row) => row.matched).length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        bust: GFX_CACHE_BUST,
        giftAnimBust: GIFT_ANIM_CACHE_BUST,
        refreshed: refreshed.length,
        reenabled,
        hiddenBodyParts,
        audit: {
          sceneName,
          bodyPartsAllOff,
          bodyParts: bodyPartsAudit,
          corePresent,
          coreTotal: core.length,
          coreSources: coreSourcesAudit
        },
        details: refreshed,
        skipped,
        hint: "V OBS Preview bys měl vidět jednu MIA + celého Koje. Body-parts OFF."
      },
      null,
      2
    )
  );

  await obs.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
