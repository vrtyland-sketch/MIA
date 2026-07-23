"use strict";

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;
  const n = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(n)) return true;
  if (["0", "false", "no", "off"].includes(n)) return false;
  return fallback;
}

function normalizeWorldMode(value, fallback = "default") {
  const mode = safeString(value, fallback).toLowerCase();
  if (mode === "nejsem_tu" || mode === "spinak_nejsem_tu") return "nejsem_tu";
  if (mode === "default" || mode === "live") return "default";
  return mode;
}

function isNejsemTuWorldMode(ctx = {}) {
  const mode = normalizeWorldMode(
    ctx.outputState?.worldMode || ctx.ecosystemState?.worldMode,
    "default"
  );
  return mode === "nejsem_tu";
}

function isAwayHostMode(ctx = {}) {
  if (isNejsemTuWorldMode(ctx)) return true;
  const soloPhase = safeString(ctx.outputState?.soloStreamState?.phase, "main");
  return soloPhase === "solo";
}

function resolveAwaySceneName(runtimeConfig = {}, env = process.env) {
  const explicit = safeString(
    env.MIA_AWAY_SCENE || env.MIA_SOLO_STREAM_SCENE_MIA,
    ""
  );
  if (explicit) return explicit;

  const fromConfig = safeString(runtimeConfig?.awayMode?.sceneName, "");
  if (fromConfig) return fromConfig;

  const sceneMap = runtimeConfig?.overlay?.sceneMap || {};
  if (sceneMap.mia) return safeString(sceneMap.mia);
  if (sceneMap.host) return safeString(sceneMap.host);

  return "SPINAK_NEJSEM_TU";
}

function resolveMainReturnSceneName(runtimeConfig = {}, env = process.env) {
  return (
    safeString(env.MIA_SOLO_STREAM_MAIN_SCENE, "") ||
    safeString(runtimeConfig?.soloStream?.scenes?.main, "") ||
    safeString(runtimeConfig?.obs?.sceneName, "SPINAK_ENGINE_GIFTS")
  );
}

function isAwayObsSwitchEnabled(runtimeConfig = {}, env = process.env) {
  if (toBool(env.MIA_AWAY_OBS_SCENE_SWITCH, false)) return true;
  return runtimeConfig?.awayMode?.obsSceneSwitch === true;
}

function getAwayModeState(outputState = {}) {
  if (!outputState.awayModeState || typeof outputState.awayModeState !== "object") {
    outputState.awayModeState = {
      active: false,
      returnSceneName: "",
      currentSceneName: "",
      enteredAt: 0
    };
  }
  return outputState.awayModeState;
}

function buildHostModeSnapshot(ctx = {}) {
  const worldMode = normalizeWorldMode(
    ctx.outputState?.worldMode || ctx.ecosystemState?.worldMode,
    "default"
  );
  const soloPhase = safeString(ctx.outputState?.soloStreamState?.phase, "main");
  const awayByWorld = worldMode === "nejsem_tu";
  const awayBySolo = soloPhase === "solo";
  const capybaraAway =
    ctx.capybaraFlow?.awayMode === true ||
    ctx.outputState?.capybaraFlow?.awayMode === true;

  let label = "LIVE";
  let badge = "LIVE";
  if (awayByWorld) {
    label = "NEJSEM TU · MIA HOST";
    badge = "HOST";
  } else if (awayBySolo) {
    label = "SOLO STREAM · MIA VEDE";
    badge = "SOLO";
  }

  const awayState = getAwayModeState(ctx.outputState || {});

  return {
    worldMode,
    hostMode: awayByWorld ? "nejsem_tu" : awayBySolo ? "solo_stream" : "live",
    awayActive: awayByWorld,
    soloStreamPhase: soloPhase,
    capybaraAwayMode: capybaraAway,
    label,
    badge,
    sceneName: resolveAwaySceneName(ctx.runtimeConfig || {}, process.env),
    awaySceneActive: awayState.active === true,
    returnSceneName: awayState.returnSceneName || null
  };
}

async function syncAwayObsScene(mode = "enter", ctx = {}) {
  const runtimeConfig = ctx.runtimeConfig || {};
  const env = ctx.env || process.env;
  const outputState = ctx.outputState || {};
  const safeObsCall = ctx.safeObsCall;
  const writeLog = typeof ctx.writeLog === "function" ? ctx.writeLog : null;

  if (!isAwayObsSwitchEnabled(runtimeConfig, env)) {
    return { ok: true, skipped: true, reason: "away_obs_switch_disabled" };
  }

  if (typeof safeObsCall !== "function") {
    return { ok: false, reason: "safeObsCall_missing" };
  }

  const awayState = getAwayModeState(outputState);
  const mainScene = resolveMainReturnSceneName(runtimeConfig, env);
  const awayScene = resolveAwaySceneName(runtimeConfig, env);

  if (mode === "enter") {
    if (awayState.active && awayState.currentSceneName === awayScene) {
      return { ok: true, skipped: true, reason: "already_in_away_scene" };
    }

    const current = await safeObsCall("GetCurrentProgramScene");
    const currentName = safeString(current?.response?.currentProgramSceneName, mainScene);
    awayState.returnSceneName = currentName || mainScene;
    awayState.currentSceneName = awayScene;
    awayState.active = true;
    awayState.enteredAt = Date.now();

    const result = await safeObsCall("SetCurrentProgramScene", {
      sceneName: awayScene
    });

    if (writeLog) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "away_obs_scene_enter",
        awayScene,
        returnScene: awayState.returnSceneName,
        ok: result?.ok === true
      });
    }

    return {
      ok: result?.ok === true,
      mode: "enter",
      sceneName: awayScene,
      returnSceneName: awayState.returnSceneName,
      result
    };
  }

  if (mode === "exit") {
    if (!awayState.active) {
      return { ok: true, skipped: true, reason: "away_scene_not_active" };
    }

    const restoreScene = awayState.returnSceneName || mainScene;
    const result = await safeObsCall("SetCurrentProgramScene", {
      sceneName: restoreScene
    });

    awayState.active = false;
    awayState.currentSceneName = "";
    awayState.enteredAt = 0;

    if (writeLog) {
      writeLog("mia-events", {
        ts: Date.now(),
        stage: "away_obs_scene_exit",
        restoreScene,
        ok: result?.ok === true
      });
    }

    return {
      ok: result?.ok === true,
      mode: "exit",
      sceneName: restoreScene,
      result
    };
  }

  return { ok: false, reason: "invalid_mode" };
}

async function applyWorldModeTransition(nextWorldMode, ctx = {}) {
  const normalized = normalizeWorldMode(nextWorldMode, "default");
  const previous = normalizeWorldMode(
    ctx.outputState?.worldMode || ctx.ecosystemState?.worldMode,
    "default"
  );

  if (normalized === previous) {
    return { ok: true, skipped: true, reason: "world_mode_unchanged" };
  }

  if (normalized === "nejsem_tu") {
    return syncAwayObsScene("enter", ctx);
  }

  if (previous === "nejsem_tu") {
    return syncAwayObsScene("exit", ctx);
  }

  return { ok: true, skipped: true, reason: "no_obs_transition" };
}

module.exports = {
  normalizeWorldMode,
  isNejsemTuWorldMode,
  isAwayHostMode,
  resolveAwaySceneName,
  resolveMainReturnSceneName,
  isAwayObsSwitchEnabled,
  getAwayModeState,
  buildHostModeSnapshot,
  syncAwayObsScene,
  applyWorldModeTransition
};
