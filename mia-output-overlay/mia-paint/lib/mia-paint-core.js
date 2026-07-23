(function (global) {
"use strict";
  const __modules = {};
  function __require(name) {
    if (__modules[name]) return __modules[name].exports;
    throw new Error("missing module: " + name);
  }
  __modules["./../mia-svg-primitives"] = { exports: (function () {
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
  
}


    return { default: api, ...(api && typeof api === "object" ? api : {}) };
  })() };
  __modules["./constants"] = { exports: (function () {
const MIA_PAINT_VERSION = 1;
const DEFAULT_TILE_SIZE = 512;
const DEFAULT_DPI = 72;
const MAX_UNDO = 100;
const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten"];


    return {
  MIA_PAINT_VERSION,
  DEFAULT_TILE_SIZE,
  DEFAULT_DPI,
  MAX_UNDO,
  BLEND_MODES
};
  })() };
  __modules["./EventBus"] = { exports: (function () {
function createEventBus() {
  const handlers = new Map();

  function on(type, fn) {
    if (typeof fn !== "function") return () => {};
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(fn);
    return () => off(type, fn);
  }

  function off(type, fn) {
    const set = handlers.get(type);
    if (set) set.delete(fn);
  }

  function emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        emit("error", { type, error: err });
      }
    }
  }

  function once(type, fn) {
    const unsub = on(type, (payload) => {
      unsub();
      fn(payload);
    });
    return unsub;
  }

  return { on, off, emit, once };
}


    return { createEventBus };
  })() };
  __modules["./Layer"] = { exports: (function () {
const { DEFAULT_TILE_SIZE } = __require("./constants");
const { nextShapeId } = __require("./VectorShape");

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


    return {
  createLayer,
  createVectorLayer,
  cloneLayer,
  nextLayerId,
  normalizeTransform
};
  })() };
  __modules["./Document"] = { exports: (function () {
const { MIA_PAINT_VERSION, DEFAULT_DPI } = __require("./constants");
const { createLayer, nextLayerId } = __require("./Layer");
const { createTimeline } = __require("./Animation");

let docSeq = 0;

function nextDocumentId() {
  docSeq += 1;
  return `doc_${docSeq}_${Date.now().toString(36)}`;
}

function createDocument(opts = {}) {
  const firstLayer = createLayer({ name: "Pozadí", id: opts.backgroundLayerId });
  return {
    id: opts.id || nextDocumentId(),
    name: opts.name || "Bez názvu",
    version: MIA_PAINT_VERSION,
    width: Math.max(1, Number(opts.width) || 1920),
    height: Math.max(1, Number(opts.height) || 1080),
    dpi: Number(opts.dpi) || DEFAULT_DPI,
    background: opts.background == null ? null : String(opts.background),
    layers: Array.isArray(opts.layers) && opts.layers.length ? opts.layers.slice() : [firstLayer],
    activeLayerId: opts.activeLayerId || firstLayer.id,
    selection: opts.selection || null,
    timeline: opts.timeline || createTimeline(),
    fxParticles: Array.isArray(opts.fxParticles) ? opts.fxParticles.slice() : [],
    meta: {
      author: opts.author || "",
      createdAt: opts.createdAt || new Date().toISOString(),
      modifiedAt: opts.modifiedAt || new Date().toISOString()
    }
  };
}

function getActiveLayer(doc) {
  if (!doc?.layers?.length) return null;
  return doc.layers.find((l) => l.id === doc.activeLayerId) || doc.layers[0];
}

function addLayer(doc, opts = {}) {
  const layer = createLayer(opts);
  doc.layers.push(layer);
  doc.activeLayerId = layer.id;
  touchDocument(doc);
  return layer;
}

function addVectorLayer(doc, opts = {}) {
  const { createVectorLayer } = __require("./Layer");
  const layer = createVectorLayer(opts);
  doc.layers.push(layer);
  doc.activeLayerId = layer.id;
  touchDocument(doc);
  return layer;
}

function removeLayer(doc, layerId) {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return false;
  if (doc.layers.length <= 1) return false;
  doc.layers.splice(idx, 1);
  if (doc.activeLayerId === layerId) {
    doc.activeLayerId = doc.layers[Math.max(0, idx - 1)].id;
  }
  touchDocument(doc);
  return true;
}

function setActiveLayer(doc, layerId) {
  if (!doc.layers.some((l) => l.id === layerId)) return false;
  doc.activeLayerId = layerId;
  touchDocument(doc);
  return true;
}

function moveLayer(doc, layerId, toIndex) {
  const from = doc.layers.findIndex((l) => l.id === layerId);
  if (from < 0) return false;
  const clamped = Math.max(0, Math.min(doc.layers.length - 1, toIndex));
  const [layer] = doc.layers.splice(from, 1);
  doc.layers.splice(clamped, 0, layer);
  touchDocument(doc);
  return true;
}

function touchDocument(doc) {
  if (doc?.meta) doc.meta.modifiedAt = new Date().toISOString();
}

function serializeDocument(doc) {
  return JSON.stringify(doc, null, 2);
}

function parseDocument(json) {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  const { createVectorLayer } = __require("./Layer");
  const { createTimeline } = __require("./Animation");
  return createDocument({
    ...raw,
    timeline: raw.timeline || createTimeline(),
    fxParticles: raw.fxParticles || [],
    layers: (raw.layers || []).map((l) =>
      l.kind === "vector" ? createVectorLayer(l) : createLayer(l)
    )
  });
}


    return {
  createDocument,
  getActiveLayer,
  addLayer,
  addVectorLayer,
  removeLayer,
  setActiveLayer,
  moveLayer,
  touchDocument,
  serializeDocument,
  parseDocument,
  nextDocumentId
};
  })() };
  __modules["./HistoryStack"] = { exports: (function () {
const { MAX_UNDO } = __require("./constants");

function createHistoryStack(maxDepth = MAX_UNDO) {
  const undo = [];
  const redo = [];
  let max = Math.max(1, Number(maxDepth) || MAX_UNDO);

  function execute(command, doc) {
    if (!command || typeof command.apply !== "function") {
      throw new Error("history: command must implement apply()");
    }
    const snapshot = command.apply(doc);
    undo.push({ command, snapshot });
    if (undo.length > max) undo.shift();
    redo.length = 0;
    return doc;
  }

  function undoOnce(doc) {
    const entry = undo.pop();
    if (!entry) return { doc, changed: false };
    if (typeof entry.command.revert === "function") {
      entry.command.revert(doc, entry.snapshot);
    }
    redo.push(entry);
    return { doc, changed: true };
  }

  function redoOnce(doc) {
    const entry = redo.pop();
    if (!entry) return { doc, changed: false };
    const snapshot = entry.command.apply(doc);
    entry.snapshot = snapshot;
    undo.push(entry);
    return { doc, changed: true };
  }

  function canUndo() {
    return undo.length > 0;
  }

  function canRedo() {
    return redo.length > 0;
  }

  function clear() {
    undo.length = 0;
    redo.length = 0;
  }

  return {
    execute,
    undo: undoOnce,
    redo: redoOnce,
    canUndo,
    canRedo,
    clear,
    get depth() {
      return undo.length;
    }
  };
}


    return { createHistoryStack };
  })() };
  __modules["./Viewport"] = { exports: (function () {
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 64;

function createViewport(opts = {}) {
  const state = {
    panX: Number(opts.panX) || 0,
    panY: Number(opts.panY) || 0,
    zoom: clampZoom(opts.zoom, 1),
    width: Math.max(1, Number(opts.width) || 800),
    height: Math.max(1, Number(opts.height) || 600)
  };

  function clampZoom(z, fallback) {
    const n = Number(z);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, n));
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.panX) / state.zoom,
      y: (sy - state.panY) / state.zoom
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: wx * state.zoom + state.panX,
      y: wy * state.zoom + state.panY
    };
  }

  function panBy(dx, dy) {
    state.panX += dx;
    state.panY += dy;
    return state;
  }

  function zoomAt(factor, anchorSx, anchorSy) {
    const before = screenToWorld(anchorSx, anchorSy);
    state.zoom = clampZoom(state.zoom * factor, state.zoom);
    const after = screenToWorld(anchorSx, anchorSy);
    state.panX += (after.x - before.x) * state.zoom;
    state.panY += (after.y - before.y) * state.zoom;
    return state;
  }

  function fitToBounds(bounds, padding = 32) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return state;
    const availW = state.width - padding * 2;
    const availH = state.height - padding * 2;
    const scale = Math.min(availW / bounds.width, availH / bounds.height);
    state.zoom = clampZoom(scale, 1);
    state.panX = (state.width - bounds.width * state.zoom) / 2 - bounds.x * state.zoom;
    state.panY = (state.height - bounds.height * state.zoom) / 2 - bounds.y * state.zoom;
    return state;
  }

  function resize(width, height) {
    state.width = Math.max(1, Number(width) || state.width);
    state.height = Math.max(1, Number(height) || state.height);
    return state;
  }

  function getTransformMatrix() {
    return { panX: state.panX, panY: state.panY, zoom: state.zoom };
  }

  function setState(partial = {}) {
    if (Number.isFinite(partial.panX)) state.panX = partial.panX;
    if (Number.isFinite(partial.panY)) state.panY = partial.panY;
    if (Number.isFinite(partial.zoom)) state.zoom = clampZoom(partial.zoom, state.zoom);
    if (Number.isFinite(partial.width)) state.width = Math.max(1, partial.width);
    if (Number.isFinite(partial.height)) state.height = Math.max(1, partial.height);
    return state;
  }

  return {
    get state() {
      return { ...state };
    },
    screenToWorld,
    worldToScreen,
    panBy,
    zoomAt,
    fitToBounds,
    resize,
    setState,
    getTransformMatrix,
    MIN_ZOOM,
    MAX_ZOOM
  };
}


    return { createViewport, MIN_ZOOM, MAX_ZOOM };
  })() };
  __modules["./pressureCurve"] = { exports: (function () {
const CURVES = {
  linear: (t) => t,
  soft: (t) => Math.pow(t, 0.55),
  hard: (t) => Math.pow(t, 1.65),
  firm: (t) => 0.15 + Math.pow(t, 1.2) * 0.85
};

function normalizePressure(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback != null ? fallback : 1;
  return Math.max(0.01, Math.min(1, n));
}

function applyPressure(raw, curveName) {
  const t = normalizePressure(raw, 1);
  const fn = CURVES[curveName] || CURVES.firm;
  return Math.max(0.01, Math.min(1, fn(t)));
}

function brushRadius(size, pressure, curveName, minFrac) {
  const base = Math.max(1, Number(size) || 8);
  const p = applyPressure(pressure, curveName);
  const frac = minFrac != null ? minFrac : 0.28;
  return base * (frac + p * (1 - frac)) * 0.5;
}

function brushAlpha(opacity, pressure, curveName) {
  const base = Math.max(0, Math.min(1, Number(opacity) || 1));
  const p = applyPressure(pressure, curveName);
  return base * (0.2 + p * 0.8);
}


    return {
  CURVES,
  applyPressure,
  brushRadius,
  brushAlpha,
  normalizePressure
};
  })() };
  __modules["./Selection"] = { exports: (function () {
function normalizeRect(x0, y0, x1, y1) {
  const ax = Number(x0) || 0;
  const ay = Number(y0) || 0;
  const bx = Number(x1) || 0;
  const by = Number(y1) || 0;
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return {
    x,
    y,
    width: Math.max(1, Math.abs(bx - ax)),
    height: Math.max(1, Math.abs(by - ay))
  };
}

function createRectSelection(x, y, width, height) {
  return {
    kind: "rect",
    x: Number(x) || 0,
    y: Number(y) || 0,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1)
  };
}

function createLassoSelection(points) {
  const pts = Array.isArray(points) ? points.filter(Boolean) : [];
  const bounds = boundsFromPoints(pts);
  return {
    kind: "lasso",
    points: pts,
    ...bounds
  };
}

function createMaskSelection(x, y, width, height, maskRows) {
  return {
    kind: "mask",
    x: Number(x) || 0,
    y: Number(y) || 0,
    width: Math.max(1, Number(width) || 1),
    height: Math.max(1, Number(height) || 1),
    maskRows: Array.isArray(maskRows) ? maskRows : []
  };
}

function boundsFromPoints(points) {
  if (!points.length) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function selectionBounds(sel) {
  if (!sel) return null;
  if (sel.kind === "rect" || sel.kind === "mask") {
    return {
      x: sel.x,
      y: sel.y,
      width: sel.width,
      height: sel.height
    };
  }
  if (sel.kind === "lasso") {
    return boundsFromPoints(sel.points || []);
  }
  return null;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function pointInPolygon(x, y, points) {
  const pts = points || [];
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInSelection(x, y, sel) {
  if (!sel) return false;
  if (sel.kind === "rect") {
    return pointInRect(x, y, sel);
  }
  if (sel.kind === "lasso") {
    return pointInPolygon(x, y, sel.points);
  }
  if (sel.kind === "mask") {
    if (!pointInRect(x, y, sel)) return false;
    const lx = Math.floor(x - sel.x);
    const ly = Math.floor(y - sel.y);
    const row = sel.maskRows[ly];
    if (!row) return false;
    return !!row[lx];
  }
  return false;
}

function expandBounds(bounds, pad) {
  const p = Number(pad) || 0;
  return {
    x: bounds.x - p,
    y: bounds.y - p,
    width: bounds.width + p * 2,
    height: bounds.height + p * 2
  };
}


    return {
  normalizeRect,
  createRectSelection,
  createLassoSelection,
  createMaskSelection,
  boundsFromPoints,
  selectionBounds,
  pointInRect,
  pointInPolygon,
  pointInSelection,
  expandBounds
};
  })() };
  __modules["./VectorShape"] = { exports: (function () {
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


    return {
  nextShapeId,
  createRectShape,
  createEllipseShape,
  createPathShape
};
  })() };
  __modules["./svgExport"] = { exports: (function () {
const { escXml } = __require("./../mia-svg-primitives");

function shapeToSvgElement(shape) {
  if (!shape) return "";
  const fill = escXml(shape.fill || "none");
  const stroke = escXml(shape.stroke || "none");
  const sw = Number(shape.strokeWidth) || 0;
  const op = Number(shape.opacity);
  const opacityAttr = Number.isFinite(op) && op < 1 ? ` opacity="${op}"` : "";
  const rot = Number(shape.rotation) || 0;
  const cx = shape.x + (shape.width || 0) / 2;
  const cy = shape.y + (shape.height || 0) / 2;
  const transform =
    rot !== 0 ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";

  if (shape.type === "rect") {
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr}${transform}/>`;
  }
  if (shape.type === "ellipse") {
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    return `<ellipse cx="${shape.x + rx}" cy="${shape.y + ry}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr}${transform}/>`;
  }
  if (shape.type === "path" && shape.d) {
    return `<path d="${escXml(shape.d)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr} transform="translate(${shape.x} ${shape.y})${rot ? ` rotate(${rot})` : ""}"/>`;
  }
  return "";
}

function exportDocumentToSvg(doc, vectorLayers = []) {
  const width = Math.max(1, Number(doc?.width) || 1);
  const height = Math.max(1, Number(doc?.height) || 1);
  const bg = doc?.background ? `<rect width="100%" height="100%" fill="${escXml(doc.background)}"/>` : "";
  const layerGroups = (vectorLayers || [])
    .filter((l) => l.visible !== false)
    .map((layer) => {
      const shapes = (layer.shapes || []).map(shapeToSvgElement).join("\n    ");
      const op = Number(layer.opacity);
      const opacityAttr = Number.isFinite(op) && op < 1 ? ` opacity="${op}"` : "";
      return `  <g id="${escXml(layer.id)}" data-name="${escXml(layer.name || "")}"${opacityAttr}>\n    ${shapes}\n  </g>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `${bg}\n${layerGroups}\n</svg>`
  );
}


    return {
  escXml,
  shapeToSvgElement,
  exportDocumentToSvg
};
  })() };
  __modules["./svgRender"] = { exports: (function () {
const { drawShapeOnCanvas, escXml, createSvgElement, SVG_NS } = __require("./../mia-svg-primitives");


    return {
  SVG_NS,
  escXml,
  createSvgElement,
  drawShapeOnCanvas
};
  })() };
  __modules["./Animation"] = { exports: (function () {
const { ensureMotion } = __require("./Motion");

let timelineSeq = 0;
let frameSeq = 0;

function nextTimelineId() {
  timelineSeq += 1;
  return `timeline_${timelineSeq}_${Date.now().toString(36)}`;
}

function nextFrameId() {
  frameSeq += 1;
  return `frame_${frameSeq}_${Date.now().toString(36)}`;
}

function createFrame(opts = {}) {
  return {
    id: opts.id || nextFrameId(),
    label: opts.label || "Snímek",
    durationMs: Math.max(16, Number(opts.durationMs) || 83),
    /** Per-layer tile snapshot keys — filled by GPU engine */
    layerSnapshots: opts.layerSnapshots || {}
  };
}

function createTimeline(opts = {}) {
  const first = createFrame({ label: "1" });
  const tl = {
    id: opts.id || nextTimelineId(),
    fps: Math.max(1, Math.min(60, Number(opts.fps) || 12)),
    frames: Array.isArray(opts.frames) && opts.frames.length ? opts.frames.slice() : [first],
    activeFrameIndex: 0,
    onionBefore: Math.max(0, Math.min(5, Number(opts.onionBefore) || 1)),
    onionAfter: Math.max(0, Math.min(5, Number(opts.onionAfter) || 1)),
    playing: false,
    motion: opts.motion || null
  };
  ensureMotion(tl);
  return tl;
}

function getActiveFrame(timeline) {
  if (!timeline?.frames?.length) return null;
  const idx = Math.max(0, Math.min(timeline.frames.length - 1, timeline.activeFrameIndex || 0));
  return timeline.frames[idx];
}

function addFrame(timeline, opts = {}) {
  const frame = createFrame({
    label: opts.label || String(timeline.frames.length + 1),
    durationMs: opts.durationMs || Math.round(1000 / (timeline.fps || 12))
  });
  timeline.frames.push(frame);
  timeline.activeFrameIndex = timeline.frames.length - 1;
  return frame;
}

function frameDurationMs(timeline, frame) {
  if (frame?.durationMs) return frame.durationMs;
  return Math.round(1000 / (timeline?.fps || 12));
}

function timelineDurationMs(timeline) {
  if (!timeline?.frames?.length) return 0;
  return timeline.frames.reduce((sum, f) => sum + frameDurationMs(timeline, f), 0);
}

function onionFrameIndices(timeline) {
  const idx = timeline.activeFrameIndex || 0;
  const before = [];
  const after = [];
  for (let i = 1; i <= timeline.onionBefore; i += 1) {
    const j = idx - i;
    if (j >= 0) before.push(j);
  }
  for (let i = 1; i <= timeline.onionAfter; i += 1) {
    const j = idx + i;
    if (j < timeline.frames.length) after.push(j);
  }
  return { before, after, current: idx };
}


    return {
  createTimeline,
  createFrame,
  getActiveFrame,
  addFrame,
  frameDurationMs,
  timelineDurationMs,
  onionFrameIndices,
  nextTimelineId,
  nextFrameId
};
  })() };
  __modules["./timelineClock"] = { exports: (function () {
const { ensureMotion } = __require("./Motion");
const { frameDurationMs, timelineDurationMs } = __require("./Animation");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unifiedDurationMs(timeline) {
  if (!timeline) return 1000;
  const motion = ensureMotion(timeline);
  const frameDur = timelineDurationMs(timeline);
  const motionDur = toNumber(motion?.durationMs, 0);
  return Math.max(1000, frameDur, motionDur);
}

function frameIndexStartMs(timeline, index = 0) {
  if (!timeline?.frames?.length) return 0;
  const idx = clamp(Math.floor(index), 0, timeline.frames.length - 1);
  let acc = 0;
  for (let i = 0; i < idx; i += 1) {
    acc += frameDurationMs(timeline, timeline.frames[i]);
  }
  return acc;
}

function frameIndexEndMs(timeline, index = 0) {
  if (!timeline?.frames?.length) return 0;
  const idx = clamp(Math.floor(index), 0, timeline.frames.length - 1);
  return frameIndexStartMs(timeline, idx) + frameDurationMs(timeline, timeline.frames[idx]);
}

function timeMsToFrameIndex(timeline, timeMs = 0) {
  if (!timeline?.frames?.length) return 0;
  const t = Math.max(0, toNumber(timeMs, 0));
  let acc = 0;
  for (let i = 0; i < timeline.frames.length; i += 1) {
    const dur = frameDurationMs(timeline, timeline.frames[i]);
    if (t < acc + dur) return i;
    acc += dur;
  }
  return timeline.frames.length - 1;
}

function syncPlayheadFromFrame(timeline, mode = "start") {
  const motion = ensureMotion(timeline);
  if (!motion || !timeline?.frames?.length) return { ok: false };
  const idx = timeline.activeFrameIndex || 0;
  let ms = frameIndexStartMs(timeline, idx);
  if (mode === "center") {
    ms += Math.round(frameDurationMs(timeline, timeline.frames[idx]) / 2);
  } else if (mode === "end") {
    ms = frameIndexEndMs(timeline, idx);
  }
  motion.playheadMs = clamp(ms, 0, unifiedDurationMs(timeline));
  motion.durationMs = Math.max(motion.durationMs, motion.playheadMs + 1);
  return { ok: true, playheadMs: motion.playheadMs, frameIndex: idx };
}

function syncFrameFromPlayhead(timeline) {
  const motion = ensureMotion(timeline);
  if (!motion || !timeline?.frames?.length) return { ok: false };
  const idx = timeMsToFrameIndex(timeline, motion.playheadMs);
  timeline.activeFrameIndex = idx;
  return { ok: true, frameIndex: idx, playheadMs: motion.playheadMs };
}

function setUnifiedPlayhead(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false };
  const duration = unifiedDurationMs(timeline);
  motion.playheadMs = clamp(toNumber(timeMs, 0), 0, duration);
  motion.durationMs = Math.max(motion.durationMs, duration);
  const frame = syncFrameFromPlayhead(timeline);
  return { ok: true, playheadMs: motion.playheadMs, frameIndex: frame.frameIndex, durationMs: duration };
}

function exportSampleTimes(timeline, opts = {}) {
  const duration = unifiedDurationMs(timeline);
  const fps = Math.max(1, toNumber(opts.fps || timeline?.fps, 12));
  const stepMs = Math.max(16, toNumber(opts.stepMs, Math.round(1000 / fps)));
  const times = [];
  for (let t = 0; t <= duration; t += stepMs) {
    times.push(t);
  }
  if (times[times.length - 1] !== duration) times.push(duration);
  return times;
}


    return {
  unifiedDurationMs,
  frameIndexStartMs,
  frameIndexEndMs,
  timeMsToFrameIndex,
  syncPlayheadFromFrame,
  syncFrameFromPlayhead,
  setUnifiedPlayhead,
  exportSampleTimes
};
  })() };
  __modules["./boneRig"] = { exports: (function () {
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function computeBoneChainWorld(rig, sampleAngleFn, timeMs = 0) {
  if (!rig?.bones?.length) return [];
  const pivotX = Number(rig.pivotX) || 0;
  const pivotY = Number(rig.pivotY) || 0;
  let x = pivotX;
  let y = pivotY;
  let cumulative = 0;
  const chain = [];

  for (const bone of rig.bones) {
    const local = sampleAngleFn(rig, bone.id, timeMs);
    cumulative += local;
    const rad = degToRad(cumulative);
    const len = Math.max(1, Number(bone.length) || 32);
    const endX = x + Math.cos(rad) * len;
    const endY = y + Math.sin(rad) * len;
    chain.push({
      id: bone.id,
      parentId: bone.parentId,
      x,
      y,
      endX,
      endY,
      localAngle: local,
      worldAngle: cumulative,
      length: len
    });
    x = endX;
    y = endY;
  }
  return chain;
}

function solveTwoBoneIK(rootX, rootY, targetX, targetY, lenA, lenB) {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  let dist = Math.hypot(dx, dy);
  const maxReach = lenA + lenB - 0.001;
  const minReach = Math.abs(lenA - lenB) + 0.001;
  dist = clamp(dist, minReach, maxReach);

  const base = Math.atan2(dy, dx);
  const cosA = (lenA * lenA + dist * dist - lenB * lenB) / (2 * lenA * dist);
  const angleA = Math.acos(clamp(cosA, -1, 1));
  const cosB = (lenA * lenA + lenB * lenB - dist * dist) / (2 * lenA * lenB);
  const elbow = Math.acos(clamp(cosB, -1, 1));

  const rootWorld = base - angleA;
  const midWorld = base + angleA;

  return {
    ok: true,
    rootWorld: radToDeg(rootWorld),
    midLocal: radToDeg(midWorld - rootWorld),
    reachable: Math.hypot(dx, dy) <= maxReach + 0.01,
    targetX,
    targetY,
    dist
  };
}

function solveRigIK(rig, targetX, targetY, timeMs = 0, sampleAngleFn) {
  if (!rig?.bones || rig.bones.length < 2) {
    return { ok: false, error: "need_two_bones" };
  }
  const chain = computeBoneChainWorld(rig, sampleAngleFn, timeMs);
  const root = chain[0];
  if (!root) return { ok: false, error: "no_root" };

  const b0 = rig.bones[0];
  const b1 = rig.bones[1];
  const solved = solveTwoBoneIK(root.x, root.y, targetX, targetY, b0.length, b1.length);

  const angles = {};
  angles[b0.id] = solved.rootWorld - (b0.angle || 0);
  angles[b1.id] = solved.midLocal;
  if (rig.bones[2]) {
    angles[rig.bones[2].id] = 0;
  }

  return {
    ok: true,
    angles,
    solved,
    chain
  };
}

function boneOverlayPaths(chain, docWidth, docHeight) {
  if (!chain?.length) return [];
  const cx = docWidth / 2;
  const cy = docHeight / 2;
  return chain.map((bone) => ({
    id: bone.id,
    x1: cx + bone.x,
    y1: cy + bone.y,
    x2: cx + bone.endX,
    y2: cy + bone.endY,
    jointX: cx + bone.endX,
    jointY: cy + bone.endY
  }));
}


    return {
  computeBoneChainWorld,
  solveTwoBoneIK,
  solveRigIK,
  boneOverlayPaths
};
  })() };
  __modules["./LipSync"] = { exports: (function () {
const VISEME_PRESETS = Object.freeze({
  sil: { mouthOpen: 0, mouthWide: 0, label: "silence" },
  A: { mouthOpen: 0.82, mouthWide: 0.28, label: "A" },
  E: { mouthOpen: 0.48, mouthWide: 0.62, label: "E" },
  I: { mouthOpen: 0.32, mouthWide: 0.72, label: "I" },
  O: { mouthOpen: 0.76, mouthWide: 0.18, label: "O" },
  U: { mouthOpen: 0.42, mouthWide: 0.12, label: "U" },
  M: { mouthOpen: 0.08, mouthWide: 0.22, label: "M" },
  F: { mouthOpen: 0.18, mouthWide: 0.38, label: "F" },
  L: { mouthOpen: 0.36, mouthWide: 0.48, label: "L" },
  W: { mouthOpen: 0.28, mouthWide: 0.55, label: "W" }
});

function ensureLipSync(motion) {
  if (!motion) return null;
  if (!motion.lipSync) {
    motion.lipSync = {
      layerId: null,
      keyframes: []
    };
  }
  return motion.lipSync;
}

function getVisemePreset(id = "sil") {
  const raw = String(id || "sil");
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  return VISEME_PRESETS[upper] || VISEME_PRESETS[lower] || VISEME_PRESETS.sil;
}

function createVisemeKeyframe(timeMs, viseme = "sil", props = {}) {
  const preset = getVisemePreset(viseme);
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    viseme: String(viseme).toUpperCase(),
    mouthOpen: props.mouthOpen ?? preset.mouthOpen,
    mouthWide: props.mouthWide ?? preset.mouthWide,
    jawY: Number(props.jawY) || 0
  };
}

function addVisemeKeyframe(timeline, props = {}) {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const lip = ensureLipSync(motion);
  if (props.layerId) lip.layerId = props.layerId;
  const kf = createVisemeKeyframe(
    props.timeMs ?? motion.playheadMs,
    props.viseme || "A",
    props
  );
  lip.keyframes.push(kf);
  lip.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, keyframe: kf, count: lip.keyframes.length };
}

function sampleVisemeKeyframes(keyframes, timeMs) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return { viseme: "sil", mouthOpen: 0, mouthWide: 0, jawY: 0 };
  }
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (timeMs <= sorted[0].timeMs) return { ...sorted[0] };
  if (timeMs >= sorted[sorted.length - 1].timeMs) return { ...sorted[sorted.length - 1] };

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs || 1;
      const t = (timeMs - a.timeMs) / span;
      return {
        viseme: t < 0.5 ? a.viseme : b.viseme,
        mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * t,
        mouthWide: a.mouthWide + (b.mouthWide - a.mouthWide) * t,
        jawY: (a.jawY || 0) + ((b.jawY || 0) - (a.jawY || 0)) * t
      };
    }
  }
  return { ...sorted[0] };
}

function sampleLipSync(timeline, timeMs) {
  const lip = timeline?.motion?.lipSync;
  if (!lip) return { viseme: "sil", mouthOpen: 0, mouthWide: 0, jawY: 0, layerId: null };
  const sampled = sampleVisemeKeyframes(lip.keyframes, timeMs);
  return { ...sampled, layerId: lip.layerId || null };
}

function visemeToLayerOffset(sample = {}) {
  const open = Number(sample.mouthOpen) || 0;
  const wide = Number(sample.mouthWide) || 0;
  return {
    y: (Number(sample.jawY) || 0) + open * 8,
    scaleY: 1 + open * 0.06,
    scaleX: 1 + wide * 0.04
  };
}

/**
 * Phase 13w — map mouthOpen (0..1) → speak PNG index (closed → open).
 * frameCount typically 4 for masters/speak/01–04.
 */
function visemeToSpeakFrameIndex(sample = {}, frameCount = 4) {
  const n = Math.max(1, Math.floor(Number(frameCount) || 4));
  const open = Math.max(0, Math.min(1, Number(sample.mouthOpen) || 0));
  if (open < 0.12) return 0;
  if (n === 1) return 0;
  const idx = Math.round(open * (n - 1));
  return Math.max(0, Math.min(n - 1, idx));
}

function estimateMsPerCharForLip(text = "", durationMs = 0) {
  const cleaned = String(text || "").replace(/\s/g, "");
  const chars = Math.max(1, cleaned.length || String(text || "").length || 1);
  const dur = Math.max(0, Number(durationMs) || 0);
  if (dur > 0) return Math.max(35, Math.min(160, dur / chars));
  return 70;
}

/**
 * Phase 13w — live TTS lip track for speech overlay / voicePlayback.
 */
function buildLiveLipTrackFromText(text = "", opts = {}) {
  const raw = String(text || "").slice(0, 400);
  const durationMs =
    Math.max(600, Number(opts.durationMs) || estimateMsPerCharForLip(raw, 0) * Math.max(1, raw.replace(/\s/g, "").length));
  const msPerChar =
    opts.msPerChar != null
      ? Math.max(35, Math.min(160, Number(opts.msPerChar) || 70))
      : estimateMsPerCharForLip(raw, durationMs);
  const keyframes = buildVisemeTrackFromText(raw, Number(opts.startMs) || 0, msPerChar);
  // Ensure track ends closed
  const lastT = keyframes.length ? keyframes[keyframes.length - 1].timeMs : 0;
  if (lastT < durationMs) {
    keyframes.push(createVisemeKeyframe(durationMs, "sil"));
  }
  return {
    phase: "13w",
    provider: "text_viseme_v1",
    durationMs,
    msPerChar,
    keyframes,
    textPreview: raw.slice(0, 80)
  };
}

/**
 * Phase 13x — prefer amplitude from TTS audio; fallback text (13w).
 */
function buildLiveLipTrackSmart(opts = {}) {
  const text = String(opts.text || opts.textPreview || "").slice(0, 400);
  const durationHint = Math.max(0, Number(opts.durationMs) || 0);
  let buffer = null;
  if (Buffer.isBuffer(opts.audioBuffer)) buffer = opts.audioBuffer;
  else if (opts.audioPath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(opts.audioPath)) buffer = fs.readFileSync(opts.audioPath);
    } catch (_err) {
      buffer = null;
    }
  } else if (typeof opts.audioBase64 === "string" && opts.audioBase64) {
    buffer = Buffer.from(opts.audioBase64, "base64");
  }

  if (buffer?.length) {
    const amp = buildVisemeTrackFromAudio(buffer, {
      startMs: Number(opts.startMs) || 0,
      stepMs: Number(opts.stepMs) || 40
    });
    if (amp.ok && amp.keyframes?.length) {
      let keyframes = amp.keyframes;
      // Optional: reshape open mouths with text visemes while keeping amp silence gates
      if (opts.blendText === true && text) {
        const textTrack = buildVisemeTrackFromText(
          text,
          Number(opts.startMs) || 0,
          estimateMsPerCharForLip(text, amp.durationMs || durationHint)
        );
        keyframes = gateTextVisemesWithAmplitude(textTrack, amp.keyframes);
      }
      return {
        phase: "13x",
        provider: "audio_amplitude_live_v1",
        durationMs: amp.durationMs || durationHint || 800,
        keyframes,
        textPreview: text.slice(0, 80),
        amplitude: { provider: amp.provider, keyframeCount: amp.keyframes.length }
      };
    }
  }

  if (!text) {
    return {
      phase: "13x",
      provider: "empty",
      ok: false,
      error: "no_text_or_audio",
      keyframes: [createVisemeKeyframe(0, "sil")],
      durationMs: durationHint || 600
    };
  }
  return buildLiveLipTrackFromText(text, {
    durationMs: durationHint,
    startMs: opts.startMs,
    msPerChar: opts.msPerChar
  });
}

function buildVisemeTrackFromText(text = "", startMs = 0, msPerChar = 80) {
  const chars = String(text).toUpperCase().replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, "");
  const map = {
    A: "A",
    Á: "A",
    E: "E",
    É: "E",
    Ě: "E",
    I: "I",
    Í: "I",
    O: "O",
    Ó: "O",
    U: "U",
    Ú: "U",
    Ů: "U",
    M: "M",
    B: "M",
    P: "M",
    F: "F",
    V: "F",
    L: "L",
    W: "W",
    " ": "sil"
  };
  const keyframes = [];
  let t = startMs;
  for (const ch of chars) {
    const viseme = map[ch] || "A";
    keyframes.push(createVisemeKeyframe(t, viseme));
    t += msPerChar;
  }
  if (!keyframes.length) keyframes.push(createVisemeKeyframe(startMs, "sil"));
  return keyframes;
}

/** Minimal WAV PCM extractor (16-bit mono/stereo). */
function extractWavPcm(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let channels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (id === "data") {
      dataOffset = chunkStart;
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }
  if (dataOffset < 0 || bitsPerSample !== 16) return null;
  const sampleCount = Math.floor(dataSize / (bitsPerSample / 8));
  const samples = new Float32Array(Math.floor(sampleCount / channels));
  let si = 0;
  for (let i = 0; i + channels * 2 <= dataSize && si < samples.length; i += channels * 2) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      sum += buffer.readInt16LE(dataOffset + i + c * 2) / 32768;
    }
    samples[si] = sum / channels;
    si += 1;
  }
  return { samples: samples.subarray(0, si), sampleRate };
}

function audioBufferToWavPcm(audioBuffer) {
  const direct = extractWavPcm(audioBuffer);
  if (direct) return direct;
  // ffmpeg decode → temp wav
  try {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const { spawnSync } = require("child_process");
    const { resolveFfmpeg } = require("../mia-graphics-studio/animationEncoder");
    const ffmpeg = resolveFfmpeg();
    if (!ffmpeg) return null;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-lip-"));
    const inPath = path.join(tmp, "in.bin");
    const outPath = path.join(tmp, "out.wav");
    try {
      fs.writeFileSync(inPath, audioBuffer);
      const result = spawnSync(
        ffmpeg,
        ["-y", "-i", inPath, "-ac", "1", "-ar", "16000", "-f", "wav", outPath],
        { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
      );
      if (result.status !== 0 || !fs.existsSync(outPath)) return null;
      return extractWavPcm(fs.readFileSync(outPath));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } catch (_err) {
    return null;
  }
}

function energyToViseme(norm) {
  const n = Math.max(0, Math.min(1, Number(norm) || 0));
  if (n < 0.08) return "sil";
  if (n < 0.18) return "M";
  if (n < 0.35) return "E";
  if (n < 0.55) return "A";
  if (n < 0.75) return "O";
  return "A";
}

/** Build visemes from Float32 mono samples (browser AudioContext or WAV PCM). */
function buildVisemeTrackFromSamples(samples, sampleRate, opts = {}) {
  const startMs = Math.max(0, Number(opts.startMs) || 0);
  const stepMs = Math.max(20, Math.min(200, Number(opts.stepMs) || 50));
  const rate = Math.max(1, Number(sampleRate) || 16000);
  if (!samples?.length) {
    return { ok: false, error: "missing_samples", keyframes: [] };
  }
  const window = Math.max(1, Math.round((rate * stepMs) / 1000));
  const energies = [];
  for (let i = 0; i < samples.length; i += window) {
    let sum = 0;
    const end = Math.min(samples.length, i + window);
    for (let j = i; j < end; j += 1) {
      const v = samples[j];
      sum += v * v;
    }
    energies.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  const peak = Math.max(...energies, 1e-6);
  const keyframes = [];
  let lastViseme = null;
  energies.forEach((e, index) => {
    const viseme = energyToViseme(e / peak);
    const timeMs = startMs + index * stepMs;
    if (viseme === lastViseme && viseme === "sil" && index % 3 !== 0) return;
    if (viseme === lastViseme && index > 0 && index % 2 !== 0) return;
    keyframes.push(createVisemeKeyframe(timeMs, viseme));
    lastViseme = viseme;
  });
  if (!keyframes.length) keyframes.push(createVisemeKeyframe(startMs, "sil"));
  const endMs = startMs + energies.length * stepMs;
  keyframes.push(createVisemeKeyframe(endMs, "sil"));
  return {
    ok: true,
    keyframes,
    provider: "audio_amplitude_v1",
    phase: "13u",
    durationMs: endMs - startMs,
    sampleRate: rate,
    windowCount: energies.length,
    stepMs
  };
}

/**
 * Phase 13u — amplitude envelope → viseme track (no cloud STT).
 * Accepts WAV buffer or any audio ffmpeg can decode.
 */
function buildVisemeTrackFromAudio(audioInput, opts = {}) {
  let buffer = null;
  if (Buffer.isBuffer(audioInput)) buffer = audioInput;
  else if (typeof audioInput === "string") buffer = Buffer.from(audioInput, "base64");
  else if (audioInput?.audioBase64) buffer = Buffer.from(String(audioInput.audioBase64), "base64");
  if (!buffer?.length) {
    return { ok: false, error: "missing_audio", keyframes: [] };
  }

  const pcm = audioBufferToWavPcm(buffer);
  if (!pcm?.samples?.length) {
    return {
      ok: false,
      error: "audio_decode_failed",
      keyframes: [],
      hint: "Použij WAV/MP3 nebo nastav MIA_FFMPEG_PATH"
    };
  }
  return buildVisemeTrackFromSamples(pcm.samples, pcm.sampleRate, opts);
}

function buildWhisperMultipart(audioBuffer, ext, language) {
  const boundary = `----miawhisper${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const filename = `speech.${ext}`;
  const parts = [];
  const pushField = (name, value) => {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        "utf8"
      )
    );
  };
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      "utf8"
    )
  );
  parts.push(audioBuffer);
  parts.push(Buffer.from("\r\n", "utf8"));
  pushField("model", "whisper-1");
  pushField("language", language);
  pushField("response_format", "verbose_json");
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

/**
 * Phase 13v — OpenAI Whisper transcription (optional; needs API key).
 */
async function transcribeAudioWhisper(audioBuffer, opts = {}) {
  const env = opts.env || process.env;
  const key = env.MIA_LLM_API_KEY || env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_api_key" };
  if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    return { ok: false, error: "missing_audio" };
  }
  const ext = String(opts.audioExt || "wav")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8) || "wav";
  const language = opts.language || opts.lang || "cs";

  try {
    const axios = require("axios");
    const multipart = buildWhisperMultipart(audioBuffer, ext, language);
    const resp = await axios.post("https://api.openai.com/v1/audio/transcriptions", multipart.body, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": multipart.contentType
      },
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    return {
      ok: true,
      text: String(resp.data?.text || "").trim(),
      language: resp.data?.language || language,
      duration: resp.data?.duration || null,
      provider: "openai_whisper"
    };
  } catch (err) {
    const detail =
      err?.response?.data?.error?.message ||
      err?.response?.data ||
      err?.message ||
      err;
    return {
      ok: false,
      error: "whisper_failed",
      detail: String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 200)
    };
  }
}

function gateTextVisemesWithAmplitude(textKeyframes, ampKeyframes) {
  if (!Array.isArray(textKeyframes) || !Array.isArray(ampKeyframes) || !ampKeyframes.length) {
    return textKeyframes;
  }
  const ampAt = (ms) => {
    let best = ampKeyframes[0];
    let bestDist = Infinity;
    for (const kf of ampKeyframes) {
      const d = Math.abs((kf.timeMs || 0) - ms);
      if (d < bestDist) {
        bestDist = d;
        best = kf;
      }
    }
    return best;
  };
  return textKeyframes.map((kf) => {
    const amp = ampAt(kf.timeMs || 0);
    const ampVis = String(amp?.viseme || "SIL").toUpperCase();
    if (ampVis === "SIL" || ampVis === "M") {
      return createVisemeKeyframe(kf.timeMs, ampVis === "M" ? "M" : "sil", {
        mouthOpen: amp.mouthOpen,
        mouthWide: amp.mouthWide
      });
    }
    return kf;
  });
}

/**
 * Phase 13v — Whisper STT → text visemes, fallback amplitude (13u).
 */
async function buildVisemeTrackFromAudioSmart(audioInput, opts = {}) {
  const startMs = Math.max(0, Number(opts.startMs) || 0);
  let buffer = null;
  if (Buffer.isBuffer(audioInput)) buffer = audioInput;
  else if (typeof audioInput === "string") buffer = Buffer.from(audioInput, "base64");
  else if (audioInput?.audioBase64) buffer = Buffer.from(String(audioInput.audioBase64), "base64");

  const amp = buildVisemeTrackFromAudio(buffer || audioInput, opts);
  if (opts.useStt === false) {
    return { ...amp, phase: amp.ok ? "13u" : amp.phase };
  }

  if (!buffer?.length) return amp;

  const stt = await transcribeAudioWhisper(buffer, {
    env: opts.env,
    audioExt: opts.audioExt,
    language: opts.language || opts.lang || "cs"
  });
  if (!stt.ok || !stt.text) {
    return {
      ...amp,
      stt,
      provider: amp.provider || "audio_amplitude_v1",
      phase: amp.ok ? "13u" : amp.phase
    };
  }

  const durationMs =
    (stt.duration != null ? Number(stt.duration) * 1000 : null) ||
    amp.durationMs ||
    Math.max(800, stt.text.length * 70);
  const msPerChar = Math.max(35, Math.min(140, durationMs / Math.max(1, stt.text.replace(/\s/g, "").length || stt.text.length)));
  let keyframes = buildVisemeTrackFromText(stt.text, startMs, msPerChar);
  if (opts.gateWithAmplitude !== false && amp.ok && amp.keyframes?.length) {
    keyframes = gateTextVisemesWithAmplitude(keyframes, amp.keyframes);
  }

  return {
    ok: true,
    keyframes,
    provider: "whisper_viseme_v1",
    phase: "13v",
    transcript: stt.text,
    language: stt.language,
    durationMs,
    msPerChar,
    stt,
    amplitude: amp.ok ? { provider: amp.provider, keyframeCount: amp.keyframes.length } : null
  };
}

function applyVisemeTrack(timeline, keyframes = [], layerId = null) {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const lip = ensureLipSync(motion);
  if (layerId) lip.layerId = layerId;
  lip.keyframes = keyframes.slice().sort((a, b) => a.timeMs - b.timeMs);
  const last = lip.keyframes[lip.keyframes.length - 1];
  if (last) motion.durationMs = Math.max(motion.durationMs, last.timeMs + 1);
  return { ok: true, count: lip.keyframes.length };
}

function findVisemeKeyframeIndex(keyframes, timeMs, toleranceMs = 8) {
  if (!Array.isArray(keyframes)) return -1;
  const t = Math.max(0, Number(timeMs) || 0);
  let best = -1;
  let bestDist = Infinity;
  keyframes.forEach((kf, index) => {
    const dist = Math.abs((Number(kf.timeMs) || 0) - t);
    if (dist <= toleranceMs && dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

function deleteVisemeKeyframe(timeline, timeMs) {
  const motion = timeline?.motion;
  const lip = motion?.lipSync;
  if (!lip?.keyframes?.length) return { ok: false, error: "no_lip_track" };
  const idx = findVisemeKeyframeIndex(lip.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = lip.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: lip.keyframes.length };
}

function updateVisemeKeyframe(timeline, timeMs, props = {}) {
  const motion = timeline?.motion;
  const lip = motion?.lipSync;
  if (!lip?.keyframes?.length) return { ok: false, error: "no_lip_track" };
  const idx = findVisemeKeyframeIndex(lip.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const prev = lip.keyframes[idx];
  const preset = props.viseme ? getVisemePreset(props.viseme) : null;
  lip.keyframes[idx] = {
    ...prev,
    ...props,
    timeMs: props.timeMs ?? prev.timeMs,
    viseme: props.viseme ? String(props.viseme).toUpperCase() : prev.viseme,
    mouthOpen: props.mouthOpen ?? preset?.mouthOpen ?? prev.mouthOpen,
    mouthWide: props.mouthWide ?? preset?.mouthWide ?? prev.mouthWide
  };
  lip.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, lip.keyframes[lip.keyframes.length - 1].timeMs + 1);
  return { ok: true, keyframe: lip.keyframes[idx] };
}


    return {
  VISEME_PRESETS,
  ensureLipSync,
  getVisemePreset,
  createVisemeKeyframe,
  addVisemeKeyframe,
  sampleVisemeKeyframes,
  sampleLipSync,
  visemeToLayerOffset,
  visemeToSpeakFrameIndex,
  estimateMsPerCharForLip,
  buildLiveLipTrackFromText,
  buildLiveLipTrackSmart,
  buildVisemeTrackFromText,
  buildVisemeTrackFromAudio,
  buildVisemeTrackFromSamples,
  buildVisemeTrackFromAudioSmart,
  transcribeAudioWhisper,
  applyVisemeTrack,
  findVisemeKeyframeIndex,
  deleteVisemeKeyframe,
  updateVisemeKeyframe
};
  })() };
  __modules["./cameraPresets"] = { exports: (function () {
/**
 * Virtuální záběry (shot presets) pro export / multi-angle Animation Bank.
 * C1–C6 = framing na stejném dokumentu, ne fyzické kamery streamera.
 */

const CAMERA_PRESETS = Object.freeze([
  {
    id: "C1",
    label: "Wide",
    description: "Celá postava + scéna",
    panX: 0,
    panY: 0,
    zoom: 0.85,
    rotation: 0
  },
  {
    id: "C2",
    label: "Medium",
    description: "Pas nahoru",
    panX: 0,
    panY: 24,
    zoom: 1.05,
    rotation: 0
  },
  {
    id: "C3",
    label: "Close",
    description: "Obličej / emoce / lip sync",
    panX: 0,
    panY: 48,
    zoom: 1.35,
    rotation: 0
  },
  {
    id: "C4",
    label: "Detail",
    description: "Ruce / gift zona",
    panX: -32,
    panY: 56,
    zoom: 1.5,
    rotation: -4
  },
  {
    id: "C5",
    label: "Hero",
    description: "Dramatický úhel",
    panX: 16,
    panY: 32,
    zoom: 1.2,
    rotation: 8
  },
  {
    id: "C6",
    label: "Profile",
    description: "Bok / reakce",
    panX: 40,
    panY: 28,
    zoom: 1.15,
    rotation: -12
  }
]);

function listCameraPresets() {
  return CAMERA_PRESETS.map((row) => ({ ...row }));
}

function getCameraPreset(id = "C1") {
  const key = String(id || "C1").toUpperCase();
  return CAMERA_PRESETS.find((row) => row.id === key) || CAMERA_PRESETS[0];
}

function ensureCameraRig(motion) {
  if (!motion) return null;
  if (!motion.cameraRig) {
    motion.cameraRig = {
      activePresetId: "C1",
      presets: listCameraPresets()
    };
  }
  return motion.cameraRig;
}

function setActiveCameraPreset(timeline, presetId = "C1") {
  const motion = timeline?.motion;
  if (!motion) return { ok: false, error: "no_timeline" };
  const preset = getCameraPreset(presetId);
  if (!preset) return { ok: false, error: "unknown_preset" };
  const rig = ensureCameraRig(motion);
  rig.activePresetId = preset.id;
  return { ok: true, presetId: preset.id, preset: { ...preset } };
}

function sampleCameraPreset(motion, presetId) {
  if (!motion?.cameraRig) {
    return { panX: 0, panY: 0, zoom: 1, rotation: 0, presetId: null, label: null };
  }
  const id = presetId || motion.cameraRig.activePresetId || "C1";
  const preset = getCameraPreset(id);
  return {
    panX: preset.panX,
    panY: preset.panY,
    zoom: preset.zoom,
    rotation: preset.rotation,
    presetId: preset.id,
    label: preset.label
  };
}

function mergeCameraWithPreset(baseCamera = {}, presetSample = {}) {
  return {
    panX: (Number(baseCamera.panX) || 0) + (Number(presetSample.panX) || 0),
    panY: (Number(baseCamera.panY) || 0) + (Number(presetSample.panY) || 0),
    zoom: (Number(baseCamera.zoom) || 1) * (Number(presetSample.zoom) || 1),
    rotation: (Number(baseCamera.rotation) || 0) + (Number(presetSample.rotation) || 0),
    presetId: presetSample.presetId || null
  };
}

const TIER_CAMERA = Object.freeze({
  T0: "C2",
  T1: "C1",
  T2: "C2",
  T3: "C3",
  T4: "C4",
  T5: "C5",
  T6: "C5"
});

const EMOTION_CAMERA = Object.freeze({
  idle: "C2",
  happy: "C2",
  sad: "C3",
  dance: "C1",
  gift: "C4",
  wave: "C2",
  think: "C3",
  duel: "C5",
  combo: "C5"
});

function resolveCameraForContext(opts = {}) {
  if (opts.cameraId) return String(opts.cameraId).toUpperCase();
  const tier = String(opts.tier || "").toUpperCase();
  if (tier && TIER_CAMERA[tier]) return TIER_CAMERA[tier];
  const emotion = String(opts.emotion || opts.mood || "").toLowerCase();
  if (emotion && EMOTION_CAMERA[emotion]) return EMOTION_CAMERA[emotion];
  return "C2";
}

function clipIdForCamera(baseClipId, cameraId = "C1") {
  const base = String(baseClipId || "custom/clip_001")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const cam = String(cameraId || "C1").toLowerCase();
  if (base.toLowerCase().endsWith(`/${cam}`) || base.toLowerCase().endsWith(`_${cam}`)) {
    return base;
  }
  return `${base}/${cam}`;
}


    return {
  CAMERA_PRESETS,
  listCameraPresets,
  getCameraPreset,
  ensureCameraRig,
  setActiveCameraPreset,
  sampleCameraPreset,
  mergeCameraWithPreset,
  TIER_CAMERA,
  EMOTION_CAMERA,
  resolveCameraForContext,
  clipIdForCamera
};
  })() };
  __modules["./Motion"] = { exports: (function () {
const boneRig = __require("./boneRig");
const lipSync = __require("./LipSync");
const cameraPresets = __require("./cameraPresets");

let rigSeq = 0;

function nextRigId() {
  rigSeq += 1;
  return `rig_${rigSeq}_${Date.now().toString(36)}`;
}

const DEFAULT_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1
});

const DEFAULT_CAMERA = Object.freeze({
  panX: 0,
  panY: 0,
  zoom: 1,
  rotation: 0
});

function ensureMotion(timeline) {
  if (!timeline) return null;
  if (!timeline.motion) {
    timeline.motion = {
      durationMs: 2000,
      playheadMs: 0,
      layerTracks: {},
      cameraTrack: { keyframes: [] },
      rigs: []
    };
  }
  return timeline.motion;
}

function normalizeEasing(value) {
  const key = String(value || "linear").toLowerCase().replace(/_/g, "-");
  if (key === "ease" || key === "smooth" || key === "smoothstep") return "ease";
  if (key === "ease-in" || key === "in") return "ease-in";
  if (key === "ease-out" || key === "out") return "ease-out";
  if (key === "ease-in-out" || key === "in-out") return "ease-in-out";
  return "linear";
}

/** Easing curves for motion sampling (13p/13q). */
function easeSample(t, mode) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  const m = normalizeEasing(mode);
  if (m === "ease" || m === "ease-in-out") return x * x * (3 - 2 * x);
  if (m === "ease-in") return x * x;
  if (m === "ease-out") {
    const y = 1 - x;
    return 1 - y * y;
  }
  return x;
}

function createTransformKeyframe(timeMs, props = {}) {
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    x: Number(props.x) || 0,
    y: Number(props.y) || 0,
    scaleX: props.scaleX == null ? 1 : Number(props.scaleX),
    scaleY: props.scaleY == null ? 1 : Number(props.scaleY),
    rotation: Number(props.rotation) || 0,
    opacity: props.opacity == null ? 1 : Number(props.opacity),
    easing: normalizeEasing(props.easing)
  };
}

function createCameraKeyframe(timeMs, props = {}) {
  return {
    timeMs: Math.max(0, Number(timeMs) || 0),
    panX: Number(props.panX) || 0,
    panY: Number(props.panY) || 0,
    zoom: props.zoom == null ? 1 : Number(props.zoom),
    rotation: Number(props.rotation) || 0,
    easing: normalizeEasing(props.easing)
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sampleKeyframes(keyframes, timeMs, defaults = DEFAULT_TRANSFORM) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return { ...defaults };
  }
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  if (timeMs <= sorted[0].timeMs) return { ...defaults, ...sorted[0] };
  if (timeMs >= sorted[sorted.length - 1].timeMs) {
    return { ...defaults, ...sorted[sorted.length - 1] };
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (timeMs >= a.timeMs && timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs || 1;
      const t = (timeMs - a.timeMs) / span;
      const easeMode = normalizeEasing(a.easing || b.easing);
      const te = easeSample(t, easeMode);
      const out = { ...defaults };
      for (const key of Object.keys(defaults)) {
        if (a[key] != null && b[key] != null) {
          out[key] = lerp(Number(a[key]), Number(b[key]), te);
        } else if (a[key] != null) {
          out[key] = a[key];
        }
      }
      for (const key of Object.keys(a)) {
        if (key === "easing" || key === "timeMs") continue;
        if (!(key in defaults) && a[key] != null && b[key] != null && typeof a[key] === "number") {
          out[key] = lerp(Number(a[key]), Number(b[key]), te);
        }
      }
      out.easing = easeMode;
      return out;
    }
  }
  return { ...defaults, ...sorted[0] };
}

function ensureLayerTrack(motion, layerId) {
  if (!motion.layerTracks[layerId]) {
    motion.layerTracks[layerId] = { keyframes: [] };
  }
  return motion.layerTracks[layerId];
}

function addLayerKeyframe(timeline, layerId, props = {}) {
  const motion = ensureMotion(timeline);
  if (!motion || !layerId) return { ok: false, error: "invalid_layer" };
  const track = ensureLayerTrack(motion, layerId);
  const kf = createTransformKeyframe(props.timeMs ?? motion.playheadMs, props);
  track.keyframes.push(kf);
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, layerId, keyframe: kf, count: track.keyframes.length };
}

