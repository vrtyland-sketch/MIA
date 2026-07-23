"use strict";

/**
 * Generate minimal placeholder PNG sprites when art files are missing.
 *   node scripts/kojnozrout_generate_base_sprites.js
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const MOODS_DIR = path.resolve(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "moods"
);

const MOOD_COLORS = {
  idle: [138, 255, 157],
  happy: [255, 230, 122],
  hungry: [255, 179, 71],
  excited: [255, 140, 220],
  full: [110, 240, 180],
  sleepy: [160, 190, 255],
  sick: [190, 255, 160],
  sad: [170, 190, 220],
  warm: [255, 210, 170],
  eating: [255, 200, 120]
};

function insideEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function drawSprite(color) {
  const width = 256;
  const height = 256;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (width * y + x) << 2;
      let alpha = 0;

      const body =
        insideEllipse(x, y, 128, 152, 62, 78) ||
        insideEllipse(x, y, 88, 92, 18, 24) ||
        insideEllipse(x, y, 168, 92, 18, 24);

      const eyeL = insideEllipse(x, y, 108, 138, 7, 9);
      const eyeR = insideEllipse(x, y, 148, 138, 7, 9);
      const mouth = insideEllipse(x, y, 128, 162, 14, 8);

      if (body) alpha = 255;
      if (eyeL || eyeR) {
        png.data[i] = 30;
        png.data[i + 1] = 30;
        png.data[i + 2] = 40;
        png.data[i + 3] = 255;
        continue;
      }
      if (mouth) {
        png.data[i] = 50;
        png.data[i + 1] = 30;
        png.data[i + 2] = 40;
        png.data[i + 3] = 255;
        continue;
      }

      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
      png.data[i + 3] = alpha;
    }
  }

  return PNG.sync.write(png);
}

function generateBaseSprites() {
  fs.mkdirSync(MOODS_DIR, { recursive: true });
  const written = [];

  for (const [mood, color] of Object.entries(MOOD_COLORS)) {
    const outPath = path.join(MOODS_DIR, `kojnozout-${mood}.png`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      continue;
    }
    fs.writeFileSync(outPath, drawSprite(color));
    written.push(outPath);
  }

  return { moodsDir: MOODS_DIR, written };
}

if (require.main === module) {
  const result = generateBaseSprites();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { generateBaseSprites };
