"use strict";

/**
 * MIA oči — vidí OBS scénu, gift videa, co se právě přehrává.
 * Skenuje zdroje, pozice, soubory na disku a stav média.
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const VIDEO_INPUT_KINDS = new Set([
  "ffmpeg_source",
  "vlc_source",
  "media_source"
]);

const MEDIA_STATE_PLAYING = new Set([
  "OBS_MEDIA_STATE_PLAYING",
  "OBS_WEBSOCKET_MEDIA_INPUT_STATE_PLAYING"
]);

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTier(value) {
  const tier = safeString(value).toUpperCase();
  if (tier === "T1" || tier === "T2" || tier === "T3" || tier === "T4") {
    return tier;
  }
  return "";
}

function inferTierFromSourceName(sourceName = "") {
  const match = safeString(sourceName).match(/^(T[1-5]|PROFILE)_/i);
  return match ? match[1].toUpperCase() : "";
}

function normalizeMediaState(value = "") {
  const state = safeString(value);
  return {
    raw: state,
    playing: MEDIA_STATE_PLAYING.has(state)
  };
}

function normalizeFilePath(value = "") {
  return safeString(value).replace(/\\/g, "/");
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

function computeAverageLuminance(rgba, width, height) {
  if (!rgba || !width || !height) return { avgLum: 0, samplePixels: 0 };
  let sum = 0;
  let count = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 8) continue;
    const lum = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
    sum += lum;
    count += 1;
  }
  return { avgLum: count ? sum / count : 0, samplePixels: count };
}

function parsePngBuffer(buffer) {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer, (err, png) => {
      if (err) return reject(err);
      resolve(png);
    });
  });
}

function normalizeScreenshotBase64(imageDataBase64 = "") {
  const raw = safeString(imageDataBase64);
  if (!raw) return "";
  return raw.replace(/^data:image\/[a-z+]+;base64,/i, "");
}

async function analyzePngBase64Luminance(imageDataBase64 = "") {
  const raw = normalizeScreenshotBase64(imageDataBase64);
  if (!raw) return { ok: false, reason: "empty_image_data" };
  try {
    const png = await parsePngBuffer(Buffer.from(raw, "base64"));
    const stats = computeAverageLuminance(png.data, png.width, png.height);
    return { ok: true, ...stats, width: png.width, height: png.height };
  } catch (err) {
    return { ok: false, reason: err.message || "png_parse_failed" };
  }
}

// Pokrytí kresbou: kolik pixelů je opravdu „něco" (ne čisté pozadí) + bounding box.
// Slouží k poznání PRÁZDNÉHO/ROZBITÉHO overlaye — luminance sama nestačí.
function computeContentCoverage(rgba, width, height, opts = {}) {
  const bgTol = toNumber(opts.bgTolerance, 12); // jak blízko k černé/pozadí = „prázdno"
  if (!rgba || !width || !height) {
    return { coverage: 0, contentPixels: 0, totalPixels: 0, bbox: null };
  }
  let content = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const total = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3];
      if (a < 16) continue; // průhledné = prázdno
      const lum = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
      if (lum <= bgTol) continue; // skoro černé = prázdno
      content += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const bbox =
    maxX >= 0
      ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
      : null;
  return {
    coverage: total ? content / total : 0,
    contentPixels: content,
    totalPixels: total,
    bbox
  };
}

async function analyzePngBase64Coverage(imageDataBase64 = "", opts = {}) {
  const raw = normalizeScreenshotBase64(imageDataBase64);
  if (!raw) return { ok: false, reason: "empty_image_data" };
  try {
    const png = await parsePngBuffer(Buffer.from(raw, "base64"));
    const lum = computeAverageLuminance(png.data, png.width, png.height);
    const cov = computeContentCoverage(png.data, png.width, png.height, opts);
    const minCoverage = toNumber(opts.minCoverage, 0.012);
    const blank = cov.coverage < minCoverage;
    return {
      ok: true,
      width: png.width,
      height: png.height,
      avgLum: lum.avgLum,
      ...cov,
      blank
    };
  } catch (err) {
    return { ok: false, reason: err.message || "png_parse_failed" };
  }
}

function summarizeTransform(transform = {}) {
  const positionX = toNumber(transform.positionX, 0);
  const positionY = toNumber(transform.positionY, 0);
  const scaleX = toNumber(transform.scaleX, 1);
  const scaleY = toNumber(transform.scaleY, 1);
  const width = Math.round(Math.abs(toNumber(transform.sourceWidth, 1920) * scaleX));
  const height = Math.round(Math.abs(toNumber(transform.sourceHeight, 1080) * scaleY));

  return {
    positionX,
    positionY,
    scaleX,
    scaleY,
    width,
    height,
    rotation: toNumber(transform.rotation, 0),
    alignment: toNumber(transform.alignment, 0)
  };
}

function createMiaEyes(deps = {}) {
  const runtimeConfig = deps.runtimeConfig || {};
  const safeObsCall =
    typeof deps.safeObsCall === "function"
      ? deps.safeObsCall
      : async () => ({ ok: false, reason: "missing_safeObsCall" });
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};
  const nowTs = typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const screenshotDir =
    safeString(deps.screenshotDir) ||
    path.resolve(__dirname, "..", "mia-output-overlay", "generated", "eyes");

  const eyesConfig = {
    giftSceneName: safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS"),
    scanCacheMs: toNumber(runtimeConfig?.eyes?.scanCacheMs, 4000),
    screenshotWidth: toNumber(runtimeConfig?.eyes?.screenshotWidth, 640),
    screenshotHeight: toNumber(runtimeConfig?.eyes?.screenshotHeight, 360),
    webcamAutoHide: runtimeConfig?.eyes?.webcamAutoHide !== false,
    webcamSourceName: safeString(runtimeConfig?.eyes?.webcamSourceName, "Video Capture Device"),
    webcamDarkLum: toNumber(runtimeConfig?.eyes?.webcamDarkLum, 18),
    webcamBrightLum: toNumber(runtimeConfig?.eyes?.webcamBrightLum, 28),
    webcamPollMs: toNumber(runtimeConfig?.eyes?.webcamPollMs, 8000)
  };

  const state = {
    lastScanAt: 0,
    lastViewAt: 0,
    catalog: [],
    catalogByName: {},
    lastView: null,
    lastScreenshot: null,
    lastError: null,
    lastAwayScan: null,
    webcam: {
      lastCheckAt: 0,
      lastLuminance: 0,
      lastEnabled: null,
      lastAction: null,
      sourceName: eyesConfig.webcamSourceName
    }
  };

  function getGiftSceneName(sceneName = "") {
    return safeString(sceneName, eyesConfig.giftSceneName);
  }

  function buildCatalogIndex(catalog = []) {
    const byName = {};
    for (const item of catalog) {
      if (item?.inputName) {
        byName[item.inputName] = item;
      }
    }
    state.catalog = catalog;
    state.catalogByName = byName;
    state.lastScanAt = nowTs();
    return catalog;
  }

  async function readInputSettings(inputName) {
    const response = await safeObsCall("GetInputSettings", { inputName });
    if (!response?.ok) {
      return { ok: false, inputName, reason: response?.reason || "GetInputSettings_failed" };
    }

    const settings = response.response?.inputSettings || response.inputSettings || {};
    const filePath =
      safeString(settings.local_file) ||
      safeString(settings.input) ||
      safeString(settings.path) ||
      "";

    return {
      ok: true,
      inputName,
      settings,
      filePath: normalizeFilePath(filePath),
      fileExists: fileExistsOnDisk(filePath)
    };
  }

  async function readSceneItemMeta(sceneName, sourceName) {
    const idResponse = await safeObsCall("GetSceneItemId", { sceneName, sourceName });
    if (!idResponse?.ok) {
      return {
        ok: false,
        sceneName,
        sourceName,
        reason: idResponse?.reason || "GetSceneItemId_failed"
      };
    }

    const sceneItemId = idResponse.response?.sceneItemId;
    const [enabledResponse, transformResponse] = await Promise.all([
      safeObsCall("GetSceneItemEnabled", { sceneName, sceneItemId }),
      safeObsCall("GetSceneItemTransform", { sceneName, sceneItemId })
    ]);

    const sceneItemEnabled = Boolean(
      enabledResponse?.response?.sceneItemEnabled ??
        enabledResponse?.sceneItemEnabled
    );
    const transform = summarizeTransform(
      transformResponse?.response?.sceneItemTransform ||
        transformResponse?.sceneItemTransform ||
        {}
    );

    return {
      ok: true,
      sceneName,
      sourceName,
      sceneItemId,
      sceneItemEnabled,
      transform
    };
  }

  async function readMediaStatus(inputName) {
    const response = await safeObsCall("GetMediaInputStatus", { inputName });
    if (!response?.ok) {
      return {
        ok: false,
        inputName,
        reason: response?.reason || "GetMediaInputStatus_failed"
      };
    }

    const payload = response.response || response;
    const mediaState = normalizeMediaState(payload.mediaState);
    return {
      ok: true,
      inputName,
      mediaState: mediaState.raw,
      playing: mediaState.playing,
      mediaDuration: toNumber(payload.mediaDuration, 0),
      mediaCursor: toNumber(payload.mediaCursor, 0)
    };
  }

  async function scanCatalog(options = {}) {
    const force = options.force === true;
    const sceneName = getGiftSceneName(options.sceneName);
    const cacheFresh =
      !force &&
      state.catalog.length > 0 &&
      nowTs() - state.lastScanAt < eyesConfig.scanCacheMs;

    if (cacheFresh) {
      return {
        ok: true,
        cached: true,
        sceneName,
        scannedAt: state.lastScanAt,
        items: state.catalog
      };
    }

    const [inputListResponse, sceneItemsResponse, programSceneResponse] = await Promise.all([
      safeObsCall("GetInputList"),
      safeObsCall("GetSceneItemList", { sceneName }),
      safeObsCall("GetCurrentProgramScene")
    ]);

    if (!inputListResponse?.ok) {
      state.lastError = {
        ts: nowTs(),
        stage: "eyes_scan_failed",
        reason: inputListResponse?.reason || "GetInputList_failed"
      };
      return { ok: false, reason: state.lastError.reason };
    }

    const inputs = inputListResponse.response?.inputs || inputListResponse.inputs || [];
    const sceneItems =
      sceneItemsResponse?.response?.sceneItems || sceneItemsResponse.sceneItems || [];
    const sceneItemByName = new Map(
      sceneItems.map((item) => [safeString(item.sourceName), item])
    );
    const programScene =
      safeString(
        programSceneResponse?.response?.sceneName ||
          programSceneResponse?.response?.currentProgramSceneName
      ) || "";

    const catalog = [];

    for (const input of inputs) {
      const inputName = safeString(input?.inputName);
      const inputKind = safeString(input?.inputKind);
      if (!inputName) continue;

      const tierFromConfig = inferTierFromSourceName(inputName);
      const isVideoKind = VIDEO_INPUT_KINDS.has(inputKind);
      const isTierVideo = Boolean(tierFromConfig);

      if (!isVideoKind && !isTierVideo) continue;

      const settings = await readInputSettings(inputName);
      const sceneItem = sceneItemByName.get(inputName);
      let sceneMeta = null;

      if (sceneItem) {
        sceneMeta = await readSceneItemMeta(sceneName, inputName);
      }

      const tier =
        tierFromConfig ||
        normalizeTier(
          runtimeConfig?.obs?.tierSources &&
            Object.entries(runtimeConfig.obs.tierSources).find(([, pool]) =>
              Array.isArray(pool) ? pool.includes(inputName) : false
            )?.[0]
        );

      catalog.push({
        inputName,
        inputKind,
        tier: tier || "UNKNOWN",
        filePath: settings.filePath || "",
        fileExists: settings.fileExists === true,
        fileName: settings.filePath ? path.basename(settings.filePath) : "",
        inGiftScene: Boolean(sceneItem),
        sceneName,
        sceneItemId: sceneMeta?.sceneItemId ?? sceneItem?.sceneItemId ?? null,
        sceneItemEnabled: sceneMeta?.sceneItemEnabled === true,
        transform: sceneMeta?.transform || null,
        onProgramScene: programScene === sceneName
      });
    }

    catalog.sort((a, b) => a.inputName.localeCompare(b.inputName, "cs"));
    buildCatalogIndex(catalog);

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "mia_eyes_scan",
      sceneName,
      programScene,
      itemCount: catalog.length,
      visibleOnGiftScene: catalog.filter((x) => x.sceneItemEnabled).length
    });

    return {
      ok: true,
      cached: false,
      sceneName,
      programScene,
      scannedAt: state.lastScanAt,
      items: catalog
    };
  }

  async function getPlaybackView(options = {}) {
    const includeMedia = options.includeMedia !== false;
    const sceneName = getGiftSceneName(options.sceneName);

    const [programSceneResponse, sceneItemsResponse, scanResult] = await Promise.all([
      safeObsCall("GetCurrentProgramScene"),
      safeObsCall("GetSceneItemList", { sceneName }),
      scanCatalog({ force: options.forceScan === true, sceneName })
    ]);

    const programScene =
      safeString(
        programSceneResponse?.response?.sceneName ||
          programSceneResponse?.response?.currentProgramSceneName
      ) || "";
    const sceneItems =
      sceneItemsResponse?.response?.sceneItems || sceneItemsResponse.sceneItems || [];

    const catalog = scanResult?.items || state.catalog;
    const activeVideos = [];

    for (const item of sceneItems) {
      const sourceName = safeString(item.sourceName);
      if (!sourceName) continue;

      const catalogItem = state.catalogByName[sourceName] || catalog.find((x) => x.inputName === sourceName);
      if (!catalogItem && !/^T[1-4]_/i.test(sourceName)) continue;

      const enabled = Boolean(item.sceneItemEnabled);
      if (!enabled) continue;

      const meta = await readSceneItemMeta(sceneName, sourceName);
      const media = includeMedia ? await readMediaStatus(sourceName) : null;

      activeVideos.push({
        sourceName,
        tier: catalogItem?.tier || inferTierFromSourceName(sourceName) || "UNKNOWN",
        sceneItemEnabled: enabled,
        transform: meta.ok ? meta.transform : catalogItem?.transform || null,
        filePath: catalogItem?.filePath || "",
        fileName: catalogItem?.fileName || "",
        media: media?.ok
          ? {
              state: media.mediaState,
              playing: media.playing,
              durationMs: media.mediaDuration,
              cursorMs: media.mediaCursor
            }
          : null
      });
    }

    const view = {
      scannedAt: state.lastScanAt,
      viewedAt: nowTs(),
      giftSceneName: sceneName,
      programScene,
      onGiftScene: programScene === sceneName,
      activeVideos,
      playingNow: activeVideos.filter((x) => x.media?.playing),
      catalogSize: catalog.length
    };

    state.lastView = view;
    state.lastViewAt = view.viewedAt;
    return view;
  }

  function listTierPool(tier = "T1", catalog = state.catalog) {
    const safeTier = normalizeTier(tier) || "T1";
    return catalog
      .filter((item) => item.tier === safeTier && item.inGiftScene)
      .sort((a, b) => a.inputName.localeCompare(b.inputName, "cs"));
  }

  function resolveBeatSource(beat = {}, beatIndex = 0, catalog = state.catalog) {
    const preferredName = safeString(beat.videoSource);
    const preferredTier = normalizeTier(beat.videoTier) || inferTierFromSourceName(preferredName);

    if (preferredName && state.catalogByName[preferredName]) {
      const item = state.catalogByName[preferredName];
      return {
        tier: item.tier !== "UNKNOWN" ? item.tier : preferredTier || "T1",
        sourceName: preferredName,
        pickedBy: "manifest",
        eyesSeen: true,
        filePath: item.filePath,
        transform: item.transform
      };
    }

    const tier = preferredTier || ["T1", "T1", "T2", "T3", "T4"][beatIndex] || "T1";
    const pool = listTierPool(tier, catalog);

    if (!pool.length) {
      const configPool =
        runtimeConfig?.obs?.tierSources?.[tier] &&
        Array.isArray(runtimeConfig.obs.tierSources[tier])
          ? runtimeConfig.obs.tierSources[tier]
          : [];
      const fallbackName = safeString(configPool[beatIndex % configPool.length]);
      return {
        tier,
        sourceName: fallbackName,
        pickedBy: "config_fallback",
        eyesSeen: Boolean(state.catalogByName[fallbackName]),
        filePath: state.catalogByName[fallbackName]?.filePath || "",
        transform: state.catalogByName[fallbackName]?.transform || null
      };
    }

    const picked = pool[beatIndex % pool.length];
    return {
      tier,
      sourceName: picked.inputName,
      pickedBy: "eyes_tier_pool",
      eyesSeen: true,
      filePath: picked.filePath,
      transform: picked.transform
    };
  }

  function buildStoryPlanFromEyes(story = {}, userLabel = "", catalog = state.catalog) {
    const beats = Array.isArray(story.beats) ? story.beats : [];
    const first = safeString(userLabel, "Divák").split(/\s+/)[0] || userLabel;

    return beats.map((beat, index) => {
      const video = resolveBeatSource(beat, index, catalog);
      const caption = safeString(beat.caption)
        .replace(/\{user\}/g, first)
        .replace(/\{fullUser\}/g, userLabel);
      const subcaption = safeString(beat.subcaption)
        .replace(/\{user\}/g, first)
        .replace(/\{fullUser\}/g, userLabel);

      return {
        id: safeString(beat.id, `beat_${index + 1}`),
        caption,
        subcaption,
        tier: video.tier,
        sourceName: video.sourceName,
        pickedBy: video.pickedBy,
        eyesSeen: video.eyesSeen,
        filePath: video.filePath,
        transform: video.transform
      };
    }).filter((beat) => beat.sourceName);
  }

  async function observePlayback(sourceName, options = {}) {
    const timeoutMs = toNumber(options.timeoutMs, 2500);
    const startedAt = nowTs();

    while (nowTs() - startedAt < timeoutMs) {
      const view = await getPlaybackView({ includeMedia: true, forceScan: false });
      const match = view.activeVideos.find((x) => x.sourceName === sourceName);
      if (match?.media?.playing) {
        return {
          ok: true,
          seen: true,
          sourceName,
          view: match,
          waitedMs: nowTs() - startedAt
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const view = await getPlaybackView({ includeMedia: true, forceScan: false });
    const match = view.activeVideos.find((x) => x.sourceName === sourceName);

    return {
      ok: Boolean(match),
      seen: Boolean(match),
      playing: Boolean(match?.media?.playing),
      sourceName,
      view: match || null,
      waitedMs: nowTs() - startedAt
    };
  }

  async function scanAwayScene(options = {}) {
    const awaySceneModule = require("./MIA_OBS_AWAY_SCENE");
    const awayLoopModule = require("./MIA_OBS_AWAY_LOOP");
    const loopConfig = awayLoopModule.getAwayLoopConfig();
    const sceneName = safeString(options.sceneName, awaySceneModule.resolveAwaySceneName());
    const requiredOverlayIds = awaySceneModule.AWAY_REQUIRED_IDS || [];

    const overlayPatterns = [
      { id: "away_loop", pattern: /MIA_AWAY_LOOP|nejsem tu smy|away-loop/i },
      { id: "host_mode", pattern: /MIA_HOST|host-mode/i },
      { id: "entity", pattern: /MIA_ENTITY|entity-overlay/i },
      { id: "viewer_strip", pattern: /VIEWER_STRIP|viewer-strip/i },
      { id: "speech", pattern: /MIA_SPEECH|speech-overlay/i },
      { id: "voice", pattern: /MIA_VOICE|voice-overlay/i }
    ];

    const [programSceneResponse, inputListResponse, sceneItemsResponse] = await Promise.all([
      safeObsCall("GetCurrentProgramScene"),
      safeObsCall("GetInputList"),
      safeObsCall("GetSceneItemList", { sceneName })
    ]);

    if (!sceneItemsResponse?.ok) {
      return {
        ok: false,
        reason: sceneItemsResponse?.reason || "GetSceneItemList_failed",
        sceneName
      };
    }

    const programScene =
      safeString(
        programSceneResponse?.response?.sceneName ||
          programSceneResponse?.response?.currentProgramSceneName
      ) || "";
    const inputs = inputListResponse?.response?.inputs || inputListResponse?.inputs || [];
    const sceneItems =
      sceneItemsResponse?.response?.sceneItems || sceneItemsResponse?.sceneItems || [];

    const overlays = [];
    for (const item of sceneItems) {
      const sourceName = safeString(item?.sourceName);
      if (!sourceName) continue;

      let url = "";
      let inputKind = "";
      const input = inputs.find((row) => row?.inputName === sourceName);
      if (input) {
        inputKind = safeString(input.inputKind);
        if (inputKind === "browser_source") {
          const settings = await readInputSettings(sourceName);
          url = safeString(settings.settings?.url);
        }
      }

      const hay = `${sourceName} ${url}`;
      const match = overlayPatterns.find((row) => row.pattern.test(hay));
      const meta = await readSceneItemMeta(sceneName, sourceName);

      overlays.push({
        id: match?.id || "other",
        sourceName,
        inputKind,
        url,
        sceneItemEnabled: meta.ok ? meta.sceneItemEnabled : Boolean(item.sceneItemEnabled),
        transform: meta.ok ? meta.transform : null
      });
    }

    const loopEntry =
      overlays.find((row) => row.id === "away_loop") ||
      overlays.find((row) => /MIA_AWAY_LOOP|nejsem tu smy/i.test(row.sourceName));

    let loopVisual = null;
    if (loopEntry?.sceneItemEnabled && loopEntry.sourceName) {
      const shot = await safeObsCall("GetSourceScreenshot", {
        sourceName: loopEntry.sourceName,
        imageFormat: "png",
        imageWidth: eyesConfig.screenshotWidth,
        imageHeight: eyesConfig.screenshotHeight
      });
      const imageData = normalizeScreenshotBase64(
        shot?.response?.imageData || shot?.imageData || ""
      );
      if (imageData) {
        const lum = await analyzePngBase64Luminance(imageData);
        const cov = await analyzePngBase64Coverage(imageData);
        loopVisual = {
          ok: lum.ok && cov.ok && cov.coverage >= 0.08,
          avgLum: lum.avgLum,
          coverage: cov.coverage,
          reason:
            cov.coverage < 0.08
              ? "loop_empty_or_black"
              : lum.avgLum < 4
                ? "loop_too_dark"
                : null
        };
      } else {
        loopVisual = { ok: false, reason: "loop_screenshot_failed" };
      }
    } else {
      loopVisual = { ok: false, reason: "away_loop_not_visible" };
    }

    const missingRequired = requiredOverlayIds.filter(
      (id) => !overlays.some((row) => row.id === id && row.sceneItemEnabled)
    );

    const report = {
      ok: missingRequired.length === 0 && loopVisual?.ok === true,
      sceneName,
      programScene,
      onAwayScene: programScene === sceneName,
      loopMode: awayLoopModule.resolveAwayLoopMode(),
      loopSource: loopEntry?.sourceName || loopConfig.inputName,
      loopVisual,
      overlays,
      missingRequired,
      scannedAt: nowTs()
    };

    state.lastAwayScan = report;
    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "mia_eyes_away_scan",
      sceneName,
      onAwayScene: report.onAwayScene,
      loopOk: loopVisual?.ok === true,
      missingRequired
    });

    return report;
  }

  async function captureScreenshot(options = {}) {
    const sourceName = safeString(options.sourceName);
    const imageFormat = safeString(options.imageFormat, "png");
    const imageWidth = toNumber(options.imageWidth, eyesConfig.screenshotWidth);
    const imageHeight = toNumber(options.imageHeight, eyesConfig.screenshotHeight);
    const save = options.save !== false;

    const request = {
      imageFormat,
      imageWidth,
      imageHeight
    };

    if (sourceName) {
      request.sourceName = sourceName;
    } else {
      request.sourceName = getGiftSceneName(options.sceneName);
    }

    const response = await safeObsCall("GetSourceScreenshot", request);
    if (!response?.ok) {
      return {
        ok: false,
        reason: response?.reason || "GetSourceScreenshot_failed",
        sourceName: request.sourceName
      };
    }

    const imageData = normalizeScreenshotBase64(
      response.response?.imageData || response.imageData || ""
    );
    if (!imageData) {
      return { ok: false, reason: "empty_screenshot", sourceName: request.sourceName };
    }

    let savedPath = "";
    if (save) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      const fileName = `eyes-${safeString(request.sourceName, "scene").replace(/[^\w.-]+/g, "_")}-${nowTs()}.${imageFormat}`;
      savedPath = path.join(screenshotDir, fileName);
      fs.writeFileSync(savedPath, Buffer.from(imageData, "base64"));
    }

    const shot = {
      ok: true,
      sourceName: request.sourceName,
      imageFormat,
      imageWidth,
      imageHeight,
      imageData,
      savedPath,
      publicUrl: savedPath
        ? `/generated/eyes/${path.basename(savedPath)}`
        : "",
      capturedAt: nowTs()
    };

    state.lastScreenshot = shot;
    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "mia_eyes_screenshot",
      sourceName: shot.sourceName,
      publicUrl: shot.publicUrl
    });

    return shot;
  }

  async function syncWebcamVisibility(options = {}) {
    if (!eyesConfig.webcamAutoHide) {
      return { ok: true, action: "disabled" };
    }

    const sceneName = getGiftSceneName(options.sceneName);
    const sourceName = safeString(options.sourceName, eyesConfig.webcamSourceName);
    const now = nowTs();

    const sceneMeta = await readSceneItemMeta(sceneName, sourceName);
    if (!sceneMeta.ok) {
      return {
        ok: false,
        action: "skip",
        reason: sceneMeta.reason || "webcam_not_in_scene",
        sourceName,
        sceneName
      };
    }

    const shot = await safeObsCall("GetSourceScreenshot", {
      sourceName,
      imageFormat: "png",
      imageWidth: 320,
      imageHeight: 180
    });

    if (!shot?.ok) {
      return {
        ok: false,
        action: "skip",
        reason: shot?.reason || "screenshot_failed",
        sourceName
      };
    }

    const imageData = shot.response?.imageData || shot.imageData || "";
    const lumStats = await analyzePngBase64Luminance(imageData);
    if (!lumStats.ok) {
      return {
        ok: false,
        action: "skip",
        reason: lumStats.reason || "luminance_failed",
        sourceName
      };
    }

    const avgLum = lumStats.avgLum;
    const wasEnabled = sceneMeta.sceneItemEnabled === true;
    let action = "noop";
    let enabled = wasEnabled;

    // MIA oči: černý frame = kamera bez signálu → schovej. Jas nad prah = zapni.
    if (wasEnabled && avgLum < eyesConfig.webcamDarkLum) {
      const hideResp = await safeObsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: sceneMeta.sceneItemId,
        sceneItemEnabled: false
      });
      if (hideResp?.ok) {
        action = "hide";
        enabled = false;
      }
    } else if (!wasEnabled && avgLum >= eyesConfig.webcamBrightLum) {
      const showResp = await safeObsCall("SetSceneItemEnabled", {
        sceneName,
        sceneItemId: sceneMeta.sceneItemId,
        sceneItemEnabled: true
      });
      if (showResp?.ok) {
        action = "show";
        enabled = true;
      }
    }

    state.webcam = {
      lastCheckAt: now,
      lastLuminance: Math.round(avgLum * 10) / 10,
      lastEnabled: enabled,
      lastAction: action,
      sourceName,
      sceneName,
      samplePixels: lumStats.samplePixels
    };

    if (action === "hide" || action === "show") {
      appendJsonLog("mia-events", {
        ts: now,
        stage: "mia_eyes_webcam",
        action,
        sourceName,
        avgLum: state.webcam.lastLuminance,
        darkLum: eyesConfig.webcamDarkLum,
        brightLum: eyesConfig.webcamBrightLum
      });
    }

    return {
      ok: true,
      action,
      sourceName,
      sceneName,
      avgLum: state.webcam.lastLuminance,
      enabled,
      wasEnabled
    };
  }

  function getSnapshot() {
    return {
      lastScanAt: state.lastScanAt,
      lastViewAt: state.lastViewAt,
      catalogSize: state.catalog.length,
      giftSceneName: eyesConfig.giftSceneName,
      lastView: state.lastView,
      lastScreenshot: state.lastScreenshot,
    lastError: state.lastError,
    webcam: state.webcam,
    lastAwayScan: state.lastAwayScan || null,
    catalogPreview: state.catalog.slice(0, 12).map((item) => ({
        inputName: item.inputName,
        tier: item.tier,
        fileName: item.fileName,
        inGiftScene: item.inGiftScene,
        sceneItemEnabled: item.sceneItemEnabled,
        transform: item.transform
      }))
    };
  }

  return {
    scanCatalog,
    scanAwayScene,
    getPlaybackView,
    buildStoryPlanFromEyes,
    resolveBeatSource,
    observePlayback,
    captureScreenshot,
    syncWebcamVisibility,
    getSnapshot,
    listTierPool
  };
}

module.exports = {
  createMiaEyes,
  inferTierFromSourceName,
  normalizeMediaState,
  computeAverageLuminance,
  computeContentCoverage,
  normalizeScreenshotBase64,
  analyzePngBase64Luminance,
  analyzePngBase64Coverage
};
