"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const paintCore = require("../shared/mia-paint-core");
const paintIo = require("../shared/mia-paint-io");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

async function run() {
  const doc = paintCore.createDocument({ name: "IO Test", width: 64, height: 64 });
  const layer = paintCore.getActiveLayer(doc);
  const tilePayload = {
    [layer.id]: [
      {
        tx: 0,
        ty: 0,
        png: paintIo.rgbaToBase64Png({
          width: 4,
          height: 4,
          data: Buffer.from([
            255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
            255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
            255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
            255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255
          ])
        })
      }
    ]
  };

  const bundle = paintIo.packBundle(doc, tilePayload);
  assert.equal(bundle.format, "miapaint");
  assert.ok(bundle.document.layers.length >= 1);
  pass("packBundle");

  const encoded = paintIo.encodeMiapaintFile(bundle);
  assert.ok(encoded[0] === 0x1f && encoded[1] === 0x8b, "gzip magic");
  const decoded = paintIo.decodeMiapaintFile(encoded);
  assert.equal(decoded.document.name, "IO Test");
  pass("encode/decode .miapaint gzip");

  const restored = paintIo.unpackBundle(decoded, paintCore);
  assert.equal(restored.doc.width, 64);
  assert.ok(restored.tiles[layer.id]?.length === 1);
  pass("unpackBundle");

  const pngOut = await paintIo.exportDocumentImage(restored.doc, restored.tiles, "png");
  assert.ok(pngOut.length > 32);
  pass("exportDocumentImage PNG");

  const jpgOut = await paintIo.exportDocumentImage(restored.doc, restored.tiles, "jpg", 90);
  assert.ok(jpgOut.length > 32);
  pass("exportDocumentImage JPG");

  const webpOut = await paintIo.exportDocumentImage(restored.doc, restored.tiles, "webp", 85);
  assert.ok(webpOut.length > 32);
  pass("exportDocumentImage WEBP");

  const gpuJs = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-gpu.js"),
    "utf8"
  );
  assert.match(gpuJs, /collectTilePayload/, "tile payload export");
  assert.match(gpuJs, /applyTilePayload/, "tile payload import");
  assert.match(gpuJs, /exportDocumentImageBlob/, "browser raster export");
  assert.match(gpuJs, /importImageToLayer/, "image import");
  pass("GPU I/O surface");

  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /btnSave/, "save UI");
  assert.match(html, /fileImportImage/, "import input");
  assert.match(html, /mia-paint-io-browser/, "browser io bundle");
  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /saveProject/, "save wiring");
  assert.match(appJs, /loadProjectFile/, "load wiring");
  pass("editor I/O UI");

  const bridge = fs.readFileSync(path.join(ROOT, "scripts", "MIA_PAINT_BRIDGE.js"), "utf8");
  assert.match(bridge, /saveProject/, "bridge save");
  assert.match(bridge, /importImageBase64/, "bridge import");
  pass("bridge I/O");

  console.log("\n---- MIA PAINT IO CONTRACT ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
