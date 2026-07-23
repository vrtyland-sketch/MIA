"use strict";

/**
 * Soft-neon companion tint for Koj idle (and optional mood batch).
 * Preserves alpha; shifts opaque pixels toward mint–aqua Soft Neon Lab.
 *
 * Usage:
 *   node scripts/kojnozrout_soft_neon_tint.js
 *   node scripts/kojnozrout_soft_neon_tint.js --batch
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MOODS = path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout", "moods");
const TARGET_MINT = { r: 100, g: 235, b: 200 };
const TARGET_CYAN = { r: 80, g: 210, b: 255 };
const MIX = 0.28;
const CYAN_MIX = 0.12;

async function tintFile(inputPath, outputPath) {
  const sharp = require("sharp");
  const buf = fs.readFileSync(inputPath);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  let tinted = 0;
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a < 12) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    // Prefer cyan bias on brighter rim-ish pixels
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const cool = Math.max(0, Math.min(1, (luma - 40) / 180));
    const tr = TARGET_MINT.r * (1 - cool) + TARGET_CYAN.r * cool;
    const tg = TARGET_MINT.g * (1 - cool) + TARGET_CYAN.g * cool;
    const tb = TARGET_MINT.b * (1 - cool) + TARGET_CYAN.b * cool;
    const m = MIX + cool * CYAN_MIX;
    out[i] = Math.round(r * (1 - m) + tr * m);
    out[i + 1] = Math.round(g * (1 - m) + tg * m);
    out[i + 2] = Math.round(b * (1 - m) + tb * m);
    tinted += 1;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
  return { inputPath, outputPath, tinted, w: info.width, h: info.height };
}

async function main() {
  const batch = process.argv.includes("--batch");
  const idleIn = path.join(MOODS, "kojnozout-idle.png");
  if (!fs.existsSync(idleIn)) {
    console.error("[SOFT_NEON_TINT] missing idle:", idleIn);
    process.exit(1);
  }

  // Backup once
  const bak = path.join(MOODS, "kojnozout-idle.pre-soft-neon.png");
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(idleIn, bak);
    console.log("[SOFT_NEON_TINT] backup →", bak);
  }

  const results = [];
  if (batch) {
    const files = fs.readdirSync(MOODS).filter((f) => /^kojnozout-.*\.png$/i.test(f) && !f.includes(".pre-"));
    for (const f of files) {
      const p = path.join(MOODS, f);
      results.push(await tintFile(p, p));
    }
  } else {
    // Core idle + warm + happy — visible on stream without full bank rewrite
    for (const key of ["idle", "warm", "happy", "idle-f2"]) {
      const p = path.join(MOODS, `kojnozout-${key}.png`);
      if (!fs.existsSync(p)) continue;
      const keyBak = path.join(MOODS, `kojnozout-${key}.pre-soft-neon.png`);
      if (!fs.existsSync(keyBak)) fs.copyFileSync(p, keyBak);
      results.push(await tintFile(p, p));
    }
  }

  console.log(JSON.stringify({ ok: true, count: results.length, sample: results[0] }, null, 2));
}

main().catch((err) => {
  console.error("[SOFT_NEON_TINT]", err);
  process.exit(1);
});
