"use strict";

/** Sdílené SVG/canvas primitivy — MIA Paint + koj-vector.js */

const SVG_NS = "http://www.w3.org/2000/svg";

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t))
  ];
}

function rgb(c, a) {
  if (a == null) return `rgb(${c[0]},${c[1]},${c[2]})`;
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/** Browser: vytvoří SVG element. Node: vrátí popis { tag, attrs }. */
function createSvgElement(tag, attrs, doc) {
  const documentRef = doc || (typeof document !== "undefined" ? document : null);
  if (documentRef && typeof documentRef.createElementNS === "function") {
    const node = documentRef.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        node.setAttribute(k, String(attrs[k]));
      }
    }
    return node;
  }
  return { tag, attrs: attrs || {}, ns: SVG_NS };
}

/**
 * Kreslí VectorShape-like objekt na canvas 2D kontext.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shape — { type, x, y, width, height, fill, stroke, strokeWidth, rotation, opacity, d }
 * @param {object} opts — { offsetX, offsetY, scale, layerOpacity }
 */
function drawShapeOnCanvas(ctx, shape, opts = {}) {
  if (!ctx || !shape) return;
  const scale = Number(opts.scale) > 0 ? Number(opts.scale) : 1;
  const ox = Number(opts.offsetX) || 0;
  const oy = Number(opts.offsetY) || 0;
  const layerOpacity = opts.layerOpacity != null ? opts.layerOpacity : 1;
  const x = ox + (Number(shape.x) || 0) * scale;
  const y = oy + (Number(shape.y) || 0) * scale;
  const w = Math.max(1, Number(shape.width) || 1) * scale;
  const h = Math.max(1, Number(shape.height) || 1) * scale;
  const opacity = (shape.opacity != null ? shape.opacity : 1) * layerOpacity;

  ctx.save();
  if (shape.rotation) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((Number(shape.rotation) * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  ctx.globalAlpha = opacity;

  if (shape.type === "rect") {
    ctx.fillStyle = shape.fill || "transparent";
    ctx.strokeStyle = shape.stroke || "#000";
    ctx.lineWidth = (Number(shape.strokeWidth) || 1) * scale;
    ctx.fillRect(x, y, w, h);
    if (shape.stroke && shape.stroke !== "none") {
      ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }
  } else if (shape.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = shape.fill || "transparent";
    ctx.fill();
    ctx.strokeStyle = shape.stroke || "#000";
    ctx.lineWidth = (Number(shape.strokeWidth) || 1) * scale;
    if (shape.stroke && shape.stroke !== "none") ctx.stroke();
  } else if (shape.type === "path" && shape.d) {
    const path = new Path2D(shape.d);
    ctx.fillStyle = shape.fill || "none";
    ctx.strokeStyle = shape.stroke || "#000";
    ctx.lineWidth = (Number(shape.strokeWidth) || 1) * scale;
    ctx.translate(x, y);
    if (shape.fill && shape.fill !== "none") ctx.fill(path);
    if (shape.stroke && shape.stroke !== "none") ctx.stroke(path);
  }
  ctx.restore();
}

const api = {
  SVG_NS,
  escXml,
  clamp,
  lerp,
  lerpRgb,
  rgb,
  createSvgElement,
  drawShapeOnCanvas
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== "undefined") {
  globalThis.MIA_SVG_PRIMITIVES = api;
}
