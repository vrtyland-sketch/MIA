"use strict";

const fxRegistry = require("../../scripts/MIA_2D_FX_REGISTRY");

/** Agentní presety → kanonické burst presety z mia-2d-fx */
const PARTICLE_PRESETS = {
  sparkle_blue: {
    id: "sparkle_blue",
    label: "Modré jiskry",
    burst: "star",
    frame: "star",
    accent: "#4cc9ff",
    count: 24
  },
  sparkle_pink: {
    id: "sparkle_pink",
    label: "Růžové jiskry",
    burst: "star",
    frame: "star",
    accent: "#ff5ab4",
    count: 22
  },
  rain: {
    id: "rain",
    label: "Déšť",
    burst: "trail",
    frame: "trail",
    accent: "#88aaff",
    count: 36,
    upward: -1.2
  },
  fire: {
    id: "fire",
    label: "Oheň",
    burst: "impact",
    frame: "spark",
    accent: "#ff6600",
    count: 28,
    upward: 0.9
  },
  smoke: {
    id: "smoke",
    label: "Kouř",
    burst: "trail",
    frame: "trail",
    accent: "#aaaaaa",
    count: 20,
    upward: -0.6
  },
  heal: {
    id: "heal",
    label: "Srdíčka",
    burst: "heal",
    frame: "heart",
    accent: "#ff5ab4",
    count: 26
  },
  impact: {
    id: "impact",
    label: "Impact",
    burst: "impact",
    frame: "spark",
    accent: "#ffd166",
    count: 32
  }
};

function getParticlePreset(id) {
  const key = String(id || "sparkle_blue").toLowerCase();
  return PARTICLE_PRESETS[key] || PARTICLE_PRESETS.sparkle_blue;
}

function listParticlePresets() {
  return Object.values(PARTICLE_PRESETS);
}

function resolveBurstConfig(presetId, overrides = {}) {
  const preset = getParticlePreset(presetId);
  const base = fxRegistry.BURST_PRESETS[preset.burst] || fxRegistry.BURST_PRESETS.star;
  return {
    ...base,
    ...preset,
    ...overrides,
    preset: preset.id,
    burst: preset.burst,
    frame: preset.frame || base.frame || "star"
  };
}

module.exports = {
  PARTICLE_PRESETS,
  getParticlePreset,
  listParticlePresets,
  resolveBurstConfig
};
