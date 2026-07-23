"use strict";

const assert = require("assert/strict");
const {
  applyPressure,
  brushRadius,
  brushAlpha,
  createHistoryStack,
  createPaintStrokeCommand
} = require("../shared/mia-paint-core");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.ok(applyPressure(0.5, "linear") > 0.4);
  assert.ok(applyPressure(0.5, "soft") > applyPressure(0.5, "hard"));
  const rLight = brushRadius(32, 0.2, "firm");
  const rHeavy = brushRadius(32, 1, "firm");
  assert.ok(rHeavy > rLight);
  assert.ok(brushAlpha(1, 0.2, "firm") < brushAlpha(1, 1, "firm"));
  pass("pressure curve");

  const log = [];
  const raster = {
    restoreTileSnapshots(layerId, snapshots) {
      log.push({ layerId, keys: snapshots.map((s) => s.key) });
    }
  };

  const before = [{ key: "0,0", tx: 0, ty: 0, existed: false, data: null }];
  const after = [{ key: "0,0", tx: 0, ty: 0, existed: true, data: null }];
  const cmd = createPaintStrokeCommand("layer_a", before, after, raster);
  const history = createHistoryStack(20);
  const doc = { id: "doc" };

  history.execute(cmd, doc);
  assert.equal(log.length, 1);
  assert.deepEqual(log[0].keys, ["0,0"]);

  history.undo(doc);
  assert.equal(log.length, 2);
  assert.deepEqual(log[1].keys, ["0,0"]);

  history.redo(doc);
  assert.equal(log.length, 3);
  pass("PaintStrokeCommand undo/redo roundtrip");

  const gpuJs = require("fs").readFileSync(
    require("path").join(__dirname, "..", "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),
    "utf8"
  );
  assert.match(gpuJs, /beginStroke/, "stroke session begin");
  assert.match(gpuJs, /endStroke/, "stroke session commit");
  assert.match(gpuJs, /destination-out/, "eraser composite");
  assert.match(gpuJs, /pressureCurve/, "pressure curve wiring");
  pass("GPU stroke + eraser surface");

  const appJs = require("fs").readFileSync(
    require("path").join(__dirname, "..", "mia-output-overlay", "mia-paint", "app.js"),
    "utf8"
  );
  assert.match(appJs, /doUndo/, "undo shortcut");
  assert.match(appJs, /eraser/, "eraser tool");
  pass("app.js undo + eraser");

  console.log("\n---- MIA PAINT STROKE CONTRACT ----");
  console.log("passed");
}

run();
