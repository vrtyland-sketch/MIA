"use strict";

/**
 * Vygeneruje malovaná pozadí scén pro Koj overlay.
 *   node scripts/koj_scene_backgrounds_build.js
 */

const fs = require("fs");
const path = require("path");
const { SCENE_PALETTES, renderSceneBackground } = require("./kojnozrout_background_generator");

const OUT_DIR = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "scenes");

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const keys = Object.keys(SCENE_PALETTES);
  const written = [];

  for (const scene of keys) {
    const buf = renderSceneBackground(scene, scene.length * 7);
    const fileName = `scene-${scene}.png`;
    const outPath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(outPath, buf);
    written.push({ scene, file: fileName, bytes: buf.length });
  }

  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, scenes: written }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { OUT_DIR };
