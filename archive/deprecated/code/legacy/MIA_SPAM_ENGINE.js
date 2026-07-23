"use strict";

/**
 * MIA_SPAM_ENGINE.js
 *
 * OPRAVENÁ VERZE – MIA KANON
 *
 * PRINCIP:
 * - KAŽDÝ gift = validní support (nikdy nezablokuje video)
 * - spam pouze zvyšuje tier / efekt
 * - overlay_spam NIKDY nesmí blokovat video flow
 */

const WINDOW_MS = 5000;
const SPAM_THRESHOLD = 5;
const MIN_SPAM_POINTS = 250;

const STATE = {
  events: [],
  buffer: 0,
  windowActive: false
};

function now() {
  return Date.now();
}

function cleanup(time) {
  const cutoff = time - WINDOW_MS;

  STATE.events = STATE.events.filter((e) => e.time > cutoff);

  if (STATE.events.length === 0) {
    STATE.windowActive = false;
    STATE.buffer = 0;
  }
}

function buildDebug() {
  return {
    buffer: STATE.buffer,
    events: STATE.events.length,
    windowActive: STATE.windowActive
  };
}

function resolveSpamTier(points) {
  if (points >= 7500) return "T4";
  if (points >= 3492.5) return "T3";
  if (points >= MIN_SPAM_POINTS) return "T2";
  return null;
}

function processSupport(support = {}) {
  const miaPoints = Number(support.miaPoints) || 0;
  const time = now();

  if (miaPoints <= 0) {
    return {
      type: "none",
      debug: buildDebug()
    };
  }

  cleanup(time);

  // 🟢 PRVNÍ EVENT
  if (!STATE.windowActive) {
    STATE.windowActive = true;
    STATE.events = [{ time, points: miaPoints }];
    STATE.buffer = miaPoints;

    return {
      type: "support",
      tier: "T1",
      spamBoost: false,
      debug: buildDebug()
    };
  }

  // 🟢 DALŠÍ EVENTY
  STATE.events.push({ time, points: miaPoints });
  STATE.buffer += miaPoints;

  // 🟢 POD SPAM THRESHOLD → normální support
  if (STATE.events.length < SPAM_THRESHOLD) {
    return {
      type: "support",
      tier: "T1",
      spamBoost: false,
      debug: buildDebug()
    };
  }

  // 🟡 SPAM AKTIVNÍ → ale NEblokuje video
  const spamTier = resolveSpamTier(STATE.buffer);

  if (!spamTier) {
    return {
      type: "support",
      tier: "T1",
      spamBoost: true,
      debug: buildDebug()
    };
  }

  // 🔥 VELKÝ SPAM → boost tieru
  const result = {
    type: "support",
    tier: spamTier,
    spamBoost: true,
    buffer: STATE.buffer,
    debug: buildDebug()
  };

  // reset window po silném spamu
  STATE.events = [];
  STATE.buffer = 0;
  STATE.windowActive = false;

  return result;
}

function getState() {
  return {
    events: STATE.events.slice(),
    buffer: STATE.buffer,
    windowActive: STATE.windowActive
  };
}

function resetState() {
  STATE.events = [];
  STATE.buffer = 0;
  STATE.windowActive = false;

  return getState();
}

module.exports = {
  processSupport,
  getState,
  resetState
};