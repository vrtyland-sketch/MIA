"use strict";

let shapeSeq = 0;

function nextShapeId() {
  shapeSeq += 1;
  return `vshape_${shapeSeq}_${Date.now().toString(36)}`;
}

function createRectShape(x, y, width, height, opts = {}) {
  return {
    id: opts.id || nextShapeId(),
    type: "rect",
    x: Number(x) || 0,
    y: Number(y) || 0,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1),
    fill: opts.fill || "#7b6cff",
    stroke: opts.stroke || "#1a1a2e",
    strokeWidth: Number(opts.strokeWidth) || 2,
    rotation: Number(opts.rotation) || 0,
    opacity: opts.opacity != null ? opts.opacity : 1
  };
}

function createEllipseShape(x, y, width, height, opts = {}) {
  return {
    id: opts.id || nextShapeId(),
    type: "ellipse",
    x: Number(x) || 0,
    y: Number(y) || 0,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1),
    fill: opts.fill || "#7b6cff",
    stroke: opts.stroke || "#1a1a2e",
    strokeWidth: Number(opts.strokeWidth) || 2,
    rotation: Number(opts.rotation) || 0,
    opacity: opts.opacity != null ? opts.opacity : 1
  };
}

function createPathShape(d, opts = {}) {
  return {
    id: opts.id || nextShapeId(),
    type: "path",
    d: String(d || ""),
    x: Number(opts.x) || 0,
    y: Number(opts.y) || 0,
    fill: opts.fill || "none",
    stroke: opts.stroke || "#1a1a2e",
    strokeWidth: Number(opts.strokeWidth) || 2,
    rotation: Number(opts.rotation) || 0,
    opacity: opts.opacity != null ? opts.opacity : 1
  };
}

module.exports = {
  nextShapeId,
  createRectShape,
  createEllipseShape,
  createPathShape
};
