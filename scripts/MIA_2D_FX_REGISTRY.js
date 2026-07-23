"use strict";

/**
 * Kanonický registr 2D FX — projectile druhy, particle sheet, burst presety.
 * Sdíleno: generate_fx_manifest · ITEM_EFFECT · browser mia-2d-fx.js
 */

const PROJECTILE_KINDS = ["coin", "box", "orb", "heart", "food", "star", "spark"];

/** Index buněk v particle-sheet.png (8×48 px) */
const SHEET_FRAME = {
  spark: 0,
  orb: 1,
  star: 2,
  coin: 3,
  heart: 4,
  box: 5,
  food: 6,
  trail: 7
};

const SHEET_ANIM = {
  cols: 4,
  rows: 8,
  frameWidth: 48,
  frameHeight: 48,
  fps: 14
};

const IMPACT_SHEET = {
  cols: 4,
  rows: 4,
  frameCount: 16,
  frameWidth: 64,
  frameHeight: 64,
  fps: 28
};

const BURST_PRESETS = {
  impact: {
    count: 32,
    speedMin: 2.2,
    speedMax: 7.5,
    upward: 0.35,
    shockwave: true,
    life: 1,
    anim: true,
    impactSprite: true
  },
  heal: {
    count: 26,
    speedMin: 1.4,
    speedMax: 5.2,
    upward: 1.6,
    shockwave: false,
    frame: "heart",
    life: 1.1,
    anim: true,
    impactSprite: false
  },
  star: {
    count: 20,
    speedMin: 1.8,
    speedMax: 6,
    upward: 0.8,
    shockwave: false,
    frame: "star",
    life: 0.95,
    anim: true,
    impactSprite: true
  },
  item_pop: {
    count: 18,
    speedMin: 1.2,
    speedMax: 4.8,
    upward: 1.1,
    shockwave: false,
    frame: "star",
    life: 0.85,
    anim: true,
    impactSprite: false
  },
  trail: {
    count: 4,
    speedMin: 0.4,
    speedMax: 1.6,
    upward: -0.2,
    shockwave: false,
    life: 0.45,
    anim: true,
    impactSprite: false
  }
};

const ROLE_PROJECTILE = {
  food: "food",
  heal: "heart",
  comfort: "star",
  care: "heart",
  duel: "box"
};

const PROJECTILE_BURST = {
  coin: "impact",
  box: "impact",
  orb: "star",
  heart: "heal",
  food: "item_pop",
  star: "star",
  spark: "impact"
};

const ASSET_PATHS = {
  projectiles: "/assets/kojnozrout/fx/projectiles/",
  particleSheet: "/assets/kojnozrout/fx/projectiles/particle-sheet.png",
  particleSheetAnim: "/assets/kojnozrout/fx/projectiles/particle-sheet-anim.png",
  burstImpactSheet: "/assets/kojnozrout/fx/projectiles/burst-impact-sheet.png",
  items: "/assets/kojnozrout/items/"
};

const CACHE_VER = {
  projectiles: "v=4",
  particleSheet: "v=2",
  particleSheetAnim: "v=1",
  burstImpactSheet: "v=1",
  items: "v=4"
};

function buildFxManifest(options = {}) {
  const ver = { ...CACHE_VER, ...(options.cacheVer || {}) };
  const projectiles = {};
  for (const kind of PROJECTILE_KINDS) {
    projectiles[kind] = {
      url: `${ASSET_PATHS.projectiles}${kind}.png?${ver.projectiles}`,
      burst: PROJECTILE_BURST[kind] || "impact",
      sheetFrame: SHEET_FRAME[kind] ?? SHEET_FRAME.spark
    };
  }
  return {
    version: 2,
    generatedAt: Date.now(),
    projectiles,
    particleSheet: {
      url: `${ASSET_PATHS.particleSheet}?${ver.particleSheet}`,
      frameWidth: 48,
      frameCount: 8,
      frames: SHEET_FRAME
    },
    particleSheetAnim: {
      url: `${ASSET_PATHS.particleSheetAnim}?${ver.particleSheetAnim}`,
      frameWidth: SHEET_ANIM.frameWidth,
      frameHeight: SHEET_ANIM.frameHeight,
      cols: SHEET_ANIM.cols,
      rows: SHEET_ANIM.rows,
      fps: SHEET_ANIM.fps,
      kinds: SHEET_FRAME
    },
    burstImpactSheet: {
      url: `${ASSET_PATHS.burstImpactSheet}?${ver.burstImpactSheet}`,
      frameWidth: IMPACT_SHEET.frameWidth,
      frameHeight: IMPACT_SHEET.frameHeight,
      cols: IMPACT_SHEET.cols,
      rows: IMPACT_SHEET.rows,
      frameCount: IMPACT_SHEET.frameCount,
      fps: IMPACT_SHEET.fps
    },
    items: {
      base: ASSET_PATHS.items,
      ver: ver.items
    },
    bursts: BURST_PRESETS,
    roles: ROLE_PROJECTILE
  };
}

module.exports = {
  PROJECTILE_KINDS,
  SHEET_FRAME,
  SHEET_ANIM,
  IMPACT_SHEET,
  BURST_PRESETS,
  ROLE_PROJECTILE,
  PROJECTILE_BURST,
  ASSET_PATHS,
  CACHE_VER,
  buildFxManifest
};