function addCameraKeyframe(timeline, props = {}) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false, error: "no_timeline" };
  const kf = createCameraKeyframe(props.timeMs ?? motion.playheadMs, props);
  motion.cameraTrack.keyframes.push(kf);
  motion.cameraTrack.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  motion.durationMs = Math.max(motion.durationMs, kf.timeMs + 1);
  return { ok: true, keyframe: kf, count: motion.cameraTrack.keyframes.length };
}

function createBonesRig(timeline, opts = {}) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false, error: "no_timeline" };
  const rig = {
    id: opts.id || nextRigId(),
    layerId: opts.layerId || null,
    pivotX: Number(opts.pivotX) || 0,
    pivotY: Number(opts.pivotY) || 0,
    deformScale: opts.deformScale == null ? 0.45 : Number(opts.deformScale),
    bones: [
      { id: "root", parentId: null, length: Number(opts.rootLength) || 48, angle: 0 },
      { id: "mid", parentId: "root", length: Number(opts.midLength) || 40, angle: 0 },
      { id: "tip", parentId: "mid", length: Number(opts.tipLength) || 32, angle: 0 }
    ],
    boneKeyframes: {},
    ikTarget: null
  };
  motion.rigs.push(rig);
  return { ok: true, rig };
}

function computeBoneChainForRig(rig, timeMs = 0) {
  return boneRig.computeBoneChainWorld(rig, sampleBoneAngle, timeMs);
}

