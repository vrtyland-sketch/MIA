"use strict";

const { resolveSoloStreamConfig } = require("./MIA_SOLO_STREAM_CONFIG");
const proactiveHost = require("./MIA_PROACTIVE_HOST");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function getSoloStreamState(outputState = {}) {
  if (!outputState.soloStreamState || typeof outputState.soloStreamState !== "object") {
    outputState.soloStreamState = {
      phase: "main",
      returnSceneName: "",
      currentSceneName: "",
      enteredAt: 0,
      lastSwitchAt: 0,
      lastSegmentAt: 0,
      lastSegmentLevel: 0,
      switchCount: 0,
      lastExitReason: null
    };
  }

  return outputState.soloStreamState;
}

function resetSoloStreamState(outputState = {}) {
  const state = getSoloStreamState(outputState);
  state.phase = "main";
  state.returnSceneName = "";
  state.currentSceneName = "";
  state.enteredAt = 0;
  state.lastSwitchAt = 0;
  state.lastSegmentAt = 0;
  state.lastSegmentLevel = 0;
  state.lastExitReason = "chat_activity";
  return state;
}

function resolveSceneFromMap(sceneMap = {}, key = "") {
  const normalized = safeString(key).toLowerCase();
  if (!normalized) return "";

  if (sceneMap[normalized]) return safeString(sceneMap[normalized]);

  const aliases = {
    default: ["default", "main"],
    idle: ["idle", "afk", "solo"],
    lobby: ["lobby", "waiting"],
    mia: ["mia", "host", "community"]
  };

  for (const [mapKey, names] of Object.entries(aliases)) {
    if (names.includes(normalized) && sceneMap[mapKey]) {
      return safeString(sceneMap[mapKey]);
    }
  }

  return "";
}

function resolveMainSceneName(config = {}, runtimeConfig = {}) {
  const explicit = safeString(config?.scenes?.main);
  if (explicit) return explicit;

  const sceneMap = runtimeConfig?.overlay?.sceneMap || {};
  const fromKey = resolveSceneFromMap(sceneMap, config?.sceneMapKeys?.main || "default");
  if (fromKey) return fromKey;

  const obsReturn = safeString(runtimeConfig?.obs?.returnSceneName);
  if (obsReturn) return obsReturn;

  return safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS");
}

function resolveSoloSceneName(level = 1, config = {}, runtimeConfig = {}) {
  const soloLevel = Math.max(1, Math.min(3, toNumber(level, 1)));
  const explicit = safeString(config?.scenes?.solo?.[soloLevel]);
  if (explicit) return explicit;

  const sceneMap = runtimeConfig?.overlay?.sceneMap || {};
  const keyName = config?.sceneMapKeys?.[`solo${soloLevel}`] || "idle";
  const fromKey = resolveSceneFromMap(sceneMap, keyName);
  if (fromKey) return fromKey;

  if (soloLevel >= 3) {
    return (
      resolveSceneFromMap(sceneMap, "mia") ||
      resolveSceneFromMap(sceneMap, "lobby") ||
      resolveSceneFromMap(sceneMap, "idle") ||
      resolveMainSceneName(config, runtimeConfig)
    );
  }

  if (soloLevel === 2) {
    return (
      resolveSceneFromMap(sceneMap, "lobby") ||
      resolveSceneFromMap(sceneMap, "idle") ||
      resolveMainSceneName(config, runtimeConfig)
    );
  }

  return (
    resolveSceneFromMap(sceneMap, "idle") ||
    resolveSceneFromMap(sceneMap, "lobby") ||
    resolveMainSceneName(config, runtimeConfig)
  );
}

function resolveEnterQuietMs(config = {}, tick = {}, band = "medium") {
  const configured = toNumber(config?.thresholds?.enterQuietMs, 0);
  if (configured > 0) return configured;

  if (typeof proactiveHost.resolveQuietThresholdMs === "function") {
    return proactiveHost.resolveQuietThresholdMs(band);
  }

  return toNumber(tick?.quietThresholdMs, 60000);
}

