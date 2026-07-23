"use strict";

/**
 * Kompletní 2D grafická továrna — projectile, arena, itemy, evoluce, multi-frame battle.
 *
 *   npm run generate:koj-2d-factory
 */

const fs = require("fs");
const path = require("path");
const { transformCanonFile } = require("./kojnozrout_canon_transform");
const { convertSprite } = require("./kojnozrout_prepare_sprite");
const { MOODS_DIR } = require("./kojnozrout_restore_canon_sprites");
const { ITEM_CATALOG } = require("./MIA_KOJNOZROUT_ITEM_META");
const { FORMS } = require("./generate_platform_form_anims");
const {
  writePng,
  drawCoin,
  drawBox,
  drawOrb,
  drawHeartIcon,
  drawFood,
  drawStarIcon,
  drawSpark,
  drawItemIcon,
  drawArenaBackground,
  drawVsBadge,
  drawParticleSheet,
  drawParticleSheetAnim,
  drawBurstImpactSheet,
  drawPropBowl,
  drawPropBall,
  drawPropMic,
  drawPropHand,
  drawSceneDen,
  drawSceneCave,
  drawSceneCozy,
  drawSceneFeast,
  drawSceneParty,
  drawSceneNight
} = require("./koj_procedural_png");

const ROOT = path.join(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");

const SCENE_KEYS = ["den", "cave", "cozy", "feast", "party", "night"];
const SCENE_DRAWERS = {
  den: drawSceneDen,
  cave: drawSceneCave,
  cozy: drawSceneCozy,
  feast: drawSceneFeast,
  party: drawSceneParty,
  night: drawSceneNight
};

const PROP_SPECS = {
  bowl: { draw: drawPropBowl, size: 256 },
  ball: { draw: drawPropBall, size: 256 },
  mic: { draw: drawPropMic, size: 256 },
  hand: { draw: drawPropHand, size: 256 }
};

const PROJECTILES = {
  coin: drawCoin,
  box: drawBox,
  orb: drawOrb,
  heart: drawHeartIcon,
  food: drawFood,
  star: drawStarIcon,
  spark: drawSpark
};

const EVOLUTION_TIERS = {
  egg: { source: "idle", scale: 0.52, scaleY: 0.48, offsetY: 80, hueDeg: -6 },
  hatchling: { source: "idle", scale: 0.62, scaleY: 0.58, offsetY: 48, hueDeg: -4 },
  sprout: { source: "happy", scale: 0.72, scaleY: 0.68, offsetY: 24, hueDeg: 0 },
  guardian: { source: "full", scale: 0.86, scaleY: 0.82, offsetY: 8, hueDeg: 4 },
  legend: { source: "excited", scale: 1.02, scaleY: 0.98, offsetY: -12, hueDeg: 8, satMul: 1.06 }
};

const BATTLE_MULTIFRAME = {
  attack_01: { source: "attack", scale: 1.02, rotateDeg: -8, offsetX: 20 },
  attack_02: { source: "attack2", scale: 1.04, rotateDeg: -12, offsetX: 32 },
  attack_03: { source: "attack2", scale: 1.08, rotateDeg: -18, offsetX: 48, offsetY: -8 },
  hit_01: { source: "hit", scale: 0.96, rotateDeg: 8, offsetX: -24 },
  hit_02: { source: "hit2", scale: 0.92, rotateDeg: 12, offsetX: -36 }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function shouldSkipAsset(dest, force, minBytes = 50000) {
  if (force) return false;
  try {
    return fs.existsSync(dest) && fs.statSync(dest).size >= minBytes;
  } catch (_) {
    return false;
  }
}

async function generateProps(outDir, options = {}) {
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const results = [];
  for (const [name, spec] of Object.entries(PROP_SPECS)) {
    const dest = path.join(outDir, `${name}.png`);
    if (shouldSkipAsset(dest, forceHand, 20000)) {
      results.push({ name, skipped: true, bytes: fs.statSync(dest).size });
      continue;
    }
    const png = createCanvas(spec.size, spec.size);
    spec.draw(png);
    const tempDest = path.join(outDir, `.tmp-${name}.png`);
    await writePng(png, tempDest);
    const keyed = await convertSprite(tempDest, dest, { mode: "matte" });
    try { fs.unlinkSync(tempDest); } catch (_) { /* ok */ }
    results.push({ name, dest, bytes: fs.statSync(dest).size, alphaRatio: keyed.alphaRatio });
  }
  return results;
}

async function generateScenes(outDir, options = {}) {
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const results = [];
  for (const key of SCENE_KEYS) {
    const dest = path.join(outDir, `scene-${key}.png`);
    if (shouldSkipAsset(dest, forceHand, 100000)) {
      results.push({ scene: key, skipped: true, bytes: fs.statSync(dest).size });
      continue;
    }
    const png = createCanvas(1080, 1920);
    SCENE_DRAWERS[key](png);
    await writePng(png, dest);
    results.push({ scene: key, dest, bytes: fs.statSync(dest).size });
  }
  return results;
}

async function generateProjectiles(outDir, options = {}) {
  const force = Boolean(options.force);
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const results = [];
  for (const [name, draw] of Object.entries(PROJECTILES)) {
    const dest = path.join(outDir, `${name}.png`);
    if (shouldSkipAsset(dest, forceHand || force, 5000)) {
      results.push({ name, skipped: true, bytes: fs.statSync(dest).size, source: "hand" });
      continue;
    }
    const png = createCanvas(128, 128);
    draw(png);
    await writePng(png, dest);
    results.push({ name, dest, bytes: fs.statSync(dest).size, source: "procedural" });
  }
  const sheetDest = path.join(outDir, "particle-sheet.png");
  if (shouldSkipAsset(sheetDest, forceHand, 5000)) {
    results.push({ name: "particle-sheet", skipped: true, bytes: fs.statSync(sheetDest).size, source: "hand" });
  } else {
    const sheet = drawParticleSheet();
    await writePng(sheet, sheetDest);
    results.push({ name: "particle-sheet", dest: sheetDest, bytes: fs.statSync(sheetDest).size, source: "procedural" });
  }
  const animDest = path.join(outDir, "particle-sheet-anim.png");
  if (shouldSkipAsset(animDest, forceHand, 8000)) {
    results.push({ name: "particle-sheet-anim", skipped: true, bytes: fs.statSync(animDest).size, source: "hand" });
  } else {
    const anim = drawParticleSheetAnim();
    await writePng(anim, animDest);
    results.push({ name: "particle-sheet-anim", dest: animDest, bytes: fs.statSync(animDest).size, source: "procedural" });
  }
  const impactDest = path.join(outDir, "burst-impact-sheet.png");
  if (shouldSkipAsset(impactDest, forceHand, 8000)) {
    results.push({ name: "burst-impact-sheet", skipped: true, bytes: fs.statSync(impactDest).size, source: "hand" });
  } else {
    const impact = drawBurstImpactSheet();
    await writePng(impact, impactDest);
    results.push({ name: "burst-impact-sheet", dest: impactDest, bytes: fs.statSync(impactDest).size, source: "procedural" });
  }
  return results;
}

async function generateItems(outDir, options = {}) {
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const results = [];
  for (const id of Object.keys(ITEM_CATALOG)) {
    const dest = path.join(outDir, `${id}.png`);
    if (shouldSkipAsset(dest, forceHand, 5000)) {
      results.push({ id, skipped: true, bytes: fs.statSync(dest).size, source: "hand" });
      continue;
    }
    const png = drawItemIcon(id, 128);
    await writePng(png, dest);
    results.push({ id, dest, bytes: fs.statSync(dest).size, source: "procedural" });
  }
  return results;
}

async function generateArena(outDir, options = {}) {
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const bgDest = path.join(outDir, "background.png");
  const vsDest = path.join(outDir, "vs-badge.png");
  const results = [];
  if (!shouldSkipAsset(bgDest, forceHand, 50000)) {
    const bg = drawArenaBackground(1080, 1920);
    await writePng(bg, bgDest);
    results.push({ name: "background", dest: bgDest, bytes: fs.statSync(bgDest).size, source: "procedural" });
  } else {
    results.push({ name: "background", skipped: true, bytes: fs.statSync(bgDest).size, source: "hand" });
  }
  if (!shouldSkipAsset(vsDest, forceHand, 5000)) {
    const vs = drawVsBadge(320, 160);
    await writePng(vs, vsDest);
    results.push({ name: "vs-badge", dest: vsDest, bytes: fs.statSync(vsDest).size, source: "procedural" });
  } else {
    results.push({ name: "vs-badge", skipped: true, bytes: fs.statSync(vsDest).size });
  }
  return results;
}

function generateEvolution(outDir, options = {}) {
  const forceHand = Boolean(options.forceHandPainted);
  ensureDir(outDir);
  const results = [];
  for (const [tier, spec] of Object.entries(EVOLUTION_TIERS)) {
    const dest = path.join(outDir, `${tier}.png`);
    if (shouldSkipAsset(dest, forceHand, 50000)) {
      results.push({ tier, skipped: true, bytes: fs.statSync(dest).size, source: "hand" });
      continue;
    }
    const src = path.join(MOODS_DIR, `kojnozout-${spec.source}.png`);
    if (!fs.existsSync(src)) {
      results.push({ tier, ok: false, reason: "source_missing" });
      continue;
    }
    transformCanonFile(src, dest, spec);
    results.push({ tier, ok: true, bytes: fs.statSync(dest).size, source: "derived" });
  }
  return results;
}

function generateBattleMultiframe() {
  const results = [];
  for (const platform of FORMS) {
    const dir = path.join(ROOT, "forms", platform);
    for (const [frame, spec] of Object.entries(BATTLE_MULTIFRAME)) {
      const srcPath = path.join(dir, `${spec.source}.png`);
      const dest = path.join(dir, `${frame}.png`);
      if (!fs.existsSync(srcPath)) {
        results.push({ platform, frame, ok: false, reason: "source_missing" });
        continue;
      }
      transformCanonFile(srcPath, dest, spec);
      results.push({ platform, frame, ok: true, bytes: fs.statSync(dest).size });
    }
  }
  return results;
}

function writeManifest(payload) {
  const manifestPath = path.join(ROOT, "factory-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
  return manifestPath;
}

async function generateKoj2dFactory(options = {}) {
  const force = Boolean(options.force);
  const handOpts = { forceHandPainted: Boolean(options.forceHandPainted) };
  const fxDir = path.join(ROOT, "fx", "projectiles");
  const arenaDir = path.join(ROOT, "arena");
  const itemsDir = path.join(ROOT, "items");
  const evolutionDir = path.join(ROOT, "evolution");
  const propsDir = path.join(ROOT, "props");
  const scenesDir = path.join(ROOT, "scenes");

  const projectiles = await generateProjectiles(fxDir, { force, forceHandPainted: handOpts.forceHandPainted });
  const arena = await generateArena(arenaDir, handOpts);
  const items = await generateItems(itemsDir, handOpts);
  const evolution = generateEvolution(evolutionDir, handOpts);
  const props = await generateProps(propsDir, handOpts);
  const scenes = await generateScenes(scenesDir, handOpts);
  const battleFrames = options.skipBattleFrames ? [] : generateBattleMultiframe();

  const manifest = {
    generatedAt: Date.now(),
    projectiles,
    arena,
    items,
    evolution,
    props,
    scenes,
    battleFrames,
    paths: {
      projectiles: "/assets/kojnozrout/fx/projectiles/",
      arena: "/assets/kojnozrout/arena/",
      items: "/assets/kojnozrout/items/",
      evolution: "/assets/kojnozrout/evolution/",
      props: "/assets/kojnozrout/props/",
      scenes: "/assets/kojnozrout/scenes/"
    }
  };
  const manifestPath = writeManifest(manifest);
  try {
    require("./generate_fx_manifest").main();
  } catch (_e) {
    /* ok */
  }
  return { ok: true, manifestPath, manifest };
}

async function main() {
  const force = process.argv.includes("--force");
  const result = await generateKoj2dFactory({ force });
  console.log(
    JSON.stringify(
      {
        ok: true,
        manifest: result.manifestPath,
        counts: {
          projectiles: result.manifest.projectiles.length,
          arena: result.manifest.arena.length,
          items: result.manifest.items.length,
          evolution: result.manifest.evolution.filter((r) => r.ok).length,
          props: result.manifest.props.length,
          scenes: result.manifest.scenes.length,
          battleFrames: result.manifest.battleFrames.filter((r) => r.ok).length
        }
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateKoj2dFactory, EVOLUTION_TIERS, BATTLE_MULTIFRAME, PROJECTILES };
