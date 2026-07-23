"use strict";

const { createPaintStrokeCommand } = require("./PaintStrokeCommand");

/** Alias — undo/redo tile snapshotů (move, crop pixels, clear selection). */
function createTileSnapshotCommand(layerId, beforeSnapshots, afterSnapshots, raster) {
  return createPaintStrokeCommand(layerId, beforeSnapshots, afterSnapshots, raster);
}

module.exports = { createTileSnapshotCommand };
