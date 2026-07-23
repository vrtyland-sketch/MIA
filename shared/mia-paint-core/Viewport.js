"use strict";

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

module.exports = { createViewport, MIN_ZOOM, MAX_ZOOM };
