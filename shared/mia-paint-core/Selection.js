"use strict";

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

module.exports = {
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
