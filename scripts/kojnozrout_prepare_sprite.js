"use strict";

/**
 * Converts sprite PNGs to true RGBA alpha.
 * Handles: magenta chroma (#FF00FF), baked checkerboard, edge-connected neutral bg.
 *
 * Usage:
 *   node scripts/kojnozrout_prepare_sprite.js input.png output.png
 *   node scripts/kojnozrout_prepare_sprite.js --batch mia-output-overlay/assets/kojnozrout/moods
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const {
  shouldKeyPixel,
  markEdgeBackground,
  applyAlphaFromMask
} = require("../shared/mia-paint-ai/trueAlpha");

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on("parsed", function onParsed() {
        resolve(this);
      })
      .on("error", reject);
  });
}

function writePng(png, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    png
      .pack()
      .pipe(fs.createWriteStream(filePath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

async function convertSprite(inputPath, outputPath, options = {}) {
  const mode = options.mode || "auto";
  const png = await readPng(inputPath);
  const bgMask = markEdgeBackground(png.data, png.width, png.height, mode);
  const keyed = applyAlphaFromMask(png.data, bgMask);

  await writePng(png, outputPath);

  return {
    input: inputPath,
    output: outputPath,
    width: png.width,
    height: png.height,
    transparentPixels: keyed,
    alphaRatio: keyed / (png.width * png.height)
  };
}

async function batchConvert(dirPath, options = {}) {
  const abs = path.resolve(dirPath);
  const rawDir = path.join(abs, "_raw");
  const entries = fs.existsSync(rawDir)
    ? fs.readdirSync(rawDir).filter((f) => f.toLowerCase().endsWith(".png"))
    : fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith(".png"));

  const results = [];
  for (const file of entries) {
    const input = fs.existsSync(rawDir)
      ? path.join(rawDir, file)
      : path.join(abs, file);
    const output = path.join(abs, file.replace(/\.png$/i, "") + ".png");
    if (input === output && !fs.existsSync(rawDir)) {
      const tempOut = path.join(abs, `.tmp-${file}`);
      results.push(await convertSprite(input, tempOut, options));
      fs.renameSync(tempOut, output);
    } else {
      results.push(await convertSprite(input, output, options));
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node scripts/kojnozrout_prepare_sprite.js <in.png> <out.png>");
    console.error("       node scripts/kojnozrout_prepare_sprite.js --batch <dir>");
    process.exit(1);
  }

  if (args[0] === "--batch") {
    const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "auto";
    const dirArg = args.find((a, i) => i > 0 && a !== "--mode" && args[i - 1] !== "--mode");
    const results = await batchConvert(dirArg || "mia-output-overlay/assets/kojnozrout/moods", { mode });
    for (const row of results) {
      console.log(`✅ ${path.basename(row.output)} alpha ${(row.alphaRatio * 100).toFixed(1)}% keyed`);
    }
    return;
  }

  const result = await convertSprite(args[0], args[1], { mode: args[2] || "auto" });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}

module.exports = {
  convertSprite,
  batchConvert,
  shouldKeyPixel,
  markEdgeBackground
};