function isGiftVideoBusy(videoSnapshot = {}, config = {}) {
  if (config?.safety?.blockDuringGiftVideo === false) return false;
  if (!videoSnapshot || typeof videoSnapshot !== "object") return false;

  return Boolean(
    videoSnapshot.processing ||
      videoSnapshot.specialPlaybackActive ||
      (videoSnapshot.currentPlayback &&
        typeof videoSnapshot.currentPlayback === "object" &&
        safeString(videoSnapshot.currentPlayback.sourceName))
  );
}

function evaluateSceneBlockers(ctx = {}, config = {}) {
  const reasons = [];

  if (!config.enabled) reasons.push("disabled");
  if (!config.obsSceneSwitch) reasons.push("obs_scene_switch_off");
  if (ctx.obsConnected === false) reasons.push("obs_disconnected");

  if (config?.safety?.blockDuringGiftVideo !== false && isGiftVideoBusy(ctx.videoSnapshot, config)) {
    reasons.push("gift_video_active");
  }

  if (config?.safety?.blockDuringVoice !== false && ctx.voiceActive) {
    reasons.push("voice_active");
  }

  if (config?.safety?.blockDuringSupportRoute !== false && ctx.supportRouteActive) {
    reasons.push("support_route_active");
  }

  const now = Date.now();
  const state = getSoloStreamState(ctx.outputState || {});
  const cooldownMs = toNumber(config?.thresholds?.sceneSwitchCooldownMs, 30000);
  if (state.lastSwitchAt > 0 && now - state.lastSwitchAt < cooldownMs) {
    reasons.push("scene_switch_cooldown");
  }

  return reasons;
}

function getLastChatActivityAt(streamState = {}, serverStartedAt = 0) {
  const chatAt = toNumber(streamState?.chat?.lastMessageAt, 0);
  if (chatAt > 0) return chatAt;

  const communityAt = toNumber(streamState?.lastCommunityEventAt, 0);
  if (communityAt > 0) return communityAt;

  return toNumber(serverStartedAt, 0);
}

function evaluateSoloStreamAction(ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const config = resolveSoloStreamConfig(runtimeConfig, process.env);
  const outputState = ctx.outputState || {};
  const streamState = ctx.streamState || {};
  const tick = ctx.tick || {};
  const state = getSoloStreamState(outputState);
  const now = Date.now();

  const behavior =
    typeof proactiveHost.resolveQuietBehavior === "function"
      ? proactiveHost.resolveQuietBehavior()
      : "solo_stream";

  if (!config.enabled || behavior !== "solo_stream") {
    return {
      ok: true,
      action: "noop",
      reason: behavior !== "solo_stream" ? "behavior_not_solo_stream" : "disabled",
      phase: state.phase,
      config: summarizeConfig(config)
    };
  }

  const band = safeString(tick.band, "medium");
  const quietMs = toNumber(
    tick.quietMs,
    Math.max(0, now - getLastChatActivityAt(streamState, ctx.serverStartedAt))
  );
  const enterQuietMs = resolveEnterQuietMs(config, tick, band);
  const exitChatActivityMs = toNumber(config?.thresholds?.exitChatActivityMs, 8000);
  const lastChatAt = getLastChatActivityAt(streamState, ctx.serverStartedAt);
  const sinceChatMs = lastChatAt > 0 ? Math.max(0, now - lastChatAt) : quietMs;
  const level = Math.max(1, toNumber(tick.level, state.lastSegmentLevel || 1));
  const blockers = evaluateSceneBlockers(ctx, config);

  if (state.phase === "solo" && sinceChatMs <= exitChatActivityMs) {
    return {
      ok: true,
      action: "exit",
      reason: "chat_activity",
      phase: "solo",
      targetScene: state.returnSceneName || resolveMainSceneName(config, runtimeConfig),
      sinceChatMs,
      blockers,
      config: summarizeConfig(config)
    };
  }

  if (state.phase === "main" && quietMs >= enterQuietMs) {
    const targetScene = resolveSoloSceneName(level, config, runtimeConfig);
    return {
      ok: true,
      action: blockers.length > 0 ? "enter_deferred" : "enter",
      reason: "quiet_stream",
      phase: "main",
      targetScene,
      level,
      quietMs,
      enterQuietMs,
      blockers,
      config: summarizeConfig(config)
    };
  }

  if (state.phase === "solo") {
    const minHoldMs = toNumber(config?.thresholds?.minSceneHoldMs, 45000);
    const targetScene = resolveSoloSceneName(level, config, runtimeConfig);
    const canUpgradeScene =
      targetScene &&
      targetScene !== state.currentSceneName &&
      now - toNumber(state.enteredAt, 0) >= minHoldMs &&
      level > toNumber(state.lastSegmentLevel, 0);

    if (canUpgradeScene && blockers.length === 0) {
      return {
        ok: true,
        action: "switch",
        reason: "solo_level_upgrade",
        phase: "solo",
        targetScene,
        level,
        blockers,
        config: summarizeConfig(config)
      };
    }

    return {
      ok: true,
      action: "hold",
      reason: "solo_active",
      phase: "solo",
      currentScene: state.currentSceneName,
      level,
      quietMs,
      blockers,
      config: summarizeConfig(config)
    };
  }

  return {
    ok: true,
    action: "noop",
    reason: "chat_not_quiet_enough",
    phase: state.phase,
    quietMs,
    enterQuietMs,
    blockers,
    config: summarizeConfig(config)
  };
}

