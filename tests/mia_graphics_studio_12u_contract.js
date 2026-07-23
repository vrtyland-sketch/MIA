"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");
const PARTS_DIR = path.join(ROOT, "mia-output-overlay", "assets", "mia", "parts");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("body part asset manifest lists dedicated parts root", () => {
    const manifest = graphicsStudio.getBodyPartAssetManifest();
    assert.equal(manifest.phase, "12u");
    assert.match(manifest.root, /\/assets\/mia\/parts/);
    assert.ok(manifest.requiredFiles.length >= 14);
  });

  await test("all required part PNG files exist on disk", () => {
    for (const rel of graphicsStudio.REQUIRED_PART_FILES) {
      const full = path.join(PARTS_DIR, rel);
      assert.ok(fs.existsSync(full), `missing ${rel}`);
      assert.ok(fs.statSync(full).size > 1000, `too small ${rel}`);
    }
  });

  await test("part PNGs have alpha channel", async () => {
    const sharp = require("sharp");
    const sample = path.join(PARTS_DIR, "head", "idle.png");
    const meta = await sharp(sample).metadata();
    assert.equal(meta.hasAlpha, true);
    assert.ok(meta.width >= 200);
    assert.ok(meta.height >= 200);
  });

  await test("runtime uses parts paths and no CSS crop hacks", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-body-part-runtime.js"),
      "utf8"
    );
    const presence = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "lib", "mia-live-presence.js"),
      "utf8"
    );
    assert.match(src, /MiaLivePresence|PRESENCE\.faces/);
    assert.match(presence, /\/assets\/mia\/(?:cyber|parts\/head)\//);
    assert.match(src, /\/assets\/mia\/parts\/eyes\//);
    assert.match(src, /\/assets\/mia\/parts\/torso\//);
    assert.match(src, /\/assets\/mia\/parts\/feet\//);
    assert.match(src, /PRESENCE\.bustUrl/);
    assert.doesNotMatch(src, /objectPosition:\s*"50% 92%"/);
    assert.doesNotMatch(src, /masters\/idle\.png/);
  });

  await test("catalog face/speak point at parts assets", () => {
    assert.match(graphicsStudio.MIA_FACE.idle, /\/parts\/head\/idle\.png/);
    assert.match(graphicsStudio.MIA_SPEAK_FRAMES[0], /\/parts\/eyes\/01\.png/);
  });

  await test("build script and npm script exist", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "scripts", "build_mia_body_parts.js")));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.match(pkg.scripts["build:mia-body-parts"], /build_mia_body_parts/);
  });

  await test("graphics body phase 12u", () => {
    graphicsStudio.resetBodyPreview();
    assert.equal(graphicsStudio.getBodyState().phase, "12u");
    assert.equal(graphicsStudio.getObsHook(3000).phase, "12u");
  });

  console.log("mia_graphics_studio_12u_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
