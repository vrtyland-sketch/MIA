"use strict";

const CREATURES = Object.freeze([
  {
    id: "bio_hunter_alpha",
    label: "Bio lovec Alpha",
    archetype: "hunter",
    shaderProfile: "mia_creature_bio_v1",
    params: {
      skinTint: [38, 120, 88],
      edgeGlow: [0, 255, 180],
      plateStrength: 0.72,
      mandibleGlow: 0.45,
      eyeGlow: 0.85
    },
    note: "Originální MIA creature — bio-mechanický lovec, ne licencovaná IP."
  },
  {
    id: "shadow_stalker",
    label: "Stínový stalker",
    archetype: "stealth",
    shaderProfile: "mia_creature_shadow_v1",
    params: {
      skinTint: [24, 28, 48],
      edgeGlow: [120, 60, 220],
      plateStrength: 0.35,
      mandibleGlow: 0.1,
      eyeGlow: 0.95
    },
    note: "Tmavý silueta + fialové okraje."
  },
  {
    id: "neon_gladiator",
    label: "Neon gladiátor",
    archetype: "arena",
    shaderProfile: "mia_creature_neon_v1",
    params: {
      skinTint: [18, 22, 36],
      edgeGlow: [255, 64, 128],
      plateStrength: 0.88,
      mandibleGlow: 0.2,
      eyeGlow: 1
    },
    note: "Combat aréna — výrazné neon plate."
  }
]);

function listCreatures() {
  return CREATURES.map((row) => ({
    id: row.id,
    label: row.label,
    archetype: row.archetype,
    shaderProfile: row.shaderProfile,
    note: row.note
  }));
}

function getCreature(id = "") {
  const key = String(id || "").toLowerCase();
  return CREATURES.find((row) => row.id === key) || null;
}

function resolveCreatureForCombat(input = {}) {
  const tier = String(input.tier || "").toUpperCase();
  const seed = String(input.userId || input.nickname || input.seed || "mia");
  if (tier === "T5" || tier === "T6") return getCreature("bio_hunter_alpha");
  if (/duel|arena|turnaj/.test(String(input.context || input.chatText || "").toLowerCase())) {
    return getCreature("neon_gladiator");
  }
  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const pick = CREATURES[hash % CREATURES.length];
  return pick || getCreature("shadow_stalker");
}

function buildCreatureShaderParams(creature, seed = "mia") {
  if (!creature) return null;
  const hash = String(seed)
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const jitter = (hash % 17) / 100;
  const params = { ...creature.params };
  params.plateStrength = Math.max(0, Math.min(1, params.plateStrength + jitter - 0.08));
  params.seed = hash;
  return {
    creatureId: creature.id,
    label: creature.label,
    shaderProfile: creature.shaderProfile,
    params
  };
}

module.exports = {
  CREATURES,
  listCreatures,
  getCreature,
  resolveCreatureForCombat,
  buildCreatureShaderParams
};
