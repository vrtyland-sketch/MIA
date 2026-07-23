"use strict";

/**
 * Undo/redo příkaz pro tah štětce/gumy — obnoví tile snapshoty.
 * raster: { restoreTileSnapshots(layerId, snapshots) }
 */
function createPaintStrokeCommand(layerId, beforeSnapshots, afterSnapshots, raster) {
  if (!layerId || !raster || typeof raster.restoreTileSnapshots !== "function") {
    throw new Error("PaintStrokeCommand: invalid raster adapter");
  }

  const snap = {
    layerId,
    before: beforeSnapshots,
    after: afterSnapshots
  };

  return {
    kind: "paint_stroke",
    layerId,
    apply(_doc) {
      raster.restoreTileSnapshots(layerId, afterSnapshots);
      return snap;
    },
    revert(_doc, stored) {
      const payload = stored || snap;
      raster.restoreTileSnapshots(payload.layerId, payload.before);
    }
  };
}

module.exports = { createPaintStrokeCommand };