function applyIkToRig(timeline, rigId, targetX, targetY, timeMs) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const t = Math.max(0, Number(timeMs ?? motion.playheadMs) || 0);
  const solved = boneRig.solveRigIK(rig, targetX, targetY, t, sampleBoneAngle);
  if (!solved.ok) return solved;
  for (const [boneId, angle] of Object.entries(solved.angles)) {
    addBoneKeyframe(timeline, rigId, boneId, t, angle);
  }
  rig.ikTarget = { x: Number(targetX) || 0, y: Number(targetY) || 0, timeMs: t };
  motion.durationMs = Math.max(motion.durationMs, t + 1);
  return { ok: true, rigId, angles: solved.angles, ikTarget: rig.ikTarget, chain: solved.chain };
}

function addBoneKeyframe(timeline, rigId, boneId, timeMs, angle) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  if (!rig.boneKeyframes[boneId]) rig.boneKeyframes[boneId] = [];
  const kf = { timeMs: Math.max(0, Number(timeMs) || 0), angle: Number(angle) || 0 };
  rig.boneKeyframes[boneId].push(kf);
  rig.boneKeyframes[boneId].sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, rigId, boneId, keyframe: kf };
}

function sampleBoneAngle(rig, boneId, timeMs) {
  const bone = rig.bones.find((b) => b.id === boneId);
  const kfs = (rig.boneKeyframes[boneId] || []).map((k) => ({
    timeMs: k.timeMs,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: k.angle,
    opacity: 1
  }));
  const sampled = sampleKeyframes(kfs, timeMs, { ...DEFAULT_TRANSFORM, rotation: bone?.angle || 0 });
  return sampled.rotation;
}

