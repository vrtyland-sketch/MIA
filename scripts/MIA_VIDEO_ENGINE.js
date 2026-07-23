"use strict";

const persistentLayersModule = require("./MIA_OBS_PERSISTENT_LAYERS");
const {
  tierRequiresEmbeddedAudio
} = require("./MIA_MEDIA_CATALOG");
const {
  readObsCanvas,
  resolvePlatform,
  buildGiftVideoTransform
} = require("./MIA_OBS_VISION");

/**
 * MIA_VIDEO_ENGINE.js
 *
 * Auditní verze:
 * - drží běžnou tier rotaci jako ve funkční 86
 * - opravuje bowl special tak, aby šel pustit přesně jeden zadaný source
 * - special event má prioritu před běžnou frontou
 * - waitForMediaEnd umí čekat na OBS MediaInputPlaybackEnded
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTier(value) {
  const tier = safeString(value).toUpperCase();
  if (tier === "T6") return "T5";
  if (
    tier === "T1" ||
    tier === "T2" ||
    tier === "T3" ||
    tier === "T4" ||
    tier === "T5" ||
    tier === "PROFILE"
  ) {
    return tier;
  }
  return "T1";
}

function normalizeObsPath(filePath = "") {
  return safeString(filePath).replace(/\\/g, "/");
}

function buildSourcePool(runtimeConfig, tier) {
  const pool =
    runtimeConfig?.obs?.tierSources?.[tier] &&
    Array.isArray(runtimeConfig.obs.tierSources[tier])
      ? runtimeConfig.obs.tierSources[tier]
      : [];

  return pool.map((x) => safeString(x)).filter(Boolean);
}

function buildPlaybackMs(runtimeConfig, tier) {
  const defaults = {
    T1: 5000,
    T2: 10000,
    T3: 15000,
    T4: 20000,
    T5: 35000,
    PROFILE: 12000
  };
  return toNumber(runtimeConfig?.obs?.tierPlaybackMs?.[tier], defaults[tier] || 5000);
}

function getGiftPlaybackSettings(runtimeConfig = {}) {
  const obs = runtimeConfig?.obs || {};
  return {
    waitMediaEnd: obs.giftWaitMediaEnd !== false,
    bufferMs: toNumber(obs.giftPlaybackBufferMs, 1500),
    longAudioMinMs: toNumber(obs.giftLongAudioMinMs, 60000),
    maxSleepMs: toNumber(obs.giftPlaybackMaxSleepMs, 120000),
    maxWaitMs: toNumber(obs.giftPlaybackMaxWaitMs, 600000)
  };
}

function resolveGiftVideoTiming(mediaPick = {}, runtimeConfig = {}, tier = "T1") {
  const settings = getGiftPlaybackSettings(runtimeConfig);
  const safeTier = normalizeTier(tier);
  const durationMs = toNumber(mediaPick?.durationMs, 0);
  const hasAudio =
    mediaPick?.hasEmbeddedAudio === true ||
    (tierRequiresEmbeddedAudio(safeTier) && mediaPick?.hasEmbeddedAudio !== false);
  const streamerFullPlay =
    mediaPick?.streamerFullPlay === true ||
    mediaPick?.pickedBy === "streamer_media_command";

  if (streamerFullPlay && durationMs > 0) {
    const playbackMs = durationMs + settings.bufferMs;
    return {
      playbackMs,
      waitForMediaEnd: true,
      maxWaitMs: Math.min(durationMs + 30_000, 900_000),
      longAudioFullPlay: true,
      durationMs,
      hasEmbeddedAudio: hasAudio
    };
  }

  const longAudioFullPlay = hasAudio && durationMs > settings.longAudioMinMs;
  const waitForMediaEnd = settings.waitMediaEnd || longAudioFullPlay;

  let playbackMs;
  if (durationMs > 0) {
    if (longAudioFullPlay) {
      playbackMs = durationMs + settings.bufferMs;
    } else {
      playbackMs = Math.min(
        Math.max(durationMs + settings.bufferMs, 4000),
        settings.maxSleepMs
      );
    }
  } else {
    playbackMs = buildPlaybackMs(runtimeConfig, safeTier);
  }

  let maxWaitMs;
  if (longAudioFullPlay && durationMs > 0) {
    maxWaitMs = Math.min(durationMs + settings.bufferMs + 8000, settings.maxWaitMs);
  } else if (waitForMediaEnd && durationMs > 0) {
    maxWaitMs = Math.min(Math.max(playbackMs + 5000, 10000), settings.maxWaitMs);
  } else {
    maxWaitMs = Math.max(playbackMs + 5000, 10000);
  }

  return {
    playbackMs,
    waitForMediaEnd,
    maxWaitMs,
    longAudioFullPlay,
    durationMs: durationMs > 0 ? durationMs : null,
    hasEmbeddedAudio: hasAudio
  };
}

function buildJobTimingFields(mediaPick = {}, runtimeConfig = {}, tier = "T1") {
  const timing = resolveGiftVideoTiming(mediaPick, runtimeConfig, tier);
  return {
    playbackMs: timing.playbackMs,
    waitForMediaEnd: timing.waitForMediaEnd,
    maxWaitMs: timing.maxWaitMs,
    longAudioFullPlay: timing.longAudioFullPlay,
    durationMs: timing.durationMs,
    hasEmbeddedAudio: timing.hasEmbeddedAudio
  };
}

function getGiftQueueConfig(runtimeConfig) {
  return {
    maxPendingJobs: toNumber(runtimeConfig?.obs?.queue?.maxPendingJobs, 50),
    idlePollMs: toNumber(runtimeConfig?.obs?.queue?.idlePollMs, 120),
    mergeEnabled: runtimeConfig?.obs?.queue?.mergeEnabled !== false,
    mergeWindowMs: toNumber(runtimeConfig?.obs?.queue?.mergeWindowMs, 3500),
    interruptPollMs: toNumber(runtimeConfig?.obs?.queue?.interruptPollMs, 150),
    sceneName: safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS"),
    autoSwitchProgramScene:
      runtimeConfig?.obs?.autoSwitchProgramScene !== false,
    restoreProgramSceneAfterPlayback:
      runtimeConfig?.obs?.restoreProgramSceneAfterPlayback !== false,
    returnSceneName: safeString(runtimeConfig?.obs?.returnSceneName, ""),
    sceneSwitchSettleMs: toNumber(runtimeConfig?.obs?.sceneSwitchSettleMs, 280),
    muteGiftVideoDuringMiaVoice:
      runtimeConfig?.obs?.muteGiftVideoDuringMiaVoice !== false,
    stopPreviousOnly: runtimeConfig?.obs?.stopPreviousOnly !== false,
    playbackSettings: getGiftPlaybackSettings(runtimeConfig)
  };
}

function getUserLabel(normalizedEvent = {}) {
  const user = normalizedEvent?.user || {};
  return (
    safeString(user.nickname) ||
    safeString(user.username) ||
    safeString(user.displayName) ||
    safeString(user.name) ||
    "unknown"
  );
}

function buildMergeKey(tier, normalizedEvent = {}) {
  const support = normalizedEvent?.support || {};
  const user = normalizedEvent?.user || {};

  return [
    normalizeTier(tier),
    String(user.userId ?? user.username ?? user.nickname ?? "anon").toLowerCase(),
    safeString(support.giftName, "gift").toLowerCase()
  ].join("|");
}

function buildJobId(prefix, nowTs) {
  return `${prefix}_${nowTs()}`;
}

function buildPlaybackId(sourceName, nowTs) {
  return `${safeString(sourceName, "unknown")}_${nowTs()}`;
}

function buildEventSummary(normalizedEvent = {}) {
  return {
    platform: safeString(normalizedEvent?.platform, "unknown"),
    eventType: safeString(normalizedEvent?.eventType, "unknown"),
    route: safeString(normalizedEvent?.route, "unknown"),
    user: getUserLabel(normalizedEvent),
    support: normalizedEvent?.support
      ? {
          giftName: safeString(normalizedEvent.support.giftName),
          tier: safeString(normalizedEvent.support.tier).toUpperCase(),
          coins: toNumber(
            normalizedEvent.support.totalCoins ??
              normalizedEvent.support.coins ??
              normalizedEvent.support.rawValue,
            0
          ),
          repeatCount: toNumber(normalizedEvent.support.repeatCount, 1)
        }
      : null
  };
}

function getEndedInputName(eventData = {}) {
  return (
    safeString(eventData?.inputName) ||
    safeString(eventData?.mediaInputName) ||
    safeString(eventData?.input?.inputName) ||
    safeString(eventData?.input)
  );
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createVideoEngine(deps = {}) {
  const runtimeConfig = deps.runtimeConfig || {};
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : () => {};
  const nowTs =
    typeof deps.nowTs === "function" ? deps.nowTs : () => Date.now();
  const sleep =
    typeof deps.sleep === "function"
      ? deps.sleep
      : (ms) =>
          new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, Number(ms) || 0))
          );
  const safeObsCall =
    typeof deps.safeObsCall === "function"
      ? deps.safeObsCall
      : async () => ({ ok: false, reason: "missing_safeObsCall" });
  const isMiaVoiceActive =
    typeof deps.isMiaVoiceActive === "function"
      ? deps.isMiaVoiceActive
      : () => false;
  const pickNextMediaForTier =
    typeof deps.pickNextMediaForTier === "function"
      ? deps.pickNextMediaForTier
      : null;

  const queueConfig = getGiftQueueConfig(runtimeConfig);

  const allTiers = ["T1", "T2", "T3", "T4", "T5", "PROFILE"];
  const tierSources = {};
  const tierPlaybackMs = {};
  const rotationIndexByTier = {};

  for (const tier of allTiers) {
    tierSources[tier] = buildSourcePool(runtimeConfig, tier);
    tierPlaybackMs[tier] = buildPlaybackMs(runtimeConfig, tier);
    rotationIndexByTier[tier] = 0;
  }

  const state = {
    sceneName: queueConfig.sceneName,
    tierSources,
    tierPlaybackMs,
    rotationIndexByTier,

    pendingQueue: [],
    processing: false,
    currentPlayback: null,
    specialPlaybackActive: false,
    stats: {
      enqueued: 0,
      merged: 0,
      dropped: 0,
      started: 0,
      completed: 0,
      failed: 0,
      cleared: 0,
      stopAllCalls: 0
    },

    currentToken: null,
    lastJob: null,
    lastResult: null,
    lastError: null,
    lastEnqueueAt: 0,
    lastStartedAt: 0,
    lastEndedAt: 0,

    activePlaybackWait: null,

    lastPersistentLayersAt: 0
  };

  function getAllSources() {
    return allTiers.flatMap((tier) => state.tierSources[tier] || []).filter(Boolean);
  }

  function sourceExists(sourceName) {
    const safeSourceName = safeString(sourceName);
    if (!safeSourceName) return false;
    return getAllSources().includes(safeSourceName);
  }

  function peekNextSourceForTier(tier) {
    const safeTier = normalizeTier(tier);
    const pool = state.tierSources[safeTier] || [];

    if (!pool.length) {
      return "";
    }

    const currentIndex = toNumber(state.rotationIndexByTier[safeTier], 0);
    return pool[currentIndex % pool.length];
  }

  function getNextSourceForTier(tier) {
    const safeTier = normalizeTier(tier);
    const sourceName = peekNextSourceForTier(safeTier);

    if (!sourceName) {
      return "";
    }

    const pool = state.tierSources[safeTier] || [];
    const currentIndex = toNumber(state.rotationIndexByTier[safeTier], 0);
    state.rotationIndexByTier[safeTier] = pool.length
      ? (currentIndex + 1) % Math.max(pool.length, 1)
      : currentIndex + 1;

    return sourceName;
  }

  function resolveMediaPickForTier(tier) {
    const safeTier = normalizeTier(tier);
    if (!pickNextMediaForTier) {
      return {
        obsSource: peekNextSourceForTier(safeTier),
        tier: safeTier,
        pickedBy: "obs_slot_only"
      };
    }

    const rotationIndex = toNumber(state.rotationIndexByTier[safeTier], 0);
    const pick = pickNextMediaForTier(safeTier, rotationIndex);
    if (!pick?.obsSource) {
      return {
        obsSource: peekNextSourceForTier(safeTier),
        tier: safeTier,
        pickedBy: "obs_slot_fallback"
      };
    }

    return pick;
  }

  async function bindMediaToInput(sourceName, absPath) {
    const safeSource = safeString(sourceName);
    const safePath = normalizeObsPath(absPath);
    if (!safeSource || !safePath) {
      return { ok: false, reason: "missing_bind_target" };
    }

    const settingsResp = await safeObsCall("GetInputSettings", { inputName: safeSource });
    if (!settingsResp?.ok) {
      return {
        ok: false,
        reason: settingsResp?.reason || "GetInputSettings_failed",
        sourceName: safeSource
      };
    }

    const current = settingsResp.response?.inputSettings || settingsResp.inputSettings || {};
    if (normalizeObsPath(current.local_file) === safePath) {
      return { ok: true, sourceName: safeSource, unchanged: true };
    }

    const response = await safeObsCall("SetInputSettings", {
      inputName: safeSource,
      inputSettings: {
        ...current,
        local_file: safePath,
        restart_on_activate: current.restart_on_activate !== false,
        close_when_inactive: current.close_when_inactive !== false,
        clear_on_media_end: current.clear_on_media_end !== false
      },
      overlay: true
    });

    return {
      ok: response?.ok === true,
      sourceName: safeSource,
      absPath: safePath,
      reason: response?.reason,
      raw: response || null
    };
  }

  async function getSceneItemId(sceneName, sourceName) {
    const response = await safeObsCall("GetSceneItemId", {
      sceneName,
      sourceName
    });

    if (!response?.ok) {
      return {
        ok: false,
        reason: response?.reason || "GetSceneItemId_failed",
        sourceName,
        sceneName,
        raw: response || null
      };
    }

    const sceneItemId = response?.response?.sceneItemId;

    if (typeof sceneItemId !== "number") {
      return {
        ok: false,
        reason: "sceneItemId_missing",
        sourceName,
        sceneName,
        raw: response || null
      };
    }

    return {
      ok: true,
      sceneItemId,
      sourceName,
      sceneName
    };
  }

  async function setSceneItemEnabled(sceneName, sourceName, enabled) {
    const idResult = await getSceneItemId(sceneName, sourceName);

    if (!idResult.ok) {
      return idResult;
    }

    const response = await safeObsCall("SetSceneItemEnabled", {
      sceneName,
      sceneItemId: idResult.sceneItemId,
      sceneItemEnabled: Boolean(enabled)
    });

    if (!response?.ok) {
      return {
        ok: false,
        reason: response?.reason || "SetSceneItemEnabled_failed",
        sourceName,
        sceneName,
        sceneItemId: idResult.sceneItemId,
        raw: response || null
      };
    }

    return {
      ok: true,
      sceneName,
      sourceName,
      sceneItemId: idResult.sceneItemId,
      enabled: Boolean(enabled)
    };
  }

  async function raiseSceneItemToTop(sceneName, sourceName) {
    const idResult = await getSceneItemId(sceneName, sourceName);
    if (!idResult.ok) return idResult;

    const listResp = await safeObsCall("GetSceneItemList", { sceneName });
    if (!listResp?.ok) {
      return { ok: false, reason: listResp?.reason || "GetSceneItemList_failed" };
    }

    const items = listResp.response?.sceneItems || [];
    const topIndex = items.reduce(
      (max, item) => Math.max(max, toNumber(item?.sceneItemIndex, 0)),
      0
    );

    const response = await safeObsCall("SetSceneItemIndex", {
      sceneName,
      sceneItemId: idResult.sceneItemId,
      sceneItemIndex: topIndex
    });

    if (!response?.ok) {
      return {
        ok: false,
        reason: response?.reason || "SetSceneItemIndex_failed",
        sourceName,
        sceneName
      };
    }

    return { ok: true, sceneName, sourceName, sceneItemIndex: topIndex };
  }

  async function ensurePersistentStreamOverlaysOnTop(sceneName, activeVideoSource = "") {
    if (!persistentLayersModule.shouldKeepPersistentOverlaysAboveVideo(runtimeConfig)) {
      return { ok: true, skipped: true, reason: "persistent_layers_disabled" };
    }

    const safeActiveVideo = safeString(activeVideoSource);
    const throttleMs = Math.max(
      0,
      Number(process.env.MIA_OBS_PERSISTENT_LAYERS_THROTTLE_MS || 5000)
    );
    if (
      !safeActiveVideo &&
      throttleMs > 0 &&
      Date.now() - state.lastPersistentLayersAt < throttleMs
    ) {
      return { ok: true, skipped: true, reason: "persistent_layers_throttled" };
    }

    const rules = persistentLayersModule.resolvePersistentLayerRules(runtimeConfig);
    const listResp = await safeObsCall("GetSceneItemList", { sceneName });
    if (!listResp?.ok) {
      return { ok: false, reason: listResp?.reason || "GetSceneItemList_failed" };
    }

    const items = listResp.response?.sceneItems || [];
    const sourceNames = items
      .map((item) => safeString(item?.sourceName))
      .filter(Boolean)
      .filter((name) => name !== safeString(activeVideoSource));

    const ordered = persistentLayersModule.sortPersistentOverlaySources(sourceNames, rules);
    const raised = [];
    const enabled = [];

    for (const sourceName of ordered) {
      const item = items.find((entry) => safeString(entry?.sourceName) === sourceName);
      const forceEnable =
        typeof persistentLayersModule.shouldForceEnablePersistentOverlay === "function"
          ? persistentLayersModule.shouldForceEnablePersistentOverlay(sourceName)
          : true;

      // Alert overlaye (combo/flyby/duel) jen zvedáme když už jsou zapnuté —
      // nikdy je nezapínáme natvrdo (šetří paměť/GPU, brání pádu OBS na slabém HW).
      if (item && item.sceneItemEnabled !== true) {
        if (!forceEnable) {
          continue;
        }
        const enableResult = await setSceneItemEnabled(sceneName, sourceName, true);
        if (enableResult.ok) {
          enabled.push(sourceName);
        }
      }

      const raiseResult = await raiseSceneItemToTop(sceneName, sourceName);
      if (raiseResult.ok) {
        raised.push(sourceName);
      }
    }

    if (raised.length || enabled.length) {
      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "obs_persistent_layers_raised",
        sceneName,
        activeVideoSource: safeActiveVideo || null,
        raised,
        enabled
      });
    }

    state.lastPersistentLayersAt = Date.now();

    return { ok: true, sceneName, raised, enabled };
  }

  async function ensureGiftVideoVisibleLayout(sceneName, sourceName, tier = "T1") {
    const idResult = await getSceneItemId(sceneName, sourceName);
    if (!idResult.ok) return idResult;

    const canvas = await readObsCanvas(safeObsCall);
    const kickBridge =
      String(process.env.MIA_KICK_BRIDGE_ENABLED || "").toLowerCase() === "1";
    const platform = resolvePlatform(
      process.env.MIA_STREAM_PLATFORM || "auto",
      kickBridge
    );
    const layout = buildGiftVideoTransform(tier, canvas, platform);

    const response = await safeObsCall("SetSceneItemTransform", {
      sceneName,
      sceneItemId: idResult.sceneItemId,
      sceneItemTransform: layout
    });

    return {
      ok: response?.ok === true,
      sourceName,
      sceneName,
      canvas,
      platform,
      layout
    };
  }

  async function getCurrentProgramSceneName() {
    const response = await safeObsCall("GetCurrentProgramScene");

    if (!response?.ok) {
      return null;
    }

    return safeString(
      response.response?.sceneName ||
        response.response?.currentProgramSceneName
    );
  }

  async function setCurrentProgramScene(sceneName) {
    if (!sceneName) {
      return { ok: false, reason: "missing_scene_name" };
    }

    const response = await safeObsCall("SetCurrentProgramScene", { sceneName });

    if (!response?.ok) {
      return {
        ok: false,
        reason: response?.reason || "SetCurrentProgramScene_failed",
        sceneName,
        raw: response || null
      };
    }

    return { ok: true, sceneName };
  }

  async function restartMediaInput(inputName) {
    await sleep(120);

    const restartResponse = await safeObsCall("TriggerMediaInputAction", {
      inputName,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART"
    });

    await safeObsCall("TriggerMediaInputAction", {
      inputName,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
    });

    if (!restartResponse?.ok) {
      const playOnlyResponse = await safeObsCall("TriggerMediaInputAction", {
        inputName,
        mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
      });

      if (!playOnlyResponse?.ok) {
        return {
          ok: false,
          reason: restartResponse?.reason || "TriggerMediaInputAction_failed",
          inputName,
          raw: restartResponse || null
        };
      }
    }

    return {
      ok: true,
      inputName
    };
  }

  async function stopMediaInput(inputName) {
    const response = await safeObsCall("TriggerMediaInputAction", {
      inputName,
      mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP"
    });

    return {
      ok: response?.ok === true,
      inputName,
      raw: response || null
    };
  }

  async function setInputMuted(inputName, muted) {
    const response = await safeObsCall("SetInputMute", {
      inputName,
      inputMuted: Boolean(muted)
    });

    return {
      ok: response?.ok === true,
      inputName,
      muted: Boolean(muted),
      raw: response || null
    };
  }

  async function stopAllGiftVideos(reason = "stop_all") {
    const allSources = getAllSources();
    const results = [];

    state.stats.stopAllCalls += 1;

    for (const sourceName of allSources) {
      const result = await setSceneItemEnabled(state.sceneName, sourceName, false);
      results.push(result);
    }

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "video_stop_all",
      reason,
      sceneName: state.sceneName,
      results
    });

    return {
      ok: true,
      sceneName: state.sceneName,
      results
    };
  }

  async function hidePreviousGiftVideo(reason = "before_playback") {
    const previousSource = safeString(state.currentPlayback?.sourceName);
    if (queueConfig.stopPreviousOnly && previousSource) {
      await stopMediaInput(previousSource);
      const result = await setSceneItemEnabled(state.sceneName, previousSource, false);
      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "video_hide_previous",
        reason,
        sourceName: previousSource,
        result
      });
      return { ok: true, mode: "previous_only", sourceName: previousSource };
    }

    return stopAllGiftVideos(reason);
  }

  async function waitUntilSpecialPlaybackFinishes() {
    while (state.specialPlaybackActive) {
      await sleep(queueConfig.interruptPollMs);
    }
  }

  async function waitForPlaybackCompletion(currentPlayback, options = {}) {
    const playbackMs =
      toNumber(options.playbackMs, 0) ||
      state.tierPlaybackMs[currentPlayback?.tier] ||
      5000;

    const waitForMediaEnd = options.waitForMediaEnd === true;
    const maxWaitMs =
      toNumber(options.maxWaitMs, 0) ||
      Math.max(playbackMs + 5000, 10000);

    if (!waitForMediaEnd) {
      await sleep(playbackMs);
      return {
        mode: "sleep",
        waitedMs: playbackMs
      };
    }

    const deferred = createDeferred();
    const startedAt = nowTs();

    state.activePlaybackWait = {
      playbackId: currentPlayback.playbackId,
      sourceName: safeString(currentPlayback.sourceName),
      startedAt,
      deferred
    };

    let timeoutId = null;

    try {
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            mode: "timeout",
            waitedMs: nowTs() - startedAt
          });
        }, maxWaitMs);
      });

      const eventPromise = deferred.promise.then(() => {
        return {
          mode: "media_end",
          waitedMs: nowTs() - startedAt
        };
      });

      return await Promise.race([eventPromise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (
        state.activePlaybackWait &&
        state.activePlaybackWait.playbackId === currentPlayback.playbackId
      ) {
        state.activePlaybackWait = null;
      }
    }
  }

  async function executePlaybackJob(job, options = {}) {
    const tier = normalizeTier(job.tier);
    const sourceName = safeString(job.sourceName);
    const mediaAbs = normalizeObsPath(job.mediaAbs);
    const playbackMs =
      toNumber(job.playbackMs, 0) ||
      toNumber(options.playbackMs, 0) ||
      state.tierPlaybackMs[tier] ||
      5000;
    const waitForMediaEnd = options.waitForMediaEnd === true;
    const special = job?.special === true;

    if (!sourceName) {
      state.stats.failed += 1;
      state.lastError = {
        ts: nowTs(),
        reason: "missing_source_name",
        job: clone(job)
      };
      return {
        ok: false,
        reason: "missing_source_name",
        job: clone(job)
      };
    }

    const obsProbe = await safeObsCall("GetVersion");
    if (!obsProbe?.ok) {
      state.stats.failed += 1;
      state.lastError = {
        ts: nowTs(),
        reason: obsProbe?.reason || "obs_not_connected",
        job: clone(job)
      };

      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "video_playback_skipped",
        reason: obsProbe?.reason || "obs_not_connected",
        tier,
        sourceName,
        job: clone(job)
      });

      return {
        ok: false,
        skipped: true,
        reason: obsProbe?.reason || "obs_not_connected",
        job: clone(job)
      };
    }

    let previousProgramScene = null;
    let switchedProgramScene = false;

    if (queueConfig.autoSwitchProgramScene) {
      previousProgramScene = await getCurrentProgramSceneName();

      if (previousProgramScene !== state.sceneName) {
        const switchResult = await setCurrentProgramScene(state.sceneName);

        if (switchResult?.ok) {
          switchedProgramScene = true;
          appendJsonLog("mia-events", {
            ts: nowTs(),
            stage: "video_program_scene_switched",
            fromScene: previousProgramScene || "(unknown)",
            toScene: state.sceneName,
            tier,
            sourceName
          });

          if (queueConfig.sceneSwitchSettleMs > 0) {
            await sleep(queueConfig.sceneSwitchSettleMs);
          }
        } else {
          appendJsonLog("mia-events", {
            ts: nowTs(),
            stage: "video_program_scene_switch_failed",
            fromScene: previousProgramScene || "(unknown)",
            toScene: state.sceneName,
            tier,
            sourceName,
            result: switchResult
          });
        }
      }
    }

    state.currentPlayback = {
      playbackId: buildPlaybackId(sourceName, nowTs),
      tier,
      sourceName,
      startedAt: nowTs(),
      eventSummary: buildEventSummary(job.normalizedEvent),
      special
    };

    state.lastStartedAt = state.currentPlayback.startedAt;
    state.stats.started += 1;

    let mutedForVoice = false;

    try {
      await hidePreviousGiftVideo(special ? "before_special_playback" : "before_playback");

      if (mediaAbs) {
        const bindResult = await bindMediaToInput(sourceName, mediaAbs);
        if (!bindResult.ok) {
          state.stats.failed += 1;
          state.lastError = {
            ts: nowTs(),
            reason: bindResult.reason || "bind_media_failed",
            job: clone(job),
            bindResult
          };

          appendJsonLog("mia-events", {
            ts: nowTs(),
            stage: "video_bind_failed",
            tier,
            sourceName,
            mediaAbs,
            bindResult
          });

          return {
            ok: false,
            reason: bindResult.reason || "bind_media_failed",
            stage: "bind_failed",
            bindResult
          };
        }
      }

      const enableResult = await setSceneItemEnabled(state.sceneName, sourceName, true);
      if (!enableResult.ok) {
        state.stats.failed += 1;
        state.lastError = {
          ts: nowTs(),
          reason: enableResult.reason,
          job: clone(job),
          enableResult
        };
        state.currentPlayback = null;

        appendJsonLog("mia-events", {
          ts: nowTs(),
          stage: "video_playback_failed",
          reason: enableResult.reason,
          tier,
          sourceName,
          job: clone(job)
        });

        return {
          ok: false,
          reason: enableResult.reason,
          stage: "enable_failed",
          enableResult
        };
      }

      if (
        runtimeConfig?.obs?.mutateVideoLayoutOnPlayback === true
      ) {
        await raiseSceneItemToTop(state.sceneName, sourceName);
        await ensureGiftVideoVisibleLayout(state.sceneName, sourceName, tier);
      } else {
        await raiseSceneItemToTop(state.sceneName, sourceName);
      }

      await ensurePersistentStreamOverlaysOnTop(state.sceneName, sourceName);

      if (
        queueConfig.muteGiftVideoDuringMiaVoice &&
        isMiaVoiceActive() === true &&
        !tierRequiresEmbeddedAudio(tier)
      ) {
        const muteResult = await setInputMuted(sourceName, true);
        mutedForVoice = muteResult.ok === true;
      }

      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "video_playback_started",
        sceneName: state.sceneName,
        programScene: (await getCurrentProgramSceneName()) || previousProgramScene,
        switchedProgramScene,
        tier,
        sourceName,
        mediaRel: safeString(job.mediaRel),
        contentKind: safeString(job.contentKind),
        hasEmbeddedAudio: job.hasEmbeddedAudio,
        playbackMs,
        waitForMediaEnd,
        special,
        mutedForVoice,
        job: clone(job)
      });

      const restartResult = await restartMediaInput(sourceName);
      if (!restartResult.ok) {
        state.stats.failed += 1;
        state.lastError = {
          ts: nowTs(),
          reason: restartResult.reason,
          job: clone(job),
          restartResult
        };
        await setSceneItemEnabled(state.sceneName, sourceName, false);
        state.currentPlayback = null;
        return {
          ok: false,
          reason: restartResult.reason,
          stage: "restart_failed",
          restartResult
        };
      }

      const waitResult = await waitForPlaybackCompletion(state.currentPlayback, {
        playbackMs,
        waitForMediaEnd,
        maxWaitMs: options.maxWaitMs
      });

      await stopMediaInput(sourceName);
      const disableResult = await setSceneItemEnabled(state.sceneName, sourceName, false);

      if (mutedForVoice) {
        await setInputMuted(sourceName, false);
      }

      state.lastEndedAt = nowTs();
      state.stats.completed += 1;
      state.lastResult = {
        ok: true,
        ts: nowTs(),
        tier,
        sourceName,
        playbackMs,
        waitResult,
        disableResult
      };
      state.currentPlayback = null;

      appendJsonLog("mia-events", {
        ts: nowTs(),
        stage: "video_playback_finished",
        sceneName: state.sceneName,
        tier,
        sourceName,
        playbackMs,
        waitResult,
        special,
        disableResult
      });

      await ensurePersistentStreamOverlaysOnTop(state.sceneName, "");

      return {
        ok: true,
        tier,
        sourceName,
        playbackMs,
        waitResult,
        disableResult,
        snapshot: getSnapshot()
      };
    } finally {
      if (mutedForVoice) {
        await setInputMuted(sourceName, false);
      }

      if (
        switchedProgramScene &&
        queueConfig.restoreProgramSceneAfterPlayback &&
        options.restoreProgramScene !== false
      ) {
        if (state.pendingQueue.length > 0) {
          appendJsonLog("mia-events", {
            ts: nowTs(),
            stage: "video_program_scene_restore_skipped",
            reason: "pending_queue_not_empty",
            pendingJobs: state.pendingQueue.length,
            sceneName: state.sceneName,
            tier,
            sourceName
          });
        } else {
          const returnScene =
            safeString(queueConfig.returnSceneName) || previousProgramScene;

          if (returnScene && returnScene !== state.sceneName) {
            const restoreResult = await setCurrentProgramScene(returnScene);

            appendJsonLog("mia-events", {
              ts: nowTs(),
              stage: restoreResult?.ok
                ? "video_program_scene_restored"
                : "video_program_scene_restore_failed",
              fromScene: state.sceneName,
              toScene: returnScene,
              tier,
              sourceName,
              result: restoreResult
            });
          }
        }
      }
    }
  }

  async function drainQueue() {
    if (state.processing) {
      return;
    }

    state.processing = true;

    try {
      while (state.pendingQueue.length > 0) {
        await waitUntilSpecialPlaybackFinishes();

        const job = state.pendingQueue.shift();
        state.lastJob = clone(job);

        await executePlaybackJob(job, {
          playbackMs: job.playbackMs,
          waitForMediaEnd: job.waitForMediaEnd === true || job.longAudioFullPlay === true,
          maxWaitMs: job.maxWaitMs
        });
        await sleep(queueConfig.idlePollMs);
      }
    } finally {
      state.processing = false;
    }
  }

  function tryMergeJob(tier, normalizedEvent) {
    if (!queueConfig.mergeEnabled) {
      return false;
    }

    const mergeKey = buildMergeKey(tier, normalizedEvent);
    const now = nowTs();

    for (let i = state.pendingQueue.length - 1; i >= 0; i -= 1) {
      const job = state.pendingQueue[i];
      if (!job) continue;

      if (job.mergeKey !== mergeKey) continue;
      if (job.special) continue;
      if (now - toNumber(job.createdAt, 0) > queueConfig.mergeWindowMs) continue;

      job.count = toNumber(job.count, 1) + 1;
      job.updatedAt = now;
      state.stats.merged += 1;

      appendJsonLog("mia-events", {
        ts: now,
        stage: "video_job_merged",
        mergeKey,
        tier,
        count: job.count,
        user: getUserLabel(normalizedEvent)
      });

      return true;
    }

    return false;
  }

  function peekNextGiftMediaPick(tier) {
    const safeTier = normalizeTier(tier);
    const mediaPick = resolveMediaPickForTier(safeTier);
    if (!mediaPick?.obsSource) {
      return null;
    }

    return {
      ...clone(mediaPick),
      timing: resolveGiftVideoTiming(mediaPick, runtimeConfig, safeTier)
    };
  }

  function resolveGiftJobPriority(safeTier, normalizedEvent = {}, special = false) {
    if (special) return 100;
    const support =
      normalizedEvent?.support && typeof normalizedEvent.support === "object"
        ? normalizedEvent.support
        : {};
    const mapPriority = toNumber(
      support.giftPriority ?? support.giftMap?.priority ?? support.giftMapRuntime?.priority,
      0
    );
    const tierPriority = Number(String(safeTier).replace(/\D/g, "")) || 1;
    return Math.max(mapPriority, tierPriority);
  }

  function sortPendingQueueByPriority() {
    state.pendingQueue.sort((a, b) => {
      if (a?.special && !b?.special) return -1;
      if (!a?.special && b?.special) return 1;
      const pa = toNumber(a?.priority, 0);
      const pb = toNumber(b?.priority, 0);
      if (pb !== pa) return pb - pa;
      return toNumber(a?.createdAt, 0) - toNumber(b?.createdAt, 0);
    });
  }

  function buildGiftJobFromPick(safeTier, mediaPick, normalizedEvent = {}, special = false, extra = {}) {
    const sourceName = safeString(mediaPick?.obsSource);
    const timingFields = buildJobTimingFields(mediaPick, runtimeConfig, safeTier);

    return {
      jobId: buildJobId(special ? "special" : "gift", nowTs),
      createdAt: nowTs(),
      updatedAt: nowTs(),
      tier: safeTier,
      priority: resolveGiftJobPriority(safeTier, normalizedEvent, special),
      giftKey: safeString(
        normalizedEvent?.support?.giftKey ||
          normalizedEvent?.support?.giftMap?.giftKey ||
          ""
      ),
      sourceName,
      mediaRel: safeString(extra.mediaRel || mediaPick?.rel),
      mediaAbs: normalizeObsPath(extra.mediaAbs || mediaPick?.abs),
      contentKind: safeString(mediaPick?.contentKind),
      hasEmbeddedAudio: timingFields.hasEmbeddedAudio,
      durationMs: timingFields.durationMs,
      playbackMs: toNumber(extra.playbackMs, 0) || timingFields.playbackMs,
      waitForMediaEnd:
        extra.forceFullPlayback === true || extra.reason === "streamer_solo_media"
          ? true
          : timingFields.waitForMediaEnd,
      maxWaitMs: toNumber(extra.maxWaitMs, 0) || timingFields.maxWaitMs,
      longAudioFullPlay:
        extra.forceFullPlayback === true || extra.reason === "streamer_solo_media"
          ? timingFields.longAudioFullPlay || toNumber(timingFields.durationMs, 0) > 0
          : timingFields.longAudioFullPlay,
      normalizedEvent: clone(normalizedEvent),
      mergeKey: buildMergeKey(safeTier, normalizedEvent),
      count: 1,
      special,
      reason: safeString(extra.reason, special ? "special_event" : ""),
      mediaPick: clone(mediaPick)
    };
  }

  function advanceTierRotation(safeTier) {
    const pool = state.tierSources[safeTier] || [];
    const currentIndex = toNumber(state.rotationIndexByTier[safeTier], 0);
    state.rotationIndexByTier[safeTier] = pool.length
      ? (currentIndex + 1) % Math.max(pool.length, 1)
      : currentIndex + 1;
  }

  async function enqueueGiftPlayback(tier, normalizedEvent = {}) {
    const safeTier = normalizeTier(tier);

    if (!(state.tierSources[safeTier] || []).length) {
      state.stats.failed += 1;
      state.lastError = {
        ts: nowTs(),
        reason: "tier_has_no_sources",
        tier: safeTier
      };
      return {
        ok: false,
        reason: "tier_has_no_sources",
        tier: safeTier,
        snapshot: getSnapshot()
      };
    }

    if (tryMergeJob(safeTier, normalizedEvent)) {
      return {
        ok: true,
        merged: true,
        tier: safeTier,
        snapshot: getSnapshot()
      };
    }

    const preResolvedPick = normalizedEvent?.giftVideoPick;
    const mediaPick =
      preResolvedPick && preResolvedPick.obsSource
        ? preResolvedPick
        : resolveMediaPickForTier(safeTier);
    const sourceName = safeString(mediaPick.obsSource) || getNextSourceForTier(safeTier);

    if (!sourceName) {
      state.stats.failed += 1;
      state.lastError = {
        ts: nowTs(),
        reason: "tier_has_no_sources",
        tier: safeTier
      };
      return {
        ok: false,
        reason: "tier_has_no_sources",
        tier: safeTier,
        snapshot: getSnapshot()
      };
    }

    const incomingPriority = resolveGiftJobPriority(safeTier, normalizedEvent, false);

    if (state.pendingQueue.length >= queueConfig.maxPendingJobs) {
      let lowestIdx = -1;
      let lowestPriority = Number.POSITIVE_INFINITY;
      for (let i = 0; i < state.pendingQueue.length; i += 1) {
        const pending = state.pendingQueue[i];
        if (!pending || pending.special) continue;
        const p = toNumber(pending.priority, 0);
        if (p < lowestPriority) {
          lowestPriority = p;
          lowestIdx = i;
        }
      }

      if (lowestIdx >= 0 && incomingPriority > lowestPriority) {
        state.pendingQueue.splice(lowestIdx, 1);
        state.stats.dropped += 1;
      } else {
        state.stats.dropped += 1;
        state.lastError = {
          ts: nowTs(),
          reason: "queue_full",
          tier: safeTier
        };
        return {
          ok: false,
          reason: "queue_full",
          tier: safeTier,
          snapshot: getSnapshot()
        };
      }
    }

    advanceTierRotation(safeTier);

    const job = buildGiftJobFromPick(
      safeTier,
      { ...mediaPick, obsSource: sourceName },
      normalizedEvent,
      false
    );

    state.pendingQueue.push(job);
    sortPendingQueueByPriority();
    state.stats.enqueued += 1;
    state.lastEnqueueAt = nowTs();

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "video_job_enqueued",
      tier: safeTier,
      priority: job.priority,
      giftKey: job.giftKey || null,
      sourceName,
      queueLength: state.pendingQueue.length,
      waitForMediaEnd: job.waitForMediaEnd,
      maxWaitMs: job.maxWaitMs,
      longAudioFullPlay: job.longAudioFullPlay,
      eventSummary: buildEventSummary(normalizedEvent)
    });

    void drainQueue();

    return {
      ok: true,
      enqueued: true,
      tier: safeTier,
      sourceName,
      timing: {
        playbackMs: job.playbackMs,
        waitForMediaEnd: job.waitForMediaEnd,
        maxWaitMs: job.maxWaitMs,
        longAudioFullPlay: job.longAudioFullPlay
      },
      snapshot: getSnapshot()
    };
  }

  async function playSpecialEvent(tier, normalizedEvent = {}, options = {}) {
    const safeTier = normalizeTier(tier);
    const forcedSourceName = safeString(options.sourceName);
    const mediaPick = forcedSourceName
      ? {
          obsSource: forcedSourceName,
          pickedBy: safeString(options.reason, "forced_source"),
          ...(options.mediaPick && typeof options.mediaPick === "object" ? options.mediaPick : {}),
          durationMs: toNumber(
            options.mediaPick?.durationMs ?? options.durationMs,
            toNumber(options.mediaPick?.durationMs, 0)
          ),
          hasEmbeddedAudio: options.mediaPick?.hasEmbeddedAudio === true
        }
      : resolveMediaPickForTier(safeTier);
    const sourceName = safeString(mediaPick.obsSource) || getNextSourceForTier(safeTier);

    if (!sourceName) {
      return {
        ok: false,
        reason: "tier_has_no_sources",
        tier: safeTier,
        snapshot: getSnapshot()
      };
    }

    if (forcedSourceName && !sourceExists(forcedSourceName)) {
      const inputResp = await safeObsCall("GetInputList");
      const inputNames = (inputResp?.response?.inputs || inputResp?.response || [])
        .map((item) => safeString(item?.inputName))
        .filter(Boolean);

      if (!inputNames.includes(forcedSourceName)) {
        return {
          ok: false,
          reason: "forced_source_not_found",
          tier: safeTier,
          sourceName: forcedSourceName,
          snapshot: getSnapshot()
        };
      }
    }

    while (state.processing) {
      await sleep(queueConfig.interruptPollMs);
    }

    state.specialPlaybackActive = true;

    const job = buildGiftJobFromPick(
      safeTier,
      {
        ...mediaPick,
        obsSource: sourceName,
        abs: options.mediaAbs || mediaPick.abs,
        rel: options.mediaRel || mediaPick.rel
      },
      normalizedEvent,
      true,
      {
        mediaAbs: options.mediaAbs,
        mediaRel: options.mediaRel,
        playbackMs: options.playbackMs,
        maxWaitMs: options.maxWaitMs,
        forceFullPlayback: options.forceFullPlayback === true,
        reason: options.reason
      }
    );

    if (options.waitForMediaEnd === false && !job.longAudioFullPlay) {
      job.waitForMediaEnd = false;
    }

    try {
      return await executePlaybackJob(job, {
        ...options,
        playbackMs: toNumber(options.playbackMs, 0) || job.playbackMs,
        waitForMediaEnd:
          options.waitForMediaEnd === true ||
          job.waitForMediaEnd === true ||
          job.longAudioFullPlay === true,
        maxWaitMs: toNumber(options.maxWaitMs, 0) || job.maxWaitMs
      });
    } finally {
      state.specialPlaybackActive = false;
      void drainQueue();
    }
  }

  function clearQueue() {
    const cleared = state.pendingQueue.length;
    state.pendingQueue = [];
    state.stats.cleared += cleared;

    appendJsonLog("mia-events", {
      ts: nowTs(),
      stage: "video_queue_cleared",
      cleared
    });

    return {
      ok: true,
      cleared,
      snapshot: getSnapshot()
    };
  }

  function hasTierSources(tier) {
    const safeTier = normalizeTier(tier);
    return Array.isArray(state.tierSources[safeTier]) && state.tierSources[safeTier].length > 0;
  }

  function handleMediaPlaybackEnded(eventData = {}) {
    const endedInputName = getEndedInputName(eventData);

    if (!state.activePlaybackWait) {
      return {
        ok: false,
        reason: "no_active_playback_wait",
        endedInputName
      };
    }

    if (!endedInputName) {
      return {
        ok: false,
        reason: "missing_input_name"
      };
    }

    if (endedInputName !== safeString(state.activePlaybackWait.sourceName)) {
      return {
        ok: false,
        reason: "different_input_ended",
        endedInputName,
        waitingFor: safeString(state.activePlaybackWait.sourceName)
      };
    }

    state.activePlaybackWait.deferred.resolve({
      ok: true,
      endedInputName
    });

    return {
      ok: true,
      endedInputName
    };
  }

  function getSnapshot() {
    return {
      sceneName: state.sceneName,
      tierSources: clone(state.tierSources),
      tierPlaybackMs: clone(state.tierPlaybackMs),
      rotationIndexByTier: clone(state.rotationIndexByTier),
      queueLength: state.pendingQueue.length,
      pendingQueue: clone(state.pendingQueue),
      processing: state.processing,
      currentPlayback: clone(state.currentPlayback),
      specialPlaybackActive: state.specialPlaybackActive,
      stats: clone(state.stats),
      lastJob: clone(state.lastJob),
      lastResult: clone(state.lastResult),
      lastError: clone(state.lastError),
      lastEnqueueAt: state.lastEnqueueAt,
      lastStartedAt: state.lastStartedAt,
      lastEndedAt: state.lastEndedAt
    };
  }

  return {
    enqueueGiftPlayback,
    playSpecialEvent,
    clearQueue,
    stopAllGiftVideos,
    hasTierSources,
    handleMediaPlaybackEnded,
    getSnapshot,
    peekNextSourceForTier,
    peekNextGiftMediaPick,
    ensurePersistentStreamOverlaysOnTop
  };
}

module.exports = {
  createVideoEngine,
  resolveGiftVideoTiming,
  getGiftPlaybackSettings,
  buildJobTimingFields
};