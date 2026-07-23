"use strict";

const { MIA_PAINT_VERSION } = require("../mia-paint-core/constants");

function documentToManifest(doc) {
  if (!doc) return null;
  return {
    format: "miapaint",
    version: MIA_PAINT_VERSION,
    savedAt: new Date().toISOString(),
    document: {
      id: doc.id,
      name: doc.name,
      version: doc.version,
      width: doc.width,
      height: doc.height,
      dpi: doc.dpi,
      background: doc.background,
      activeLayerId: doc.activeLayerId,
      selection: doc.selection,
      meta: doc.meta,
      timeline: doc.timeline
        ? {
            id: doc.timeline.id,
            fps: doc.timeline.fps,
            activeFrameIndex: doc.timeline.activeFrameIndex,
            onionBefore: doc.timeline.onionBefore,
            onionAfter: doc.timeline.onionAfter,
            frames: (doc.timeline.frames || []).map((f) => ({
              id: f.id,
              label: f.label,
              durationMs: f.durationMs,
              layerSnapshotKeys: f.layerSnapshots
                ? Object.keys(f.layerSnapshots)
                : []
            }))
          }
        : null,
      layers: (doc.layers || []).map((layer) => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        kind: layer.kind,
        transform: layer.transform,
        shapes: layer.kind === "vector" ? (layer.shapes || []).map((s) => ({ ...s })) : undefined,
        tileSize: layer.tileSize,
        mask: layer.mask || null
      }))
    }
  };
}

function manifestToDocument(manifest, paintCore) {
  const raw = manifest?.document;
  if (!raw) return null;
  const doc = paintCore.createDocument({
    id: raw.id,
    name: raw.name,
    width: raw.width,
    height: raw.height,
    dpi: raw.dpi,
    background: raw.background,
    activeLayerId: raw.activeLayerId,
    selection: raw.selection,
    meta: raw.meta,
    timeline: raw.timeline,
    layers: (raw.layers || []).map((l) =>
      l.kind === "vector" ? paintCore.createVectorLayer(l) : paintCore.createLayer(l)
    )
  });
  return doc;
}

module.exports = {
  documentToManifest,
  manifestToDocument
};
