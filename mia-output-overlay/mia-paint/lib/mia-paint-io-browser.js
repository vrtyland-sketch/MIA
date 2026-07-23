(function (global) {
  "use strict";

  function cloneDocumentMeta(doc) {
    return {
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
      timeline: doc.timeline,
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
    };
  }

  function packBundle(doc, tiles) {
    return {
      format: "miapaint",
      version: 1,
      savedAt: new Date().toISOString(),
      document: cloneDocumentMeta(doc),
      tiles: tiles || {}
    };
  }

  async function gzipBlobFromJson(obj) {
    const json = JSON.stringify(obj);
    if (typeof CompressionStream === "undefined") {
      return new Blob([json], { type: "application/json" });
    }
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
    const out = await new Response(stream).blob();
    return out;
  }

  async function parseMiapaintFile(file) {
    let text;
    if (typeof DecompressionStream !== "undefined") {
      try {
        const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
        text = await new Response(stream).text();
        return JSON.parse(text);
      } catch (_err) {
        /* fallback plain json */
      }
    }
    text = await file.text();
    return JSON.parse(text);
  }

  global.MIA_PAINT_IO_BROWSER = {
    packBundle,
    gzipBlobFromJson,
    parseMiapaintFile
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
