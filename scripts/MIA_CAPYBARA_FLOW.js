"use strict";

/**
 * Gift chat loop (legacy název: capybara flow).
 * Po qualifying pet dárku v AWAY: 20s animace → MIA vyzve chat → odpověď na komentář.
 * Gift map: animal_small + chatLoop:true (Kapybara, Tofu, Creeper, …).
 */

const textBankModule = require("./MIA_TEXT_BANK");
const outputStateModule = require("./MIA_OUTPUT_STATE");

const TEXT_BANK = textBankModule.TEXT_BANK || {};

const SHOW_MS = 20000;
const WAIT_MS = 90000;

const WAIT_PROMPTS = [
  "{gifter} poslal {giftName}! Napiš do chatu — reaguju hned.",
  "Dík za {giftName} od {gifter}. Co na to říkáte? Napište do chatu.",
  "Kojnožrout se raduje. Po dárku od {gifter} — chcete něco říct?"
];

const AWAY_WAIT_PROMPTS = [
  "Jsem tady za tebe. Po {giftName} od {gifter} čekám na tvůj komentář.",
  "NEJSEM TU režim — {giftName} proběhla. Napiš do chatu, odpovím.",
  "Držím show. Po dárku od {gifter} čekám na chat."
];

const THANK_LEADS = [
  "Po {giftName} od {gifter} —",
  "Dík {gifter} za {giftName} —",
  "{gifter} poslal {giftName} —"
];

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

function fillGiftTokens(text, session = {}) {
  const gifter = safeString(session.gifterLabel, "Divák");
  const giftName = safeString(session.giftName, "dárek");
  return normalizeText(String(text || "").replace(/\{gifter\}/g, gifter).replace(/\{giftName\}/g, giftName));
}

/** away_only (default) | always | off */
function resolveChatLoopMode(env = process.env) {
  const raw = safeString(env.MIA_GIFT_CHAT_LOOP || env.MIA_CAPYBARA_FLOW, "away_only").toLowerCase();
  if (["0", "off", "false", "no"].includes(raw)) return "off";
  if (["always", "on", "all", "live"].includes(raw)) return "always";
  return "away_only";
}

