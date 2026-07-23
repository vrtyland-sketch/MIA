"use strict";

/**
 * CARE validace — kánon: kdo, jak často, spam, kontext.
 * Per-user cooldown preferuje MIA_USER_ACK_THROTTLE (stejná vrstva jako ahoj/gift).
 */

const userAckThrottle = require("./MIA_USER_ACK_THROTTLE");

const USER_COOLDOWN_MS = 20000;
const SPAM_WINDOW_MS = 45000;
const SPAM_MAX_SAME_ACTION = 3;

const userCareState = new Map();

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUserKey(userLabel = "") {
  return safeString(userLabel).toLowerCase().replace(/\s+/g, "_") || "anonymous";
}

function getUserRecord(userLabel = "") {
  const key = normalizeUserKey(userLabel);
  const existing = userCareState.get(key);
  if (existing) return existing;
  const fresh = { lastAt: 0, lastAction: "", attempts: [] };
  userCareState.set(key, fresh);
  return fresh;
}

function pruneAttempts(record = {}, now = Date.now()) {
  record.attempts = (record.attempts || []).filter((row) => now - toNumber(row.at, 0) < SPAM_WINDOW_MS);
  return record;
}

function validateCareContext(action = "", kojnozoutState = {}) {
  const affliction = safeString(kojnozoutState.affliction).toLowerCase();
  const mood = safeString(kojnozoutState.mood).toLowerCase();
  const hunger = toNumber(kojnozoutState.hunger, 0);

  if (action === "lecit" && affliction !== "sick" && mood !== "sick") {
    return {
      ok: true,
      reason: "care_context_soft",
      soft: true,
      hint: "Není nemocný — ale péče potěší."
    };
  }

  if (
    action === "uklidnit" &&
    !["annoyed", "stressed", "sad"].includes(affliction) &&
    !["annoyed", "stressed", "sad"].includes(mood)
  ) {
    return {
      ok: true,
      reason: "care_context_soft",
      soft: true,
      hint: "Už je v klidu — ale mazlení neškodí."
    };
  }

  if (action === "nakrmit" && hunger < 35 && toNumber(kojnozoutState.bowlPercent, 0) >= 85) {
    return {
      ok: true,
      reason: "care_context_soft",
      soft: true,
      hint: "Miska je skoro plná — vezme to s vděčností."
    };
  }

  return { ok: true, reason: "ok" };
}

function validateCareAttempt(ctx = {}) {
  const userLabel = safeString(ctx.userLabel, "někdo");
  const action = safeString(ctx.action).toLowerCase();
  const now = toNumber(ctx.now, Date.now());
  const record = pruneAttempts(getUserRecord(userLabel), now);
  const outputState = ctx.outputState && typeof ctx.outputState === "object" ? ctx.outputState : null;
  const audienceBand = safeString(ctx.audienceBand, "medium");
  const userKey =
    safeString(ctx.userKey) ||
    userAckThrottle.resolveUserKey({
      user: { nickname: userLabel },
      nickname: userLabel
    });

  if (!action) {
    return { ok: false, reason: "care_action_missing" };
  }

  // Primární: sdílený per-user throttle (anti-opakování).
  if (
    outputState &&
    userAckThrottle.isUserPublicAckCooling(outputState, userKey, "care", audienceBand)
  ) {
    const check = userAckThrottle.checkUserPublicAck(
      outputState,
      userKey,
      "care",
      audienceBand
    );
    return {
      ok: false,
      reason: "care_user_cooldown",
      retryInMs: check.remainingMs,
      message: "Kojnožrout potřebuje chvilku mezi péčí od stejného člověka."
    };
  }

  if (!outputState && now - toNumber(record.lastAt, 0) < USER_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "care_user_cooldown",
      retryInMs: USER_COOLDOWN_MS - (now - record.lastAt),
      message: "Kojnožrout potřebuje chvilku mezi péčí od stejného člověka."
    };
  }

  const sameActionCount = (record.attempts || []).filter((row) => row.action === action).length;
  if (sameActionCount >= SPAM_MAX_SAME_ACTION) {
    return {
      ok: false,
      reason: "care_spam",
      message: "Stejná péče příliš často — zkus něco jiného nebo počkej."
    };
  }

  const context = validateCareContext(action, ctx.kojnozoutState || {});
  if (!context.ok) {
    return context;
  }

  record.lastAt = now;
  record.lastAction = action;
  record.attempts.push({ action, at: now });
  userCareState.set(normalizeUserKey(userLabel), record);

  if (outputState) {
    userAckThrottle.noteUserPublicAck(outputState, userKey, "care");
  }

  return {
    ...context,
    ok: true,
    userLabel,
    action,
    userKey
  };
}

function resetCareValidationState() {
  userCareState.clear();
}

module.exports = {
  USER_COOLDOWN_MS,
  SPAM_WINDOW_MS,
  SPAM_MAX_SAME_ACTION,
  validateCareAttempt,
  validateCareContext,
  resetCareValidationState
};
