"use strict";

/**
 * Phase 13a — MIA visual identity lock.
 * Aligns AI/procedural generation with #miaHolo cyan projection (speech-overlay).
 * Does not redesign body-part PNGs or Koj art — locks NEW generated frames.
 */

/** Matches speech-overlay.html #miaHolo --holo-c1 / --holo-c2 */
const HOLO = {
  c1: { r: 0, g: 220, b: 255 },
  c2: { r: 0, g: 160, b: 255 }
};

const MOOD_ACCENTS = {
  idle: { r: 180, g: 240, b: 255 },
  gift: { r: 255, g: 210, b: 80 },
  combo: { r: 200, g: 120, b: 255 },
  duel: { r: 255, g: 90, b: 110 },
  wave: { r: 120, g: 220, b: 255 },
  speak: { r: 160, g: 230, b: 255 },
  bounce: { r: 100, g: 200, b: 255 },
  nod: { r: 140, g: 210, b: 255 },
  happy: { r: 255, g: 210, b: 80 }
};

const IDENTITY_PROMPT_SUFFIX =
  "MIA holographic AI projection mascot, cyan turquoise glow (#00DCFF), translucent holographic silhouette, clean centered character, stream overlay style, not a green animal, not a capybara";

const DEFAULT_MIA_PROMPT =
  "MIA holographic stream mascot, friendly cyberpunk AI projection, cyan glow";

function resolveMoodKey(moodOrMotion = "idle") {
  const key = String(moodOrMotion || "idle").toLowerCase();
  if (MOOD_ACCENTS[key]) return key;
  if (/gift|rose|heart/.test(key)) return "gift";
  if (/duel|fight|battle/.test(key)) return "duel";
  if (/combo|party/.test(key)) return "combo";
  if (/wave|mava/.test(key)) return "wave";
  if (/speak|talk|mluv/.test(key)) return "speak";
  if (/happy|radost/.test(key)) return "happy";
  return "idle";
}

function proceduralBodyRgb() {
  return { ...HOLO.c1 };
}

function proceduralAccentRgb(moodOrMotion = "idle") {
  const key = resolveMoodKey(moodOrMotion);
  return { ...(MOOD_ACCENTS[key] || MOOD_ACCENTS.idle) };
}

function withMiaIdentityPrompt(prompt, opts = {}) {
  const base = String(prompt || DEFAULT_MIA_PROMPT).trim();
  if (/holographic AI projection|holo-c1|#00DCFF|cyan turquoise glow/i.test(base)) {
    return base;
  }
  const mood = resolveMoodKey(opts.mood || opts.motion);
  const moodHint =
    mood === "gift"
      ? "warm gold holographic accent"
      : mood === "duel"
        ? "red alert holographic accent"
        : mood === "combo"
          ? "purple holographic accent"
          : "cyan holographic accent";
  return `${base}, ${IDENTITY_PROMPT_SUFFIX}, ${moodHint}`;
}

function getVisualIdentitySnapshot() {
  return {
    phase: "13a",
    holo: HOLO,
    moods: MOOD_ACCENTS,
    identityPromptSuffix: IDENTITY_PROMPT_SUFFIX,
    defaultMiaPrompt: DEFAULT_MIA_PROMPT,
    source: "speech-overlay.html #miaHolo"
  };
}

/**
 * Phase 13o — soft cyan/mood tint on existing body-part PNG (opt-in rebuild).
 * Preserves alpha; does not invent new art.
 */
async function applyMiaIdentityTintBuffer(pngBuffer, opts = {}) {
  const sharp = require("sharp");
  const mood = resolveMoodKey(opts.mood || opts.motion || "idle");
  const holo = HOLO.c1;
  const accent = proceduralAccentRgb(mood);
  const mix = Math.max(0.05, Math.min(0.45, Number(opts.mix) || 0.22));
  const accentMix = Math.max(0, Math.min(0.2, Number(opts.accentMix) || 0.08));
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  let tinted = 0;
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a < 8) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const keep = 1 - mix - accentMix;
    out[i] = Math.round(r * keep + holo.r * mix + accent.r * accentMix);
    out[i + 1] = Math.round(g * keep + holo.g * mix + accent.g * accentMix);
    out[i + 2] = Math.round(b * keep + holo.b * mix + accent.b * accentMix);
    tinted += 1;
  }
  const buffer = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();
  return {
    ok: true,
    phase: "13o",
    mood,
    mix,
    accentMix,
    tintedPixels: tinted,
    width: info.width,
    height: info.height,
    buffer
  };
}

module.exports = {
  HOLO,
  MOOD_ACCENTS,
  IDENTITY_PROMPT_SUFFIX,
  DEFAULT_MIA_PROMPT,
  resolveMoodKey,
  proceduralBodyRgb,
  proceduralAccentRgb,
  withMiaIdentityPrompt,
  getVisualIdentitySnapshot,
  applyMiaIdentityTintBuffer
};
