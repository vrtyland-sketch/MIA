"use strict";

const { PNG } = require("pngjs");
const { SpriteCanvas } = require("./kojnozrout_sprite_renderer");

const WIDTH = 960;
const HEIGHT = 540;

const PROGRAM_PALETTES = {
  flower_support: { top: [255, 210, 230], bottom: [120, 60, 120], accent: [255, 120, 180] },
  flower_burst: { top: [255, 180, 220], bottom: [90, 40, 100], accent: [255, 90, 160] },
  heart_ping: { top: [255, 190, 200], bottom: [140, 50, 80], accent: [255, 80, 120] },
  heart_burst: { top: [255, 160, 180], bottom: [120, 30, 70], accent: [255, 60, 100] },
  care_feed: { top: [200, 240, 200], bottom: [40, 100, 60], accent: [120, 220, 140] },
  music_pulse: { top: [180, 200, 255], bottom: [40, 50, 120], accent: [120, 160, 255] },
  music_showcase: { top: [140, 180, 255], bottom: [30, 40, 100], accent: [90, 140, 255] },
  pet_react: { top: [220, 240, 255], bottom: [60, 90, 140], accent: [160, 210, 255] },
  beast_summon: { top: [255, 200, 140], bottom: [90, 40, 20], accent: [255, 140, 60] },
  travel_motion: { top: [180, 230, 255], bottom: [20, 80, 120], accent: [100, 200, 255] },
  celebration_burst: { top: [255, 240, 160], bottom: [120, 80, 20], accent: [255, 200, 60] },
  power_strike: { top: [255, 200, 160], bottom: [80, 20, 20], accent: [255, 100, 40] },
  magic_orbit: { top: [200, 160, 255], bottom: [50, 20, 90], accent: [160, 100, 255] },
  cinematic_vehicle: { top: [160, 190, 220], bottom: [20, 40, 70], accent: [120, 180, 255] },
  cinematic_support: { top: [200, 210, 230], bottom: [40, 50, 80], accent: [140, 170, 220] },
  generic_support: { top: [190, 220, 255], bottom: [30, 60, 110], accent: [100, 180, 255] }
};

