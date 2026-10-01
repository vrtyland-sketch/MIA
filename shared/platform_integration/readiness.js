"use strict";

const fs = require("fs");
const path = require("path");
const { streamPlatforms, getPlatform } = require("./registry");
const { tokenStatus } = require("./tokenStore");

const ROOT = path.resolve(__dirname, "..", "..");

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  const out = { ...process.env };
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) {
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (out[k] === undefined) out[k] = v;
    }
  }
  return out;
}

function envTruthy(env, key) {
  const v = String(env[key] || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function hasAny(env, keys) {
  return keys.some((k) => String(env[k] || "").trim());
}

function assessPlatform(id, env = loadDotEnv()) {
  const meta = getPlatform(id);
  if (!meta) return { id, ok: false, status: "unknown_platform" };

  const enabledKey =
    id === "tiktok"
      ? null
      : id === "kick"
        ? "MIA_KICK_ENABLED"
        : id === "twitch"
          ? "MIA_TWITCH_ENABLED"
          : id === "youtube"
            ? "MIA_YOUTUBE_ENABLED"
            : id === "telegram"
              ? "MIA_TELEGRAM_ENABLED"
              : null;

  // Align with MIA_CONFIG defaults: Kick defaults ON when unset; Twitch/YouTube default OFF.
  let enabled;
  if (id === "tiktok") {
    enabled = true;
  } else if (id === "kick") {
    const raw = env[enabledKey];
    enabled =
      raw === undefined || String(raw).trim() === ""
        ? true
        : envTruthy(env, enabledKey);
  } else {
    enabled = enabledKey ? envTruthy(env, enabledKey) : false;
  }


  const missing = [];
  if (id === "twitch") {
    if (!hasAny(env, ["TWITCH_CLIENT_ID"])) missing.push("TWITCH_CLIENT_ID");
    if (!hasAny(env, ["TWITCH_ACCESS_TOKEN"])) missing.push("TWITCH_ACCESS_TOKEN");
    if (!hasAny(env, ["TWITCH_CHANNEL_LOGIN", "TWITCH_BROADCASTER_ID"])) {
      missing.push("TWITCH_CHANNEL_LOGIN|TWITCH_BROADCASTER_ID");
    }
  }
  if (id === "youtube") {
    if (!hasAny(env, ["YOUTUBE_API_KEY", "MIA_YOUTUBE_API_KEY"])) {
      missing.push("YOUTUBE_API_KEY");
    }
    if (!hasAny(env, ["YOUTUBE_LIVE_CHAT_ID", "MIA_YOUTUBE_LIVE_CHAT_ID", "YOUTUBE_VIDEO_ID", "MIA_YOUTUBE_VIDEO_ID"])) {
      missing.push("YOUTUBE_LIVE_CHAT_ID|YOUTUBE_VIDEO_ID");
    }
  }
  if (id === "kick") {
    // channel/chatroom often have defaults — warn only if enabled and nothing set
  }
  if (id === "telegram") {
    if (!hasAny(env, ["MIA_TELEGRAM_BOT_TOKEN"])) missing.push("MIA_TELEGRAM_BOT_TOKEN");
  }

  const tokens = ["twitch", "youtube", "kick"].includes(id)
    ? tokenStatus(id)
    : { present: false };

  let status = "ready";
  if (!enabled && id !== "tiktok") status = "disabled";
  else if (missing.length) status = "blocked_credentials";
  else if (id === "twitch" && !tokens.present && !hasAny(env, ["TWITCH_ACCESS_TOKEN"])) {
    status = "needs_oauth";
  }

  return {
    id,
    displayName: meta.displayName,
    enabled,
    status,
    ok: status === "ready",
    configuredReady: status === "ready",
    runtimeReady: false,
    liveReady: false,
    missing,
    chatOnly:
      id === "twitch"
        ? !hasAny(env, ["MIA_TWITCH_CHAT_ONLY", "TWITCH_CHAT_ONLY"])
          ? true
          : envTruthy(env, "MIA_TWITCH_CHAT_ONLY") || envTruthy(env, "TWITCH_CHAT_ONLY")
        : Boolean(meta.capabilities?.chatOnlyDefault),
    tokens,
    freezePolicy: meta.freezePolicy,
    operatorSteps: meta.operatorSteps,
    bridgeModule: meta.bridgeModule
  };
}

const LIVE_SIGNAL_WINDOW_MS = 15 * 60 * 1000;
const FOUR_WAY_IDS = ["tiktok", "kick", "twitch", "youtube"];

function assessLiveSignal(signal, now = Date.now(), windowMs = LIVE_SIGNAL_WINDOW_MS) {
  if (!signal || typeof signal !== "object") {
    return { fresh: false, at: null, eventType: null, ageMs: null };
  }
  const at = Number(signal.at);
  if (!Number.isFinite(at) || at <= 0) {
    return { fresh: false, at: null, eventType: null, ageMs: null };
  }
  const ageMs = now - at;
  const eventType =
    typeof signal.eventType === "string" && signal.eventType.trim()
      ? signal.eventType.trim().toUpperCase()
      : null;
  return {
    fresh: ageMs >= 0 && ageMs <= windowMs,
    at,
    eventType,
    ageMs
  };
}

function assessAll(env = loadDotEnv(), options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const windowMs = Number.isFinite(options.liveWindowMs)
    ? Math.max(1000, options.liveWindowMs)
    : LIVE_SIGNAL_WINDOW_MS;
  const liveSignals = options.liveSignals && typeof options.liveSignals === "object"
    ? options.liveSignals
    : {};

  const platforms = streamPlatforms().map((p) => {
    const row = assessPlatform(p.id, env);
    const signal = assessLiveSignal(liveSignals[p.id], now, windowMs);
    const liveReady = row.configuredReady === true && signal.fresh === true;
    return {
      ...row,
      runtimeReady: liveReady,
      liveReady,
      liveSignal: signal.fresh
        ? { at: signal.at, eventType: signal.eventType, ageMs: signal.ageMs }
        : null
    };
  });
  const ready = platforms.filter((p) => p.configuredReady).map((p) => p.id);
  const live = platforms.filter((p) => p.liveReady).map((p) => p.id);
  const blocked = platforms.filter((p) => p.status === "blocked_credentials" || p.status === "needs_oauth");
  const disabled = platforms.filter((p) => p.status === "disabled");
  const fourWayConfiguredReady = FOUR_WAY_IDS.every((id) =>
    platforms.find((p) => p.id === id)?.configuredReady
  );
  const fourWayLiveReady = FOUR_WAY_IDS.every((id) =>
    platforms.find((p) => p.id === id)?.liveReady
  );
  return {
    at: new Date(now).toISOString(),
    layer: "multi_platform_integration",
    corePolicy: "Stream Core frozen — adapters chat-only where declared",
    platforms,
    summary: {
      ready,
      live,
      blocked: blocked.map((p) => p.id),
      disabled: disabled.map((p) => p.id),
      configuredReady: fourWayConfiguredReady,
      runtimeReady: fourWayLiveReady,
      liveReady: fourWayLiveReady,
      fourWayConfiguredReady,
      fourWayLiveReady,
      // Credential/config aggregate only. A true value is not proof of live chat.
      fourWayReady: fourWayConfiguredReady,
      impliesLiveInputs: false,
      readinessNote:
        "configuredReady/fourWayReady mean credentials and config only. runtimeReady/liveReady require a recent observed ingest on each platform."
    }
  };
}

module.exports = {
  loadDotEnv,
  assessPlatform,
  assessAll,
  assessLiveSignal,
  LIVE_SIGNAL_WINDOW_MS
};