function summarizeConfig(config = {}) {
  return {
    enabled: config.enabled !== false,
    obsSceneSwitch: config.obsSceneSwitch !== false,
    configPath: safeString(config.configPath),
    sources: cloneJson(config.sources, {})
  };
}

async function getCurrentProgramSceneName(safeObsCall) {
  if (typeof safeObsCall !== "function") return null;

  const response = await safeObsCall("GetCurrentProgramScene");
  if (!response?.ok) return null;

  return safeString(
    response.response?.sceneName || response.response?.currentProgramSceneName
  );
}

async function setProgramScene(safeObsCall, sceneName) {
  if (!sceneName || typeof safeObsCall !== "function") {
    return { ok: false, reason: "missing_scene_or_obs" };
  }

  const response = await safeObsCall("SetCurrentProgramScene", { sceneName });
  if (!response?.ok) {
    return {
      ok: false,
      reason: safeString(response?.reason, "SetCurrentProgramScene_failed"),
      sceneName
    };
  }

  return { ok: true, sceneName };
}

async function applySoloStreamAction(action = {}, deps = {}) {
  const {
    safeObsCall,
    runtimeConfig = {},
    outputState = {},
    writeLog = () => {}
  } = deps;

  const config = resolveSoloStreamConfig(runtimeConfig, process.env);
  const state = getSoloStreamState(outputState);
  const now = Date.now();
  const result = {
    ok: true,
    applied: false,
    action: safeString(action.action, "noop"),
    reason: safeString(action.reason, ""),
    phaseBefore: state.phase
  };

  if (!config.enabled || !config.obsSceneSwitch) {
    result.ok = false;
    result.reason = "solo_stream_obs_disabled";
    return result;
  }

  if (action.action === "enter_deferred") {
    result.deferred = true;
    result.blockers = action.blockers || [];
    return result;
  }

  if (action.action === "exit") {
    const restoreScene =
      safeString(state.returnSceneName) ||
      safeString(action.targetScene) ||
      resolveMainSceneName(config, runtimeConfig);

    if (!restoreScene) {
      result.ok = false;
      result.reason = "missing_restore_scene";
      return result;
    }

    if (Array.isArray(action.blockers) && action.blockers.length > 0) {
      result.deferred = true;
      result.blockers = action.blockers;
      return result;
    }

    const switchResult = await setProgramScene(safeObsCall, restoreScene);
    result.switch = switchResult;
    result.applied = switchResult.ok;

    if (switchResult.ok) {
      state.phase = "main";
      state.currentSceneName = restoreScene;
      state.returnSceneName = "";
      state.lastSwitchAt = now;
      state.lastExitReason = safeString(action.reason, "chat_activity");
      state.lastSegmentLevel = 0;
      state.switchCount = toNumber(state.switchCount, 0) + 1;
    }

    writeLog("mia-events", {
      ts: now,
      stage: "solo_stream_scene_exit",
      reason: action.reason,
      sceneName: restoreScene,
      ok: switchResult.ok
    });

    return result;
  }

  if (action.action === "enter" || action.action === "switch") {
    const targetScene = safeString(action.targetScene);
    if (!targetScene) {
      result.ok = false;
      result.reason = "missing_target_scene";
      return result;
    }

    if (Array.isArray(action.blockers) && action.blockers.length > 0) {
      result.deferred = true;
      result.blockers = action.blockers;
      return result;
    }

    if (action.action === "enter") {
      const currentScene = await getCurrentProgramSceneName(safeObsCall);
      state.returnSceneName =
        safeString(currentScene) || resolveMainSceneName(config, runtimeConfig);
    }

    const switchResult = await setProgramScene(safeObsCall, targetScene);
    result.switch = switchResult;
    result.applied = switchResult.ok;

    if (switchResult.ok) {
      state.phase = "solo";
      state.currentSceneName = targetScene;
      state.enteredAt = state.enteredAt > 0 && action.action === "switch" ? state.enteredAt : now;
      state.lastSwitchAt = now;
      state.lastSegmentLevel = toNumber(action.level, state.lastSegmentLevel || 1);
      state.switchCount = toNumber(state.switchCount, 0) + 1;
    }

    writeLog("mia-events", {
      ts: now,
      stage: action.action === "enter" ? "solo_stream_scene_enter" : "solo_stream_scene_switch",
      reason: action.reason,
      sceneName: targetScene,
      returnSceneName: state.returnSceneName,
      level: toNumber(action.level, 1),
      ok: switchResult.ok
    });

    return result;
  }

  result.phaseAfter = state.phase;
  return result;
}

