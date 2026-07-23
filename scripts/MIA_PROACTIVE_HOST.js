"use strict";

const textBankModule = require("./MIA_TEXT_BANK");
const outputStateModule = require("./MIA_OUTPUT_STATE");
const supportPolicy = require("./MIA_SUPPORT_REACTION_POLICY");
const chatLexiconModule = require("./MIA_CHAT_LEXICON");

const TEXT_BANK = textBankModule.TEXT_BANK || {};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value) {
  return safeString(value).replace(/\s+/g, " ").trim();
}

function isEnabled() {
  const flag = safeString(process.env.MIA_PROACTIVE_HOST, "on").toLowerCase();
  return flag !== "0" && flag !== "off" && flag !== "false";
}

function resolveQuietBehavior() {
  const flag = safeString(process.env.MIA_QUIET_BEHAVIOR, "solo_stream").toLowerCase();
  if (flag === "off" || flag === "none" || flag === "silent") return "silent";
  if (flag === "wake_chat" || flag === "legacy" || flag === "proactive") return "wake_chat";
  return "solo_stream";
}

function getBankVariants(key) {
  return Array.isArray(TEXT_BANK[key]) ? TEXT_BANK[key] : [];
}

function pickRotationText(outputState, key, variants, fallbackText) {
  const list = Array.isArray(variants)
    ? variants.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  if (list.length === 0) {
    return normalizeText(fallbackText);
  }

  if (typeof outputStateModule.getNextRotationIndex === "function") {
    const index = outputStateModule.getNextRotationIndex(outputState, key, list.length);
    return list[index] || list[0];
  }

  return list[Math.floor(Math.random() * list.length)] || list[0];
}

function getProactiveHostState(outputState = {}) {
  if (!outputState.proactiveHostState || typeof outputState.proactiveHostState !== "object") {
    outputState.proactiveHostState = {
      lastSpokeAt: 0,
      escalationLevel: 0,
      speakCount: 0,
      soloSegment: 0
    };
  }

  return outputState.proactiveHostState;
}

function resetProactiveHostOnChat(outputState = {}) {
  const state = getProactiveHostState(outputState);
  state.escalationLevel = 0;
  state.soloSegment = 0;
  return state;
}

function noteProactiveSpoke(outputState = {}, level = 1) {
  const state = getProactiveHostState(outputState);
  const now = Date.now();

  state.lastSpokeAt = now;
  state.escalationLevel = Math.max(toNumber(state.escalationLevel, 0), level);
  state.speakCount = toNumber(state.speakCount, 0) + 1;
  state.soloSegment = toNumber(state.soloSegment, 0) + 1;

  return state;
}

function resolveQuietThresholdMs(band = "medium") {
  const map = {
    tiny: 35000,
    small: 50000,
    medium: 70000,
    large: 100000,
    huge: 130000,
    unknown: 60000
  };

  return map[band] || map.medium;
}

function resolveProactiveCooldownMs(band = "medium") {
  const map = {
    tiny: 90000,
    small: 120000,
    medium: 150000,
    large: 180000,
    huge: 240000,
    unknown: 120000
  };

  return map[band] || map.medium;
}

function resolveEscalationLevel(quietMs, thresholdMs, spiceLevel = 0) {
  const ratio = quietMs / Math.max(1, thresholdMs);

  if (ratio >= 3 && spiceLevel >= 18) return 3;
  if (ratio >= 3) return 2;
  if (ratio >= 2) return 2;
  return 1;
}

function resolveSoloStreamLevel(quietMs, thresholdMs) {
  const ratio = quietMs / Math.max(1, thresholdMs);
  if (ratio >= 3) return 3;
  if (ratio >= 2) return 2;
  return 1;
}

