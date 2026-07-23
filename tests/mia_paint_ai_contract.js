"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const paintAi = require("../shared/mia-paint-ai");
const paintAiBridge = require("../scripts/MIA_PAINT_AI");
const paintCore = require("../shared/mia-paint-core");
const paintIo = require("../shared/mia-paint-io");
const bridge = require("../scripts/MIA_PAINT_BRIDGE");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

async function run() {
  assert.ok(paintAi.AGENT_COMMANDS.includes("export_koj_factory"));
  assert.ok(paintAi.AGENT_COMMANDS.includes("set_canvas_size"));
  pass("agent command catalog");

  const gen = await paintAi.generateImage({ prompt: "test koj", width: 128, height: 128 });
  assert.equal(gen.ok, true);
  assert.ok(gen.buffer.length > 100);
  pass("procedural generate");

  const png = await paintAi.proceduralImage(64, 64, "alpha");
  const rb = await paintAi.removeBackgroundBuffer(png, { tolerance: 40 });
  assert.ok(rb.length > 50);
  pass("remove background");

  bridge.resetSession();
  const snap = paintAiBridge.getAgentSnapshot(bridge.getSession(), paintCore);
  assert.ok(snap.ok);
  assert.ok(snap.commands.length >= 10);
  pass("agent snapshot");

  bridge.resetSession();
  const renamed = bridge.runCommand({ action: "set_document_name", name: "Agent Doc" });
  assert.equal(renamed.name, "Agent Doc");
  pass("agent set_document_name");

  const doc = bridge.getSession().document;
  const layer = paintCore.getActiveLayer(doc);
  const tilePayload = {
    [layer.id]: [
      {
        tx: 0,
        ty: 0,
        png: paintIo.rgbaToBase64Png({
          width: 8,
          height: 8,
          data: Buffer.alloc(8 * 8 * 4, 200)
        })
      }
    ]
  };
  const bundle = paintIo.packBundle(doc, tilePayload);
  const koj = await paintAiBridge.exportKojFactory(bundle, { name: "test_export" });
  assert.ok(koj.ok);
  assert.ok(fs.existsSync(koj.path));
  pass("export koj factory");

  const routes = fs.readFileSync(path.join(ROOT, "routes", "mia_paint.js"), "utf8");
  assert.match(routes, /\/mia\/paint\/ai\/generate/);
  assert.match(routes, /\/mia\/paint\/agent\/snapshot/);
  pass("AI routes");

  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /aiProps/);
  assert.match(html, /btnAiGenerate/);
  assert.match(html, /btnExportKoj/);
  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /aiGenerateLayer/);
  assert.match(appJs, /exportKojFactory/);
  pass("editor AI UI");

  assert.ok(fs.existsSync(path.join(ROOT, "shared", "mia-paint-ai", "imageOps.js")));
  pass("mia-paint-ai module");

  console.log("\n---- MIA PAINT AI / AGENT CONTRACT ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
