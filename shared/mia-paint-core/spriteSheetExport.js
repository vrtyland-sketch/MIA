"use strict";

const DEFAULT_SHEET = {
  cols: 4,
  rows: 8,
  frameWidth: 48,
  frameHeight: 48,
  fps: 14
};

function layoutSpriteSheet(frames, sheetSpec = {}) {
  const spec = { ...DEFAULT_SHEET, ...sheetSpec };
  const fw = Math.max(1, Number(spec.frameWidth) || 48);
  const fh = Math.max(1, Number(spec.frameHeight) || 48);
  const count = Math.max(0, frames?.length || 0);
  const cols = Math.max(1, Number(spec.cols) || Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Number(spec.rows) || Math.ceil(count / cols));
  const placements = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    placements.push({
      index: i,
      col,
      row,
      x: col * fw,
      y: row * fh,
      width: fw,
      height: fh
    });
  }
  return {
    spec: { ...spec, cols, rows, frameWidth: fw, frameHeight: fh },
    sheetWidth: cols * fw,
    sheetHeight: rows * fh,
    frameCount: count,
    placements
  };
}

function spriteSheetManifest(layout, meta = {}) {
  const { spec, sheetWidth, sheetHeight, frameCount, placements } = layout;
  return {
    kind: "mia_paint_sprite_sheet",
    version: 1,
    sheetWidth,
    sheetHeight,
    frameCount,
    cols: spec.cols,
    rows: spec.rows,
    frameWidth: spec.frameWidth,
    frameHeight: spec.frameHeight,
    fps: spec.fps,
    frames: placements.map((p) => ({
      index: p.index,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height
    })),
    meta
  };
}

module.exports = {
  DEFAULT_SHEET,
  layoutSpriteSheet,
  spriteSheetManifest
};
