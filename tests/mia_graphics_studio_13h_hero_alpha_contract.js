"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");
const WAVE = path.join(ROOT, "mia-output-overlay", "assets", "mia", "parts", "head", "wave.png");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

async function edgeOpaqueCount(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let edge = 0;
  const w = info.width;
  const h = info.height;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x > 1 && y > 1 && x < w - 2 && y < h - 2) continue;
      if (data[(y * w + x) * 4 + 3] > 12) edge += 1;
    }
  }
  return edge;
}

(async () => {
  await test("catalog lists hero_true_alpha as 13h", () => {
    const def = graphicsStudio.getCommand("hero_true_alpha");
    assert.equal(def.phase, "13h");
    assert.equal(def.status, "implemented");
  });

  await test("body parts build uses true-alpha matte", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "build_mia_body_parts.js"), "utf8");
    assert.match(src, /applyTrueAlphaBuffer/);
    assert.match(src, /softenAlphaFringe/);
    assert.match(src, /phase: IDENTITY \? "13o" : "13h"/);
    assert.match(src, /fit = 0\.88/);
  });

  await test("hero wave PNG has clean edge alpha", async () => {
    assert.ok(fs.existsSync(WAVE), "wave.png missing — run build:mia-body-parts --force");
    const edge = await edgeOpaqueCount(WAVE);
    assert.ok(edge < 80, `edge opaque pixels too high: ${edge}`);
  });

  await test("body overlay cache bust 13h", () => {
    const presence = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-live-presence.js"),
      "utf8"
    );
    const runtime = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    assert.match(presence, /bustUrl/);
    assert.match(presence, /BUST\s*=\s*["']36-koj-unify["']|BUST\s*=\s*["']34-asset-control["']|BUST\s*=\s*["']33-gfx-harden["']|BUST\s*=\s*["']14[abcde](?:-cyber(?:-xf)?|-cyborg|-motion|-live-robot)?["']|v=13h|v=13y|v=13z|v=14b-cyber|v=14c-cyborg|v=14d-motion|v=14e-live-robot/);
    assert.match(runtime, /PRESENCE\.bustUrl/);
  });

  console.log("mia_graphics_studio_13h_hero_alpha_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