function pickWakeChatLine(outputState, level = 1) {
  const keys =
    level >= 3
      ? ["mia_proactive_spicy"]
      : level === 2
        ? ["mia_proactive_bored", "idle_bored", "wake_up_chat_mia"]
        : ["mia_proactive_wake", "wake_up_chat_mia", "idle_bored"];

  const variants = [];
  for (const key of keys) {
    variants.push(...getBankVariants(key));
  }

  const line = pickRotationText(
    outputState,
    `proactive_host_${level}`,
    variants,
    "Tak co, parto. Chat spí, nebo co?"
  );

  if (level < 2) {
    return line;
  }

  const laugh = pickRotationText(
    outputState,
    "proactive_host_laugh",
    getBankVariants("mia_proactive_laugh"),
    "*smích*"
  );

  const lower = line.toLowerCase();
  if (lower.includes("smích") || lower.includes("haha")) {
    return line;
  }

  if (level >= 3) {
    return `${line} ${laugh}`;
  }

  return Math.random() < 0.55 ? `${line} ${laugh}` : line;
}

function pickSoloStreamKeys(level = 1) {
  if (level >= 3) {
    return ["mia_solo_stream_deep", "mia_solo_stream_story"];
  }
  if (level === 2) {
    return ["mia_solo_stream_story", "mia_solo_stream_beat"];
  }
  return ["mia_solo_stream_beat", "mia_solo_stream_story"];
}

function pickSoloStreamLine(outputState, level = 1, ctx = {}) {
  const keys = pickSoloStreamKeys(level);
  const variants = [];

  for (const key of keys) {
    variants.push(...getBankVariants(key));
  }

  const mood = safeString(ctx.kojnozoutState?.mood, "");
  const fallback =
    mood === "sleepy"
      ? "Kojnožrout teď odpočívá. Já mezitím držím solo beat streamu."
      : "Pokračuju v programu. Teď vedu show já — solo stream beat.";

  return pickRotationText(outputState, `solo_stream_${level}`, variants, fallback);
}

function getLastChatActivityAt(streamState = {}, serverStartedAt = 0) {
  const chatAt = toNumber(streamState?.chat?.lastMessageAt, 0);
  if (chatAt > 0) return chatAt;

  const communityAt = toNumber(streamState?.lastCommunityEventAt, 0);
  if (communityAt > 0) return communityAt;

  return toNumber(serverStartedAt, Date.now());
}

function getRecentOverlayBlockMs(overlayState = {}) {
  const now = Date.now();
  const miaAt = toNumber(overlayState?.miaOverlay?.updatedAt, 0);
  const kojAt = toNumber(overlayState?.kojnozoutOverlay?.updatedAt, 0);
  const lastAt = toNumber(overlayState?.lastAcceptedAt, Math.max(miaAt, kojAt));
  const recentAt = Math.max(miaAt, kojAt, lastAt);

  if (recentAt <= 0) return 0;
  return Math.max(0, now - recentAt);
}

function buildQuietOverlayPayload(behavior, outputState, level, band, quietMs, ctx = {}) {
  if (behavior === "solo_stream") {
    const text = pickSoloStreamLine(outputState, level, ctx);
    const mood = level >= 3 ? "focused" : level === 2 ? "warm" : "calm";

    return {
      owner: "mia",
      speaker: "mia",
      route: "community",
      title: "MIA",
      text,
      subtext: "solo_host",
      mood,
      stage: "solo_stream",
      action: "host_segment",
      holdMs: level >= 3 ? 8200 : level === 2 ? 6800 : 5600,
      priority: 2,
      meta: {
        source: "solo_stream",
        soloStreamLevel: level,
        audienceBand: band,
        quietMs,
        behavior: "solo_stream"
      }
    };
  }

  const text = pickWakeChatLine(outputState, level);
  const mood = level >= 3 ? "playful" : level === 2 ? "playful" : "warm";

  return {
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text,
    subtext: level >= 2 ? "proactive_host" : "wake_up",
    mood,
    stage: "idle",
    action: level >= 2 ? "laugh" : "wake_chat",
    holdMs: level >= 3 ? 6800 : 5600,
    priority: 2,
    meta: {
      source: "proactive_host",
      proactiveLevel: level,
      audienceBand: band,
      quietMs,
      behavior: "wake_chat"
    }
  };
}

