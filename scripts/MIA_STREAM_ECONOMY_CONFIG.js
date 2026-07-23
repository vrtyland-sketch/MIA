"use strict";

/**
 * Jediná JSON mapa stream ekonomiky: tier prahy, spam wave, per-user throttle.
 * Načítá shared/stream_economy_config.json — moduly drží fallback na hardcoded defaulty.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "shared", "stream_economy_config.json");

const FALLBACK = Object.freeze({
  version: "1.0.0",
  tiers: {
    miaPointsPerCoin: 7.5,
    coinThresholds: {
      T1: 1,
      T2: 100,
      T3: 1000,
      T4: 5000,
      T5: 10000,
      T6: 25000
    }
  },
  spamWave: {
    windowMs: 15000,
    minSequenceCount: 3,
    rewardThresholds: {
      T2: 750,
      T3: 7500,
      T4: 37500
    }
  },
  userAckThrottle: {
    giftAckCooldownMs: {
      tiny: 20000,
      small: 30000,
      medium: 45000,
      large: 60000,
      huge: 90000,
      unknown: 35000
    },
    greetingCooldownMs: {
      tiny: 90000,
      small: 120000,
      medium: 180000,
      large: 240000,
      huge: 300000,
      unknown: 150000
    },
    pingCooldownMs: {
      tiny: 45000,
      small: 60000,
      medium: 90000,
      large: 120000,
      huge: 180000,
      unknown: 75000
    },
    followCooldownMs: {
      tiny: 300000,
      small: 300000,
      medium: 600000,
      large: 600000,
      huge: 900000,
      unknown: 600000
    },
    careCooldownMs: {
      tiny: 15000,
      small: 20000,
      medium: 25000,
      large: 35000,
      huge: 45000,
      unknown: 22000
    }
  }
});

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(base[key] || {}, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return deepMerge(FALLBACK, raw);
  } catch {
    return { ...FALLBACK };
  }
}

const CONFIG = loadConfig();

function getConfig() {
  return CONFIG;
}

function getTierConfig() {
  return CONFIG.tiers || FALLBACK.tiers;
}

function getSpamWaveConfig() {
  return CONFIG.spamWave || FALLBACK.spamWave;
}

function getUserAckThrottleConfig() {
  return CONFIG.userAckThrottle || FALLBACK.userAckThrottle;
}

module.exports = {
  CONFIG_PATH,
  FALLBACK,
  getConfig,
  getTierConfig,
  getSpamWaveConfig,
  getUserAckThrottleConfig
};
