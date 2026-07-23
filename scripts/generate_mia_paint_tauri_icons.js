"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const ICON_DIR = path.join(ROOT, "tools", "mia-paint-tauri", "src-tauri", "icons");

function drawIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1a1f2e"/>
          <stop offset="100%" stop-color="#3d5a80"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#g)"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif" font-weight="700"
        font-size="${Math.round(size * 0.42)}" fill="#e8eef8">M</text>
      <rect x="${Math.round(size * 0.12)}" y="${Math.round(size * 0.78)}"
        width="${Math.round(size * 0.76)}" height="${Math.max(2, Math.round(size * 0.04))}"
        rx="2" fill="#7eb8ff" opacity="0.85"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png();
}

async function main() {
  fs.mkdirSync(ICON_DIR, { recursive: true });
  const sizes = [32, 128, 256, 512];
  for (const size of sizes) {
    const out = path.join(ICON_DIR, `${size}x${size}.png`);
    await drawIcon(size).toFile(out);
    console.log(`[paint:icons] ${out}`);
  }
  const icon256 = path.join(ICON_DIR, "256x256.png");
  const icon128 = path.join(ICON_DIR, "128x128.png");
  fs.copyFileSync(icon256, path.join(ICON_DIR, "icon.png"));
  await sharp(icon128)
    .resize(32, 32)
    .toFile(path.join(ICON_DIR, "32x32.png"));
  console.log("[paint:icons] done — enable bundle in tauri.conf.json for release build");
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
