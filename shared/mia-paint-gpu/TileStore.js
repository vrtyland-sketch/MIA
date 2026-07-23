"use strict";

const { tileKey } = require("./tileMath");

class TileStore {
  constructor(tileSize = 512) {
    this.tileSize = Math.max(1, tileSize);
    this.tiles = new Map();
  }

  has(tx, ty) {
    return this.tiles.has(tileKey(tx, ty));
  }

  get(tx, ty) {
    return this.tiles.get(tileKey(tx, ty)) || null;
  }

  mark(tx, ty, patch = {}) {
    const key = tileKey(tx, ty);
    const prev = this.tiles.get(key) || { tx, ty, dirty: false, hasData: false };
    const next = {
      ...prev,
      tx,
      ty,
      dirty: patch.dirty != null ? patch.dirty : true,
      hasData: patch.hasData != null ? patch.hasData : prev.hasData
    };
    this.tiles.set(key, next);
    return next;
  }

  keysInRange(bounds) {
    const out = [];
    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty += 1) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx += 1) {
        const key = tileKey(tx, ty);
        if (this.tiles.has(key)) out.push(this.tiles.get(key));
      }
    }
    return out;
  }

  listWithData() {
    return [...this.tiles.values()].filter((t) => t.hasData);
  }

  clear() {
    this.tiles.clear();
  }
}

module.exports = { TileStore };
