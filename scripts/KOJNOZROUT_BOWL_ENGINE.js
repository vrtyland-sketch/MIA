"use strict";

const FULL_BOWL_HOLD_MS = 3000;
const POST_RESET_GUARD_MS = 800;

function now() {
  return Date.now();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureState(state) {
  const safeState = state && typeof state === "object" ? state : {};

  if (!safeState.bowl || typeof safeState.bowl !== "object") {
    safeState.bowl = {};
  }

  if (!safeState.bowl.meta || typeof safeState.bowl.meta !== "object") {
    safeState.bowl.meta = {};
  }

  const meta = safeState.bowl.meta;

  if (typeof meta.fullTriggered !== "boolean") {
    meta.fullTriggered = false;
  }

  if (typeof meta.fullTs !== "number") {
    meta.fullTs = 0;
  }

  if (typeof meta.cooldownUntilTs !== "number") {
    meta.cooldownUntilTs = 0;
  }

  if (typeof meta.lastEvent !== "string") {
    meta.lastEvent = "";
  }

  if (typeof meta.lastTransitionTs !== "number") {
    meta.lastTransitionTs = 0;
  }

  safeState.bowlPercent = clamp(toNumber(safeState.bowlPercent, 0), 0, 100);
  safeState.bowlState = clamp(
    toNumber(safeState.bowlState, safeState.bowlPercent),
    0,
    100
  );
  safeState.bowlFillPercent = clamp(
    toNumber(safeState.bowlFillPercent, safeState.bowlPercent),
    0,
    100
  );

  // compat struktura pro další vrstvy
  if (typeof safeState.bowl.percent !== "number") {
    safeState.bowl.percent = safeState.bowlPercent;
  }
  if (typeof safeState.bowl.visualLevel !== "string") {
    safeState.bowl.visualLevel = safeState.bowlVisualLevel || "empty";
  }
  if (typeof safeState.bowl.stage !== "string") {
    safeState.bowl.stage = safeState.stage || "idle";
  }

  return safeState;
}

function shouldTriggerFullBowl(state) {
  const safeState = ensureState(state);
  const percent = clamp(toNumber(safeState.bowlPercent, 0), 0, 100);
  const meta = safeState.bowl.meta || {};
  const ts = now();

  if (percent < 100) return false;
  if (meta.fullTriggered) return false;
  if (ts < toNumber(meta.cooldownUntilTs, 0)) return false;

  return true;
}

function markFullTriggered(state) {
  const safeState = ensureState(state);
  const ts = now();

  safeState.bowl.meta.fullTriggered = true;
  safeState.bowl.meta.fullTs = ts;
  safeState.bowl.meta.lastEvent = "FULL_BOWL_TRIGGER";
  safeState.bowl.meta.lastTransitionTs = ts;

  safeState.belly = 100; // důležité compat pole
  safeState.bowlPercent = 100;
  safeState.bowlState = 100;
  safeState.bowlFillPercent = 100;
  safeState.bowlVisualLevel = "full";
  safeState.stage = "stuffed";
  safeState.mood = "full";

  safeState.bowl.percent = 100;
  safeState.bowl.visualLevel = "full";
  safeState.bowl.stage = "stuffed";

  return safeState;
}

function shouldResetBowl(state) {
  const safeState = ensureState(state);
  const meta = safeState.bowl.meta || {};

  if (!meta.fullTriggered) return false;

  const fullTs = toNumber(meta.fullTs, 0);
  if (!fullTs) return false;

  return now() - fullTs >= FULL_BOWL_HOLD_MS;
}

function resetBowl(state, options = {}) {
  const safeState = ensureState(state);
  const ts = now();
  const cooldownMs = clamp(
    toNumber(options.cooldownMs, POST_RESET_GUARD_MS),
    0,
    60000
  );
  const resetReason =
    typeof options.reason === "string" && options.reason.trim()
      ? options.reason.trim()
      : "BOWL_RESET";

  // KRITICKÝ FIX:
  // musí se resetnout i compat pole belly,
  // jinak si syncDerivedFields natáhne znovu 100 %
  safeState.belly = 0;
  safeState.bowlPercent = 0;
  safeState.bowlState = 0;
  safeState.bowlFillPercent = 0;
  safeState.bowlVisualLevel = "empty";

  safeState.hunger = 100;
  safeState.stage = "idle";
  safeState.mood = "hungry";

  safeState.bowl.percent = 0;
  safeState.bowl.visualLevel = "empty";
  safeState.bowl.stage = "idle";

  safeState.bowl.meta = {
    fullTriggered: false,
    fullTs: 0,
    cooldownUntilTs: ts + cooldownMs,
    lastEvent: resetReason,
    lastTransitionTs: ts
  };

  return safeState;
}

function forceResetBowl(state, options = {}) {
  const safeState = resetBowl(state, {
    ...options,
    reason: options.reason || "BOWL_FORCE_RESET"
  });

  return {
    state: safeState,
    event:
      typeof options.event === "string" && options.event.trim()
        ? options.event.trim()
        : "BOWL_FORCE_RESET"
  };
}

function processBowlCycle(state) {
  const safeState = ensureState(state);

  if (shouldTriggerFullBowl(safeState)) {
    markFullTriggered(safeState);

    return {
      state: safeState,
      event: "FULL_BOWL_TRIGGER"
    };
  }

  if (shouldResetBowl(safeState)) {
    resetBowl(safeState);

    return {
      state: safeState,
      event: "BOWL_RESET"
    };
  }

  return {
    state: safeState,
    event: null
  };
}

module.exports = {
  processBowlCycle,
  resetBowl,
  forceResetBowl
};