function computeBoneWorldAngles(rig, timeMs) {
  const world = {};
  for (const bone of rig.bones) {
    const local = sampleBoneAngle(rig, bone.id, timeMs);
    if (bone.parentId && world[bone.parentId] != null) {
      world[bone.id] = world[bone.parentId] + local;
    } else {
      world[bone.id] = local;
    }
  }
  return world;
}

function sampleBoneRig(rig, timeMs) {
  if (!rig) return { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, boneAngles: {} };
  const world = computeBoneWorldAngles(rig, timeMs);
  const chain = boneRig.computeBoneChainWorld(rig, sampleBoneAngle, timeMs);
  const restChain = boneRig.computeBoneChainWorld(
    rig,
    (_r, boneId) => {
      const bone = rig.bones.find((b) => b.id === boneId);
      return Number(bone?.angle) || 0;
    },
    0
  );
  const tip = chain[chain.length - 1];
  const tipRest = restChain[restChain.length - 1];
  const mid = chain[1] || tip;
  // Phase 13u — tip delta from rest pose drives layer transform (lite mesh substitute)
  const deform = Math.max(0, Math.min(1, Number(rig.deformScale ?? 0.45)));
  const dx = tip && tipRest ? (tip.endX - tipRest.endX) * deform : 0;
  const dy = tip && tipRest ? (tip.endY - tipRest.endY) * deform : 0;
  const dRot = tip && tipRest ? (tip.worldAngle - tipRest.worldAngle) * deform : 0;
  const midBend = Math.abs(Number(mid?.localAngle) || 0);
  const tipBend = tip && tipRest ? tip.worldAngle - tipRest.worldAngle : 0;
  // Phase 13v — soft skew mesh substitute (canvas/WebGL affine)
  const skewX = (tipBend * 0.004 + midBend * 0.006) * deform;
  const skewY = midBend * 0.003 * deform;
  return {
    rotation: dRot,
    x: dx,
    y: dy,
    scaleX: 1 + midBend * 0.0015 * deform,
    scaleY: 1 - midBend * 0.001 * deform,
    skewX,
    skewY,
    boneAngles: world,
    chain
  };
}

