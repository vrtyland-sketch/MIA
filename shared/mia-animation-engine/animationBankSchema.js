"use strict";

const BANK_VERSION = 2;
const MANIFEST_KIND = "mia_animation_sheet";

const DEFAULT_CLIP = {
  fps: 14,
  loop: true,
  anchor: { x: 0.5, y: 1.0 },
  tags: [],
  emotion: "idle",
  effectProgram: "",
  tiers: [],
  giftKeys: []
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeStringList(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const safe = safeString(value);
    if (!safe) continue;
    const key = safe.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(safe);
  }
  return out;
}

function validateClipMetadata(meta = {}, clipId = "") {
  const errors = [];
  const id = safeString(meta.id || clipId);
  if (!id) errors.push("missing_id");

  const fps = toNumber(meta.fps, DEFAULT_CLIP.fps);
  if (fps < 1 || fps > 60) errors.push("invalid_fps");

  const anchor = meta.anchor || DEFAULT_CLIP.anchor;
  const ax = toNumber(anchor.x, 0.5);
  const ay = toNumber(anchor.y, 1.0);
  if (ax < 0 || ax > 1 || ay < 0 || ay > 1) errors.push("invalid_anchor");

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      id,
      label: safeString(meta.label, id.split("/").pop() || id),
      fps: Math.round(clamp(fps, 1, 60)),
      loop: meta.loop !== false,
      anchor: { x: ax, y: ay },
      tags: normalizeStringList(meta.tags),
      emotion: safeString(meta.emotion, "idle").toLowerCase(),
      effectProgram: safeString(meta.effectProgram).toLowerCase(),
      tiers: normalizeStringList(meta.tiers).map((t) => t.toUpperCase()),
      giftKeys: normalizeStringList(meta.giftKeys).map((k) => k.toLowerCase()),
      frameCount: Math.max(0, toNumber(meta.frameCount, 0)),
      category: safeString(meta.category, id.split("/")[0] || "misc").toLowerCase(),
      cameraId: safeString(meta.cameraId).toUpperCase() || null,
      shotLabel: safeString(meta.shotLabel) || null,
      quality: safeString(meta.quality).toLowerCase() || null,
      source: safeString(meta.source).toLowerCase() || null,
      spriteHint: safeString(meta.spriteHint).toLowerCase() || null,
      giftOverride: meta.giftOverride === true,
      trueAlpha: meta.trueAlpha === true,
      avgAlphaRatio: Number.isFinite(Number(meta.avgAlphaRatio)) ? Number(meta.avgAlphaRatio) : null
    }
  };
}

function buildClipManifest(layout, meta = {}) {
  const { spec, sheetWidth, sheetHeight, frameCount, placements } = layout;
  const clipMeta = validateClipMetadata(meta).normalized;
  return {
    kind: MANIFEST_KIND,
    version: BANK_VERSION,
    clipId: clipMeta.id,
    label: clipMeta.label,
    sheetWidth,
    sheetHeight,
    frameCount,
    cols: spec.cols,
    rows: spec.rows,
    frameWidth: spec.frameWidth,
    frameHeight: spec.frameHeight,
    fps: spec.fps || clipMeta.fps,
    loop: clipMeta.loop,
    anchor: clipMeta.anchor,
    emotion: clipMeta.emotion,
    effectProgram: clipMeta.effectProgram,
    tags: clipMeta.tags,
    giftKeys: clipMeta.giftKeys,
    tiers: clipMeta.tiers,
    cameraId: clipMeta.cameraId,
    shotLabel: clipMeta.shotLabel,
    quality: clipMeta.quality,
    source: clipMeta.source,
    spriteHint: clipMeta.spriteHint,
    giftOverride: clipMeta.giftOverride === true,
    trueAlpha: clipMeta.trueAlpha === true,
    avgAlphaRatio: clipMeta.avgAlphaRatio,
    frames: placements.map((p) => ({
      index: p.index,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height
    }))
  };
}

module.exports = {
  BANK_VERSION,
  MANIFEST_KIND,
  DEFAULT_CLIP,
  validateClipMetadata,
  buildClipManifest
};
