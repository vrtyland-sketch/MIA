"use strict";

const { publishBodyState, resetBodyState } = require("./bodyPartState");
const { resetLiveSyncSignature } = require("./bodyLiveSync");
const { resolvePosePreset } = require("./poseCommands");
const {
  normalizeBodyLayout,
  resolveHeroParts
} = require("./bodyHeroPortrait");

const DEFAULT_PREVIEW_PARTS = {
  head: true,
  eyes: false,
  hands: false,
  torso: false,
  feet: false
};

function resolveComposedPreviewParts(input = {}) {
  if (input.parts && typeof input.parts === "object") {
    return { ...DEFAULT_PREVIEW_PARTS, ...input.parts };
  }
  const mood = String(input.mood || input.preset || "wave").toLowerCase();
  const speaking = input.speaking != null ? !!input.speaking : false;
  const parts = { ...DEFAULT_PREVIEW_PARTS, head: true };
  if (speaking) {
    parts.eyes = true;
  } else if (mood === "wave" || mood === "gift" || mood === "happy") {
    parts.hands = true;
  }
  return parts;
}

function resolvePreviewParts(input = {}) {
  const layout = normalizeBodyLayout(input.layout, "hero");
  if (layout === "composed") return resolveComposedPreviewParts(input);
  return resolveHeroParts(input);
}

function listBodyPreviewPresets() {
  return [
    { id: "hero", mood: "wave", layout: "hero", label: "Hero portrait" },
    { id: "wave", mood: "wave", layout: "hero", label: "Zamávání (hero)" },
    { id: "gift", mood: "gift", layout: "hero", label: "Gift reakce" },
    { id: "duel", mood: "duel", layout: "hero", label: "Duel" },
    { id: "happy", mood: "happy", layout: "hero", label: "Radost" },
    { id: "think", mood: "think", layout: "hero", label: "Přemýšlí" },
    { id: "composed", mood: "wave", layout: "composed", label: "Composed parts (debug)" }
  ];
}

function publishBodyPreview(input = {}) {
  const mood = resolvePosePreset(input.mood || input.preset || "wave");
  const layout = normalizeBodyLayout(input.layout, "hero");
  const parts = resolvePreviewParts({ ...input, mood, layout });
  const speaking = input.speaking != null ? !!input.speaking : false;
  const lockStudioMs = Number(input.lockStudioMs) || 12000;

  return publishBodyState({
    mood,
    speaking,
    parts,
    layout,
    source: "studio",
    lockStudioMs,
    speakingHoldMs: speaking ? Number(input.speakingHoldMs) || 3200 : 0
  });
}

function resetBodyPreview() {
  resetLiveSyncSignature();
  return resetBodyState();
}

module.exports = {
  DEFAULT_PREVIEW_PARTS,
  listBodyPreviewPresets,
  resolvePreviewParts,
  resolveComposedPreviewParts,
  publishBodyPreview,
  resetBodyPreview
};
