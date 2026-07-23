"use strict";

/**
 * Skládání full-scene obrázků: pozadí + stejný Kojnožrout (pro wau momenty).
 */

const {
  SpriteCanvas,
  blitPngBuffer,
  renderKojnozoutMood,
  renderEatingVariant,
  ALL_MOODS
} = require("./kojnozrout_sprite_renderer");
const {
  WIDTH,
  HEIGHT,
  renderGiftBackground,
  listBackgroundPrograms
} = require("./kojnozrout_background_generator");

const MOOD_PROGRAM_AFFINITY = {
  idle: "generic_support",
  warm: "cinematic_support",
  happy: "celebration_burst",
  hungry: "care_feed",
  excited: "celebration_burst",
  eating: "care_feed",
  full: "celebration_burst",
  sleepy: "cinematic_support",
  sick: "care_feed",
  sad: "pet_react",
  annoyed: "power_strike",
  laugh: "celebration_burst",
  stressed: "power_strike"
};

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function rgba(r, g, b, a = 255) {
  return { r, g, b, a };
}

function resolveProgramForMood(mood = "idle", override = "") {
  const key = safeString(mood, "idle").toLowerCase();
  if (override) return safeString(override, "generic_support");
  return MOOD_PROGRAM_AFFINITY[key] || "generic_support";
}

function renderKojSpriteBuffer(mood = "idle", seed = 0) {
  const key = safeString(mood, "idle").toLowerCase();
  if (key === "eating" || /^eating-\d{2}$/.test(key)) {
    const variant = /^eating-(\d{2})$/.test(key)
      ? Number(key.match(/^eating-(\d{2})$/)[1])
      : (seed % 5) + 1;
    return renderEatingVariant(variant);
  }
  return renderKojnozoutMood(ALL_MOODS.includes(key) ? key : "idle", {
    seed,
    hueDeg: seed * 11 - 22
  });
}

function blitFullBackground(canvas, effectProgram, seed = 0) {
  const bgBuf = renderGiftBackground(effectProgram, seed);
  blitPngBuffer(canvas, bgBuf, 0, 0, 1);
}

function blitKojOnScene(canvas, kojBuf, options = {}) {
  if (!kojBuf) return;
  const layout = safeString(options.layout, "center");
  const seed = toNumber(options.seed, 0);
  const scale =
    toNumber(options.scale, 0) ||
    (layout === "hero" ? 0.62 : layout === "corner" ? 0.42 : 0.54 + (seed % 4) * 0.03);

  const kojW = Math.round(512 * scale);
  const kojH = kojW;
  let x = Math.round((WIDTH - kojW) / 2 + ((seed % 7) - 3) * 14);
  let y = Math.round(HEIGHT * 0.48);

  if (layout === "corner") {
    x = WIDTH - kojW - 40 - (seed % 3) * 8;
    y = HEIGHT - kojH - 24;
  } else if (layout === "left") {
    x = 80 + (seed % 4) * 10;
    y = Math.round(HEIGHT * 0.5);
  }

  blitPngBuffer(canvas, kojBuf, x, y, scale);

  const vignette = rgba(0, 0, 0, 28);
  for (let y2 = 0; y2 < HEIGHT; y2 += 1) {
    const edge = y2 < 24 || y2 > HEIGHT - 48 ? 1 : 0;
    if (!edge) continue;
    for (let x2 = 0; x2 < WIDTH; x2 += 1) {
      canvas.set(x2, y2, vignette);
    }
  }
}

function composeKojScene(input = {}) {
  const mood = safeString(input.mood, "idle").toLowerCase();
  const seed = toNumber(input.seed, 0);
  const program = resolveProgramForMood(mood, input.effectProgram);
  const layout = safeString(input.layout, seed % 3 === 0 ? "hero" : "center");

  const canvas = new SpriteCanvas(WIDTH, HEIGHT);
  blitFullBackground(canvas, program, seed);
  const kojBuf = input.kojBuffer || renderKojSpriteBuffer(mood, seed);
  blitKojOnScene(canvas, kojBuf, { layout, seed, scale: input.scale });

  return {
    pngBuffer: canvas.toPngBuffer(),
    mood,
    seed,
    effectProgram: program,
    layout,
    width: WIDTH,
    height: HEIGHT
  };
}

module.exports = {
  MOOD_PROGRAM_AFFINITY,
  resolveProgramForMood,
  renderKojSpriteBuffer,
  composeKojScene,
  blitKojOnScene,
  listBackgroundPrograms
};