function noteSoloSegment(outputState = {}, meta = {}) {
  const state = getSoloStreamState(outputState);
  state.lastSegmentAt = Date.now();
  state.lastSegmentLevel = Math.max(
    toNumber(state.lastSegmentLevel, 0),
    toNumber(meta.level, 1)
  );
  return state;
}

function getSoloStreamSnapshot(ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const config = resolveSoloStreamConfig(runtimeConfig, process.env);
  const outputState = ctx.outputState || {};
  const state = getSoloStreamState(outputState);
  const tick = ctx.tick || {};
  const action = evaluateSoloStreamAction(ctx);

  return {
    ok: true,
    enabled: config.enabled !== false,
    obsSceneSwitch: config.obsSceneSwitch !== false,
    phase: state.phase,
    currentSceneName: safeString(state.currentSceneName) || null,
    returnSceneName: safeString(state.returnSceneName) || null,
    enteredAt: state.enteredAt || null,
    lastSegmentAt: state.lastSegmentAt || null,
    lastSegmentLevel: toNumber(state.lastSegmentLevel, 0) || null,
    switchCount: toNumber(state.switchCount, 0),
    lastExitReason: state.lastExitReason || null,
    resolvedScenes: {
      main: resolveMainSceneName(config, runtimeConfig),
      solo1: resolveSoloSceneName(1, config, runtimeConfig),
      solo2: resolveSoloSceneName(2, config, runtimeConfig),
      solo3: resolveSoloSceneName(3, config, runtimeConfig)
    },
    nextAction: action.action,
    nextReason: action.reason,
    blockers: action.blockers || [],
    config: summarizeConfig(config)
  };
}

module.exports = {
  getSoloStreamState,
  resetSoloStreamState,
  resolveSoloStreamConfig,
  resolveMainSceneName,
  resolveSoloSceneName,
  evaluateSoloStreamAction,
  applySoloStreamAction,
  noteSoloSegment,
  getSoloStreamSnapshot,
  isGiftVideoBusy
};
