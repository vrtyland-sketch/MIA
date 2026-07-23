"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  createDocument,
  addVectorLayer,
  createRectShape,
  createEllipseShape,
  exportDocumentToSvg,
  shapeToSvgElement
} = require("../shared/mia-paint-core");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const rect = createRectShape(10, 20, 100, 50, { fill: "#ff0000", stroke: "#000", strokeWidth: 2 });
  assert.equal(rect.type, "rect");
  assert.equal(rect.width, 100);
  pass("createRectShape");

  const ellipse = createEllipseShape(0, 0, 80, 40, { fill: "#00ff00" });
  assert.equal(ellipse.type, "ellipse");
  pass("createEllipseShape");

  const svgRect = shapeToSvgElement(rect);
  assert.match(svgRect, /<rect x="10"/);
  assert.match(svgRect, /fill="#ff0000"/);
  pass("shapeToSvgElement rect");

  const doc = createDocument({ width: 640, height: 480 });
  const layer = addVectorLayer(doc, { name: "Shapes" });
  layer.shapes.push(rect, ellipse);
  const svg = exportDocumentToSvg(doc, [layer]);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /width="640"/);
  assert.match(svg, /<ellipse/);
  assert.match(svg, new RegExp(`id="${layer.id}"`));
  pass("exportDocumentToSvg");

  const gpuJs = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),
    "utf8"
  );
  assert.match(gpuJs, /floodFillPaint/, "bucket fill raster");
  assert.match(gpuJs, /fillAt/, "fillAt API");
  assert.match(gpuJs, /exportSvgString/, "SVG export");
  assert.match(gpuJs, /beginVectorRectDraft/, "vector rect draft");
  assert.match(gpuJs, /drawVectorShapes/, "vector overlay draw");
  pass("GPU vector + fill tools");

  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /data-tool="fill"/, "fill tool button");
  assert.match(html, /data-tool="vector-rect"/, "vector rect tool button");
  assert.match(appJs, /vector-rect/, "vector rect tool");
  assert.match(appJs, /exportSvgDownload/, "SVG download");
  assert.match(appJs, /btnAddVector/, "add vector layer");
  pass("app vector wiring");

  const coreJs = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-core.js"),
    "utf8"
  );
  assert.match(coreJs, /exportDocumentToSvg/, "core SVG export bundled");
  assert.match(coreJs, /createRectShape/, "core vector shapes bundled");
  pass("browser core bundle");

  console.log("\n---- MIA PAINT VECTOR CONTRACT ----");
  console.log("passed");
}

run();
