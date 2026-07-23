"use strict";

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

function parseTileKey(key) {
  const parts = String(key).split(",");
  return { tx: Number(parts[0]) || 0, ty: Number(parts[1]) || 0 };
}

function worldToTileCoord(wx, wy, tileSize = 512) {
  const ts = Math.max(1, tileSize);
  const tx = Math.floor(wx / ts);
  const ty = Math.floor(wy / ts);
  return {
    tx,
    ty,
    localX: wx - tx * ts,
    localY: wy - ty * ts
  };
}

function tileWorldOrigin(tx, ty, tileSize = 512) {
  const ts = Math.max(1, tileSize);
  return { x: tx * ts, y: ty * ts };
}

function visibleTileBounds(viewport, tileSize = 512, margin = 1) {
  const ts = Math.max(1, tileSize);
  const state = viewport.state || viewport;
  const w = state.width || 1;
  const h = state.height || 1;
  const panX = state.panX || 0;
  const panY = state.panY || 0;
  const zoom = state.zoom || 1;

  const screenToWorld = (sx, sy) => ({
    x: (sx - panX) / zoom,
    y: (sy - panY) / zoom
  });

  const corners = [
    screenToWorld(0, 0),
    screenToWorld(w, 0),
    screenToWorld(0, h),
    screenToWorld(w, h)
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }

  const minTx = Math.floor(minX / ts) - margin;
  const maxTx = Math.floor(maxX / ts) + margin;
  const minTy = Math.floor(minY / ts) - margin;
  const maxTy = Math.floor(maxY / ts) + margin;

  return { minTx, maxTx, minTy, maxTy, tileSize: ts };
}

function iterVisibleTiles(bounds) {
  const keys = [];
  for (let ty = bounds.minTy; ty <= bounds.maxTy; ty += 1) {
    for (let tx = bounds.minTx; tx <= bounds.maxTx; tx += 1) {
      keys.push({ tx, ty, key: tileKey(tx, ty) });
    }
  }
  return keys;
}

function segmentCrossesTile(x0, y0, x1, y1, tx, ty, tileSize = 512) {
  const ts = Math.max(1, tileSize);
  const left = tx * ts;
  const top = ty * ts;
  const right = left + ts;
  const bottom = top + ts;

  function inside(x, y) {
    return x >= left && x < right && y >= top && y < bottom;
  }
  if (inside(x0, y0) || inside(x1, y1)) return true;

  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (ts * 0.25)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (inside(x, y)) return true;
  }
  return false;
}

function tilesForSegment(x0, y0, x1, y1, tileSize = 512) {
  const start = worldToTileCoord(x0, y0, tileSize);
  const end = worldToTileCoord(x1, y1, tileSize);
  const minTx = Math.min(start.tx, end.tx) - 1;
  const maxTx = Math.max(start.tx, end.tx) + 1;
  const minTy = Math.min(start.ty, end.ty) - 1;
  const maxTy = Math.max(start.ty, end.ty) + 1;
  const out = [];
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (segmentCrossesTile(x0, y0, x1, y1, tx, ty, tileSize)) {
        out.push({ tx, ty, key: tileKey(tx, ty) });
      }
    }
  }
  return out;
}

module.exports = {
  tileKey,
  parseTileKey,
  worldToTileCoord,
  tileWorldOrigin,
  visibleTileBounds,
  iterVisibleTiles,
  tilesForSegment
};
