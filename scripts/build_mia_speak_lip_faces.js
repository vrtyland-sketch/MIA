"use strict";

/**
 * Phase 13z — speak-lip faces.
 * Face crop + eye-register every openness frame onto speak/01.
 * Same head placement → no side-to-side thrash between lips.
 *
 *   node scripts/build_mia_speak_lip_faces.js --force
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const FORCE = process.argv.includes("--force");
const SPEAK_DIR = path.join(ROOT, "mia-output-overlay", "assets", "mia", "masters", "speak");
const OUT_DIR = path.join(ROOT, "mia-output-overlay", "assets", "mia", "parts", "speak-lip");

const CROP = { left: 700, top: 8, width: 240, height: 220 };
const OUT_W = 360;
const OUT_H = 360;
const ALIGN = { left: 80, top: 30, width: 200, height: 120, search: 16 };

const LEVELS = [
  { id: "01", src: "01.png" },
  { id: "02", src: "02.png" },
  { id: "03", src: "03.png" },
  { id: "04", src: "04.png" }
];

async function faceRaw(srcName) {
  const srcPath = path.join(SPEAK_DIR, srcName);
  if (!fs.existsSync(srcPath)) throw new Error(`missing ${srcPath}`);
  const { data, info } = await sharp(srcPath)
    .extract(CROP)
    .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, channels: info.channels };
}

function readRgb(buf, ch, x, y) {
  const i = (y * OUT_W + x) * ch;
  return [buf[i], buf[i + 1], buf[i + 2]];
}

function findAlignOffset(base, open) {
  const { left, top, width, height, search } = ALIGN;
  let best = { dx: 0, dy: 0, score: Infinity };
  for (let dy = -search; dy <= search; dy += 1) {
    for (let dx = -search; dx <= search; dx += 1) {
      let score = 0;
      let n = 0;
      for (let y = top; y < top + height; y += 2) {
        for (let x = left; x < left + width; x += 2) {
          const ox = x + dx;
          const oy = y + dy;
          if (ox < 0 || oy < 0 || ox >= OUT_W || oy >= OUT_H) {
            score += 20000;
            n += 1;
            continue;
          }
          const [br, bg, bb] = readRgb(base.data, base.channels, x, y);
          const [or, og, ob] = readRgb(open.data, open.channels, ox, oy);
          const dr = br - or;
          const dg = bg - og;
          const db = bb - ob;
          score += dr * dr + dg * dg + db * db;
          n += 1;
        }
      }
      const avg = score / Math.max(1, n);
      if (avg < best.score) best = { dx, dy, score: avg };
    }
  }
  return best;
}

async function rawToPng(raw) {
  return sharp(raw.data, {
    raw: { width: OUT_W, height: OUT_H, channels: raw.channels }
  })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function alignToBase(openRaw, dx, dy) {
  const openPng = await rawToPng(openRaw);
  const pad = ALIGN.search + 2;
  const canvas = OUT_W + pad * 2;
  const placed = await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: openPng, left: pad - dx, top: pad - dy }])
    .png()
    .toBuffer();

  return sharp(placed)
    .extract({ left: pad, top: pad, width: OUT_W, height: OUT_H })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  const baseRaw = await faceRaw("01.png");
  const basePng = await rawToPng(baseRaw);

  for (const level of LEVELS) {
    const outPath = path.join(OUT_DIR, `${level.id}.png`);
    if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) {
      results.push({ id: level.id, skipped: true });
      continue;
    }
    if (level.id === "01") {
      fs.writeFileSync(outPath, basePng);
      results.push({ id: level.id, skipped: false, bytes: basePng.length, align: { dx: 0, dy: 0 } });
      continue;
    }
    const openRaw = await faceRaw(level.src);
    const align = findAlignOffset(baseRaw, openRaw);
    const png = await alignToBase(openRaw, align.dx, align.dy);
    fs.writeFileSync(outPath, png);
    results.push({
      id: level.id,
      skipped: false,
      bytes: png.length,
      align: { dx: align.dx, dy: align.dy, score: Number(align.score.toFixed(1)) }
    });
  }

  const a = await sharp(path.join(OUT_DIR, "01.png")).raw().toBuffer();
  const b = await sharp(path.join(OUT_DIR, "02.png")).ensureAlpha().resize(OUT_W, OUT_H).raw().toBuffer();
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;
  const pct = (100 * diff) / a.length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "13z",
        crop: CROP,
        outDir: path.relative(ROOT, OUT_DIR).replace(/\\/g, "/"),
        frames: results,
        closedVsSlightDiffPct: Number(pct.toFixed(2)),
        note: "face crop + eye-register — no head sway between lips"
      },
      null,
      2
    )
  );
  if (pct < 1) {
    console.error("frames too similar");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
