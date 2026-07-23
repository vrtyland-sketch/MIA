"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  normalizeRect,
  createRectSelection,
  createLassoSelection,
  createMaskSelection,
  selectionBounds,
  pointInRect,
  pointInPolygon,
  pointInSelection,
  expandBounds,
  applyCropDocument,
  createDocument
} = require("../shared/mia-paint-core");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const r = normalizeRect(10, 20, 110, 220);
  assert.equal(r.x, 10);
  assert.equal(r.y, 20);
  assert.equal(r.width, 100);
  assert.equal(r.height, 200);
  pass("normalizeRect");

  const rect = createRectSelection(5, 5, 50, 40);
  assert.ok(pointInSelection(10, 10, rect));
  assert.ok(!pointInSelection(100, 100, rect));
  pass("rect selection hit test");

  const lasso = createLassoSelection([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ]);
  assert.ok(pointInPolygon(50, 50, lasso.points));
  assert.ok(pointInSelection(50, 50, lasso));
  pass("lasso selection");

  const mask = createMaskSelection(0, 0, 3, 3, [
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 0]
  ]);
  assert.ok(pointInSelection(1, 1, mask));
  assert.ok(!pointInSelection(2, 0, mask));
  pass("mask selection");

  const b = selectionBounds(lasso);
  assert.ok(b.width >= 100);
  const ex = expandBounds(b, 4);
  assert.ok(ex.width > b.width);
  pass("selection bounds");

  const doc = createDocument({ width: 800, height: 600 });
  applyCropDocument(doc, { x: 10, y: 20, width: 400, height: 300 });
  assert.equal(doc.width, 400);
  assert.equal(doc.height, 300);
  assert.equal(doc.selection, null);
  pass("crop document dimensions");

  const gpuJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"), "utf8");
  assert.match(gpuJs, /floodFillSelection/, "magic wand fill");
  assert.match(gpuJs, /beginFloatingMove/, "move selection content");
  assert.match(gpuJs, /applyCropDraft/, "crop apply");
  assert.match(gpuJs, /drawSelectionOverlay/, "marching ants overlay");
  pass("GPU selection tools");

  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /select-rect/, "marquee tool");
  assert.match(appJs, /select-wand/, "wand tool");
  assert.match(appJs, /deleteSelection/, "delete selection");
  pass("app selection wiring");

  console.log("\n---- MIA PAINT SELECTION CONTRACT ----");
  console.log("passed");
}

run();
