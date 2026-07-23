"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const gpu = require("../shared/mia-paint-gpu");
const { createViewport } = require("../shared/mia-paint-core");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.ok(fs.existsSync(path.join(ROOT, "shared", "mia-paint-gpu", "tileMath.js")), "tileMath module");
  assert.ok(fs.existsSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js")), "browser gpu bundle");

  const gpuJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"), "utf8");
  assert.match(gpuJs, /WebGL2Compositor/, "WebGL2 compositor");
  assert.match(gpuJs, /LayerTileRaster/, "sparse tile raster");
  assert.match(gpuJs, /createPaintEngine/, "paint engine factory");
  assert.match(gpuJs, /visibleTileBounds/, "tile culling");
  pass("GPU browser module surface");

  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /gpuCanvas/, "gpu canvas layer");
  assert.match(html, /overlayCanvas/, "overlay canvas");
  assert.match(html, /mia-paint-gpu\.js/, "gpu script loaded");
  assert.match(html, /data-tool="brush"/, "brush tool enabled");
  pass("editor shell GPU layers");

  assert.equal(gpu.tileKey(-1, 2), "-1,2");
  const tc = gpu.worldToTileCoord(600, 1200, 512);
  assert.equal(tc.tx, 1);
  assert.equal(tc.ty, 2);
  assert.ok(tc.localX >= 0 && tc.localX < 512);
  pass("tile coordinate math");

  const vp = createViewport({ width: 800, height: 600, zoom: 1, panX: 0, panY: 0 });
  const bounds = gpu.visibleTileBounds(vp.state, 512, 1);
  assert.ok(bounds.maxTx >= bounds.minTx);
  assert.ok(bounds.maxTy >= bounds.minTy);
  const keys = gpu.iterVisibleTiles(bounds);
  assert.ok(keys.length > 0);
  pass("visible tile culling");

  const segTiles = gpu.tilesForSegment(100, 100, 900, 400, 512);
  assert.ok(segTiles.length >= 2);
  pass("segment tile coverage");

  const store = new gpu.TileStore(512);
  store.mark(0, 0, { hasData: true });
  store.mark(1, 0, { hasData: true });
  assert.equal(store.listWithData().length, 2);
  const inRange = store.keysInRange({ minTx: 0, maxTx: 0, minTy: 0, maxTy: 0 });
  assert.equal(inRange.length, 1);
  pass("TileStore metadata");

  console.log("\n---- MIA PAINT GPU CONTRACT ----");
  console.log("passed");
}

run();
