"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const paint = require("../shared/mia-paint-core");
const bridge = require("../scripts/MIA_PAINT_BRIDGE");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.ok(fs.existsSync(path.join(ROOT, "docs", "MIA_2D_EDITOR_ARCHITECTURE.md")), "architecture doc");
  assert.ok(fs.existsSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html")), "editor shell");
  assert.ok(fs.existsSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-core.js")), "browser bundle");
  pass("MIA Paint project scaffold");
  const bus = paint.createEventBus();
  let heard = null;
  bus.on("doc:change", (p) => {
    heard = p;
  });
  bus.emit("doc:change", { id: "x" });
  assert.equal(heard.id, "x");
  pass("EventBus emit/on");

  const doc = paint.createDocument({ name: "Test", width: 800, height: 600 });
  assert.equal(doc.layers.length, 1);
  assert.equal(doc.version, paint.MIA_PAINT_VERSION);
  const bg = paint.getActiveLayer(doc);
  assert.ok(bg);
  pass("Document create + active layer");

  const l2 = paint.addLayer(doc, { name: "Ink" });
  assert.equal(doc.layers.length, 2);
  assert.equal(doc.activeLayerId, l2.id);
  assert.ok(paint.removeLayer(doc, l2.id));
  assert.equal(doc.layers.length, 1);
  pass("Layer add/remove");

  const json = paint.serializeDocument(doc);
  const parsed = paint.parseDocument(json);
  assert.equal(parsed.name, doc.name);
  pass("Document serialize/parse");

  const history = paint.createHistoryStack(10);
  const renameCmd = {
    apply(d) {
      const snap = d.name;
      d.name = "Renamed";
      paint.touchDocument(d);
      return snap;
    },
    revert(d, snap) {
      d.name = snap;
      paint.touchDocument(d);
    }
  };
  history.execute(renameCmd, doc);
  assert.equal(doc.name, "Renamed");
  history.undo(doc);
  assert.equal(doc.name, "Test");
  history.redo(doc);
  assert.equal(doc.name, "Renamed");
  assert.ok(history.canUndo());
  pass("History undo/redo");

  const vp = paint.createViewport({ width: 1000, height: 800, zoom: 2, panX: 100, panY: 50 });
  const w = vp.screenToWorld(100, 50);
  assert.equal(w.x, 0);
  assert.equal(w.y, 0);
  vp.zoomAt(2, 500, 400);
  assert.ok(vp.state.zoom > 2);
  vp.fitToBounds({ x: 0, y: 0, width: 800, height: 600 });
  assert.ok(vp.state.zoom > 0);
  pass("Viewport pan/zoom/fit");

  bridge.resetSession();
  const status = bridge.getPublicStatus();
  assert.ok(status.ok);
  assert.ok(status.document);
  const cmd = bridge.runCommand({ action: "add_layer", name: "Agent layer" });
  assert.ok(cmd.ok);
  assert.equal(bridge.getPublicStatus().document.layerCount, 2);
  pass("MIA_PAINT_BRIDGE command");

  console.log("\n---- MIA PAINT CORE CONTRACT ----");
  console.log("passed");
}

run();