/** Pozadí Koj doupěte / scén (overlay) */
const SCENE_PALETTES = {
  den: { top: [72, 58, 48], bottom: [28, 22, 18], accent: [130, 100, 75] },
  cave: { top: [48, 36, 88], bottom: [12, 10, 32], accent: [160, 110, 240] },
  cozy: { top: [58, 42, 34], bottom: [22, 16, 12], accent: [255, 175, 90] },
  feast: { top: [88, 52, 28], bottom: [38, 22, 12], accent: [255, 195, 70] },
  party: { top: [88, 42, 108], bottom: [32, 14, 52], accent: [255, 110, 195] },
  night: { top: [22, 26, 62], bottom: [6, 8, 26], accent: [190, 205, 255] }
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function listBackgroundPrograms() {
  return Object.keys(PROGRAM_PALETTES);
}

function resolvePalette(effectProgram = "generic_support") {
  const key = safeString(effectProgram, "generic_support");
  return PROGRAM_PALETTES[key] || PROGRAM_PALETTES.generic_support;
}

function renderGiftBackground(effectProgram = "generic_support", seed = 0) {
  const palette = resolvePalette(effectProgram);
  return renderBackgroundFromPalette(palette, seed);
}

function renderSceneBackground(sceneKey = "den", seed = 0) {
  const key = safeString(sceneKey, "den").toLowerCase();
  const palette = SCENE_PALETTES[key] || SCENE_PALETTES.den;
  return renderBackgroundFromPalette(palette, seed, sceneKey);
}

function renderBackgroundFromPalette(palette, seed = 0, sceneKey = "") {
  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  const s = Math.max(0, seed);

  canvas.fill((x, y) => {
    const t = y / (HEIGHT - 1);
    const wave = Math.sin((x / WIDTH) * Math.PI * 2 + s * 0.4) * 0.04;
    const tt = clamp(t + wave, 0, 1);
    return rgba(
      Math.round(lerp(palette.top[0], palette.bottom[0], tt)),
      Math.round(lerp(palette.top[1], palette.bottom[1], tt)),
      Math.round(lerp(palette.top[2], palette.bottom[2], tt)),
      255
    );
  });

  const accent = rgba(...palette.accent, 90);
  const blobCount = 8 + (seed % 5);
  for (let i = 0; i < blobCount; i += 1) {
    const cx = ((seed * 97 + i * 113) % (WIDTH - 80)) + 40;
    const cy = ((seed * 53 + i * 71) % (HEIGHT - 120)) + 40;
    const r = 18 + ((seed + i) % 6) * 6;
    canvas.fillDisk(cx, cy, r, accent);
  }

  // Scéna-specifické detaily (malované, ne emoji)
  const sk = safeString(sceneKey).toLowerCase();
  if (sk === "cave") {
    const crystal = rgba(180, 140, 255, 140);
    canvas.fillEllipse(120, HEIGHT - 80, 36, 90, crystal, -12);
    canvas.fillEllipse(WIDTH - 100, HEIGHT - 70, 42, 100, crystal, 10);
    canvas.fillDisk(WIDTH / 2, HEIGHT - 40, 28, rgba(255, 220, 120, 120));
  } else if (sk === "cozy") {
    const glow = rgba(140, 200, 255, 100);
    canvas.fillEllipse(140, HEIGHT - 120, 100, 70, glow);
    canvas.fillEllipse(WIDTH - 80, HEIGHT - 100, 50, 80, rgba(255, 200, 120, 80));
  } else if (sk === "night") {
    const star = rgba(255, 255, 255, 200);
    for (let i = 0; i < 12; i += 1) {
      const sx = ((seed * 31 + i * 67) % (WIDTH - 40)) + 20;
      const sy = ((seed * 19 + i * 43) % (HEIGHT / 2)) + 20;
      canvas.fillDisk(sx, sy, 2 + (i % 3), star);
    }
    canvas.fillDisk(WIDTH - 90, 70, 22, rgba(255, 248, 200, 180));
  } else if (sk === "party") {
    const conf = rgba(255, 200, 80, 150);
    for (let i = 0; i < 6; i += 1) {
      canvas.fillDisk(80 + i * 140, 60 + (i % 3) * 40, 8 + (i % 4) * 3, conf);
    }
  } else if (sk === "den") {
    // Doupě — teplé světlo shora, kámen/meh na podlaze
    const warm = rgba(255, 200, 120, 60);
    canvas.fillEllipse(WIDTH / 2, -20, WIDTH * 0.6, 120, warm);
    const moss = rgba(60, 90, 50, 80);
    for (let i = 0; i < 5; i += 1) {
      const mx = 60 + i * 180;
      canvas.fillDisk(mx, HEIGHT - 30 + (i % 2) * 8, 12 + (i % 3) * 4, moss);
    }
  } else if (sk === "feast") {
    // Miska, pára, teplé světlo
    const steam = rgba(255, 240, 200, 70);
    canvas.fillEllipse(WIDTH / 2, HEIGHT - 90, 80, 40, rgba(180, 120, 60, 100));
    canvas.fillEllipse(WIDTH / 2 - 20, HEIGHT - 130, 18, 50, steam);
    canvas.fillEllipse(WIDTH / 2 + 15, HEIGHT - 140, 14, 45, steam);
    canvas.fillDisk(WIDTH / 2, HEIGHT - 55, 35, rgba(220, 160, 80, 130));
  }

  canvas.fillEllipse(WIDTH / 2, HEIGHT + 40, WIDTH * 0.7, 120, rgba(0, 0, 0, 40));

  return canvas.toPngBuffer();
}

function renderGiftBackgroundPng(effectProgram, seed) {
  return renderGiftBackground(effectProgram, seed);
}

module.exports = {
  WIDTH,
  HEIGHT,
  PROGRAM_PALETTES,
  SCENE_PALETTES,
  listBackgroundPrograms,
  resolvePalette,
  renderGiftBackground,
  renderSceneBackground,
  renderGiftBackgroundPng
};