function evaluateProactiveHostTick(ctx = {}) {
  if (!isEnabled()) {
    return { shouldSpeak: false, reason: "disabled", behavior: resolveQuietBehavior() };
  }

  const behavior = resolveQuietBehavior();
  if (behavior === "silent") {
    return { shouldSpeak: false, reason: "quiet_silent_mode", behavior };
  }

  const streamState = ctx.streamState || {};
  const outputState = ctx.outputState || {};
  const overlayState = ctx.overlayState || {};
  const serverStartedAt = toNumber(ctx.serverStartedAt, Date.now());
  const now = Date.now();

  const viewerCount = toNumber(streamState?.audience?.viewerCount, 0);
  const band =
    typeof supportPolicy.resolveAudienceBand === "function"
      ? supportPolicy.resolveAudienceBand(viewerCount)
      : "medium";

  const quietThresholdMs = resolveQuietThresholdMs(band);
  const cooldownMs = resolveProactiveCooldownMs(band);
  const lastChatAt = getLastChatActivityAt(streamState, serverStartedAt);
  const quietMs = Math.max(0, now - lastChatAt);
  const hostState = getProactiveHostState(outputState);
  const sinceLastProactive = now - toNumber(hostState.lastSpokeAt, 0);
  const recentOverlayMs = getRecentOverlayBlockMs(overlayState);

  if (quietMs < quietThresholdMs) {
    return {
      shouldSpeak: false,
      reason: "chat_not_quiet_enough",
      quietMs,
      quietThresholdMs,
      band,
      behavior
    };
  }

  if (hostState.lastSpokeAt > 0 && sinceLastProactive < cooldownMs) {
    return {
      shouldSpeak: false,
      reason: "proactive_cooldown",
      sinceLastProactive,
      cooldownMs,
      band,
      behavior
    };
  }

  if (recentOverlayMs > 0 && recentOverlayMs < 12000) {
    return {
      shouldSpeak: false,
      reason: "recent_overlay",
      recentOverlayMs,
      band,
      behavior
    };
  }

  let spiceLevel = 0;
  if (chatLexiconModule && typeof chatLexiconModule.getLexiconSnapshot === "function") {
    spiceLevel = toNumber(chatLexiconModule.getLexiconSnapshot()?.tone?.spiceLevel, 0);
  }

  const level =
    behavior === "solo_stream"
      ? resolveSoloStreamLevel(quietMs, quietThresholdMs)
      : resolveEscalationLevel(quietMs, quietThresholdMs, spiceLevel);

  const overlayPayload = buildQuietOverlayPayload(
    behavior,
    outputState,
    level,
    band,
    quietMs,
    ctx
  );

  return {
    shouldSpeak: true,
    reason: behavior === "solo_stream" ? "solo_stream_segment" : "quiet_chat_host",
    behavior,
    band,
    level,
    quietMs,
    quietThresholdMs,
    overlayPayload
  };
}

function buildProactiveHostResult(tickResult = {}, outputState = {}) {
  if (!tickResult?.shouldSpeak || !tickResult.overlayPayload) {
    return null;
  }

  noteProactiveSpoke(outputState, tickResult.level || 1);

  if (typeof outputStateModule.setLastText === "function") {
    outputStateModule.setLastText(outputState, "mia", tickResult.overlayPayload.text);
  }

  return tickResult.overlayPayload;
}

module.exports = {
  isEnabled,
  resolveQuietBehavior,
  getProactiveHostState,
  resetProactiveHostOnChat,
  noteProactiveSpoke,
  evaluateProactiveHostTick,
  buildProactiveHostResult,
  resolveQuietThresholdMs,
  resolveProactiveCooldownMs,
  resolveEscalationLevel,
  resolveSoloStreamLevel,
  pickSoloStreamLine
};
