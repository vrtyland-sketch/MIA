"use strict";

/**
 * Emituje fx-manifest.json pro browser runtime MIA_2D_FX.
 *
 *   npm run generate:fx-manifest
 */

const fs = require("fs");
const path = require("path");
const { buildFxManifest } = require("./MIA_2D_FX_REGISTRY");

const OUT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "fx", "fx-manifest.json");

function main() {
  const manifest = buildFxManifest();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, path: OUT, kinds: Object.keys(manifest.projectiles).length }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { main, OUT };