function isEnabled(env = process.env) {
  return resolveChatLoopMode(env) !== "off";
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

/** Gift map profil s chatLoop — ne jen název „Kapybara“. */
function isGiftChatLoopGift(profile = {}, _normalized = {}) {
  if (!profile || profile.matched !== true) return false;
  return profile.chatLoop === true;
}

/** @deprecated alias */
function isCapybaraLoopGift(profile = {}, normalized = {}) {
  return isGiftChatLoopGift(profile, normalized);
}

function resolveAwayMode(ctx = {}) {
  const worldMode = safeString(
    ctx.outputState?.worldMode || ctx.ecosystemState?.worldMode,
    "default"
  ).toLowerCase();

  if (worldMode === "nejsem_tu") return true;

  const soloPhase = safeString(ctx.outputState?.soloStreamState?.phase).toLowerCase();
  if (soloPhase === "solo") return true;

  return false;
}

function shouldStartGiftChatLoop(ctx = {}, profile = {}) {
  if (!isGiftChatLoopGift(profile, ctx.normalized)) return false;
  const mode = resolveChatLoopMode(ctx.env || process.env);
  if (mode === "off") return false;
  if (mode === "always") return true;
  return resolveAwayMode(ctx);
}

function getSession(outputState = {}) {
  if (!outputState.capybaraFlow || typeof outputState.capybaraFlow !== "object") {
    outputState.capybaraFlow = { phase: "idle" };
  }
  return outputState.capybaraFlow;
}

function startCapybaraFlow(outputState = {}, payload = {}) {
  if (!isEnabled()) return null;

  const now = Date.now();
  const session = {
    phase: "show",
    startedAt: now,
    showEndsAt: now + SHOW_MS,
    waitEndsAt: now + SHOW_MS + WAIT_MS,
    gifterLabel: safeString(payload.gifterLabel, "Divák"),
    giftName: safeString(payload.giftName, "dárek"),
    giftKey: safeString(payload.giftKey, "animal_small"),
    kojMood: safeString(payload.kojMood),
    primaryNeed: safeString(payload.primaryNeed),
    awayMode: Boolean(payload.awayMode),
    promptSent: false,
    repliedAt: 0,
    repliedUser: ""
  };

  outputState.capybaraFlow = session;
  return session;
}

function buildWaitPromptPayload(outputState = {}, session = {}) {
  const bankKey = session.awayMode ? "mia_capybara_wait_away" : "mia_capybara_wait";
  const bankVariants = Array.isArray(TEXT_BANK[bankKey]) ? TEXT_BANK[bankKey] : [];
  const fallbackList = session.awayMode ? AWAY_WAIT_PROMPTS : WAIT_PROMPTS;
  const rawText = pickRotationText(
    outputState,
    bankKey,
    bankVariants.length ? bankVariants : fallbackList,
    fallbackList[0]
  );
  const text = fillGiftTokens(rawText, session);

  return {
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text,
    subtext: "gift_wait_chat",
    mood: session.awayMode ? "focused" : "warm",
    stage: "gift_wait_chat",
    action: "gift_wait_chat",
    holdMs: session.awayMode ? 7200 : 6000,
    priority: 2,
    meta: {
      source: "gift_chat_loop",
      legacySource: "capybara_flow",
      phase: "waiting_comment",
      giftName: session.giftName,
      gifterLabel: session.gifterLabel,
      awayMode: session.awayMode === true
    }
  };
}

function resolveWaitPromptText(outputState = {}, session = {}) {
  if (session.phase !== "waiting_comment" && session.phase !== "show") {
    return "";
  }
  return buildWaitPromptPayload(outputState, session).text;
}

function tickCapybaraFlow(outputState = {}, _ctx = {}) {
  const session = getSession(outputState);

  if (session.phase === "idle" || session.phase === "completed" || session.phase === "expired") {
    return { action: "noop", session };
  }

  const now = Date.now();

  if (session.phase === "show" && now >= toNumber(session.showEndsAt, 0)) {
    session.phase = "waiting_comment";
    session.waitStartedAt = now;
    session.promptSent = false;
    return { action: "send_wait_prompt", session };
  }

  if (session.phase === "waiting_comment") {
    if (!session.promptSent) {
      session.promptSent = true;
      return { action: "send_wait_prompt", session };
    }

    if (now >= toNumber(session.waitEndsAt, 0)) {
      session.phase = "expired";
      session.expiredAt = now;
      return { action: "expire", session };
    }
  }

  return { action: "noop", session };
}

function pickThankLead(outputState = {}, session = {}) {
  const bankVariants = Array.isArray(TEXT_BANK.mia_capybara_thank_lead)
    ? TEXT_BANK.mia_capybara_thank_lead
    : THANK_LEADS;

  const raw = pickRotationText(outputState, "gift_chat_thank_lead", bankVariants, THANK_LEADS[0]);
  return fillGiftTokens(raw, session);
}

async function buildCapybaraCommentReply(outputState = {}, normalized = {}, session = {}, ctx = {}) {
  const responseEngine = ctx.responseEngine;
  const message = safeString(
    normalized.message ||
      normalized.comment ||
      normalized.content ||
      normalized.text
  );
  const userLabel = safeString(
    normalized.user?.nickname ||
      normalized.user?.username ||
      normalized.username ||
      normalized.nickname,
    "Divák"
  );

  const input = {
    message,
    userLabel,
    target: "mia",
    speaker: "mia",
    normalizedEvent: normalized,
    runtimeConfig: ctx.runtimeConfig,
    kojnozoutState: ctx.kojnozoutState
  };

  const outputStateWithKoj = {
    ...outputState,
    kojnozoutSnapshot: ctx.kojnozoutState,
    kojnozoutState: ctx.kojnozoutState
  };

  let base = null;

  if (typeof responseEngine?.buildDirectChatResponseAsync === "function") {
    base = await responseEngine.buildDirectChatResponseAsync(outputStateWithKoj, input);
  } else if (typeof responseEngine?.buildDirectChatResponse === "function") {
    base = responseEngine.buildDirectChatResponse(outputStateWithKoj, input);
  }

  const thankLead = pickThankLead(outputState, session);
  const baseSpeech = safeString(
    base?.speech_text || base?.overlayPayload?.text,
    "Díky za komentář."
  );
  const speechText = `${thankLead} ${baseSpeech}`.replace(/\s+/g, " ").trim();

  const overlayPayload = {
    ...(base?.overlayPayload || {}),
    owner: "mia",
    speaker: "mia",
    route: "community",
    title: "MIA",
    text: speechText,
    subtext: "gift_chat_reply",
    mood: session.awayMode ? "focused" : "warm",
    stage: "gift_chat_reply",
    action: "gift_chat_reply",
    holdMs: 6800,
    priority: 2,
    user: userLabel,
    userLabel,
    meta: {
      source: "gift_chat_loop",
      legacySource: "capybara_flow",
      phase: "completed",
      giftName: session.giftName,
      gifterLabel: session.gifterLabel,
      awayMode: session.awayMode === true,
      giftChatReply: true
    }
  };

  return {
    ok: true,
    shouldPlayVideo: false,
    route: "community",
    speech_text: speechText,
    overlayPayload,
    responseContract: base?.responseContract || {
      speaker: "mia",
      intent: "gift_chat_followup"
    },
    meta: {
      giftChatLoop: true,
      capybaraFlow: true,
      giftName: session.giftName,
      gifterLabel: session.gifterLabel
    }
  };
}

async function handleWaitingComment(outputState = {}, normalized = {}, ctx = {}) {
  const session = getSession(outputState);

  if (session.phase !== "waiting_comment") {
    return { handled: false, reason: "not_waiting" };
  }

  const message = safeString(
    normalized.message ||
      normalized.comment ||
      normalized.content ||
      normalized.text
  );

  if (!message) {
    return { handled: false, reason: "empty_message" };
  }

  const actionResult = await buildCapybaraCommentReply(
    outputState,
    normalized,
    session,
    ctx
  );

  session.phase = "completed";
  session.repliedAt = Date.now();
  session.repliedUser = safeString(
    normalized.user?.nickname ||
      normalized.user?.username ||
      normalized.username,
    "Divák"
  );
  session.lastReplyText = safeString(actionResult.speech_text).slice(0, 240);

  return {
    handled: true,
    actionResult,
    body: {
      ok: true,
      accepted: true,
      giftChatLoop: true,
      capybaraFlow: true,
      phase: "completed",
      actionResult
    }
  };
}

function getCapybaraSnapshot(outputState = {}) {
  const session = getSession(outputState);
  const phase = safeString(session.phase, "idle");
  const now = Date.now();
  const active = phase === "show" || phase === "waiting_comment";
  const waitPrompt = active ? resolveWaitPromptText(outputState, session) : "";

  return {
    phase,
    active,
    awayMode: session.awayMode === true,
    gifterLabel: safeString(session.gifterLabel),
    gifter: safeString(session.gifterLabel),
    userLabel: safeString(session.gifterLabel),
    giftName: safeString(session.giftName),
    giftKey: safeString(session.giftKey),
    kojMood: safeString(session.kojMood),
    primaryNeed: safeString(session.primaryNeed),
    waitPrompt,
    prompt: waitPrompt,
    showRemainingMs:
      phase === "show" ? Math.max(0, toNumber(session.showEndsAt, 0) - now) : 0,
    waitRemainingMs:
      phase === "waiting_comment"
        ? Math.max(0, toNumber(session.waitEndsAt, 0) - now)
        : 0,
    promptSent: session.promptSent === true,
    repliedUser: safeString(session.repliedUser),
    repliedAt: toNumber(session.repliedAt, 0),
    /** Alias pro nové API */
    giftChatLoop: active
  };
}

/** Alias snapshotu */
function getGiftChatLoopSnapshot(outputState = {}) {
  return getCapybaraSnapshot(outputState);
}

module.exports = {
  SHOW_MS,
  WAIT_MS,
  resolveChatLoopMode,
  isEnabled,
  isGiftChatLoopGift,
  isCapybaraLoopGift,
  shouldStartGiftChatLoop,
  resolveAwayMode,
  getSession,
  startCapybaraFlow,
  startGiftChatLoop: startCapybaraFlow,
  tickCapybaraFlow,
  tickGiftChatLoop: tickCapybaraFlow,
  buildWaitPromptPayload,
  buildCapybaraCommentReply,
  handleWaitingComment,
  getCapybaraSnapshot,
  getGiftChatLoopSnapshot,
  fillGiftTokens
};
