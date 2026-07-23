"use strict";

/**
 * MIA Paint GPU — WebGL2 compositor + sparse tile raster (browser).
 * WebGPU: detekce + fallback na WebGL2 (Phase 1).
 */
(function (global) {
  "use strict";

  const DEFAULT_TILE_SIZE = 512;

  function tileKey(tx, ty) {
    return `${tx},${ty}`;
  }

  function worldToTileCoord(wx, wy, tileSize) {
    const ts = Math.max(1, tileSize);
    const tx = Math.floor(wx / ts);
    const ty = Math.floor(wy / ts);
    return { tx, ty, localX: wx - tx * ts, localY: wy - ty * ts };
  }

  function tileWorldOrigin(tx, ty, tileSize) {
    const ts = Math.max(1, tileSize);
    return { x: tx * ts, y: ty * ts };
  }

  function applyViewportCamera(viewportState, camera) {
    if (!camera) return viewportState;
    return {
      ...viewportState,
      panX: viewportState.panX + (camera.panX || 0),
      panY: viewportState.panY + (camera.panY || 0),
      zoom: viewportState.zoom * (camera.zoom == null ? 1 : camera.zoom)
    };
  }

  function applyLayerMotionCtx(ctx, viewportState, mt, docW, docH) {
    if (!mt) return;
    const pivotX = docW / 2 + (mt.x || 0);
    const pivotY = docH / 2 + (mt.y || 0);
    const pivot = worldToScreen(viewportState, pivotX, pivotY);
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(((mt.rotation || 0) * Math.PI) / 180);
    // Phase 13v — soft skew (lite mesh)
    if (mt.skewX || mt.skewY) {
      ctx.transform(1, Number(mt.skewY) || 0, Number(mt.skewX) || 0, 1, 0, 0);
    }
    ctx.scale(mt.scaleX == null ? 1 : mt.scaleX, mt.scaleY == null ? 1 : mt.scaleY);
    ctx.translate(-pivot.x, -pivot.y);
  }

  function applyLayerMotionWorldPoint(wx, wy, mt, docW, docH) {
    if (!mt) return { x: wx, y: wy };
    const pivotX = docW / 2 + (mt.x || 0);
    const pivotY = docH / 2 + (mt.y || 0);
    const rad = ((mt.rotation || 0) * Math.PI) / 180;
    const sx = mt.scaleX == null ? 1 : mt.scaleX;
    const sy = mt.scaleY == null ? 1 : mt.scaleY;
    const skewX = Number(mt.skewX) || 0;
    const skewY = Number(mt.skewY) || 0;
    let x = wx - pivotX;
    let y = wy - pivotY;
    // skew then scale then rotate (matches canvas transform order reversed from apply)
    const kx = x + skewX * y;
    const ky = skewY * x + y;
    x = kx * sx;
    y = ky * sy;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return { x: rx + pivotX, y: ry + pivotY };
  }

  function visibleTileBounds(viewportState, tileSize, margin) {
    const ts = Math.max(1, tileSize || DEFAULT_TILE_SIZE);
    const m = margin == null ? 1 : margin;
    const w = viewportState.width || 1;
    const h = viewportState.height || 1;
    const panX = viewportState.panX || 0;
    const panY = viewportState.panY || 0;
    const zoom = viewportState.zoom || 1;
    const toWorld = (sx, sy) => ({ x: (sx - panX) / zoom, y: (sy - panY) / zoom });
    const corners = [toWorld(0, 0), toWorld(w, 0), toWorld(0, h), toWorld(w, h)];
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
    return {
      minTx: Math.floor(minX / ts) - m,
      maxTx: Math.floor(maxX / ts) + m,
      minTy: Math.floor(minY / ts) - m,
      maxTy: Math.floor(maxY / ts) + m,
      tileSize: ts
    };
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(msg || "shader compile failed");
    }
    return sh;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || "program link failed");
    }
    return prog;
  }

  const VS = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
