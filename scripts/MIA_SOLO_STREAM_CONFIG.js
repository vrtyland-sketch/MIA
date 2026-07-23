"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "..", "config", "solo-stream.json");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function readJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_err) {
    return null;
  }
}

function mergeDeep(base = {}, patch = {}) {
  const out = cloneJson(base, {});
  if (!patch || typeof patch !== "object") return out;

  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = mergeDeep(out[key], value);
    } else if (value !== undefined) {
      out[key] = cloneJson(value, value);
    }
  }

  return out;
}

function buildSoloStreamConfigFromEnv(env = process.env) {
  const sceneMapKeys = {
    main: safeString(env.MIA_SOLO_STREAM_SCENE_KEY_MAIN, "default"),
    solo1: safeString(env.MIA_SOLO_STREAM_SCENE_KEY_SOLO1, "idle"),
    solo2: safeString(env.MIA_SOLO_STREAM_SCENE_KEY_SOLO2, "lobby"),
    solo3: safeString(env.MIA_SOLO_STREAM_SCENE_KEY_SOLO3, "mia")
  };

  return {
    version: 1,
    enabled: toBool(env.MIA_SOLO_STREAM_ENABLED, true),
    obsSceneSwitch: toBool(env.MIA_SOLO_STREAM_OBS_SCENE_SWITCH, true),
    configPath: safeString(
      env.MIA_SOLO_STREAM_CONFIG_PATH,
      DEFAULT_CONFIG_PATH
    ),
    sceneMapKeys,
    scenes: {
      main: safeString(
        env.MIA_SOLO_STREAM_MAIN_SCENE || env.MIA_SOLO_STREAM_SCENE_MAIN,
        ""
      ),
      solo: {
        1: safeString(env.MIA_SOLO_STREAM_SCENE_SOLO1 || env.MIA_SOLO_STREAM_SCENE_IDLE, ""),
        2: safeString(env.MIA_SOLO_STREAM_SCENE_SOLO2 || env.MIA_SOLO_STREAM_SCENE_LOBBY, ""),
        3: safeString(env.MIA_SOLO_STREAM_SCENE_SOLO3 || env.MIA_SOLO_STREAM_SCENE_MIA, "")
      }
    },
    thresholds: {
      enterQuietMs: toNumber(env.MIA_SOLO_STREAM_ENTER_QUIET_MS, 0),
      exitChatActivityMs: toNumber(env.MIA_SOLO_STREAM_EXIT_CHAT_MS, 8000),
      minSceneHoldMs: toNumber(env.MIA_SOLO_STREAM_MIN_SCENE_HOLD_MS, 45000),
      sceneSwitchCooldownMs: toNumber(env.MIA_SOLO_STREAM_SCENE_COOLDOWN_MS, 30000)
    },
    safety: {
      blockDuringGiftVideo: toBool(env.MIA_SOLO_STREAM_BLOCK_DURING_VIDEO, true),
      blockDuringVoice: toBool(env.MIA_SOLO_STREAM_BLOCK_DURING_VOICE, true),
      blockDuringSupportRoute: toBool(env.MIA_SOLO_STREAM_BLOCK_DURING_SUPPORT, true)
    }
  };
}

function resolveSoloStreamConfig(runtimeConfig = {}, env = process.env) {
  const fromRuntime = runtimeConfig?.soloStream || {};
  const fromEnv = buildSoloStreamConfigFromEnv(env);
  const configPath =
    safeString(fromRuntime.configPath) ||
    safeString(fromEnv.configPath) ||
    DEFAULT_CONFIG_PATH;

  const fromFile = readJsonFile(configPath) || {};
  const merged = mergeDeep(fromEnv, fromFile);
  const finalConfig = mergeDeep(merged, fromRuntime);

  finalConfig.configPath = configPath;
  finalConfig.sources = {
    env: true,
    file: Boolean(fromFile && Object.keys(fromFile).length > 0),
    runtimeOverride: Boolean(fromRuntime && Object.keys(fromRuntime).length > 0)
  };

  return finalConfig;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  buildSoloStreamConfigFromEnv,
  resolveSoloStreamConfig
};