function listMotionTracks(timeline, documentLayers = []) {
  const motion = ensureMotion(timeline);
  if (!motion) return [];
  const tracks = [];
  for (const layer of documentLayers) {
    const track = motion.layerTracks[layer.id];
    tracks.push({
      kind: "layer",
      id: layer.id,
      label: layer.name || layer.id,
      keyframes: (track?.keyframes || []).map((kf, index) => ({ ...kf, index, trackKind: "layer", trackId: layer.id }))
    });
  }
  tracks.push({
    kind: "camera",
    id: "camera",
    label: "Kamera",
    keyframes: (motion.cameraTrack?.keyframes || []).map((kf, index) => ({
      ...kf,
      index,
      trackKind: "camera",
      trackId: "camera"
    }))
  });
  const lip = motion.lipSync;
  if (lip?.keyframes?.length) {
    tracks.push({
      kind: "lip",
      id: "lip_sync",
      layerId: lip.layerId,
      label: lip.layerId ? `Viseme (${lip.layerId.slice(0, 8)})` : "Viseme",
      keyframes: lip.keyframes.map((kf, index) => ({
        ...kf,
        index,
        trackKind: "lip",
        trackId: "lip_sync"
      }))
    });
  }
  for (const rig of motion.rigs || []) {
    for (const bone of rig.bones) {
      const keyframes = (rig.boneKeyframes[bone.id] || []).map((kf, index) => ({
        ...kf,
        angle: kf.angle,
        index,
        trackKind: "bone",
        trackId: rig.id,
        boneId: bone.id,
        rigLayerId: rig.layerId
      }));
      tracks.push({
        kind: "bone",
        id: `${rig.id}:${bone.id}`,
        rigId: rig.id,
        boneId: bone.id,
        layerId: rig.layerId,
        label: `Bone ${bone.id}`,
        keyframes
      });
    }
  }
  return tracks;
}

