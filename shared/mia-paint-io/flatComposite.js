"use strict";

const { encodeImageBuffer } = require("./rasterCodec");

/**
 * Složí sparse tiles do jednoho RGBA bufferu (Node).
 * tilePayload: { [layerId]: [{ tx, ty, png: base64 }] }
 */
function compositeTilesToRgba(doc, tilePayload, decodeBase64Png) {
  const width = Math.max(1, doc.width);
  const height = Math.max(1, doc.height);
  const out = Buffer.alloc(width * height * 4, 0);

  if (doc.background) {
    fillSolidBackground(out, width, height, doc.background);
  }

  for (const layer of doc.layers || []) {
    if (!layer.visible || layer.kind !== "raster") continue;
    const tiles = tilePayload[layer.id] || [];
    const opacity = Number(layer.opacity);
    const layerAlpha = Number.isFinite(opacity) ? opacity : 1;
    for (const tile of tiles) {
      if (!tile?.png) continue;
      const rgba = decodeBase64Png(tile.png);
      const ts = layer.tileSize || 512;
      blitTile(out, width, height, rgba, tile.tx * ts, tile.ty * ts, layerAlpha);
    }
  }

  return { width, height, data: out };
}

function fillSolidBackground(buf, width, height, color) {
  const rgb = parseHexColor(color);
  if (!rgb) return;
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    buf[o] = rgb.r;
    buf[o + 1] = rgb.g;
    buf[o + 2] = rgb.b;
    buf[o + 3] = 255;
  }
}

function parseHexColor(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6 && h.length !== 3) return null;
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function blitTile(dst, docW, docH, src, dstX, dstY, layerAlpha) {
  const sw = src.width;
  const sh = src.height;
  const sdata = src.data;
  for (let y = 0; y < sh; y += 1) {
    const py = dstY + y;
    if (py < 0 || py >= docH) continue;
    for (let x = 0; x < sw; x += 1) {
      const px = dstX + x;
      if (px < 0 || px >= docW) continue;
      const si = (y * sw + x) * 4;
      const sa = (sdata[si + 3] / 255) * layerAlpha;
      if (sa <= 0) continue;
      const di = (py * docW + px) * 4;
      const inv = 1 - sa;
      dst[di] = Math.round(sdata[si] * sa + dst[di] * inv);
      dst[di + 1] = Math.round(sdata[si + 1] * sa + dst[di + 1] * inv);
      dst[di + 2] = Math.round(sdata[si + 2] * sa + dst[di + 2] * inv);
      dst[di + 3] = Math.round(255 * (sa + (dst[di + 3] / 255) * inv));
    }
  }
}

async function exportDocumentImage(doc, tilePayload, format, quality) {
  const { base64PngToRgba } = require("./rasterCodec");
  const rgba = compositeTilesToRgba(doc, tilePayload, base64PngToRgba);
  return encodeImageBuffer(rgba, format, quality);
}

module.exports = {
  compositeTilesToRgba,
  exportDocumentImage
};
