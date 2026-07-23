"use strict";

/**
 * MIA OBS verify — read-only diagnostika před live (ffmpeg sloty, browser overlaye, voice, VC).
 */

const fs = require("fs");
const path = require("path");

const obsHands = require("./MIA_OBS_HANDS");
const obsAwayScene = require("./MIA_OBS_AWAY_SCENE");
const { buildSplitUrls: buildSplitUrlsFromManifest } = require("./MIA_OBS_LIVE_MANIFEST");
const { loadTemplates } = require("./MIA_MEDIA_CATALOG");
const { BODY_PARTS } = require("../shared/mia-graphics-studio/bodyPartsCatalog");
const { resolveBodySyncMode } = require("./MIA_OBS_BODY_SYNC");

const VIDEO_INPUT_KINDS = new Set(["ffmpeg_source", "vlc_source", "media_source"]);
const VOICE_MONITOR_OK = new Set([
  "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
  "OBS_WEBSOCKET_MONITOR_TYPE_MONITOR_AND_OUTPUT"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function checkItem(id, label, ok, detail = "", group = "system") {
  return {
    id,
    label,
    ok: Boolean(ok),
    status: ok ? "ok" : "fail",
    detail: safeString(detail),
    group
  };
}

function buildSplitUrls(port = 3000, options = {}) {
  return buildSplitUrlsFromManifest(port, options);
}

function buildTikTokAudioGuide(env = process.env) {
  const voiceMonitor = safeString(env.MIA_OBS_VOICE_MONITOR, "and_output");
  return {
    virtualCameraNote: "OBS Virtual Camera neposílá zvuk do TikTok Studia.",
    recommendedMic: safeString(env.MIA_TIKTOK_MIC_DEVICE, "VB-Audio Virtual Cable Output"),
    obsVoiceMonitor: voiceMonitor,
    steps: [
      "VB-Audio Virtual Cable (nebo stejný virtual audio device)",
      "OBS → Nastavení → Audio → Monitoring Device = CABLE Input",
      `MIA_VOICE: Monitor and Output (MIA_OBS_VOICE_MONITOR=${voiceMonitor})`,
      "TikTok LIVE Studio → mikrofon = CABLE Output (ne integrovaný mikrofon)",
      "Gift videa T3+: zvuk z OBS jde přes stejný monitoring chain"
    ]
  };
}

function fileExistsOnDisk(filePath = "") {
  const normalized = safeString(filePath);
  if (!normalized) return false;
  try {
    return fs.existsSync(normalized);
  } catch (_err) {
    return false;
  }
}

async function readBrowserUrlMap(obsCall, inputs) {
  const map = {};
  for (const input of inputs) {
    if (input?.inputKind !== "browser_source") continue;
    try {
      const resp = await obsCall("GetInputSettings", { inputName: input.inputName });
      map[input.inputName] = safeString(
        resp?.inputSettings?.url || resp?.inputSettings?.local_file || ""
      );
    } catch (_err) {
      map[input.inputName] = "";
    }
  }
  return map;
}

async function verifyGiftVideoSlots(obsCall, options = {}) {
  const checks = [];
  const templates = options.templates || loadTemplates();
  const tierSlots = templates.tierSlots || {};
  const tiers = options.tiers || ["T1", "T2", "T3", "T4", "T5"];

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const inputByName = new Map(inputs.map((row) => [row.inputName, row]));

  for (const tier of tiers) {
    const slots = tierSlots[tier] || [];
    let tierOkCount = 0;

    for (const slotName of slots) {
      const input = inputByName.get(slotName);
      if (!input) {
        checks.push(
          checkItem(`gift_${slotName}`, `Gift ${slotName}`, false, "zdroj v OBS chybí", "gift_video")
        );
        continue;
      }

      if (!VIDEO_INPUT_KINDS.has(input.inputKind)) {
        checks.push(
          checkItem(
            `gift_${slotName}`,
            `Gift ${slotName}`,
            false,
            `špatný typ ${input.inputKind}`,
            "gift_video"
          )
        );
        continue;
      }

      let localFile = "";
      try {
        const settings = await obsCall("GetInputSettings", { inputName: slotName });
        localFile = safeString(settings?.inputSettings?.local_file || "");
      } catch (err) {
        checks.push(
          checkItem(`gift_${slotName}`, `Gift ${slotName}`, false, err.message, "gift_video")
        );
        continue;
      }

      const hasPath = Boolean(localFile);
      const fileOk = hasPath && fileExistsOnDisk(localFile);
      const ok = hasPath && fileOk;
      if (ok) tierOkCount += 1;

      checks.push(
        checkItem(
          `gift_${slotName}`,
          `Gift ${slotName}`,
          ok,
          ok
            ? path.basename(localFile)
            : hasPath
              ? "soubor na disku chybí"
              : "local_file prázdný",
          "gift_video"
        )
      );
    }

    const tierRequired = tier !== "T5";
    const tierOk = tierOkCount > 0;
    checks.push(
      checkItem(
        `gift_tier_${tier}`,
        `Tier ${tier} sloty`,
        tierRequired ? tierOk : tierOkCount > 0 || slots.length === 0,
        `${tierOkCount}/${slots.length} OK`,
        "gift_video"
      )
    );
  }

  return checks;
}

async function verifyBrowserOverlays(obsCall, options = {}) {
  const checks = [];
  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const splitUrls = options.splitUrls || buildSplitUrls(options.port || 3000);
  const specs = obsHands.buildObsRecommendedSpecs(splitUrls);

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const urlByInput = await readBrowserUrlMap(obsCall, inputs);

  let sceneItems = [];
  try {
    const list = await obsCall("GetSceneItemList", { sceneName });
    sceneItems = list?.sceneItems || [];
  } catch (err) {
    checks.push(
      checkItem("browser_scene", `Scéna ${sceneName}`, false, err.message, "browser_overlay")
    );
    return checks;
  }

  const sceneSourceSet = new Set(sceneItems.map((item) => item.sourceName));

  for (const spec of specs) {
    const resolved = obsHands.resolveExistingInputName(spec, inputs, urlByInput);
    if (!resolved) {
      checks.push(
        checkItem(
          `browser_${spec.id}`,
          spec.inputName,
          false,
          "browser zdroj chybí — spusť MIA s OBS nebo MIA_OBS_HANDS=0 vypnuto",
          "browser_overlay"
        )
      );
      continue;
    }

    const url = safeString(urlByInput[resolved]);
    const urlOk = spec.urlPattern.test(url);
    const inScene = sceneSourceSet.has(resolved);
    const ok = urlOk && inScene;

    checks.push(
      checkItem(
        `browser_${spec.id}`,
        resolved,
        ok,
        ok
          ? "ve scéně, URL OK"
          : !urlOk
            ? `URL: ${url || "(prázdná)"}`
            : "existuje, ale není ve scéně",
        "browser_overlay"
      )
    );
  }

  return checks;
}

function graphicsBodyUrlMatches(url, part, mode) {
  const normalized = safeString(url).toLowerCase();
  if (!normalized.includes("mia-body-part-overlay.html")) return false;
  if (!normalized.includes(`part=${part}`)) return false;
  if (mode === "graphics") return normalized.includes("sync=graphics");
  return normalized.includes("sync=hybrid");
}

async function verifyGraphicsBodyLayers(obsCall, options = {}) {
  const env = options.env || process.env;
  const mode = resolveBodySyncMode(options, env);
  if (mode === "none") {
    return [
      checkItem(
        "graphics_body_sync",
        "Graphics body sync",
        true,
        "vypnuto (MIA_OBS_BODY_SYNC=off)",
        "graphics_body"
      )
    ];
  }

  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const port = Number(options.port || env.PORT || 3000);
  const syncOpts = mode === "graphics" ? { syncGraphics: true } : { syncHybrid: true };
  const obsParts = BODY_PARTS.filter((row) => row.obs !== false);

  const checks = [];
  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const urlByInput = await readBrowserUrlMap(obsCall, inputs);

  let sceneItems = [];
  try {
    const list = await obsCall("GetSceneItemList", { sceneName });
    sceneItems = list?.sceneItems || [];
  } catch (err) {
    checks.push(
      checkItem("graphics_body_scene", `Scéna ${sceneName}`, false, err.message, "graphics_body")
    );
    return checks;
  }

  const sceneBySource = new Map(sceneItems.map((item) => [item.sourceName, item]));
  let okCount = 0;

  for (const part of obsParts) {
    const input = inputs.find((row) => row.inputName === part.inputName);
    if (!input || input.inputKind !== "browser_source") {
      checks.push(
        checkItem(
          `graphics_body_${part.id}`,
          part.inputName,
          false,
          "browser zdroj chybí — npm run obs:apply-hands",
          "graphics_body"
        )
      );
      continue;
    }

    const url = safeString(urlByInput[part.inputName]);
    const urlOk = graphicsBodyUrlMatches(url, part.part, mode);
    const sceneItem = sceneBySource.get(part.inputName);
    const inScene = Boolean(sceneItem);
    const hidden = sceneItem ? sceneItem.sceneItemEnabled !== true : false;
    const ok = urlOk && inScene;
    if (ok) okCount += 1;

    let detail;
    if (!inScene) {
      detail = "existuje, ale není ve scéně";
    } else if (!urlOk) {
      detail = `URL: ${url || "(prázdná)"} — očekáváno ${mode} sync`;
    } else if (!hidden) {
      detail = `${mode} sync, ve scéně — doporučeno skrýt na live`;
    } else {
      detail = `${mode} sync, ve scéně, skryté`;
    }

    checks.push(
      checkItem(`graphics_body_${part.id}`, part.inputName, ok, detail, "graphics_body")
    );
  }

  checks.push(
    checkItem(
      "graphics_body_summary",
      "Graphics body vrstvy",
      okCount === obsParts.length,
      `${okCount}/${obsParts.length} OK (${mode})`,
      "graphics_body"
    )
  );

  return checks;
}

async function verifyAwayBrowserOverlays(obsCall, options = {}) {
  const checks = [];
  const awayLoop = require("./MIA_OBS_AWAY_LOOP");
  const sceneName = safeString(
    options.sceneName,
    obsAwayScene.resolveAwaySceneName(options.env || process.env)
  );
  const splitUrls = options.splitUrls || buildSplitUrls(options.port || 3000);
  const specs = obsAwayScene
    .buildAwayHandsSpecs(splitUrls)
    .filter((spec) => obsAwayScene.AWAY_REQUIRED_IDS.includes(spec.id));

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const urlByInput = await readBrowserUrlMap(obsCall, inputs);

  let sceneItems = [];
  try {
    const list = await obsCall("GetSceneItemList", { sceneName });
    sceneItems = list?.sceneItems || [];
  } catch (err) {
    checks.push(
      checkItem(
        "away_scene",
        `Scéna ${sceneName}`,
        false,
        err.message,
        "away_scene"
      )
    );
    return checks;
  }

  checks.push(
    checkItem(
      "away_scene",
      `Scéna ${sceneName}`,
      true,
      "existuje",
      "away_scene"
    )
  );

  const loopStatus = awayLoop.buildAwayLoopStatus(options.env || process.env);
  const loopConfig = awayLoop.getAwayLoopConfig();
  const sceneSourceSet = new Set(sceneItems.map((item) => item.sourceName));
  let loopInputName = null;
  for (const input of inputs) {
    const name = safeString(input?.inputName);
    if (!name) continue;
    const upper = name.toUpperCase();
    if (
      upper === loopConfig.inputName.toUpperCase() ||
      (loopConfig.legacyInputNames || []).some((legacy) => upper === legacy.toUpperCase())
    ) {
      loopInputName = name;
      break;
    }
  }

  const loopInScene = loopInputName ? sceneSourceSet.has(loopInputName) : false;
  checks.push(
    checkItem(
      "away_loop",
      loopConfig.inputName,
      Boolean(loopInputName && loopInScene),
      loopInputName
        ? loopInScene
          ? `${loopStatus.mode} · ve scéně`
          : "zdroj existuje, chybí ve scéně AWAY"
        : "chybí — npm run obs:apply-away-scene",
      "away_scene"
    )
  );

  for (const spec of specs) {
    const resolved = obsHands.resolveExistingInputName(spec, inputs, urlByInput);
    if (!resolved) {
      checks.push(
        checkItem(
          `away_${spec.id}`,
          spec.inputName,
          false,
          "browser zdroj chybí — npm run obs:apply-away-scene",
          "away_scene"
        )
      );
      continue;
    }

    const url = safeString(urlByInput[resolved]);
    const urlOk = spec.urlPattern.test(url);
    const inScene = sceneSourceSet.has(resolved);
    const ok = urlOk && inScene;

    checks.push(
      checkItem(
        `away_${spec.id}`,
        `${resolved} (AWAY)`,
        ok,
        ok
          ? "ve scéně AWAY, URL OK"
          : !urlOk
            ? `URL: ${url || "(prázdná)"}`
            : "existuje, ale není ve scéně AWAY",
        "away_scene"
      )
    );
  }

  return checks;
}

async function verifyVoiceSource(obsCall, options = {}) {
  const checks = [];
  const splitUrls = options.splitUrls || buildSplitUrls(options.port || 3000);
  const voiceSpec = obsHands.buildObsRecommendedSpecs(splitUrls).find((row) => row.id === "voice");
  if (!voiceSpec) {
    return [checkItem("voice_spec", "MIA voice", false, "manifest chybí", "voice")];
  }

  const inputList = await obsCall("GetInputList");
  const inputs = inputList?.inputs || [];
  const urlByInput = await readBrowserUrlMap(obsCall, inputs);
  const resolved = obsHands.resolveExistingInputName(voiceSpec, inputs, urlByInput);

  if (!resolved) {
    return [checkItem("voice_source", "MIA voice", false, "MIA_VOICE chybí", "voice")];
  }

  let settings = {};
  try {
    const resp = await obsCall("GetInputSettings", { inputName: resolved });
    settings = resp?.inputSettings || {};
  } catch (err) {
    return [checkItem("voice_source", resolved, false, err.message, "voice")];
  }

  const urlOk = voiceSpec.urlPattern.test(safeString(settings.url));
  const rerouteOk = settings.reroute_audio === true;
  checks.push(
    checkItem("voice_source", resolved, urlOk && rerouteOk, urlOk ? "URL OK" : "špatná URL", "voice")
  );
  checks.push(
    checkItem(
      "voice_reroute",
      "Voice reroute audio",
      rerouteOk,
      rerouteOk ? "ON" : "v OBS zapni Control audio u browser source",
      "voice"
    )
  );

  try {
    const mon = await obsCall("GetInputAudioMonitorType", { inputName: resolved });
    const monitorType = safeString(mon?.monitorType);
    const monitorOk = VOICE_MONITOR_OK.has(monitorType);
    checks.push(
      checkItem(
        "voice_monitor",
        "Voice monitor typ",
        monitorOk,
        monitorOk ? monitorType : monitorType || "nenastaveno",
        "voice"
      )
    );
  } catch (_err) {
    checks.push(
      checkItem(
        "voice_monitor",
        "Voice monitor typ",
        false,
        "nelze přečíst — zkontroluj v OBS ručně",
        "voice"
      )
    );
  }

  return checks;
}

async function verifyVirtualCamera(obsCall) {
  try {
    const status = await obsCall("GetVirtualCamStatus");
    const active = status?.outputActive === true;
    return [
      checkItem(
        "virtual_camera",
        "OBS Virtual Camera",
        active,
        active ? "ZAPNUTÁ" : "vypnutá — npm run obs:prepare-tiktok",
        "virtual_camera"
      )
    ];
  } catch (err) {
    return [
      checkItem("virtual_camera", "OBS Virtual Camera", false, err.message, "virtual_camera")
    ];
  }
}

async function verifySceneBasics(obsCall, options = {}) {
  const checks = [];
  const sceneName = safeString(options.sceneName, "SPINAK_ENGINE_GIFTS");
  const cameraName = safeString(options.cameraName, "NOTEBOOK_CAMERA");

  try {
    const program = await obsCall("GetCurrentProgramScene");
    const programScene = safeString(program?.currentProgramSceneName || program?.sceneName);
    checks.push(
      checkItem(
        "program_scene",
        "Program scéna",
        programScene === sceneName,
        programScene || "(neznámá)",
        "scene"
      )
    );
  } catch (err) {
    checks.push(checkItem("program_scene", "Program scéna", false, err.message, "scene"));
  }

  try {
    const stream = await obsCall("GetStreamStatus");
    const streaming = stream?.outputActive === true;
    checks.push(
      checkItem(
        "obs_streaming",
        "OBS Start Streaming",
        !streaming,
        streaming ? "ZAPNUTÝ — pro TikTok vypni" : "vypnuto (správně pro TikTok Studio)",
        "scene"
      )
    );
  } catch (err) {
    checks.push(checkItem("obs_streaming", "OBS Start Streaming", false, err.message, "scene"));
  }

  try {
    const list = await obsCall("GetSceneItemList", { sceneName });
    const camera = (list?.sceneItems || []).find((item) => item?.sourceName === cameraName);
    if (!camera) {
      checks.push(
        checkItem(
          `camera_${cameraName}`,
          cameraName,
          true,
          "ve scéně není (OK pokud nepoužíváš)",
          "scene"
        )
      );
    } else {
      const disabled = camera.sceneItemEnabled !== true;
      checks.push(
        checkItem(
          `camera_${cameraName}`,
          `${cameraName} ve scéně`,
          disabled,
          disabled ? "skrytá (doporučeno pro TikTok VC)" : "viditelná — může kolidovat s VC",
          "scene"
        )
      );
    }
  } catch (err) {
    checks.push(checkItem(`camera_${cameraName}`, cameraName, false, err.message, "scene"));
  }

  return checks;
}

function collectFixHints(checks = []) {
  const fixes = new Set();
  for (const row of checks) {
    if (row.ok) continue;
    if (row.group === "gift_video") {
      fixes.add("npm run media:scan && npm run media:apply-obs");
      fixes.add("npm run media:add-obs-slots");
    }
    if (row.group === "browser_overlay") {
      fixes.add("npm run obs:stream-ready -- --fix --wait");
      fixes.add("npm run obs:verify-stream-ready -- --fix --wait");
    }
    if (row.group === "graphics_body") {
      fixes.add("npm run obs:apply-hands");
      fixes.add("npm run obs:verify-stream-ready -- --fix --wait");
    }
    if (row.group === "voice") {
      fixes.add("npm run obs:ensure-voice");
    }
    if (row.group === "virtual_camera") {
      fixes.add("npm run obs:prepare-tiktok");
    }
    if (row.id === "program_scene") {
      fixes.add(`V OBS přepni program na ${process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS"}`);
    }
  }
  return [...fixes];
}

async function buildStreamReadyReport(deps = {}) {
  const obsCall = deps.obsCall;
  if (typeof obsCall !== "function") {
    return { ok: false, reason: "obs_call_missing", checks: [] };
  }

  const sceneName =
    safeString(deps.sceneName) ||
    safeString(process.env.MIA_OBS_CAMERA_SCENE) ||
    safeString(process.env.MIA_SOLO_STREAM_MAIN_SCENE) ||
    "SPINAK_ENGINE_GIFTS";
  const port = Number(deps.port || process.env.PORT || 3000);
  const splitUrls = deps.splitUrls || buildSplitUrls(port);

  const checks = [];
  if (deps.miaOk === true) {
    checks.push(checkItem("mia_server", "MIA server", true, `port ${port}`, "system"));
  } else if (deps.miaOk === false) {
    checks.push(
      checkItem("mia_server", "MIA server", false, "offline — npm run restart", "system")
    );
  }

  checks.push(
    ...(await verifyVirtualCamera(obsCall)),
    ...(await verifySceneBasics(obsCall, {
      sceneName,
      cameraName: deps.cameraName || process.env.MIA_OBS_CAMERA_NAME || "NOTEBOOK_CAMERA"
    })),
    ...(await verifyGiftVideoSlots(obsCall, { templates: deps.templates })),
    ...(await verifyBrowserOverlays(obsCall, { sceneName, splitUrls, port })),
    ...(await verifyGraphicsBodyLayers(obsCall, { sceneName, port, env: deps.env || process.env })),
    ...(await verifyAwayBrowserOverlays(obsCall, { splitUrls, port })),
    ...(await verifyVoiceSource(obsCall, { splitUrls, port }))
  );

  const failed = checks.filter((row) => !row.ok);
  const warnings = checks.filter((row) => row.ok && /doporučeno|může kolidovat/i.test(row.detail));
  const criticalIds = new Set([
    "mia_server",
    "virtual_camera",
    "program_scene",
    "obs_streaming",
    "gift_tier_T1",
    "gift_tier_T2",
    "gift_tier_T3",
    "gift_tier_T4",
    "voice_source",
    "voice_reroute"
  ]);
  const criticalFailed = failed.some((row) => criticalIds.has(row.id));
  const browserFailed = failed.filter((row) => row.group === "browser_overlay").length;
  const browserOk = checks.filter((row) => row.group === "browser_overlay" && row.ok).length;
  const browserTotal = checks.filter((row) => row.group === "browser_overlay").length;
  const graphicsBodyOk = checks.filter((row) => row.group === "graphics_body" && row.ok).length;
  const graphicsBodyTotal = checks.filter((row) => row.group === "graphics_body").length;

  const ok =
    !criticalFailed &&
    browserOk >= Math.min(10, browserTotal) &&
    (deps.miaOk !== false);

  return {
    ok,
    sceneName,
    summary: {
      passed: checks.filter((row) => row.ok).length,
      failed: failed.length,
      warnings: warnings.length,
      browserOverlays: `${browserOk}/${browserTotal}`,
      graphicsBody: `${graphicsBodyOk}/${graphicsBodyTotal}`
    },
    checks,
    tiktokAudio: buildTikTokAudioGuide(deps.env || process.env),
    fixes: collectFixHints(checks),
    finishedAt: new Date().toISOString()
  };
}

module.exports = {
  buildSplitUrls,
  buildTikTokAudioGuide,
  buildStreamReadyReport,
  verifyGiftVideoSlots,
  verifyBrowserOverlays,
  verifyGraphicsBodyLayers,
  verifyAwayBrowserOverlays,
  verifyVoiceSource,
  verifyVirtualCamera,
  verifySceneBasics,
  collectFixHints
};
