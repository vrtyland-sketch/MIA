"use strict";

/**
 * Build stream-usable cyber MIA PNGs with true alpha (no black plate).
 * Uses edge flood-fill so black suit panels stay opaque.
 * Usage: node scripts/mia_build_cyber_alpha.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-MIA",
  "assets"
);
const OUT_DIR = path.join(ROOT, "mia-output-overlay", "assets", "mia", "cyber");
const HOLO_OUT = path.join(ROOT, "mia-output-overlay", "assets", "mia", "hologram.png");

const SOURCES = [
  {
    key: "hero",
    candidates: [
      path.join(CURSOR_ASSETS, "mia-cyber-hero-raw.png"),
      path.join(ROOT, ".tmp-audit", "mia-cyber-hero-raw.png")
    ],
    out: path.join(OUT_DIR, "hero.png")
  },
  {
    key: "speak",
    candidates: [
      path.join(CURSOR_ASSETS, "mia-cyber-speak-raw.png"),
      path.join(ROOT, ".tmp-audit", "mia-cyber-speak-raw.png")
    ],
    out: path.join(OUT_DIR, "speak.png")
  }
];

function findSource(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function isBgCandidate(r, g, b, a, hardLuma) {
  if (a < 12) return true;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const cyanBias = g > r + 8 && b > r + 8;
  if (cyanBias && maxC > 40 && luma < 220) return false;

  // Near-black plate
  if (luma <= hardLuma && maxC <= hardLuma + 10) return true;

  // Near-white / light gray plate (GenerateImage often yields this)
  const sat = maxC - minC;
  if (luma >= 232 && sat <= 18) return true;
  if (luma >= 220 && sat <= 10) return true;

  return false;
}

/**
 * Flood-fill from image edges: only background connected to border becomes alpha.
 * Interior black suit stays solid.
 */
async function toTrueAlpha(inputPath, outputPath, opts = {}) {
  const maxDim = opts.maxDim || 1280;
  const hardLuma = opts.hardLuma ?? 28;
  const softPad = opts.softPad ?? 2;

  const base = sharp(inputPath).ensureAlpha();
  const meta = await base.metadata();
  let pipeline = base;
  if ((meta.width || 0) > maxDim || (meta.height || 0) > maxDim) {
    pipeline = pipeline.resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels < 4) throw new Error(`expected RGBA, got ${channels}`);

  const n = width * height;
  const mark = new Uint8Array(n); // 1 = background to clear
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;

  const push = (x, y) => {
    const i = y * width + x;
    if (mark[i]) return;
    const o = i * 4;
    if (!isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma)) return;
    mark[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  // Soften 1–2px fringe around cleared bg for cleaner OBS edges
  if (softPad > 0) {
    const fringe = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mark[i]) continue;
        let near = false;
        for (let dy = -softPad; dy <= softPad && !near; dy++) {
          for (let dx = -softPad; dx <= softPad; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (mark[ny * width + nx]) near = true;
          }
        }
        if (!near) continue;
        const o = i * 4;
        if (isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma + 18) ||
            isBgCandidate(data[o], data[o + 1], data[o + 2], data[o + 3], hardLuma)) {
          fringe[i] = 1;
        }
      }
    }
    for (let i = 0; i < n; i++) if (fringe[i]) mark[i] = 2;
  }

  for (let i = 0; i < n; i++) {
    if (!mark[i]) continue;
    const o = i * 4;
    if (mark[i] === 1) {
      data[o + 3] = 0;
    } else {
      // fringe — partial fade
      data[o + 3] = Math.round(data[o + 3] * 0.35);
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  return {
    input: inputPath,
    output: outputPath,
    width: outMeta.width,
    height: outMeta.height,
    hasAlpha: outMeta.hasAlpha === true,
    cleared: mark.reduce((a, v) => a + (v ? 1 : 0), 0)
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];

  for (const src of SOURCES) {
    const input = findSource(src.candidates);
    if (!input) {
      throw new Error(`Missing source for ${src.key}. Tried:\n${src.candidates.join("\n")}`);
    }
    results.push(await toTrueAlpha(input, src.out));
  }

  const heroOut = path.join(OUT_DIR, "hero.png");
  await fs.promises.copyFile(heroOut, HOLO_OUT);
  results.push({ output: HOLO_OUT, copiedFrom: heroOut });

  const lipDir = path.join(OUT_DIR, "lip");
  fs.mkdirSync(lipDir, { recursive: true });
  await fs.promises.copyFile(heroOut, path.join(lipDir, "01.png"));
  await fs.promises.copyFile(path.join(OUT_DIR, "speak.png"), path.join(lipDir, "02.png"));

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