function findKeyframeIndex(keyframes, timeMs, toleranceMs = 8) {
  if (!Array.isArray(keyframes)) return -1;
  const t = toNumber(timeMs, 0);
  let best = -1;
  let bestDist = Infinity;
  keyframes.forEach((kf, index) => {
    const dist = Math.abs(toNumber(kf.timeMs, 0) - t);
    if (dist <= toleranceMs && dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function deleteLayerKeyframe(timeline, layerId, timeMs) {
  const motion = ensureMotion(timeline);
  const track = motion?.layerTracks?.[layerId];
  if (!track) return { ok: false, error: "track_not_found" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = track.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: track.keyframes.length };
}

function updateLayerKeyframe(timeline, layerId, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const track = motion?.layerTracks?.[layerId];
  if (!track) return { ok: false, error: "track_not_found" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const next = { ...props };
  if (next.easing != null) next.easing = normalizeEasing(next.easing);
  track.keyframes[idx] = {
    ...track.keyframes[idx],
    ...next,
    timeMs: next.timeMs ?? track.keyframes[idx].timeMs
  };
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: track.keyframes[idx] };
}

function deleteCameraKeyframe(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  const track = motion?.cameraTrack;
  if (!track) return { ok: false, error: "no_camera_track" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = track.keyframes.splice(idx, 1)[0];
  return { ok: true, removed, count: track.keyframes.length };
}

function updateCameraKeyframe(timeline, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const track = motion?.cameraTrack;
  if (!track) return { ok: false, error: "no_camera_track" };
  const idx = findKeyframeIndex(track.keyframes, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  track.keyframes[idx] = { ...track.keyframes[idx], ...props, timeMs: props.timeMs ?? track.keyframes[idx].timeMs };
  track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: track.keyframes[idx] };
}

function deleteBoneKeyframe(timeline, rigId, boneId, timeMs) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const list = rig.boneKeyframes[boneId];
  if (!list) return { ok: false, error: "bone_track_not_found" };
  const idx = findKeyframeIndex(list, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  const removed = list.splice(idx, 1)[0];
  return { ok: true, removed, count: list.length };
}

function updateBoneKeyframe(timeline, rigId, boneId, timeMs, props = {}) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const list = rig.boneKeyframes[boneId];
  if (!list) return { ok: false, error: "bone_track_not_found" };
  const idx = findKeyframeIndex(list, timeMs);
  if (idx < 0) return { ok: false, error: "keyframe_not_found" };
  list[idx] = {
    ...list[idx],
    timeMs: props.timeMs ?? list[idx].timeMs,
    angle: props.angle ?? list[idx].angle
  };
  list.sort((a, b) => a.timeMs - b.timeMs);
  return { ok: true, keyframe: list[idx] };
}

function motionAddBoneKeyframe(timeline, rigId, boneId, props = {}) {
  const motion = ensureMotion(timeline);
  const rig = motion?.rigs?.find((r) => r.id === rigId);
  if (!rig) return { ok: false, error: "rig_not_found" };
  const timeMs = props.timeMs ?? motion.playheadMs ?? 0;
  const angle = props.angle ?? sampleBoneAngle(rig, boneId, timeMs);
  return addBoneKeyframe(timeline, rigId, boneId, timeMs, angle);
}

function sampleMotion(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) {
    return { layers: {}, camera: { ...DEFAULT_CAMERA }, rigs: [] };
  }
  const t = Math.max(0, Number(timeMs) || 0);
  const layers = {};
  for (const [layerId, track] of Object.entries(motion.layerTracks)) {
    layers[layerId] = sampleKeyframes(track.keyframes, t, DEFAULT_TRANSFORM);
  }
  for (const rig of motion.rigs) {
    if (!rig.layerId) continue;
    const bone = sampleBoneRig(rig, t);
    const base = layers[rig.layerId] || { ...DEFAULT_TRANSFORM };
    layers[rig.layerId] = {
      ...base,
      x: base.x + bone.x,
      y: base.y + bone.y,
      rotation: base.rotation + bone.rotation,
      scaleX: (base.scaleX == null ? 1 : base.scaleX) * (bone.scaleX == null ? 1 : bone.scaleX),
      scaleY: (base.scaleY == null ? 1 : base.scaleY) * (bone.scaleY == null ? 1 : bone.scaleY),
      skewX: (base.skewX || 0) + (bone.skewX || 0),
      skewY: (base.skewY || 0) + (bone.skewY || 0)
    };
  }
  const lipSample = lipSync.sampleLipSync(timeline, t);
  if (lipSample.layerId) {
    if (!layers[lipSample.layerId]) {
      layers[lipSample.layerId] = { ...DEFAULT_TRANSFORM };
    }
    const offset = lipSync.visemeToLayerOffset(lipSample);
    const base = layers[lipSample.layerId];
    layers[lipSample.layerId] = {
      ...base,
      y: base.y + offset.y,
      scaleX: base.scaleX * offset.scaleX,
      scaleY: base.scaleY * offset.scaleY
    };
  }
  const baseCamera = sampleKeyframes(motion.cameraTrack.keyframes, t, DEFAULT_CAMERA);
  const presetSample = cameraPresets.sampleCameraPreset(motion);
  const camera = motion.cameraRig
    ? cameraPresets.mergeCameraWithPreset(baseCamera, presetSample)
    : baseCamera;
  return {
    layers,
    camera,
    lipSync: lipSample,
    cameraPresetId: presetSample.presetId,
    playheadMs: t,
    durationMs: motion.durationMs
  };
}

function setPlayhead(timeline, timeMs) {
  const motion = ensureMotion(timeline);
  if (!motion) return { ok: false };
  motion.playheadMs = Math.max(0, Math.min(motion.durationMs, Number(timeMs) || 0));
  return { ok: true, playheadMs: motion.playheadMs };
}


    return {
  DEFAULT_TRANSFORM,
  DEFAULT_CAMERA,
  ensureMotion,
  normalizeEasing,
  easeSample,
  createTransformKeyframe,
  createCameraKeyframe,
  addLayerKeyframe,
  addCameraKeyframe,
  createBonesRig,
  addBoneKeyframe,
  motionAddBoneKeyframe,
  sampleKeyframes,
  sampleBoneAngle,
  computeBoneWorldAngles,
  sampleBoneRig,
  listMotionTracks,
  findKeyframeIndex,
  deleteLayerKeyframe,
  updateLayerKeyframe,
  deleteCameraKeyframe,
  updateCameraKeyframe,
  deleteBoneKeyframe,
  updateBoneKeyframe,
  sampleMotion,
  setPlayhead,
  computeBoneChainForRig,
  applyIkToRig,
  ...lipSync,
  ...cameraPresets
};
  })() };
  __modules["./FxParticles"] = { exports: (function () {
const { resolveBurstConfig, getParticlePreset } = __require("./particlePresets");

let fxSeq = 0;

function nextFxId() {
  fxSeq += 1;
  return `fx_${fxSeq}_${Date.now().toString(36)}`;
}

function ensureFxParticles(doc) {
  if (!doc) return [];
  if (!Array.isArray(doc.fxParticles)) doc.fxParticles = [];
  return doc.fxParticles;
}

function createParticleEmitter(doc, opts = {}) {
  if (!doc) return { ok: false, error: "no_document" };
  const preset = getParticlePreset(opts.preset || opts.presetId || "sparkle_blue");
  const burst = resolveBurstConfig(preset.id, opts);
  const emitter = {
    id: opts.id || nextFxId(),
    preset: preset.id,
    burst: burst.burst,
    burstConfig: burst,
    x: opts.x == null ? Math.round(doc.width / 2) : Number(opts.x),
    y: opts.y == null ? Math.round(doc.height / 2) : Number(opts.y),
    accent: opts.accent || burst.accent || "#4cc9ff",
    durationMs: Math.max(200, Number(opts.durationMs) || 2000),
    loop: !!opts.loop,
    layerId: opts.layerId || null,
    createdAt: Date.now()
  };
  ensureFxParticles(doc).push(emitter);
  return { ok: true, emitter, count: doc.fxParticles.length };
}

function listFxParticles(doc) {
  return ensureFxParticles(doc).slice();
}

function removeFxParticle(doc, fxId) {
  const list = ensureFxParticles(doc);
  const idx = list.findIndex((e) => e.id === fxId);
  if (idx < 0) return { ok: false, error: "fx_not_found" };
  list.splice(idx, 1);
  return { ok: true, removed: fxId };
}


    return {
  ensureFxParticles,
  createParticleEmitter,
  listFxParticles,
  removeFxParticle
};
  })() };
  __modules["./particlePresets"] = { exports: (function () {
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


    return {
  PARTICLE_PRESETS,
  getParticlePreset,
  listParticlePresets,
  resolveBurstConfig
};
  })() };
  __modules["./spriteSheetExport"] = { exports: (function () {
const DEFAULT_SHEET = {
  cols: 4,
  rows: 8,
  frameWidth: 48,
  frameHeight: 48,
  fps: 14
};

function layoutSpriteSheet(frames, sheetSpec = {}) {
  const spec = { ...DEFAULT_SHEET, ...sheetSpec };
  const fw = Math.max(1, Number(spec.frameWidth) || 48);
  const fh = Math.max(1, Number(spec.frameHeight) || 48);
  const count = Math.max(0, frames?.length || 0);
  const cols = Math.max(1, Number(spec.cols) || Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Number(spec.rows) || Math.ceil(count / cols));
  const placements = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    placements.push({
      index: i,
      col,
      row,
      x: col * fw,
      y: row * fh,
      width: fw,
      height: fh
    });
  }
  return {
    spec: { ...spec, cols, rows, frameWidth: fw, frameHeight: fh },
    sheetWidth: cols * fw,
    sheetHeight: rows * fh,
    frameCount: count,
    placements
  };
}

function spriteSheetManifest(layout, meta = {}) {
  const { spec, sheetWidth, sheetHeight, frameCount, placements } = layout;
  return {
    kind: "mia_paint_sprite_sheet",
    version: 1,
    sheetWidth,
    sheetHeight,
    frameCount,
    cols: spec.cols,
    rows: spec.rows,
    frameWidth: spec.frameWidth,
    frameHeight: spec.frameHeight,
    fps: spec.fps,
    frames: placements.map((p) => ({
      index: p.index,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height
    })),
    meta
  };
}


    return {
  DEFAULT_SHEET,
  layoutSpriteSheet,
  spriteSheetManifest
};
  })() };
  __modules["./PluginHost"] = { exports: (function () {
const ALLOWED_HOOKS = new Set([
  "init",
  "destroy",
  "documentChange",
  "toolChange",
  "afterRender",
  "beforeSave"
]);

function createPluginHost(opts = {}) {
  const plugins = new Map();
  const hooks = {};
  for (const h of ALLOWED_HOOKS) hooks[h] = [];

  const host = {
    plugins,
    hooks,
    apiVersion: 1,
    emit(event, payload) {
      const list = hooks[event];
      if (!list?.length) return;
      for (const fn of list.slice()) {
        try {
          fn(payload, host);
        } catch (err) {
          if (typeof opts.onError === "function") opts.onError(err, event);
        }
      }
    },
    on(event, fn) {
      if (!ALLOWED_HOOKS.has(event) || typeof fn !== "function") return false;
      hooks[event].push(fn);
      return true;
    },
    off(event, fn) {
      const list = hooks[event];
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    },
    registerMenuItem(item) {
      if (!item?.id || !item.label) return false;
      host.menuItems.set(item.id, item);
      return true;
    },
    menuItems: new Map(),
    getContext() {
      return opts.getContext ? opts.getContext() : {};
    }
  };

  function validateManifest(manifest) {
    if (!manifest || typeof manifest !== "object") return { ok: false, error: "invalid_manifest" };
    const id = String(manifest.id || "").trim();
    if (!id || !/^[a-z0-9][a-z0-9\-_]{0,63}$/.test(id)) {
      return { ok: false, error: "invalid_plugin_id" };
    }
    if (!manifest.name || !manifest.entry) {
      return { ok: false, error: "missing_name_or_entry" };
    }
    const hookList = Array.isArray(manifest.hooks) ? manifest.hooks : [];
    for (const h of hookList) {
      if (!ALLOWED_HOOKS.has(h)) return { ok: false, error: `disallowed_hook:${h}` };
    }
    return { ok: true, id, manifest: { ...manifest, id } };
  }

  function register(manifest, activate) {
    const check = validateManifest(manifest);
    if (!check.ok) return check;
    if (plugins.has(check.id)) return { ok: false, error: "plugin_already_registered" };
    const record = {
      id: check.id,
      manifest: check.manifest,
      active: true,
      activate: typeof activate === "function" ? activate : null
    };
    plugins.set(check.id, record);
    if (record.activate) {
      try {
        record.activate(host);
      } catch (err) {
        plugins.delete(check.id);
        return { ok: false, error: "activate_failed", detail: String(err.message || err) };
      }
    }
    host.emit("init", { pluginId: check.id, manifest: check.manifest });
    return { ok: true, id: check.id };
  }

  function unregister(pluginId) {
    const id = String(pluginId || "");
    if (!plugins.has(id)) return false;
    host.emit("destroy", { pluginId: id });
    plugins.delete(id);
    return true;
  }

  function listPublic() {
    return [...plugins.values()].map((p) => ({
      id: p.id,
      name: p.manifest.name,
      version: p.manifest.version || "1.0.0",
      hooks: p.manifest.hooks || [],
      permissions: p.manifest.permissions || [],
      active: p.active
    }));
  }

  return {
    host,
    validateManifest,
    register,
    unregister,
    listPublic,
    ALLOWED_HOOKS
  };
}


    return {
  ALLOWED_HOOKS,
  createPluginHost
};
  })() };
  __modules["./commands/PaintStrokeCommand"] = { exports: (function () {
/**
 * Undo/redo příkaz pro tah štětce/gumy — obnoví tile snapshoty.
 * raster: { restoreTileSnapshots(layerId, snapshots) }
 */
function createPaintStrokeCommand(layerId, beforeSnapshots, afterSnapshots, raster) {
  if (!layerId || !raster || typeof raster.restoreTileSnapshots !== "function") {
    throw new Error("PaintStrokeCommand: invalid raster adapter");
  }

  const snap = {
    layerId,
    before: beforeSnapshots,
    after: afterSnapshots
  };

  return {
    kind: "paint_stroke",
    layerId,
    apply(_doc) {
      raster.restoreTileSnapshots(layerId, afterSnapshots);
      return snap;
    },
    revert(_doc, stored) {
      const payload = stored || snap;
      raster.restoreTileSnapshots(payload.layerId, payload.before);
    }
  };
}


    return { createPaintStrokeCommand };
  })() };
  __modules["./commands/TileSnapshotCommand"] = { exports: (function () {
const { createPaintStrokeCommand } = __require("./PaintStrokeCommand");

/** Alias — undo/redo tile snapshotů (move, crop pixels, clear selection). */
function createTileSnapshotCommand(layerId, beforeSnapshots, afterSnapshots, raster) {
  return createPaintStrokeCommand(layerId, beforeSnapshots, afterSnapshots, raster);
}


    return { createTileSnapshotCommand };
  })() };
  __modules["./selectionOps"] = { exports: (function () {
function setDocumentSelection(doc, selection) {
  if (!doc) return false;
  doc.selection = selection || null;
  return true;
}

function clearDocumentSelection(doc) {
  return setDocumentSelection(doc, null);
}

function applyCropDocument(doc, cropRect) {
  const x = Math.max(0, Math.round(Number(cropRect.x) || 0));
  const y = Math.max(0, Math.round(Number(cropRect.y) || 0));
  const width = Math.max(1, Math.round(Number(cropRect.width) || 1));
  const height = Math.max(1, Math.round(Number(cropRect.height) || 1));
  const prev = { width: doc.width, height: doc.height, cropX: x, cropY: y };
  doc.width = width;
  doc.height = height;
  clearDocumentSelection(doc);
  return prev;
}


    return {
  setDocumentSelection,
  clearDocumentSelection,
  applyCropDocument
};
  })() };
  __modules["./index"] = { exports: (function () {
const constants = __require("./constants");
const { createEventBus } = __require("./EventBus");
const layer = __require("./Layer");
const document = __require("./Document");
const { createHistoryStack } = __require("./HistoryStack");
const viewport = __require("./Viewport");
const pressureCurve = __require("./pressureCurve");
const { createPaintStrokeCommand } = __require("./commands/PaintStrokeCommand");
const { createTileSnapshotCommand } = __require("./commands/TileSnapshotCommand");
const selection = __require("./Selection");
const selectionOps = __require("./selectionOps");
const vectorShape = __require("./VectorShape");
const svgExport = __require("./svgExport");
const svgRender = __require("./svgRender");
const animation = __require("./Animation");
const timelineClock = __require("./timelineClock");
const motion = __require("./Motion");
const boneRig = __require("./boneRig");
const cameraPresets = __require("./cameraPresets");
const fxParticles = __require("./FxParticles");
const spriteSheetExport = __require("./spriteSheetExport");
const pluginHost = __require("./PluginHost");


    return {
  ...constants,
  createEventBus,
  ...layer,
  ...document,
  createHistoryStack,
  ...viewport,
  ...pressureCurve,
  ...selection,
  ...selectionOps,
  ...vectorShape,
  ...svgExport,
  ...svgRender,
  ...animation,
  ...timelineClock,
  ...motion,
  ...boneRig,
  ...cameraPresets,
  ...fxParticles,
  ...require("./particlePresets"),
  ...spriteSheetExport,
  ...pluginHost,
  createPaintStrokeCommand,
  createTileSnapshotCommand
};
  })() };
  global.MIA_PAINT_CORE = __require("./index");
})(typeof globalThis !== "undefined" ? globalThis : window);
