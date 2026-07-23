"use strict";

const { getEnvironment, listEnvironments } = require("./environmentPresets");
const {
  resolveCreatureForCombat,
  buildCreatureShaderParams
} = require("./creaturePresets");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeText(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveEnvironmentId(input = {}) {
  const mode = safeString(input.mode).toLowerCase();
  const text = normalizeText(input.chatText || input.context || input.hint || "");
  const irHint = safeString(input.irHint).toLowerCase();

  if (mode === "combat" || input.combat === true) return "arena_combat_neon";
  if (/boj|combat|arena|duel|fight|turnaj/.test(text)) return "arena_combat_neon";

  if (
    irHint === "driving" ||
    irHint === "truck" ||
    /kamion|jedu|ridim|doprav|highway|silnic/.test(text)
  ) {
    return "galactic_cruise";
  }

  if (/galax|hvezd|vesmir|space|kokpit|raket|planeta|mesic|lode|orbit/.test(text)) {
    return "space_cockpit";
  }

  if (/les|forest|prirod|strom|hiking/.test(text)) return "forest_path";

  if (input.tier === "T5" || input.tier === "T6") return "galactic_cruise";

  return safeString(input.environmentId, "studio_neutral") || "studio_neutral";
}

function resolveSceneFromContext(input = {}) {
  let mode =
    input.combat === true || safeString(input.mode).toLowerCase() === "combat"
      ? "combat"
      : "immersive";
  const environmentId = resolveEnvironmentId({
    ...input,
    mode: mode === "combat" ? "combat" : input.mode
  });
  if (mode !== "combat" && environmentId === "arena_combat_neon") {
    mode = "combat";
  }
  const env = getEnvironment(environmentId);
  const creature =
    mode === "combat" ? resolveCreatureForCombat(input) : null;
  const creatureShader =
    mode === "combat" && creature
      ? buildCreatureShaderParams(creature, input.userId || input.nickname || input.seed)
      : null;

  const filterProfile =
    mode === "combat"
      ? safeString(input.filterProfile, env.filterProfile)
      : safeString(input.filterProfile, env.filterProfile);

  return {
    ok: true,
    mode,
    environmentId: env.id,
    environmentLabel: env.label,
    environmentCategory: env.category,
    motionHint: env.motionHint,
    parallaxSpeed: env.parallaxSpeed,
    backdrop: env.backdrop,
    windows: env.windows.map((w) => ({ ...w })),
    layers: env.layers.slice(),
    filterProfile,
    streamerSlot: input.streamerSlot || { x: 0.32, y: 0.22, w: 0.36, h: 0.62 },
    segmentation: {
      provider: "mia_matting_v1",
      enabled: input.segmentation !== false,
      multiCam: true,
      maxCameras: 6,
      primaryRole: "front"
    },
    creature: creatureShader,
    cameraCount: Math.max(1, Math.min(6, Number(input.cameraCount) || 1)),
    provider: "mia_scene_director_v1",
    tags: env.tags.slice()
  };
}

function resolveSceneFromChat(text = "", opts = {}) {
  return resolveSceneFromContext({ ...opts, chatText: text });
}

module.exports = {
  listEnvironments,
  resolveEnvironmentId,
  resolveSceneFromContext,
  resolveSceneFromChat
};
