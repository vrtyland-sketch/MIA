"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const primitives = require("../shared/mia-svg-primitives");
const paint = require("../shared/mia-paint-core");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.equal(primitives.SVG_NS, "http://www.w3.org/2000/svg");
  assert.match(primitives.escXml("<a&>"), /&lt;a&amp;&gt;/);
  pass("mia-svg-primitives exports");

  const rect = paint.createRectShape(0, 0, 40, 20, { fill: "#abc" });
  assert.equal(typeof primitives.drawShapeOnCanvas, "function");
  pass("drawShapeOnCanvas available");

  const koj = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "koj-vector.js"), "utf8");
  assert.match(koj, /MIA_SVG_PRIMITIVES/, "koj-vector bridge");
  assert.match(
    fs.readFileSync(path.join(ROOT, "mia-output-overlay", "kojnozrout-runtime.html"), "utf8"),
    /mia-svg-primitives\.js/,
    "runtime loads shared primitives"
  );
  pass("koj-vector runtime wiring");

  assert.match(
    fs.readFileSync(path.join(ROOT, "shared", "mia-paint-core", "svgRender.js"), "utf8"),
    /drawShapeOnCanvas/
  );
  pass("paint svgRender module");

  console.log("\n---- MIA PAINT KOJ VECTOR BRIDGE ----");
  console.log("passed");
}

run();