uniform vec2 u_pan;
uniform float u_zoom;
uniform vec2 u_canvasSize;
uniform vec2 u_tileWorld;
uniform float u_tileSize;
out vec2 v_uv;
void main() {
  vec2 world = u_tileWorld + a_pos * u_tileSize;
  vec2 screen = world * u_zoom + u_pan;
  vec2 ndc = (screen / u_canvasSize) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = a_uv;
}`;

  const FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_opacity;
out vec4 outColor;
void main() {
  vec4 c = texture(u_tex, v_uv);
  if (c.a <= 0.001) discard;
  outColor = vec4(c.rgb, c.a * u_opacity);
}`;

  class LayerTileRaster {
    constructor(layerId, tileSize) {
      this.layerId = layerId;
      this.tileSize = tileSize || DEFAULT_TILE_SIZE;
      this.tiles = new Map();
      this.strokeTouched = new Set();
      this.strokeBefore = null;
    }

    beginStrokeCapture() {
      this.strokeTouched = new Set();
      this.strokeBefore = new Map();
    }

    cancelStrokeCapture() {
      this.strokeTouched = new Set();
      this.strokeBefore = null;
    }

    captureTileNow(tx, ty) {
      if (!this.strokeBefore) return;
      const key = tileKey(tx, ty);
      if (this.strokeBefore.has(key)) return;
      const tile = this.tiles.get(key);
      if (!tile || !tile.hasData) {
        this.strokeBefore.set(key, { key, tx, ty, existed: false, data: null });
        return;
      }
      this.strokeBefore.set(key, {
        key,
        tx,
        ty,
        existed: true,
        data: tile.ctx.getImageData(0, 0, this.tileSize, this.tileSize)
      });
    }

    noteTileTouch(tx, ty) {
      this.strokeTouched.add(tileKey(tx, ty));
      this.captureTileNow(tx, ty);
    }

    finishStrokeCapture() {
      if (!this.strokeBefore) return { before: [], after: [] };
      const after = [];
      const before = [];
      for (const key of this.strokeTouched) {
        const prev = this.strokeBefore.get(key) || { key, existed: false, data: null };
        const parts = key.split(",");
        const tx = Number(parts[0]) || 0;
        const ty = Number(parts[1]) || 0;
        before.push(prev);
        after.push(this.captureTileState(tx, ty));
      }
      this.cancelStrokeCapture();
      return { before, after };
    }

    captureTileState(tx, ty) {
      const key = tileKey(tx, ty);
      const tile = this.tiles.get(key);
      if (!tile || !tile.hasData) {
        return { key, tx, ty, existed: false, data: null };
      }
      return {
        key,
        tx,
        ty,
        existed: true,
        data: tile.ctx.getImageData(0, 0, this.tileSize, this.tileSize)
      };
    }

    exportAllTileSnapshots() {
      const out = [];
      for (const tile of this.tiles.values()) {
        if (!tile.hasData) continue;
        out.push(this.captureTileState(tile.tx, tile.ty));
      }
      return out;
    }

    clearAllTiles() {
      for (const key of [...this.tiles.keys()]) {
        const tile = this.tiles.get(key);
        if (tile?.glTexture && this._gl) this._gl.deleteTexture(tile.glTexture);
        this.tiles.delete(key);
      }
    }

    restoreTileSnapshots(snapshots) {
      if (!Array.isArray(snapshots)) return;
      for (const snap of snapshots) {
        this.applySnapshot(snap);
      }
    }

    applySnapshot(snap) {
      if (!snap) return;
      const key = snap.key || tileKey(snap.tx, snap.ty);
      if (!snap.existed || !snap.data) {
        const existing = this.tiles.get(key);
        if (existing?.glTexture && this._gl) {
          this._gl.deleteTexture(existing.glTexture);
        }
        this.tiles.delete(key);
        return;
      }
      const tile = this.ensureTile(snap.tx, snap.ty);
      tile.ctx.putImageData(snap.data, 0, 0);
      tile.dirty = true;
      tile.hasData = !this.isTileEmpty(tile);
      if (!tile.hasData) {
        if (tile.glTexture && this._gl) {
          this._gl.deleteTexture(tile.glTexture);
          tile.glTexture = null;
        }
        this.tiles.delete(key);
      }
    }

    isTileEmpty(tile) {
      const img = tile.ctx.getImageData(0, 0, this.tileSize, this.tileSize);
      const d = img.data;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] > 0) return false;
      }
      return true;
    }

    ensureTile(tx, ty) {
      const key = tileKey(tx, ty);
      let tile = this.tiles.get(key);
      if (tile) return tile;
      const canvas = document.createElement("canvas");
      canvas.width = this.tileSize;
      canvas.height = this.tileSize;
      const ctx = canvas.getContext("2d", { alpha: true });
      ctx.clearRect(0, 0, this.tileSize, this.tileSize);
      tile = { tx, ty, key, canvas, ctx, dirty: true, hasData: false, glTexture: null };
      this.tiles.set(key, tile);
      return tile;
    }

    getTilesInBounds(bounds) {
      const out = [];
      for (let ty = bounds.minTy; ty <= bounds.maxTy; ty += 1) {
        for (let tx = bounds.minTx; tx <= bounds.maxTx; tx += 1) {
          const t = this.tiles.get(tileKey(tx, ty));
          if (t && t.hasData) out.push(t);
        }
      }
      return out;
    }

    dab(x, y, radius, color, alpha, mode) {
      const ts = this.tileSize;
      const r = Math.max(1, radius);
      const minX = x - r;
      const maxX = x + r;
      const minY = y - r;
      const maxY = y + r;
      const minTx = Math.floor(minX / ts);
      const maxTx = Math.floor(maxX / ts);
      const minTy = Math.floor(minY / ts);
      const maxTy = Math.floor(maxY / ts);
      const eraser = mode === "eraser";
      const composite = eraser ? "destination-out" : "source-over";

      for (let ty = minTy; ty <= maxTy; ty += 1) {
        for (let tx = minTx; tx <= maxTx; tx += 1) {
          this.noteTileTouch(tx, ty);
          const tile = this.ensureTile(tx, ty);
          const ox = tx * ts;
          const oy = ty * ts;
          const ctx = tile.ctx;
          ctx.save();
          ctx.globalCompositeOperation = composite;
          ctx.globalAlpha = eraser ? alpha : alpha;
          if (eraser) {
            ctx.fillStyle = "rgba(0,0,0,1)";
          } else {
            ctx.fillStyle = color;
          }
          ctx.beginPath();
          ctx.arc(x - ox, y - oy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          tile.dirty = true;
          if (eraser) {
            tile.hasData = !this.isTileEmpty(tile);
            if (!tile.hasData && tile.glTexture) {
              /* keep tile entry for reuse; hasData false hides it */
            }
          } else {
            tile.hasData = true;
          }
        }
      }
    }

    stroke(x0, y0, x1, y1, radius, color, alpha, mode) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const step = Math.max(1, radius * 0.35);
      const n = Math.max(1, Math.ceil(dist / step));
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        this.dab(
          x0 + (x1 - x0) * t,
          y0 + (y1 - y0) * t,
          radius,
          color,
          alpha,
          mode
        );
      }
    }

    readPixelRGBA(wx, wy) {
      const ts = this.tileSize;
      const tc = worldToTileCoord(wx, wy, ts);
      const tile = this.tiles.get(tileKey(tc.tx, tc.ty));
      if (!tile || !tile.hasData) return { r: 0, g: 0, b: 0, a: 0 };
      const lx = Math.max(0, Math.min(ts - 1, Math.floor(tc.localX)));
      const ly = Math.max(0, Math.min(ts - 1, Math.floor(tc.localY)));
      const d = tile.ctx.getImageData(lx, ly, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] };
    }

    writePixelRGBA(wx, wy, rgba) {
      const ts = this.tileSize;
      const tc = worldToTileCoord(wx, wy, ts);
      const tile = this.ensureTile(tc.tx, tc.ty);
      const lx = Math.max(0, Math.min(ts - 1, Math.floor(tc.localX)));
      const ly = Math.max(0, Math.min(ts - 1, Math.floor(tc.localY)));
      const d = tile.ctx.getImageData(lx, ly, 1, 1);
      d.data[0] = rgba.r;
      d.data[1] = rgba.g;
      d.data[2] = rgba.b;
      d.data[3] = rgba.a;
      tile.ctx.putImageData(d, lx, ly);
      tile.dirty = true;
      tile.hasData = !this.isTileEmpty(tile);
      if (!tile.hasData) {
        if (tile.glTexture && this._gl) this._gl.deleteTexture(tile.glTexture);
        this.tiles.delete(tile.key);
      }
    }

    regionTileRange(rect) {
      const ts = this.tileSize;
      return {
        minTx: Math.floor(rect.x / ts),
        maxTx: Math.floor((rect.x + rect.width) / ts),
        minTy: Math.floor(rect.y / ts),
        maxTy: Math.floor((rect.y + rect.height) / ts)
      };
    }

    captureTilesInRegion(rect) {
      const range = this.regionTileRange(rect);
      const out = [];
      for (let ty = range.minTy; ty <= range.maxTy; ty += 1) {
        for (let tx = range.minTx; tx <= range.maxTx; tx += 1) {
          out.push(this.captureTileState(tx, ty));
        }
      }
      return out;
    }

    captureAllTiles() {
      const out = [];
      for (const tile of this.tiles.values()) {
        out.push(this.captureTileState(tile.tx, tile.ty));
      }
      return out;
    }

    colorMatch(a, b, tolerance) {
      const t = Math.max(0, Number(tolerance) || 0);
      return (
        Math.abs(a.r - b.r) <= t &&
        Math.abs(a.g - b.g) <= t &&
        Math.abs(a.b - b.b) <= t &&
        Math.abs(a.a - b.a) <= t
      );
    }

    floodFillSelection(wx, wy, tolerance, limitW, limitH) {
      const core = global.MIA_PAINT_CORE;
      const seed = this.readPixelRGBA(wx, wy);
      if (seed.a <= 0) return null;
      const maxW = Math.min(4096, limitW || 4096);
      const maxH = Math.min(4096, limitH || 4096);
      const startX = Math.max(0, Math.floor(wx));
      const startY = Math.max(0, Math.floor(wy));
      const visited = new Set();
      const queue = [[startX, startY]];
      let minX = startX;
      let minY = startY;
      let maxX = startX;
      let maxY = startY;
      const selected = [];

      while (queue.length) {
        const [x, y] = queue.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (x < 0 || y < 0 || x - startX > maxW || y - startY > maxH) continue;
        const px = this.readPixelRGBA(x, y);
        if (!this.colorMatch(px, seed, tolerance)) continue;
        visited.add(key);
        selected.push({ x, y });
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        if (selected.length > maxW * maxH) break;
      }
      if (!selected.length) return null;
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const maskRows = Array.from({ length: height }, () => new Uint8Array(width));
      for (const p of selected) {
        maskRows[p.y - minY][p.x - minX] = 1;
      }
      return core.createMaskSelection(minX, minY, width, height, maskRows.map((r) => [...r]));
    }

    floodFillPaint(wx, wy, fillRgba, tolerance, limitW, limitH) {
      const seed = this.readPixelRGBA(wx, wy);
      const fillEmpty = seed.a <= 0;
      const maxW = Math.min(4096, limitW || 4096);
      const maxH = Math.min(4096, limitH || 4096);
      const startX = Math.floor(wx);
      const startY = Math.floor(wy);
      const visited = new Set();
      const queue = [[startX, startY]];
      let filled = 0;

      while (queue.length) {
        const [x, y] = queue.pop();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (x < 0 || y < 0 || Math.abs(x - startX) > maxW || Math.abs(y - startY) > maxH) continue;
        const px = this.readPixelRGBA(x, y);
        const matches = fillEmpty ? px.a <= 0 : this.colorMatch(px, seed, tolerance);
        if (!matches) continue;
        if (!fillEmpty && this.colorMatch(px, fillRgba, 0)) continue;
        visited.add(key);
        const tc = worldToTileCoord(x, y, this.tileSize);
        this.noteTileTouch(tc.tx, tc.ty);
        this.writePixelRGBA(x, y, fillRgba);
        filled += 1;
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        if (filled > maxW * maxH) break;
      }
      return filled > 0;
    }

    forEachPixelInSelection(sel, fn) {
      const core = global.MIA_PAINT_CORE;
      const b = core.selectionBounds(sel);
      if (!b) return;
      const x0 = Math.floor(b.x);
      const y0 = Math.floor(b.y);
      const x1 = Math.ceil(b.x + b.width);
      const y1 = Math.ceil(b.y + b.height);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          if (core.pointInSelection(x, y, sel)) fn(x, y);
        }
      }
    }

    extractSelectionCanvas(sel) {
      const core = global.MIA_PAINT_CORE;
      const b = core.selectionBounds(sel);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(b.width));
      canvas.height = Math.max(1, Math.ceil(b.height));
      const ctx = canvas.getContext("2d");
      const img = ctx.createImageData(canvas.width, canvas.height);
      this.forEachPixelInSelection(sel, (x, y) => {
        const px = this.readPixelRGBA(x, y);
        const i = ((y - Math.floor(b.y)) * canvas.width + (x - Math.floor(b.x))) * 4;
        img.data[i] = px.r;
        img.data[i + 1] = px.g;
        img.data[i + 2] = px.b;
        img.data[i + 3] = px.a;
      });
      ctx.putImageData(img, 0, 0);
      return { canvas, x: b.x, y: b.y, width: canvas.width, height: canvas.height };
    }

    clearSelectionPixels(sel) {
      this.forEachPixelInSelection(sel, (x, y) => {
        this.writePixelRGBA(x, y, { r: 0, g: 0, b: 0, a: 0 });
      });
    }

    blitCanvasAt(canvas, wx, wy) {
      const ctx2d = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx2d.getImageData(0, 0, w, h);
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          const i = (dy * w + dx) * 4;
          const a = img.data[i + 3];
          if (a <= 0) continue;
          this.writePixelRGBA(Math.floor(wx + dx), Math.floor(wy + dy), {
            r: img.data[i],
            g: img.data[i + 1],
            b: img.data[i + 2],
            a
          });
        }
      }
    }

    offsetLayerContent(dx, dy, clipW, clipH) {
      const before = this.captureAllTiles();
      for (const t of this.tiles.values()) {
        if (t.glTexture && this._gl) this._gl.deleteTexture(t.glTexture);
      }
      const ts = this.tileSize;
      const srcEntries = [...this.tiles.entries()];
      this.tiles.clear();
      for (const [, tile] of srcEntries) {
        if (!tile.hasData) continue;
        const img = tile.ctx.getImageData(0, 0, ts, ts);
        const baseX = tile.tx * ts;
        const baseY = tile.ty * ts;
        for (let ly = 0; ly < ts; ly += 1) {
          for (let lx = 0; lx < ts; lx += 1) {
            const i = (ly * ts + lx) * 4;
            const a = img.data[i + 3];
            if (a <= 0) continue;
            const wx = baseX + lx + dx;
            const wy = baseY + ly + dy;
            if (wx < 0 || wy < 0 || wx >= clipW || wy >= clipH) continue;
            this.writePixelRGBA(wx, wy, {
              r: img.data[i],
              g: img.data[i + 1],
              b: img.data[i + 2],
              a
            });
          }
        }
      }
      return { before, after: this.captureAllTiles() };
    }
  }

  class WebGL2Compositor {
    constructor(canvas, gl) {
      this.canvas = canvas;
      this.gl = gl;
      this.program = createProgram(gl, VS, FS);
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0]),
        gl.STATIC_DRAW
      );
      this.aPos = gl.getAttribLocation(this.program, "a_pos");
      this.aUv = gl.getAttribLocation(this.program, "a_uv");
      this.uPan = gl.getUniformLocation(this.program, "u_pan");
      this.uZoom = gl.getUniformLocation(this.program, "u_zoom");
      this.uCanvas = gl.getUniformLocation(this.program, "u_canvasSize");
      this.uTileWorld = gl.getUniformLocation(this.program, "u_tileWorld");
      this.uTileSize = gl.getUniformLocation(this.program, "u_tileSize");
      this.uTex = gl.getUniformLocation(this.program, "u_tex");
      this.uOpacity = gl.getUniformLocation(this.program, "u_opacity");
      this.width = 1;
      this.height = 1;
      this.dpr = 1;
    }

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr || 1;
      const gl = this.gl;
      gl.viewport(0, 0, Math.floor(width * this.dpr), Math.floor(height * this.dpr));
    }

    uploadTile(tile) {
      const gl = this.gl;
      if (!tile.glTexture) {
        tile.glTexture = gl.createTexture();
      }
      gl.bindTexture(gl.TEXTURE_2D, tile.glTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile.canvas);
      tile.dirty = false;
    }

    drawTile(tile, opacity, tileSize) {
      if (tile.dirty || !tile.glTexture) this.uploadTile(tile);
      const gl = this.gl;
      const origin = tileWorldOrigin(tile.tx, tile.ty, tileSize);
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(this.aUv);
      gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(this.uPan, 0, 0);
      gl.uniform1f(this.uZoom, 1);
      gl.uniform2f(this.uCanvas, this.width, this.height);
      gl.uniform2f(this.uTileWorld, origin.x, origin.y);
      gl.uniform1f(this.uTileSize, tileSize);
      gl.uniform1i(this.uTex, 0);
      gl.uniform1f(this.uOpacity, opacity);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tile.glTexture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    render(viewportState, layers, rasters, opts) {
      const gl = this.gl;
      const ts = opts.tileSize || DEFAULT_TILE_SIZE;
      gl.viewport(0, 0, Math.floor(this.width * this.dpr), Math.floor(this.height * this.dpr));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const prog = this.program;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(this.aPos);
      gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(this.aUv);
      gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(this.uPan, viewportState.panX, viewportState.panY);
      gl.uniform1f(this.uZoom, viewportState.zoom);
      gl.uniform2f(this.uCanvas, this.width, this.height);
      gl.uniform1i(this.uTex, 0);

      const bounds = visibleTileBounds(viewportState, ts, 1);

      for (const layer of layers) {
        if (!layer.visible) continue;
        const raster = rasters.get(layer.id);
        if (!raster) continue;
        const tiles = raster.getTilesInBounds(bounds);
        const mt = opts.motionTransforms?.[layer.id];
        const docW = opts.docSize?.width || 1920;
        const docH = opts.docSize?.height || 1080;
        for (const tile of tiles) {
          if (tile.dirty || !tile.glTexture) this.uploadTile(tile);
          let origin = tileWorldOrigin(tile.tx, tile.ty, ts);
          if (mt) origin = applyLayerMotionWorldPoint(origin.x, origin.y, mt, docW, docH);
          gl.uniform2f(this.uTileWorld, origin.x, origin.y);
          gl.uniform1f(this.uTileSize, ts);
          gl.uniform1f(this.uOpacity, layer.opacity * (mt?.opacity == null ? 1 : mt.opacity));
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, tile.glTexture);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }
    }

    destroy() {
      const gl = this.gl;
      if (this.quad) gl.deleteBuffer(this.quad);
      if (this.program) gl.deleteProgram(this.program);
      if (this.whiteTex) gl.deleteTexture(this.whiteTex);
    }
  }

  class Canvas2DCompositor {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.width = 1;
      this.height = 1;
      this.dpr = 1;
    }

    resize(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr || 1;
    }

    render(viewportState, layers, rasters, opts) {
      const ctx = this.ctx;
      const ts = opts.tileSize || DEFAULT_TILE_SIZE;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);
      const bounds = visibleTileBounds(viewportState, ts, 1);

      if (opts.artboard) {
        const tl = worldToScreen(viewportState, opts.artboard.x, opts.artboard.y);
        const br = worldToScreen(
          viewportState,
          opts.artboard.x + opts.artboard.width,
          opts.artboard.y + opts.artboard.height
        );
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      }

      for (const layer of layers) {
        if (!layer.visible) continue;
        const raster = rasters.get(layer.id);
        if (!raster) continue;
        const mt = opts.motionTransforms?.[layer.id];
        const docW = opts.docSize?.width || 1920;
        const docH = opts.docSize?.height || 1080;
        ctx.save();
        ctx.globalAlpha = layer.opacity * (mt?.opacity == null ? 1 : mt.opacity);
        applyLayerMotionCtx(ctx, viewportState, mt, docW, docH);
        for (const tile of raster.getTilesInBounds(bounds)) {
          const origin = tileWorldOrigin(tile.tx, tile.ty, ts);
          const p = worldToScreen(viewportState, origin.x, origin.y);
          const size = ts * viewportState.zoom;
          ctx.drawImage(tile.canvas, p.x, p.y, size, size);
        }
        ctx.restore();
      }
    }

    destroy() {}
  }

  function worldToScreen(viewportState, wx, wy) {
    return {
      x: wx * viewportState.zoom + viewportState.panX,
      y: wy * viewportState.zoom + viewportState.panY
    };
  }

  function brushRadius(size, pressure, curve) {
    const core = global.MIA_PAINT_CORE;
    if (core?.brushRadius) return core.brushRadius(size, pressure, curve);
    const p = Math.max(0.05, Math.min(1, pressure || 1));
    return size * (0.28 + p * 0.72) * 0.5;
  }

  function brushAlpha(opacity, pressure, curve) {
    const core = global.MIA_PAINT_CORE;
    if (core?.brushAlpha) return core.brushAlpha(opacity, pressure, curve);
    const p = Math.max(0.05, Math.min(1, pressure || 1));
    return opacity * (0.2 + p * 0.8);
  }

  class PaintEngine {
    constructor(opts) {
      this.tileSize = opts.tileSize || DEFAULT_TILE_SIZE;
      this.gpuCanvas = opts.gpuCanvas;
      this.overlayCanvas = opts.overlayCanvas;
      this.overlayCtx = this.overlayCanvas.getContext("2d");
      this.backend = "none";
      this.compositor = null;
      this.webgpuAvailable = !!global.navigator?.gpu;
      this.rasters = new Map();
      this.history = null;
      this.doc = null;
      this.stroke = null;
      this.brush = {
        size: 24,
        color: "#1a1a2e",
        opacity: 0.85,
        pressureCurve: "firm"
      };
      this.selection = null;
      this.draftSelection = null;
      this.lassoPoints = null;
      this.floating = null;
      this.cropDraft = null;
      this.wandTolerance = 32;
      this.marqueePhase = 0;
      this.vectorDraft = null;
      this.motionPreviewMs = null;
      this.motionPreviewEnabled = true;
      this.showBoneOverlay = true;
      this.showOnionGhosts = true;
      this._onionCacheKey = "";
      this._onionCache = [];
    }

    async init() {
      if (this.webgpuAvailable) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            /* Phase 2: native WebGPU compositor — zatím WebGL2 */
          }
        } catch (_e) {
          /* fallback */
        }
      }

      const gl = this.gpuCanvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false
      });
      if (gl) {
        this.compositor = new WebGL2Compositor(this.gpuCanvas, gl);
        this.backend = "webgl2";
        this._gl = gl;
      } else {
        this.compositor = new Canvas2DCompositor(this.gpuCanvas);
        this.backend = "canvas2d";
        this._gl = null;
      }
      const core = global.MIA_PAINT_CORE;
      if (core?.createHistoryStack) {
        this.history = core.createHistoryStack();
      }
      return this.getStatus();
    }

    bindDocument(doc) {
      this.doc = doc;
      const ids = new Set(doc.layers.map((l) => l.id));
      for (const id of [...this.rasters.keys()]) {
        if (!ids.has(id)) this.rasters.delete(id);
      }
      for (const layer of doc.layers) {
        if (layer.kind !== "raster") continue;
        if (!this.rasters.has(layer.id)) {
          const raster = new LayerTileRaster(layer.id, this.tileSize);
          raster._gl = this._gl;
          this.rasters.set(layer.id, raster);
        }
      }
    }

    hexToRgba(hex, alpha) {
      const h = String(hex || "#000000").replace("#", "");
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const n = parseInt(full, 16);
      return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
        a: Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      };
    }

    fillAt(layerId, x, y) {
      const raster = this.rasters.get(layerId);
      if (!raster || !this.history || !this.doc) return false;
      raster.beginStrokeCapture();
      const rgba = this.hexToRgba(this.brush.color, this.brush.opacity);
      const ok = raster.floodFillPaint(
        x,
        y,
        rgba,
        this.wandTolerance,
        this.doc.width,
        this.doc.height
      );
      if (!ok) {
        raster.cancelStrokeCapture();
        return false;
      }
      const { before, after } = raster.finishStrokeCapture();
      const core = global.MIA_PAINT_CORE;
      const cmd = core.createTileSnapshotCommand(layerId, before, after, this);
      this.history.execute(cmd, this.doc);
      return true;
    }

    getVectorLayers() {
      return (this.doc?.layers || []).filter((l) => l.kind === "vector");
    }

    exportSvgString() {
      const core = global.MIA_PAINT_CORE;
      if (!core?.exportDocumentToSvg || !this.doc) return "";
      return core.exportDocumentToSvg(this.doc, this.getVectorLayers());
    }

    beginVectorRectDraft(x, y) {
      this.vectorDraft = { _x0: x, _y0: y, x, y, width: 1, height: 1 };
    }

    updateVectorRectDraft(x, y) {
      if (!this.vectorDraft) return;
      const core = global.MIA_PAINT_CORE;
      this.vectorDraft = {
        ...core.normalizeRect(this.vectorDraft._x0, this.vectorDraft._y0, x, y),
        _x0: this.vectorDraft._x0,
        _y0: this.vectorDraft._y0
      };
    }

    commitVectorRectDraft() {
      const core = global.MIA_PAINT_CORE;
      if (!this.vectorDraft || !this.doc) return null;
      let layer = this.doc.layers.find((l) => l.id === this.doc.activeLayerId);
      if (!layer || layer.kind !== "vector") {
        layer = core.addVectorLayer(this.doc, { name: "Vektor" });
      }
      const d = this.vectorDraft;
      const before = (layer.shapes || []).map((s) => ({ ...s }));
      const shape = core.createRectShape(d.x, d.y, d.width, d.height, {
        fill: this.brush.color,
        stroke: "#1a1a2e",
        strokeWidth: 2,
        opacity: this.brush.opacity
      });
      layer.shapes = layer.shapes || [];
      layer.shapes.push(shape);
      const after = layer.shapes.map((s) => ({ ...s }));
      this.vectorDraft = null;
      if (this.history) {
        const layerId = layer.id;
        const cmd = {
          kind: "vector_shapes",
          apply: () => {
            const l = this.doc.layers.find((x) => x.id === layerId);
            if (l) l.shapes = after.map((s) => ({ ...s }));
            return { layerId, before, after };
          },
          revert: (_d, snap) => {
            const l = this.doc.layers.find((x) => x.id === snap.layerId);
            if (l) l.shapes = snap.before.map((s) => ({ ...s }));
          }
        };
        this.history.execute(cmd, this.doc);
      }
      return shape;
    }

    scaleFloating(factor) {
      if (!this.floating) return;
      const f = Math.max(0.25, Math.min(4, (this.floating.scale || 1) * factor));
      this.floating.scale = f;
    }

    drawVectorShapes(ctx, viewportState) {
      const core = global.MIA_PAINT_CORE;
      const drawShape = core?.drawShapeOnCanvas || global.MIA_SVG_PRIMITIVES?.drawShapeOnCanvas;
      if (!this.doc) return;
      for (const layer of this.doc.layers) {
        if (layer.kind !== "vector" || !layer.visible) continue;
        for (const shape of layer.shapes || []) {
          if (drawShape) {
            const tl = worldToScreen(viewportState, shape.x, shape.y);
            drawShape(ctx, { ...shape, x: 0, y: 0 }, {
              offsetX: tl.x,
              offsetY: tl.y,
              scale: viewportState.zoom,
              layerOpacity: layer.opacity
            });
          }
        }
      }
      if (this.vectorDraft) {
        const d = this.vectorDraft;
        const tl = worldToScreen(viewportState, d.x, d.y);
        const w = d.width * viewportState.zoom;
        const h = d.height * viewportState.zoom;
        ctx.strokeStyle = "#7b6cff";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, w, h);
        ctx.setLineDash([]);
      }
    }

    restoreTileSnapshots(layerId, snapshots) {
      const raster = this.rasters.get(layerId);
      if (!raster) return;
      raster.restoreTileSnapshots(snapshots);
    }

    beginStroke(layerId, tool) {
      const raster = this.rasters.get(layerId);
      if (!raster) return false;
      if (this.stroke) this.cancelStroke();
      raster.beginStrokeCapture();
      this.stroke = { layerId, tool: tool === "eraser" ? "eraser" : "brush" };
      return true;
    }

    cancelStroke() {
      if (!this.stroke) return;
      const raster = this.rasters.get(this.stroke.layerId);
      if (raster?.strokeBefore) {
        const before = [];
        for (const key of raster.strokeTouched) {
          const snap = raster.strokeBefore.get(key);
          if (snap) before.push(snap);
        }
        raster.restoreTileSnapshots(before);
        raster.cancelStrokeCapture();
      }
      this.stroke = null;
    }

    endStroke() {
      if (!this.stroke || !this.history || !this.doc) {
        this.stroke = null;
        return false;
      }
      const { layerId, tool } = this.stroke;
      const raster = this.rasters.get(layerId);
      this.stroke = null;
      if (!raster) return false;

      const { before, after } = raster.finishStrokeCapture();
      if (!before.length) return false;

      const core = global.MIA_PAINT_CORE;
      if (!core?.createPaintStrokeCommand) return true;

      const cmd = core.createPaintStrokeCommand(layerId, before, after, this);
      this.history.execute(cmd, this.doc);
      return true;
    }

    undo() {
      if (!this.history || !this.doc) return false;
      const r = this.history.undo(this.doc);
      return r.changed;
    }

    redo() {
      if (!this.history || !this.doc) return false;
      const r = this.history.redo(this.doc);
      return r.changed;
    }

    canUndo() {
      return !!this.history?.canUndo();
    }

    canRedo() {
      return !!this.history?.canRedo();
    }

    paintStroke(layerId, x0, y0, x1, y1, pressure, tool) {
      const raster = this.rasters.get(layerId);
      if (!raster) return false;
      const mode = tool === "eraser" ? "eraser" : "brush";
      const radius = brushRadius(this.brush.size, pressure, this.brush.pressureCurve);
      const alpha = brushAlpha(this.brush.opacity, pressure, this.brush.pressureCurve);
      raster.stroke(x0, y0, x1, y1, radius, this.brush.color, alpha, mode);
      return true;
    }

    paintDab(layerId, x, y, pressure, tool) {
      const raster = this.rasters.get(layerId);
      if (!raster) return false;
      const mode = tool === "eraser" ? "eraser" : "brush";
      const radius = brushRadius(this.brush.size, pressure, this.brush.pressureCurve);
      const alpha = brushAlpha(this.brush.opacity, pressure, this.brush.pressureCurve);
      raster.dab(x, y, radius, this.brush.color, alpha, mode);
      return true;
    }

    resize(width, height, dpr) {
      const pxW = Math.floor(width * dpr);
      const pxH = Math.floor(height * dpr);
      this.gpuCanvas.width = pxW;
      this.gpuCanvas.height = pxH;
      this.gpuCanvas.style.width = `${width}px`;
      this.gpuCanvas.style.height = `${height}px`;
      this.overlayCanvas.width = pxW;
      this.overlayCanvas.height = pxH;
      this.overlayCanvas.style.width = `${width}px`;
      this.overlayCanvas.style.height = `${height}px`;
      this.compositor.resize(width, height, dpr);
    }

    renderOverlay(viewportState, theme) {
      const ctx = this.overlayCtx;
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportState.width, viewportState.height);
      this.drawArtboardFill(ctx, viewportState);
      this.drawOnionGhosts(ctx, viewportState);
      this.drawGrid(ctx, viewportState, theme);
      this.drawVectorShapes(ctx, viewportState);
      this.drawArtboardBorder(ctx, viewportState);
      this.drawSelectionOverlay(ctx, viewportState);
      this.drawBoneOverlay(ctx, viewportState);
    }

    invalidateOnionCache() {
      this._onionCacheKey = "";
      this._onionCache = [];
    }

    /** Phase 13q — semi-transparent neighboring cel frames on overlay. */
    _buildOnionGhostCache() {
      const tl = this.doc?.timeline;
      const core = global.MIA_PAINT_CORE;
      if (!tl?.frames?.length || !core?.onionFrameIndices) return [];
      const before = Number(tl.onionBefore) || 0;
      const after = Number(tl.onionAfter) || 0;
      if (before <= 0 && after <= 0) return [];
      if (tl.frames.length < 2) return [];

      // Preserve live paint on the active cel before hopping frames
      this.captureTimelineFrame();

      const indices = core.onionFrameIndices(tl);
      const saved = tl.activeFrameIndex || 0;
      const ghosts = [];
      const pushGhosts = (list, tint, baseAlpha) => {
        (list || []).forEach((idx, n) => {
          if (idx === saved || idx < 0 || idx >= tl.frames.length) return;
          this.applyTimelineFrame(idx);
          const canvas = this.compositeDocumentToCanvas({
            motionMs: core.frameIndexStartMs?.(tl, idx) ?? 0
          });
          const tinted = document.createElement("canvas");
          tinted.width = canvas.width;
          tinted.height = canvas.height;
          const tctx = tinted.getContext("2d");
          tctx.drawImage(canvas, 0, 0);
          tctx.globalCompositeOperation = "source-atop";
          tctx.fillStyle = tint === "before" ? "rgba(70, 130, 255, 0.45)" : "rgba(255, 130, 70, 0.45)";
          tctx.fillRect(0, 0, tinted.width, tinted.height);
          ghosts.push({
            canvas: tinted,
            alpha: Math.max(0.08, baseAlpha - n * 0.04)
          });
        });
      };
      // farther first so closer ghosts sit on top
      pushGhosts([...(indices.before || [])].reverse(), "before", 0.28);
      pushGhosts([...(indices.after || [])].reverse(), "after", 0.22);
      this.applyTimelineFrame(saved);
      return ghosts;
    }

    drawOnionGhosts(ctx, viewportState) {
      if (!this.showOnionGhosts || !this.doc?.timeline) return;
      const tl = this.doc.timeline;
      const before = Number(tl.onionBefore) || 0;
      const after = Number(tl.onionAfter) || 0;
      if (before <= 0 && after <= 0) return;
      if ((tl.frames || []).length < 2) return;

      const frameIds = (tl.frames || []).map((f) => f.id).join(",");
      const key = `${tl.activeFrameIndex}|${before}|${after}|${frameIds}|${this.doc.width}x${this.doc.height}`;
      if (this._onionCacheKey !== key) {
        this._onionCache = this._buildOnionGhostCache();
        this._onionCacheKey = key;
      }
      if (!this._onionCache.length) return;

      const tlScreen = worldToScreen(viewportState, 0, 0);
      const brScreen = worldToScreen(viewportState, this.doc.width, this.doc.height);
      const dw = brScreen.x - tlScreen.x;
      const dh = brScreen.y - tlScreen.y;

      for (const g of this._onionCache) {
        if (!g.canvas) continue;
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.drawImage(g.canvas, tlScreen.x, tlScreen.y, dw, dh);
        ctx.restore();
      }
    }

    drawBoneOverlay(ctx, viewportState) {
      if (!this.showBoneOverlay || !this.doc?.timeline?.motion?.rigs?.length) return;
      const core = global.MIA_PAINT_CORE;
      if (!core?.computeBoneChainForRig) return;
      const motion = this.doc.timeline.motion;
      const timeMs =
        this.motionPreviewMs != null ? this.motionPreviewMs : motion.playheadMs || 0;
      const cx = this.doc.width / 2;
      const cy = this.doc.height / 2;
      let layerOffsets = {};
      if (core.sampleMotion) {
        layerOffsets = core.sampleMotion(this.doc.timeline, timeMs).layers || {};
      }

      ctx.save();
      for (const rig of motion.rigs) {
        const layerT = rig.layerId ? layerOffsets[rig.layerId] || { x: 0, y: 0 } : { x: 0, y: 0 };
        const chain = core.computeBoneChainForRig(rig, timeMs);
        ctx.strokeStyle = "rgba(255, 107, 53, 0.92)";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        for (const bone of chain) {
          const p1 = worldToScreen(
            viewportState,
            cx + bone.x + layerT.x,
            cy + bone.y + layerT.y
          );
          const p2 = worldToScreen(
            viewportState,
            cx + bone.endX + layerT.x,
            cy + bone.endY + layerT.y
          );
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.fillStyle = "#ffb703";
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (rig.ikTarget) {
          const t = worldToScreen(
            viewportState,
            cx + rig.ikTarget.x + layerT.x,
            cy + rig.ikTarget.y + layerT.y
          );
          ctx.fillStyle = "#06d6a0";
          ctx.strokeStyle = "#118ab2";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    render(viewportState, theme) {
      if (!this.compositor || !this.doc) return;
      this.renderOverlay(viewportState, theme);
      const core = global.MIA_PAINT_CORE;
      let vp = viewportState;
      let motionTransforms = null;
      const motionMs =
        this.motionPreviewMs != null
          ? this.motionPreviewMs
          : this.motionPreviewEnabled
            ? this.doc.timeline?.motion?.playheadMs
            : null;
      if (motionMs != null && core?.sampleMotion && this.doc.timeline) {
        const sample = core.sampleMotion(this.doc.timeline, motionMs);
        vp = applyViewportCamera(viewportState, sample.camera);
        motionTransforms = sample.layers;
      }
      this.compositor.render(vp, this.doc.layers, this.rasters, {
        tileSize: this.tileSize,
        motionTransforms,
        docSize: { width: this.doc.width, height: this.doc.height }
      });
    }

    setMotionPlayhead(timeMs) {
      const core = global.MIA_PAINT_CORE;
      if (!core?.setPlayhead || !this.doc?.timeline) return null;
      core.setPlayhead(this.doc.timeline, timeMs);
      this.motionPreviewMs = this.doc.timeline.motion.playheadMs;
      return core.sampleMotion(this.doc.timeline, this.motionPreviewMs);
    }

    sampleMotionAt(timeMs) {
      const core = global.MIA_PAINT_CORE;
      if (!core?.sampleMotion || !this.doc?.timeline) return null;
      const t = timeMs == null ? this.doc.timeline.motion?.playheadMs || 0 : timeMs;
      return core.sampleMotion(this.doc.timeline, t);
    }

    drawArtboardFill(ctx, viewportState) {
      const tl = worldToScreen(viewportState, 0, 0);
      const br = worldToScreen(viewportState, this.doc.width, this.doc.height);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 14;
      ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.shadowBlur = 0;
    }

    drawGrid(ctx, viewportState, theme) {
      const step = 32 * viewportState.zoom;
      if (step < 8) return;
      const offX = viewportState.panX % step;
      const offY = viewportState.panY % step;
      ctx.strokeStyle = theme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = offX; x < viewportState.width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewportState.height);
      }
      for (let y = offY; y < viewportState.height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(viewportState.width, y);
      }
      ctx.stroke();
    }

    drawArtboardBorder(ctx, viewportState) {
      const tl = worldToScreen(viewportState, 0, 0);
      const br = worldToScreen(viewportState, this.doc.width, this.doc.height);
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 1;
      ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, br.x - tl.x, br.y - tl.y);
    }

    setSelection(sel) {
      const core = global.MIA_PAINT_CORE;
      this.selection = sel;
      if (this.doc && core?.setDocumentSelection) core.setDocumentSelection(this.doc, sel);
      this.floating = null;
    }

    clearSelection() {
      const core = global.MIA_PAINT_CORE;
      this.selection = null;
      this.draftSelection = null;
      this.lassoPoints = null;
      this.floating = null;
      if (this.doc && core?.clearDocumentSelection) core.clearDocumentSelection(this.doc);
    }

    beginRectDraft(x, y) {
      this.draftSelection = { _x0: x, _y0: y, x, y, width: 1, height: 1 };
      this.lassoPoints = null;
    }

    updateRectDraft(x, y) {
      if (!this.draftSelection) return;
      const core = global.MIA_PAINT_CORE;
      const d = core.normalizeRect(this.draftSelection._x0, this.draftSelection._y0, x, y);
      this.draftSelection = { _x0: this.draftSelection._x0, _y0: this.draftSelection._y0, ...d };
    }

    commitRectDraft() {
      const core = global.MIA_PAINT_CORE;
      if (!this.draftSelection) return null;
      const d = this.draftSelection;
      const sel = core.createRectSelection(d.x, d.y, d.width, d.height);
      this.draftSelection = null;
      this.setSelection(sel);
      return sel;
    }

    beginLassoDraft(x, y) {
      this.lassoPoints = [{ x, y }];
      this.draftSelection = null;
    }

    updateLassoDraft(x, y) {
      if (!this.lassoPoints) return;
      const last = this.lassoPoints[this.lassoPoints.length - 1];
      if (Math.hypot(last.x - x, last.y - y) >= 2) {
        this.lassoPoints.push({ x, y });
      }
    }

    commitLassoDraft() {
      const core = global.MIA_PAINT_CORE;
      if (!this.lassoPoints || this.lassoPoints.length < 3) {
        this.lassoPoints = null;
        return null;
      }
      const sel = core.createLassoSelection(this.lassoPoints);
      this.lassoPoints = null;
      this.setSelection(sel);
      return sel;
    }

    wandSelect(layerId, x, y, tolerance) {
      const raster = this.rasters.get(layerId);
      if (!raster) return null;
      const sel = raster.floodFillSelection(
        x,
        y,
        tolerance != null ? tolerance : this.wandTolerance,
        this.doc?.width,
        this.doc?.height
      );
      if (sel) this.setSelection(sel);
      return sel;
    }

    beginCropDraft(x, y) {
      const core = global.MIA_PAINT_CORE;
      this.cropDraft = { ...core.normalizeRect(x, y, x, y), _x0: x, _y0: y };
    }

    updateCropDraft(x, y) {
      if (!this.cropDraft) return;
      const core = global.MIA_PAINT_CORE;
      this.cropDraft = {
        ...core.normalizeRect(this.cropDraft._x0, this.cropDraft._y0, x, y),
        _x0: this.cropDraft._x0,
        _y0: this.cropDraft._y0
      };
    }

    applyCropDraft() {
      const core = global.MIA_PAINT_CORE;
      if (!this.cropDraft || !this.doc || !this.history) return false;
      const crop = { ...this.cropDraft };
      delete crop._x0;
      delete crop._y0;
      const dx = -Math.round(crop.x);
      const dy = -Math.round(crop.y);
      const newW = Math.round(crop.width);
      const newH = Math.round(crop.height);
      const layerSnaps = [];
      for (const layer of this.doc.layers) {
        const raster = this.rasters.get(layer.id);
        if (!raster) continue;
        const before = raster.captureAllTiles();
        raster.offsetLayerContent(dx, dy, newW, newH);
        layerSnaps.push({
          layerId: layer.id,
          before,
          after: raster.captureAllTiles()
        });
      }
      const docBefore = { width: this.doc.width, height: this.doc.height };
      core.applyCropDocument(this.doc, { x: 0, y: 0, width: newW, height: newH });
      const docAfter = { width: this.doc.width, height: this.doc.height };
      const cmd = {
        kind: "crop",
        apply: () => {
          for (const s of layerSnaps) {
            this.restoreTileSnapshots(s.layerId, s.after);
          }
          this.doc.width = docAfter.width;
          this.doc.height = docAfter.height;
          return { layerSnaps, docBefore, docAfter };
        },
        revert: (_d, snap) => {
          for (const s of snap.layerSnaps) {
            this.restoreTileSnapshots(s.layerId, s.before);
          }
          this.doc.width = snap.docBefore.width;
          this.doc.height = snap.docBefore.height;
        }
      };
      this.history.execute(cmd, this.doc);
      this.cropDraft = null;
      this.clearSelection();
      return true;
    }

    beginFloatingMove(layerId) {
      const core = global.MIA_PAINT_CORE;
      if (!this.selection) return false;
      const raster = this.rasters.get(layerId);
      if (!raster) return false;
      const pack = raster.extractSelectionCanvas(this.selection);
      const before = raster.captureTilesInRegion(core.expandBounds(core.selectionBounds(this.selection), 4));
      raster.clearSelectionPixels(this.selection);
      this.floating = {
        layerId,
        ...pack,
        offsetX: 0,
        offsetY: 0,
        beforeTiles: before
      };
      return true;
    }

    updateFloatingOffset(dx, dy) {
      if (!this.floating) return;
      this.floating.offsetX = dx;
      this.floating.offsetY = dy;
    }

    commitFloatingMove() {
      const core = global.MIA_PAINT_CORE;
      if (!this.floating || !this.history || !this.doc) return false;
      const f = this.floating;
      const raster = this.rasters.get(f.layerId);
      if (!raster) return false;
      const destX = f.x + f.offsetX;
      const destY = f.y + f.offsetY;
      const scale = f.scale || 1;
      if (scale !== 1) {
        const scaled = document.createElement("canvas");
        scaled.width = Math.max(1, Math.round(f.width * scale));
        scaled.height = Math.max(1, Math.round(f.height * scale));
        scaled.getContext("2d").drawImage(f.canvas, 0, 0, scaled.width, scaled.height);
        raster.blitCanvasAt(scaled, destX, destY);
      } else {
        raster.blitCanvasAt(f.canvas, destX, destY);
      }
      const after = raster.captureTilesInRegion(
        core.expandBounds(
          {
            x: destX,
            y: destY,
            width: f.width * scale,
            height: f.height * scale
          },
          4
        )
      );
      const mergedBefore = f.beforeTiles;
      const cmd = core.createTileSnapshotCommand(f.layerId, mergedBefore, after, this);
      this.history.execute(cmd, this.doc);
      this.floating = null;
      if (this.selection) {
        const b = core.selectionBounds(this.selection);
        this.setSelection(
          core.createRectSelection(
            destX,
            destY,
            b.width,
            b.height
          )
        );
      }
      return true;
    }

    cancelFloatingMove() {
      if (!this.floating) return;
      this.restoreTileSnapshots(this.floating.layerId, this.floating.beforeTiles);
      this.floating = null;
    }

    deleteSelectionPixels(layerId) {
      const core = global.MIA_PAINT_CORE;
      if (!this.selection || !this.history) return false;
      const raster = this.rasters.get(layerId);
      if (!raster) return false;
      const b = core.selectionBounds(this.selection);
      const before = raster.captureTilesInRegion(core.expandBounds(b, 2));
      raster.clearSelectionPixels(this.selection);
      const after = raster.captureTilesInRegion(core.expandBounds(b, 2));
      const cmd = core.createTileSnapshotCommand(layerId, before, after, this);
      this.history.execute(cmd, this.doc);
      return true;
    }

    drawSelectionOverlay(ctx, viewportState) {
      const core = global.MIA_PAINT_CORE;
      this.marqueePhase = (this.marqueePhase + 1) % 16;
      const dash = [6, 4];
      ctx.setLineDash(dash);
      ctx.lineDashOffset = -this.marqueePhase;

      const drawRect = (rect, stroke, fill) => {
        const tl = worldToScreen(viewportState, rect.x, rect.y);
        const br = worldToScreen(viewportState, rect.x + rect.width, rect.y + rect.height);
        const w = br.x - tl.x;
        const h = br.y - tl.y;
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(tl.x, tl.y, w, h);
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, w, h);
      };

      if (this.floating) {
        const f = this.floating;
        const x = f.x + f.offsetX;
        const y = f.y + f.offsetY;
        const sc = f.scale || 1;
        const tl = worldToScreen(viewportState, x, y);
        const size = f.width * viewportState.zoom * sc;
        const sizeH = f.height * viewportState.zoom * sc;
        ctx.drawImage(f.canvas, tl.x, tl.y, size, sizeH);
        drawRect({ x, y, width: f.width * sc, height: f.height * sc }, "#ffffff", null);
        drawRect({ x, y, width: f.width * sc, height: f.height * sc }, "#000000", null);
      }

      const sel = this.draftSelection || this.selection;
      if (sel && sel.kind === "rect") {
        drawRect(sel, "#ffffff", "rgba(123,108,255,0.08)");
        drawRect(sel, "#000000", null);
      }

      if (this.lassoPoints && this.lassoPoints.length > 1) {
        ctx.beginPath();
        const p0 = this.lassoPoints[0];
        const s0 = worldToScreen(viewportState, p0.x, p0.y);
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < this.lassoPoints.length; i += 1) {
          const s = worldToScreen(viewportState, this.lassoPoints[i].x, this.lassoPoints[i].y);
          ctx.lineTo(s.x, s.y);
        }
        ctx.strokeStyle = "#000000";
        ctx.stroke();
      } else if (sel && sel.kind === "lasso" && sel.points?.length > 1) {
        ctx.beginPath();
        const s0 = worldToScreen(viewportState, sel.points[0].x, sel.points[0].y);
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < sel.points.length; i += 1) {
          const s = worldToScreen(viewportState, sel.points[i].x, sel.points[i].y);
          ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(123,108,255,0.08)";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.stroke();
      }

      if (this.cropDraft) {
        drawRect(this.cropDraft, "#ff8060", "rgba(255,128,96,0.1)");
      }

      ctx.setLineDash([]);
    }

    getRaster(layerId) {
      return this.rasters.get(layerId);
    }

    tileStats() {
      let count = 0;
      let withData = 0;
      for (const raster of this.rasters.values()) {
        count += raster.tiles.size;
        for (const t of raster.tiles.values()) {
          if (t.hasData) withData += 1;
        }
      }
      return { layers: this.rasters.size, tiles: count, painted: withData };
    }

    captureTimelineFrame() {
      const core = global.MIA_PAINT_CORE;
      const tl = this.doc?.timeline;
      const frame = core?.getActiveFrame?.(tl);
      if (!frame) return false;
      const snapshots = {};
      for (const layer of this.doc.layers) {
        if (layer.kind !== "raster") continue;
        const raster = this.rasters.get(layer.id);
        if (!raster) continue;
        snapshots[layer.id] = raster.exportAllTileSnapshots();
      }
      frame.layerSnapshots = snapshots;
      this.invalidateOnionCache();
      return true;
    }

    applyTimelineFrame(index) {
      const core = global.MIA_PAINT_CORE;
      const tl = this.doc?.timeline;
      if (!tl?.frames?.length) return false;
      const idx = Math.max(0, Math.min(tl.frames.length - 1, index));
      const frame = tl.frames[idx];
      tl.activeFrameIndex = idx;
      for (const layer of this.doc.layers) {
        if (layer.kind !== "raster") continue;
        const raster = this.rasters.get(layer.id);
        if (!raster) continue;
        raster.clearAllTiles();
        const snaps = frame.layerSnapshots?.[layer.id] || [];
        raster.restoreTileSnapshots(snaps);
      }
      return true;
    }

    addTimelineFrame() {
      const core = global.MIA_PAINT_CORE;
      if (!this.doc?.timeline || !core?.addFrame) return null;
      this.captureTimelineFrame();
      const frame = core.addFrame(this.doc.timeline);
      this.captureTimelineFrame();
      return frame;
    }

    getSpriteSheetLayout(sheetSpec) {
      const core = global.MIA_PAINT_CORE;
      if (!core?.layoutSpriteSheet || !this.doc?.timeline) return null;
      return core.layoutSpriteSheet(this.doc.timeline.frames, sheetSpec);
    }

    exportSpriteSheetManifest(sheetSpec) {
      const core = global.MIA_PAINT_CORE;
      const layout = this.getSpriteSheetLayout(sheetSpec);
      if (!layout || !core?.spriteSheetManifest) return "";
      return JSON.stringify(
        core.spriteSheetManifest(layout, {
          documentId: this.doc.id,
          documentName: this.doc.name
        }),
        null,
        2
      );
    }

    collectMotionExportCanvases(opts = {}) {
      const tl = this.doc?.timeline;
      const core = global.MIA_PAINT_CORE;
      if (!tl || !core?.exportSampleTimes) return [];
      const savedFrame = tl.activeFrameIndex || 0;
      const savedMs = tl.motion?.playheadMs || 0;
      const savedRig = tl.motion?.cameraRig ? JSON.parse(JSON.stringify(tl.motion.cameraRig)) : null;
      const hadRig = !!tl.motion?.cameraRig;

      if (opts.cameraPresetId && core.setActiveCameraPreset) {
        core.setActiveCameraPreset(tl, opts.cameraPresetId);
      }

      const times = core.exportSampleTimes(tl, opts);
      const out = [];
      for (const t of times) {
        if (core.setUnifiedPlayhead) core.setUnifiedPlayhead(tl, t);
        else core.setPlayhead?.(tl, t);
        const frameIdx = core.timeMsToFrameIndex ? core.timeMsToFrameIndex(tl, t) : tl.activeFrameIndex;
        this.applyTimelineFrame(frameIdx);
        this.motionPreviewMs = t;
        out.push(this.compositeDocumentToCanvas({ motionMs: t }));
      }
      this.applyTimelineFrame(savedFrame);
      core.setPlayhead?.(tl, savedMs);
      this.motionPreviewMs = savedMs;

      if (hadRig && savedRig) {
        tl.motion.cameraRig = savedRig;
      } else if (tl.motion?.cameraRig) {
        delete tl.motion.cameraRig;
      }

      return out;
    }

    collectTimelineExportCanvases() {
      const motionFrames = this.collectMotionExportCanvases();
      if (motionFrames.length) return motionFrames;
      const tl = this.doc?.timeline;
      if (!tl?.frames?.length) return [];
      const saved = tl.activeFrameIndex || 0;
      const out = [];
      for (let i = 0; i < tl.frames.length; i += 1) {
        this.applyTimelineFrame(i);
        out.push(this.compositeDocumentToCanvas());
      }
      this.applyTimelineFrame(saved);
      return out;
    }

    collectTilePayload() {
      const tiles = {};
      if (!this.doc) return tiles;
      for (const layer of this.doc.layers) {
        if (layer.kind !== "raster") continue;
        const raster = this.rasters.get(layer.id);
        if (!raster) continue;
        const list = [];
        for (const tile of raster.tiles.values()) {
          if (!tile.hasData) continue;
          const dataUrl = tile.canvas.toDataURL("image/png");
          const png = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
          if (!png) continue;
          list.push({ tx: tile.tx, ty: tile.ty, png });
        }
        tiles[layer.id] = list;
      }
      return tiles;
    }

    loadTileFromPngBase64(raster, tx, ty, pngBase64) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const tile = raster.ensureTile(tx, ty);
          tile.ctx.clearRect(0, 0, this.tileSize, this.tileSize);
          tile.ctx.drawImage(img, 0, 0);
          tile.hasData = !raster.isTileEmpty(tile);
          tile.dirty = true;
          resolve();
        };
        img.onerror = () => reject(new Error("tile_png_decode_failed"));
        img.src = `data:image/png;base64,${pngBase64}`;
      });
    }

    async applyTilePayload(tilePayload) {
      if (!this.doc || !tilePayload) return false;
      for (const layer of this.doc.layers) {
        if (layer.kind !== "raster") continue;
        const raster = this.rasters.get(layer.id);
        if (!raster) continue;
        raster.clearAllTiles();
        const list = tilePayload[layer.id] || [];
        for (const item of list) {
          if (!item?.png) continue;
          await this.loadTileFromPngBase64(raster, item.tx, item.ty, item.png);
        }
      }
      return true;
    }

    bakeParticlesToCanvas(ctx, canvas, motionMs) {
      const emitters = this.doc?.fxParticles;
      if (!Array.isArray(emitters) || !emitters.length) return;
      const t = Math.max(0, Number(motionMs) || 0);
      for (const em of emitters) {
        const dur = Math.max(200, Number(em.durationMs) || 2000);
        const phase = em.loop ? (t % dur) / dur : Math.min(1, t / dur);
        if (!em.loop && t > dur) continue;
        const count = Math.max(6, Math.min(24, Number(em.burstConfig?.count) || 12));
        for (let i = 0; i < count; i += 1) {
          const seed = (i * 17 + String(em.id).length * 3) % 100;
          const ang = (seed / 100) * Math.PI * 2;
          const dist = phase * (40 + (seed % 50));
          const x = (em.x || canvas.width / 2) + Math.cos(ang) * dist;
          const y = (em.y || canvas.height / 2) + Math.sin(ang) * dist - phase * 20;
          const alpha = Math.max(0, 1 - phase) * 0.55;
          ctx.fillStyle = em.accent || "#4cc9ff";
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(x, y, 2 + (seed % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    compositeDocumentToCanvas(opts = {}) {
      const canvas = document.createElement("canvas");
      if (!this.doc) return canvas;
      canvas.width = this.doc.width;
      canvas.height = this.doc.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (this.doc.background) {
        ctx.fillStyle = this.doc.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const core = global.MIA_PAINT_CORE;
      const drawShape = core?.drawShapeOnCanvas || global.MIA_SVG_PRIMITIVES?.drawShapeOnCanvas;
      const motionMs =
        opts.motionMs != null
          ? opts.motionMs
          : this.motionPreviewMs != null
            ? this.motionPreviewMs
            : this.doc.timeline?.motion?.playheadMs ?? 0;
      const motionSample = core?.sampleMotion ? core.sampleMotion(this.doc.timeline, motionMs) : null;
      const motionLayers = motionSample?.layers || {};
      const camera = motionSample?.camera || null;

      ctx.save();
      if (camera) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.translate(cx + (camera.panX || 0), cy + (camera.panY || 0));
        const zoom = camera.zoom == null ? 1 : camera.zoom;
        ctx.scale(zoom, zoom);
        ctx.rotate(((camera.rotation || 0) * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      for (const layer of this.doc.layers) {
        if (!layer.visible) continue;
        const mt = motionLayers[layer.id];
        if (layer.kind === "raster") {
          const raster = this.rasters.get(layer.id);
          if (!raster) continue;
          ctx.save();
          ctx.globalAlpha = layer.opacity * (mt?.opacity == null ? 1 : mt.opacity);
          const pivotX = canvas.width / 2 + (mt?.x || 0);
          const pivotY = canvas.height / 2 + (mt?.y || 0);
          if (mt) {
            ctx.translate(pivotX, pivotY);
            ctx.rotate(((mt.rotation || 0) * Math.PI) / 180);
            ctx.scale(mt.scaleX == null ? 1 : mt.scaleX, mt.scaleY == null ? 1 : mt.scaleY);
            ctx.translate(-pivotX, -pivotY);
          }
          for (const tile of raster.tiles.values()) {
            if (!tile.hasData) continue;
            ctx.drawImage(tile.canvas, tile.tx * this.tileSize, tile.ty * this.tileSize);
          }
          ctx.restore();
        } else if (layer.kind === "vector" && drawShape) {
          for (const shape of layer.shapes || []) {
            drawShape(ctx, shape, { offsetX: 0, offsetY: 0, scale: 1, layerOpacity: layer.opacity });
          }
        }
      }
      ctx.restore();
      this.bakeParticlesToCanvas(ctx, canvas, motionMs);
      return canvas;
    }

    exportDocumentImageBlob(mime, quality) {
      const canvas = this.compositeDocumentToCanvas();
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mime || "image/png", quality);
      });
    }

    async importImageToLayer(layerId, imageSource, opts = {}) {
      const raster = this.rasters.get(layerId);
      if (!raster || !this.doc) return false;
      const x = Number(opts.x) || 0;
      const y = Number(opts.y) || 0;
      const fit = opts.fit !== false;
      const srcW = imageSource.width;
      const srcH = imageSource.height;
      let drawW = srcW;
      let drawH = srcH;
      if (fit) {
        const scale = Math.min(1, this.doc.width / srcW, this.doc.height / srcH);
        drawW = Math.round(srcW * scale);
        drawH = Math.round(srcH * scale);
      }
      const temp = document.createElement("canvas");
      temp.width = drawW;
      temp.height = drawH;
      const tctx = temp.getContext("2d");
      tctx.drawImage(imageSource, 0, 0, drawW, drawH);
      const ts = this.tileSize;
      const minTx = Math.floor(x / ts);
      const minTy = Math.floor(y / ts);
      const maxTx = Math.floor((x + drawW - 1) / ts);
      const maxTy = Math.floor((y + drawH - 1) / ts);
      for (let ty = minTy; ty <= maxTy; ty += 1) {
        for (let tx = minTx; tx <= maxTx; tx += 1) {
          const tile = raster.ensureTile(tx, ty);
          const ox = tx * ts;
          const oy = ty * ts;
          const sx = Math.max(0, ox - x);
          const sy = Math.max(0, oy - y);
          const dx = Math.max(0, x - ox);
          const dy = Math.max(0, y - oy);
          const sw = Math.min(drawW - sx, ts - dx);
          const sh = Math.min(drawH - sy, ts - dy);
          if (sw <= 0 || sh <= 0) continue;
          tile.ctx.drawImage(temp, sx, sy, sw, sh, dx, dy, sw, sh);
          tile.hasData = !raster.isTileEmpty(tile);
          tile.dirty = true;
        }
      }
      return true;
    }

    getStatus() {
      return {
        backend: this.backend,
        webgpuAvailable: this.webgpuAvailable,
        tileSize: this.tileSize,
        undoDepth: this.history?.depth || 0,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        ...this.tileStats()
      };
    }

    destroy() {
      if (this.compositor) this.compositor.destroy();
    }
  }

  async function createPaintEngine(opts) {
    const engine = new PaintEngine(opts);
    await engine.init();
    return engine;
  }

  global.MIA_PAINT_GPU = {
    DEFAULT_TILE_SIZE,
    tileKey,
    worldToTileCoord,
    visibleTileBounds,
    LayerTileRaster,
    WebGL2Compositor,
    Canvas2DCompositor,
    PaintEngine,
    createPaintEngine
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
