"use strict";

/**
 * Extrahuje dedicated MIA body-part PNG (s alpha) z full-body masters.
 *
 *   node scripts/build_mia_body_parts.js
 *   node scripts/build_mia_body_parts.js --force
 *   node scripts/build_mia_body_parts.js --force --identity
 *   node scripts/build_mia_body_parts.js --force --identity --identity-mix=0.25
 *
 * Výstup: mia-output-overlay/assets/mia/parts/{head,eyes,hands,torso,feet}/
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const {
  PART_CROP_FRACTIONS,
  BODY_PART_ASSETS,
  REQUIRED_PART_FILES
} = require("../shared/mia-graphics-studio/bodyPartsAssets");
const { applyTrueAlphaBuffer } = require("../shared/mia-paint-ai/trueAlpha");
const { applyMiaIdentityTintBuffer, resolveMoodKey } = require("../shared/mia-paint-ai/visualIdentity");

const ROOT = path.resolve(__dirname, "..");
const MIA_ASSETS = path.join(ROOT, "mia-output-overlay", "assets", "mia");
const MASTERS = path.join(MIA_ASSETS, "masters");
const PARTS_DIR = path.join(MIA_ASSETS, "parts");

const FORCE = process.argv.includes("--force");
const IDENTITY = process.argv.includes("--identity");
const IDENTITY_MIX = (() => {
  const flag = process.argv.find((a) => a.startsWith("--identity-mix="));
  if (!flag) return 0.22;
  return Math.max(0.05, Math.min(0.45, Number(flag.split("=")[1]) || 0.22));
})();

function moodFromOutPath(outPath) {
  const base = path.basename(outPath, path.extname(outPath)).toLowerCase();
  return resolveMoodKey(base);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function detectCharacterBox(filePath) {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const colScore = new Array(w).fill(0);
  const rowScore = new Array(h).fill(0);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * ch;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 40 && sat > 35) {
        colScore[x] += 1;
        rowScore[y] += 1;
      }
    }
  }

  let peak = 0;
  let peakX = Math.floor(w / 2);
  for (let x = 0; x < w; x += 1) {
    if (colScore[x] > peak) {
      peak = colScore[x];
      peakX = x;
    }
  }

  const thr = peak * 0.12;
  let left = peakX;
  let right = peakX;
  while (left > 0 && colScore[left - 1] > thr) left -= 1;
  while (right < w - 1 && colScore[right + 1] > thr) right += 1;

  let top = 0;
  let bottom = h - 1;
  const rowThr = peak * 0.05;
  while (top < h && rowScore[top] < rowThr) top += 1;
  while (bottom > 0 && rowScore[bottom] < rowThr) bottom -= 1;

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
    canvasW: w,
    canvasH: h
  };
}

function regionFromFraction(box, frac) {
  const left = Math.round(box.left + box.width * frac.x);
  const top = Math.round(box.top + box.height * frac.y);
  const width = Math.round(box.width * frac.w);
  const height = Math.round(box.height * frac.h);
  return {
    left: clamp(left, 0, box.canvasW - 1),
    top: clamp(top, 0, box.canvasH - 1),
    width: clamp(width, 8, box.canvasW - clamp(left, 0, box.canvasW - 1)),
    height: clamp(height, 8, box.canvasH - clamp(top, 0, box.canvasH - 1))
  };
}

async function softenAlphaFringe(pngBuffer, threshold = 40) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 3; i < out.length; i += 4) {
    const a = out[i];
    if (a > 0 && a < threshold) {
      // Soft fringe → fully transparent (zabíjí černý „rámeček“ v OBS)
      out[i] = 0;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toBuffer();
}

async function extractPart(sourcePath, region, outPath, canvas) {
  const extractedPng = await sharp(sourcePath).extract(region).ensureAlpha().png().toBuffer();
  const { data, info } = await sharp(extractedPng)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += info.channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum < 18 || (lum < 32 && sat < 18)) {
      out[i + 3] = 0;
    }
  }

  let keyedPng = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels }
  })
    .png()
    .toBuffer();

  // Phase 13h — edge flood true-alpha (stejný kontrakt jako Koj sprites)
  const alphaPass = await applyTrueAlphaBuffer(keyedPng, { mode: "matte" });
  if (alphaPass.ok && alphaPass.buffer) {
    keyedPng = alphaPass.buffer;
  }
  keyedPng = await softenAlphaFringe(keyedPng, 36);

  // Phase 13o — optional cyan / mood identity tint (does not invent art)
  // Phase 13p — combo always gets a light party tint so combo ≠ happy/think alias
  let identityMood = null;
  const outMood = moodFromOutPath(outPath);
  if (IDENTITY || outMood === "combo") {
    identityMood = outMood;
    const tint = await applyMiaIdentityTintBuffer(keyedPng, {
      mood: identityMood,
      mix: IDENTITY ? IDENTITY_MIX : 0.18
    });
    if (tint.ok && tint.buffer) keyedPng = tint.buffer;
  }

  const trimmedPng = await sharp(keyedPng).trim({ threshold: 10 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmedPng).metadata();
  const targetW = canvas.width;
  const targetH = canvas.height;
  // 88 % canvas — glow/halo se neopeře o okraj browser source (žádný „box“)
  const fit = 0.88;
  const scale = Math.min(
    (targetW * fit) / Math.max(1, trimmedMeta.width),
    (targetH * fit) / Math.max(1, trimmedMeta.height)
  );
  const rw = Math.max(1, Math.round(trimmedMeta.width * scale));
  const rh = Math.max(1, Math.round(trimmedMeta.height * scale));
  const resized = await sharp(trimmedPng).resize(rw, rh).png().toBuffer();

  const left = Math.floor((targetW - rw) / 2);
  const top = Math.floor((targetH - rh) / 2);
  await sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(outPath);

  return {
    alphaRatio: alphaPass.alphaRatio || null,
    mode: alphaPass.mode || null,
    identity: IDENTITY,
    identityMood
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function buildAll() {
  ensureDir(PARTS_DIR);
  for (const part of Object.keys(BODY_PART_ASSETS)) {
    ensureDir(path.join(PARTS_DIR, part));
  }

  const idlePath = path.join(MASTERS, "idle.png");
  const wavePath = path.join(MASTERS, "wave.png");
  if (!fs.existsSync(idlePath)) {
    throw new Error(`missing ${idlePath}`);
  }

  const box = await detectCharacterBox(idlePath);
  const jobs = [];

  const headMoods = {
    idle: "faces/idle.png",
    happy: "faces/happy.png",
    gift: "faces/gift.png",
    duel: "faces/duel.png",
    think: "faces/think.png",
    // 13s — prefer authored faces/combo.png; else gift (party) then happy
    combo: fs.existsSync(path.join(MASTERS, "faces", "combo.png"))
      ? "faces/combo.png"
      : fs.existsSync(path.join(MASTERS, "faces", "gift.png"))
        ? "faces/gift.png"
        : "faces/happy.png",
    wave: "faces/wave.png"
  };

  // Ensure a dedicated combo master plate exists for overlays / rebuilds
  const comboMaster = path.join(MASTERS, "faces", "combo.png");
  if (!fs.existsSync(comboMaster)) {
    const comboSrc = path.join(MASTERS, headMoods.combo);
    if (fs.existsSync(comboSrc) && comboSrc !== comboMaster) {
      fs.copyFileSync(comboSrc, comboMaster);
      headMoods.combo = "faces/combo.png";
    }
  } else {
    headMoods.combo = "faces/combo.png";
  }
  for (const [mood, rel] of Object.entries(headMoods)) {
    jobs.push({
      part: "head",
      source: path.join(MASTERS, rel),
      out: path.join(PARTS_DIR, "head", `${mood}.png`),
      region: regionFromFraction(box, PART_CROP_FRACTIONS.head),
      canvas: BODY_PART_ASSETS.head.canvas
    });
  }

  for (const frame of ["01", "02", "03", "04"]) {
    jobs.push({
      part: "eyes",
      source: path.join(MASTERS, "speak", `${frame}.png`),
      out: path.join(PARTS_DIR, "eyes", `${frame}.png`),
      region: regionFromFraction(box, PART_CROP_FRACTIONS.eyes),
      canvas: BODY_PART_ASSETS.eyes.canvas
    });
  }

  jobs.push({
    part: "hands",
    source: idlePath,
    out: path.join(PARTS_DIR, "hands", "idle.png"),
    region: regionFromFraction(box, PART_CROP_FRACTIONS.hands),
    canvas: BODY_PART_ASSETS.hands.canvas
  });
  jobs.push({
    part: "hands",
    source: fs.existsSync(wavePath) ? wavePath : idlePath,
    out: path.join(PARTS_DIR, "hands", "wave.png"),
    region: regionFromFraction(box, PART_CROP_FRACTIONS.hands),
    canvas: BODY_PART_ASSETS.hands.canvas
  });

  jobs.push({
    part: "torso",
    source: idlePath,
    out: path.join(PARTS_DIR, "torso", "idle.png"),
    region: regionFromFraction(box, PART_CROP_FRACTIONS.torso),
    canvas: BODY_PART_ASSETS.torso.canvas
  });
  jobs.push({
    part: "feet",
    source: idlePath,
    out: path.join(PARTS_DIR, "feet", "idle.png"),
    region: regionFromFraction(box, PART_CROP_FRACTIONS.feet),
    canvas: BODY_PART_ASSETS.feet.canvas
  });

  const written = [];
  const skipped = [];
  const alphaStats = [];
  for (const job of jobs) {
    if (!FORCE && fs.existsSync(job.out)) {
      skipped.push(path.relative(PARTS_DIR, job.out));
      continue;
    }
    if (!fs.existsSync(job.source)) {
      throw new Error(`missing source ${job.source}`);
    }
    const stats = await extractPart(job.source, job.region, job.out, job.canvas);
    written.push(path.relative(PARTS_DIR, job.out));
    if (stats && stats.alphaRatio != null) {
      alphaStats.push({
        file: path.relative(PARTS_DIR, job.out),
        alphaRatio: Number(stats.alphaRatio.toFixed(3)),
        mode: stats.mode
      });
    }
  }

  const missing = REQUIRED_PART_FILES.filter(
    (rel) => !fs.existsSync(path.join(PARTS_DIR, rel))
  );

  const report = {
    ok: missing.length === 0,
    phase: IDENTITY ? "13o" : "13h",
    identity: IDENTITY,
    identityMix: IDENTITY ? IDENTITY_MIX : null,
    characterBox: box,
    written,
    skipped,
    missing,
    alphaStats: alphaStats.slice(0, 8),
    partsDir: PARTS_DIR
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

if (require.main === module) {
  buildAll().catch((err) => {
    console.error(err?.stack || err);
    process.exitCode = 1;
  });
}

module.exports = { buildAll, detectCharacterBox, regionFromFraction };
