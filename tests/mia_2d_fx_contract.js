"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  PROJECTILE_KINDS,
  ROLE_PROJECTILE,
  buildFxManifest
} = require("../scripts/MIA_2D_FX_REGISTRY");
const itemEffect = require("../scripts/MIA_KOJNOZROUT_ITEM_EFFECT");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets");
const fxJs = fs.readFileSync(path.join(ROOT, "mia-2d-fx.js"), "utf8");
const fxCss = fs.readFileSync(path.join(ROOT, "mia-2d-fx.css"), "utf8");
const manifestPath = path.join(ROOT, "kojnozrout", "fx", "fx-manifest.json");
const runtime = fs.readFileSync(
  path.join(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
  "utf8"
);
const arena = fs.readFileSync(
  path.join(__dirname, "..", "mia-output-overlay", "arena-battle-overlay.html"),
  "utf8");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.ok(fs.existsSync(manifestPath), "fx-manifest.json exists");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(Object.keys(manifest.projectiles).length, PROJECTILE_KINDS.length);
  assert.ok(manifest.particleSheetAnim, "particleSheetAnim in manifest");
  assert.equal(manifest.particleSheetAnim.cols, 4);
  assert.equal(manifest.particleSheetAnim.rows, 8);
  assert.ok(manifest.burstImpactSheet, "burstImpactSheet in manifest");
  assert.equal(manifest.burstImpactSheet.frameCount, 16);
  pass("fx manifest multi-frame sheets");

  for (const kind of PROJECTILE_KINDS) {
    const p = path.join(ROOT, "kojnozrout", "fx", "projectiles", `${kind}.png`);
    assert.ok(fs.existsSync(p), kind);
    assert.ok(fs.statSync(p).size > 5000, `${kind} hand-painted`);
  }
  pass("projectile PNGs on disk");

  for (const sheet of ["particle-sheet-anim.png", "burst-impact-sheet.png"]) {
    const p = path.join(ROOT, "kojnozrout", "fx", "projectiles", sheet);
    assert.ok(fs.existsSync(p), sheet);
    assert.ok(fs.statSync(p).size > 1000, `${sheet} generated`);
  }
  pass("multi-frame sprite sheets on disk");

  assert.match(fxJs, /particleSheetAnim/, "anim sheet in engine");
  assert.match(fxJs, /impactSprites/, "16-frame impact sprites");
  assert.match(fxJs, /spawnImpactSprite/, "impact sprite playback");
  assert.match(fxJs, /ParticleEngine/, "canvas particle engine");
  assert.match(fxJs, /animateProjectileFlight/, "rAF projectile flight");
  assert.match(fxJs, /animateItemFly/, "rAF item fly-in");
  assert.match(fxJs, /mia-fx-raf/, "rAF CSS hook");
  assert.match(fxJs, /playItemUse/, "item use API");
  assert.match(fxJs, /particle-sheet/, "sheet loader");
  pass("mia-2d-fx.js engine surface");

  assert.match(fxCss, /miaFxFly/, "shared projectile animation");
  assert.match(fxCss, /mia-fx-canvas/, "canvas layer");
  pass("mia-2d-fx.css shared styles");

  assert.match(runtime, /mia-2d-fx\.js/, "runtime loads engine");
  assert.match(runtime, /playItemUse/, "runtime uses playItemUse");
  assert.match(arena, /mia-2d-fx\.js/, "arena loads engine");
  pass("overlays wired to MIA_2D_FX");

  for (const [role, projectile] of Object.entries(ROLE_PROJECTILE)) {
    assert.ok(PROJECTILE_KINDS.includes(projectile), `role ${role} projectile`);
  }

  const duelFx = itemEffect.resolveItemUseEffect({ id: "box", role: "duel" });
  assert.equal(duelFx.projectile, ROLE_PROJECTILE.duel);
  pass("ITEM_EFFECT projectiles compatible with registry");

  const built = buildFxManifest();
  assert.deepEqual(Object.keys(built.projectiles).sort(), PROJECTILE_KINDS.sort());
  pass("buildFxManifest stable");

  console.log("\n---- MIA 2D FX CONTRACT ----");
  console.log("passed");
}

run();
