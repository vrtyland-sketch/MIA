"use strict";

const { DEFAULT_TILE_SIZE } = require("./constants");
const { nextShapeId } = require("./VectorShape");

let layerSeq = 0;

function nextLayerId() {
  layerSeq += 1;
  return `layer_${layerSeq}_${Date.now().toString(36)}`;
}

function createLayer(opts = {}) {
  const kind =
    opts.kind === "vector" || opts.kind === "group" ? opts.kind : "raster";
  const id = opts.id || nextLayerId();
  const base = {
    id,
    name: opts.name || "Vrstva",
    visible: opts.visible !== false,
    locked: opts.locked === true,
    opacity: clamp01(opts.opacity, 1),
    blendMode: opts.blendMode || "normal",
    kind,
    transform: normalizeTransform(opts.transform)
  };
  if (kind === "vector") {
    base.shapes = Array.isArray(opts.shapes) ? opts.shapes.slice() : [];
    return base;
  }
  return {
    ...base,
    tiles: opts.tiles && typeof opts.tiles === "object" ? { ...opts.tiles } : {},
    tileSize: opts.tileSize || DEFAULT_TILE_SIZE,
    mask: opts.mask || null
  };
}

function createVectorLayer(opts = {}) {
  return createLayer({ ...opts, kind: "vector" });
}

function clamp01(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function normalizeTransform(t = {}) {
  return {
    x: Number(t.x) || 0,
    y: Number(t.y) || 0,
    scale: Number(t.scale) > 0 ? Number(t.scale) : 1,
    rotation: Number(t.rotation) || 0
  };
}

function cloneLayer(layer) {
  return createLayer({
    ...layer,
    id: nextLayerId(),
    name: `${layer.name} kopie`,
    tiles: layer.tiles ? { ...layer.tiles } : undefined,
    shapes: layer.shapes ? layer.shapes.map((s) => ({ ...s, id: nextShapeId() })) : undefined
  });
}

module.exports = {
  createLayer,
  createVectorLayer,
  cloneLayer,
  nextLayerId,
  normalizeTransform
};
