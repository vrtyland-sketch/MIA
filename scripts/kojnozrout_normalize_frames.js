"use strict";

/**
 * Normalizuje pózové PNG snímky Kojnožrouta na konzistentní plátno pomocí sharp.
 *
 * Proč: runtime overlay renderuje sprite jako `bottom:0; left:50%` s object-fit:contain.
 * AI snímky mají postavu na různých místech v průhledném plátně 1536x1024 → nohy a
 * horizontální střed "poskakují" mezi framy. Normalizace zarovná spodek postavy na
 * pevnou baseline a horizontální střed na střed plátna → plynulá animace bez klouzání.
 *
 * Postup pro každý snímek: trim průhledných okrajů → composite na čisté plátno tak,
 * aby spodek postavy seděl na baseline a střed bbox byl na canvasW/2.
 *
 * Airborne pózy (skoky) dostanou vertikální zdvih, aby si zachovaly "ve vzduchu" efekt.
 *
 * Použití:
 *   node scripts/kojnozrout_normalize_frames.js --dry-run   # jen změří, nezapisuje
 *   node scripts/kojnozrout_normalize_frames.js              # normalizuje + záloha
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const MOODS_DIR = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "moods"
);
const { resolvePrenormDir } = require("./kojnozrout_offline_paths");
const BACKUP_DIR = resolvePrenormDir();

const CANVAS_W = 1536;
const CANVAS_H = 1024;
const BOTTOM_MARGIN = 28; // px nad spodní hranou plátna pro nohy
const ALPHA_THRESHOLD = 30;

// Pózy, které mají být "ve vzduchu" — nezarovnávat nohy na baseline, ale nadzvednout.
const AIRBORNE_LIFT = {
  "hop-a": 150,
  "excited-a": 130,
  "hype-jump-b": 170,
  "hatch-wiggle-b": 90,
  "surprised-b": 80,
  "celebrate-a": 70,
  "party-pop-a": 60,
  "duel-ready-b": 40
};

function listFrames() {
  return fs
    .readdirSync(MOODS_DIR)
    .filter((f) => /^kojnozout-.*\.png$/i.test(f) && f !== "_prenorm_backup");
}

async function contentBox(buffer) {
  const img = sharp(buffer);
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const a = data[(y * w + x) * ch + 3];
      if (a > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY, w, h, ch };
}

async function normalizeOne(file, options = {}) {
  const key = file.replace(/^kojnozout-/, "").replace(/\.png$/i, "");
  const srcPath = path.join(MOODS_DIR, file);
  const input = fs.readFileSync(srcPath);
  const box = await contentBox(input);
  if (!box) return { key, skipped: "empty" };

  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;

  // Pokud je postava větší než plátno, proporcionálně zmenšíme.
  const maxW = CANVAS_W - 40;
  const maxH = CANVAS_H - BOTTOM_MARGIN - 20;
  let scale = 1;
  if (bw > maxW) scale = Math.min(scale, maxW / bw);
  if (bh > maxH) scale = Math.min(scale, maxH / bh);

  // Vytrhneme postavu (tight crop).
  let cropped = sharp(input).extract({
    left: box.minX,
    top: box.minY,
    width: bw,
    height: bh
  });

  let finalW = bw;
  let finalH = bh;
  if (scale < 1) {
    finalW = Math.round(bw * scale);
    finalH = Math.round(bh * scale);
    cropped = cropped.resize(finalW, finalH);
  }

  const croppedBuf = await cropped.png().toBuffer();

  const lift = AIRBORNE_LIFT[key] || 0;
  const left = Math.round(CANVAS_W / 2 - finalW / 2);
  const top = Math.round(CANVAS_H - BOTTOM_MARGIN - finalH - lift);

  if (options.dryRun) {
    return {
      key,
      bbox: `${bw}x${bh}`,
      scale: scale.toFixed(3),
      placeLeft: left,
      placeTop: top,
      lift
    };
  }

  const out = await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: croppedBuf, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();

  fs.writeFileSync(srcPath, out);
  return { key, written: true, scale: scale.toFixed(3), lift };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const frames = listFrames();

  if (!dryRun) {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    for (const f of frames) {
      const bak = path.join(BACKUP_DIR, f);
      if (!fs.existsSync(bak)) fs.copyFileSync(path.join(MOODS_DIR, f), bak);
    }
    console.log(`💾 záloha → ${BACKUP_DIR} (${frames.length} souborů)`);
  }

  let scaled = 0;
  let written = 0;
  for (const f of frames) {
    const r = await normalizeOne(f, { dryRun });
    if (r.written) written += 1;
    if (r.scale && Number(r.scale) < 1) {
      scaled += 1;
      console.log(`  ↓ ${r.key} scale=${r.scale}${r.lift ? " lift=" + r.lift : ""}`);
    }
  }

  if (dryRun) {
    console.log(`📋 dry-run: ${frames.length} snímků analyzováno`);
  } else {
    console.log(`✅ normalizováno: ${written}/${frames.length} (${scaled} zmenšeno)`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}

module.exports = { normalizeOne, contentBox, CANVAS_W, CANVAS_H, BOTTOM_MARGIN };
