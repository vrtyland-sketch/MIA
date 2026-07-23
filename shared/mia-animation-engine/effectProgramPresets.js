"use strict";

const PARTICLE_PRESETS = {
  generic_support: { burst: "star", count: 16, frame: "spark" },
  flower_support: { burst: "heal", count: 22, frame: "heart" },
  flower_burst: { burst: "heal", count: 28, frame: "heart" },
  heart_ping: { burst: "heal", count: 18, frame: "heart" },
  heart_burst: { burst: "star", count: 24, frame: "heart" },
  care_feed: { burst: "item_pop", count: 14, frame: "food" },
  pet_react: { burst: "star", count: 20, frame: "star" },
  music_pulse: { burst: "impact", count: 18, frame: "spark" },
  travel_motion: { burst: "trail", count: 12, frame: "trail" },
  power_strike: { burst: "impact", count: 26, frame: "box" },
  generic: { burst: "star", count: 14, frame: "spark" }
};

const SOUND_CUES = {
  generic_support: "gift_soft",
  flower_support: "gift_rose",
  flower_burst: "gift_rose_burst",
  heart_ping: "gift_heart",
  heart_burst: "gift_heart_burst",
  care_feed: "gift_feed",
  pet_react: "gift_pet",
  music_pulse: "gift_music",
  travel_motion: "gift_travel",
  power_strike: "gift_power",
  generic: "gift_soft"
};

const MOTION_BY_EFFECT = {
  flower_support: { style: "bounce", intensity: 0.55, durationMs: 900 },
  flower_burst: { style: "pulse", intensity: 0.7, durationMs: 1100 },
  heart_ping: { style: "pulse", intensity: 0.5, durationMs: 700 },
  heart_burst: { style: "bounce", intensity: 0.75, durationMs: 1000 },
  care_feed: { style: "bounce", intensity: 0.45, durationMs: 800 },
  pet_react: { style: "shake", intensity: 0.4, durationMs: 650 },
  music_pulse: { style: "pulse", intensity: 0.65, durationMs: 950 },
  travel_motion: { style: "bounce", intensity: 0.6, durationMs: 1200 },
  power_strike: { style: "shake", intensity: 0.8, durationMs: 700 },
  generic_support: { style: "bounce", intensity: 0.5, durationMs: 800 }
};

const GIFT_ANIMATION_IDS = {
  rose: "gift/rose",
  flowers_bouquet: "gift/rose",
  heart_small: "gift/heart",
  heart_big: "gift/heart",
  lion: "gift/lion",
  perfume: "gift/perfume",
  galaxy: "gift/galaxy",
  universe: "gift/galaxy"
};

/** Canonical gift keys that have hardcoded bank clip IDs (Phase 12y override targets). */
const HARDCODED_GIFT_KEYS = Object.keys(GIFT_ANIMATION_IDS);

const EMOTION_ANIMATION_IDS = {
  idle: "idle/idle_001",
  warm: "idle/idle_002",
  happy: "happy/happy_001",
  excited: "happy/happy_001",
  sad: "sad/sad_001",
  dance: "dance/dance_001",
  wave: "wave/wave_001"
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function resolveParticlePreset(effectProgram = "") {
  const key = safeString(effectProgram, "generic_support").toLowerCase();
  return { ...(PARTICLE_PRESETS.generic || PARTICLE_PRESETS.generic_support), ...(PARTICLE_PRESETS[key] || {}) };
}

function resolveSoundCue(effectProgram = "", tier = "T1") {
  const key = safeString(effectProgram, "generic_support").toLowerCase();
  const base = SOUND_CUES[key] || SOUND_CUES.generic;
  const rank = Number(String(tier).replace(/\D/g, "")) || 1;
  return rank >= 4 ? `${base}_boss` : base;
}

function resolveMotionPreset(effectProgram = "") {
  const key = safeString(effectProgram, "generic_support").toLowerCase();
  return MOTION_BY_EFFECT[key] || MOTION_BY_EFFECT.generic_support;
}

function resolveGiftAnimationId(giftKey = "", effectProgram = "", emotion = "happy") {
  const gk = safeString(giftKey).toLowerCase();
  if (gk && GIFT_ANIMATION_IDS[gk]) return GIFT_ANIMATION_IDS[gk];

  const ep = safeString(effectProgram).toLowerCase();
  if (ep.startsWith("flower")) return "gift/rose";
  if (ep.startsWith("heart")) return "gift/heart";
  if (ep === "pet_react") return "gift/lion";
  if (ep === "care_feed") return "happy/happy_001";

  const em = safeString(emotion, "happy").toLowerCase();
  return EMOTION_ANIMATION_IDS[em] || EMOTION_ANIMATION_IDS.happy;
}

module.exports = {
  PARTICLE_PRESETS,
  SOUND_CUES,
  MOTION_BY_EFFECT,
  GIFT_ANIMATION_IDS,
  HARDCODED_GIFT_KEYS,
  EMOTION_ANIMATION_IDS,
  resolveParticlePreset,
  resolveSoundCue,
  resolveMotionPreset,
  resolveGiftAnimationId
};
