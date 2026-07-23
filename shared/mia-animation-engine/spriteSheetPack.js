"use strict";

const fs = require("fs");
const path = require("path");
const { layoutSpriteSheet } = require("../mia-paint-core/spriteSheetExport");
const { buildClipManifest, validateClipMetadata } = require("./animationBankSchema");

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readFrameBuffers(framePaths = []) {
  return framePaths.map((framePath) => {
    const abs = path.resolve(framePath);
    if (!fs.existsSync(abs)) {
      throw new Error(`frame_missing:${abs}`);
    }
    return fs.readFileSync(abs);
  });
}

async function detectFrameSize(buffers = []) {
  if (!buffers.length) return { width: 256, height: 256 };
  const sharp = require("sharp");
  const meta = await sharp(buffers[0]).metadata();
  return {
    width: Math.max(1, toNumber(meta.width, 256)),
    height: Math.max(1, toNumber(meta.height, 256))
  };
}

async function packSpriteSheet(framePaths = [], options = {}) {
  const buffers = readFrameBuffers(framePaths);
  if (!buffers.length) {
    return { ok: false, error: "no_frames" };
  }

  const size = await detectFrameSize(buffers);
  const frameWidth = Math.max(1, toNumber(options.frameWidth, size.width));
  const frameHeight = Math.max(1, toNumber(options.frameHeight, size.height));
  const fps = Math.max(1, Math.min(60, toNumber(options.fps, 14)));
  const cols = options.cols ? Math.max(1, toNumber(options.cols, 1)) : undefined;
  const rows = options.rows ? Math.max(1, toNumber(options.rows, 1)) : undefined;

  const layout = layoutSpriteSheet(
    framePaths.map((_, index) => ({ index })),
    { frameWidth, frameHeight, fps, cols, rows }
  );

  const sharp = require("sharp");
  const composites = layout.placements.map((placement, index) => ({
    input: buffers[index],
    left: placement.x,
    top: placement.y
  }));

  const sheetBuffer = await sharp({
    create: {
      width: layout.sheetWidth,
      height: layout.sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  const metaInput = {
    ...options.metadata,
    id: options.clipId || options.metadata?.id,
    fps,
    frameCount: buffers.length
  };
  const validated = validateClipMetadata(metaInput, options.clipId);
  const manifest = buildClipManifest(layout, validated.normalized);

  return {
    ok: true,
    sheetBuffer,
    manifest,
    layout,
    frameCount: buffers.length,
    sheetWidth: layout.sheetWidth,
    sheetHeight: layout.sheetHeight
  };
}

async function packClipDirectory(clipDir, options = {}) {
  const framesDir = path.join(clipDir, "frames");
  const metadataPath = path.join(clipDir, "metadata.json");
  const builtDir = path.join(clipDir, "built");
  const meta = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, "utf8"))
    : {};

  const frameFiles = fs
    .readdirSync(framesDir)
    .filter((f) => /^\d{4}\.png$/i.test(f))
    .sort();

  if (!frameFiles.length) {
    return { ok: false, error: "no_frames_in_dir", clipDir };
  }

  const framePaths = frameFiles.map((f) => path.join(framesDir, f));
  const clipId =
    options.clipId ||
    meta.id ||
    path.relative(options.bankRoot || path.dirname(clipDir), clipDir).replace(/\\/g, "/");

  const packed = await packSpriteSheet(framePaths, {
    clipId,
    fps: meta.fps,
    metadata: { ...meta, id: clipId, frameCount: frameFiles.length },
    frameWidth: meta.frameWidth,
    frameHeight: meta.frameHeight,
    cols: meta.cols,
    rows: meta.rows
  });

  if (!packed.ok) return packed;

  fs.mkdirSync(builtDir, { recursive: true });
  const sheetPath = path.join(builtDir, "sprite_sheet.png");
  const manifestPath = path.join(builtDir, "sprite.json");
  fs.writeFileSync(sheetPath, packed.sheetBuffer);
  fs.writeFileSync(manifestPath, `${JSON.stringify(packed.manifest, null, 2)}\n`);

  return {
    ok: true,
    clipId,
    sheetPath,
    manifestPath,
    manifest: packed.manifest,
    frameCount: packed.frameCount
  };
}

module.exports = {
  readFrameBuffers,
  detectFrameSize,
  packSpriteSheet,
  packClipDirectory
};
