"use strict";

/**
 * True RGBA alpha matte — edge flood-fill (magenta / neutral / dark matte).
 * Same contract as scripts/kojnozrout_prepare_sprite.js (OBS / sprite bank).
 */

const sharp = require("sharp");

function isMagenta(r, g, b) {
  return r > 200 && g < 90 && b > 200;
}

function isNeutralBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18 && max > 165;
}

function isEdgeMatteBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 28 && min < 28) return true;
  return isNeutralBackground(r, g, b);
}

function shouldKeyPixel(r, g, b, mode = "auto") {
  if (mode === "magenta") return isMagenta(r, g, b);
  if (mode === "neutral") return isNeutralBackground(r, g, b);
  if (mode === "matte") return isEdgeMatteBackground(r, g, b);
  return isMagenta(r, g, b) || isEdgeMatteBackground(r, g, b);
}

function idx(width, x, y) {
  return (width * y + x) << 2;
}

function markEdgeBackground(data, width, height, mode) {
  const bg = new Uint8Array(width * height);
  const queue = [];

  function trySeed(x, y) {
    const i = idx(width, x, y);
    if (!shouldKeyPixel(data[i], data[i + 1], data[i + 2], mode)) return;
    const p = y * width + x;
    if (bg[p]) return;
    bg[p] = 1;
    queue.push(p);
  }

  for (let x = 0; x < width; x += 1) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % width;
    const y = (p - x) / width;
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const np = ny * width + nx;
      if (bg[np]) continue;
      const i = idx(width, nx, ny);
      if (!shouldKeyPixel(data[i], data[i + 1], data[i + 2], mode)) continue;
      bg[np] = 1;
      queue.push(np);
    }
  }

  return bg;
}

function applyAlphaFromMask(data, bgMask) {
  let transparent = 0;
  for (let p = 0; p < bgMask.length; p += 1) {
    if (!bgMask[p]) continue;
    data[(p << 2) + 3] = 0;
    transparent += 1;
  }
  return transparent;
}

function applyTrueAlphaRaw(data, width, height, mode = "auto") {
  const bgMask = markEdgeBackground(data, width, height, mode);
  const transparentPixels = applyAlphaFromMask(data, bgMask);
  return {
    transparentPixels,
    alphaRatio: transparentPixels / (width * height),
    mode
  };
}

async function applyTrueAlphaBuffer(inputBuffer, opts = {}) {
  const mode = opts.mode || "auto";
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const stats = applyTrueAlphaRaw(data, info.width, info.height, mode);
  const buffer = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();

  return {
    ok: true,
    buffer,
    width: info.width,
    height: info.height,
    transparentPixels: stats.transparentPixels,
    alphaRatio: stats.alphaRatio,
    mode: stats.mode,
    provider: "true_alpha_edge_flood"
  };
}

const TRUE_ALPHA_PROMPT_SUFFIX =
  "solid flat #FF00FF magenta background, no shadows on background, clean silhouette, centered character, single subject, no checkerboard";

function withTrueAlphaPrompt(prompt) {
  const base = String(prompt || "MIA stream character").trim();
  if (/#FF00FF|magenta background|true.?alpha/i.test(base)) return base;
  return `${base}, ${TRUE_ALPHA_PROMPT_SUFFIX}`;
}

module.exports = {
  isMagenta,
  isNeutralBackground,
  isEdgeMatteBackground,
  shouldKeyPixel,
  markEdgeBackground,
  applyAlphaFromMask,
  applyTrueAlphaRaw,
  applyTrueAlphaBuffer,
  TRUE_ALPHA_PROMPT_SUFFIX,
  withTrueAlphaPrompt
};
