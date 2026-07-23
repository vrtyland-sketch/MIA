"use strict";

/**
 * Phase 13e — Hero body portrait.
 * Jedna čistá MIA_HEAD vrstva nad speech stripem (bez skládačky parts).
 */

const HERO_PARTS = {
  head: true,
  eyes: false,
  hands: false,
  torso: false,
  feet: false
};

/** TikTok portrait 1080×1920 — nad MIA_BUBBLE (~y 1688), vlevo od Koje. */
const HERO_OBS_TRANSFORM = {
  positionX: 24,
  positionY: 1140,
  scaleX: 1.48,
  scaleY: 1.48,
  alignment: 5
};

const HERO_BROWSER_SIZE = { width: 360, height: 360 };

function normalizeBodyLayout(value, fallback = "hero") {
  const key = String(value || fallback).toLowerCase().trim();
  if (key === "composed" || key === "compose" || key === "parts") return "composed";
  return "hero";
}

function resolveHeroParts(input = {}) {
  if (input.parts && typeof input.parts === "object") {
    return { ...HERO_PARTS, ...input.parts };
  }
  return { ...HERO_PARTS };
}

function getHeroObsTransform() {
  return { ...HERO_OBS_TRANSFORM };
}

function isHeroTransformOnCanvas(options = {}) {
  const canvasW = Number(options.canvasW) || 1080;
  const canvasH = Number(options.canvasH) || 1920;
  const srcW = Number(options.sourceWidth) || HERO_BROWSER_SIZE.width;
  const srcH = Number(options.sourceHeight) || HERO_BROWSER_SIZE.height;
  const t = HERO_OBS_TRANSFORM;
  const w = srcW * (Number(t.scaleX) || 1);
  const h = srcH * (Number(t.scaleY) || 1);
  const left = t.positionX;
  const top = t.positionY;
  const margin = Number(options.margin) || 8;
  return (
    left >= -margin &&
    top >= -margin &&
    left + w <= canvasW + margin &&
    top + h <= canvasH + margin &&
    top + h <= 1680 + margin
  );
}

module.exports = {
  HERO_PARTS,
  HERO_OBS_TRANSFORM,
  HERO_BROWSER_SIZE,
  normalizeBodyLayout,
  resolveHeroParts,
  getHeroObsTransform,
  isHeroTransformOnCanvas
};
