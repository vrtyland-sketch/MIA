"use strict";

const { escXml } = require("../mia-svg-primitives");

function shapeToSvgElement(shape) {
  if (!shape) return "";
  const fill = escXml(shape.fill || "none");
  const stroke = escXml(shape.stroke || "none");
  const sw = Number(shape.strokeWidth) || 0;
  const op = Number(shape.opacity);
  const opacityAttr = Number.isFinite(op) && op < 1 ? ` opacity="${op}"` : "";
  const rot = Number(shape.rotation) || 0;
  const cx = shape.x + (shape.width || 0) / 2;
  const cy = shape.y + (shape.height || 0) / 2;
  const transform =
    rot !== 0 ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";

  if (shape.type === "rect") {
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr}${transform}/>`;
  }
  if (shape.type === "ellipse") {
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    return `<ellipse cx="${shape.x + rx}" cy="${shape.y + ry}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr}${transform}/>`;
  }
  if (shape.type === "path" && shape.d) {
    return `<path d="${escXml(shape.d)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacityAttr} transform="translate(${shape.x} ${shape.y})${rot ? ` rotate(${rot})` : ""}"/>`;
  }
  return "";
}

function exportDocumentToSvg(doc, vectorLayers = []) {
  const width = Math.max(1, Number(doc?.width) || 1);
  const height = Math.max(1, Number(doc?.height) || 1);
  const bg = doc?.background ? `<rect width="100%" height="100%" fill="${escXml(doc.background)}"/>` : "";
  const layerGroups = (vectorLayers || [])
    .filter((l) => l.visible !== false)
    .map((layer) => {
      const shapes = (layer.shapes || []).map(shapeToSvgElement).join("\n    ");
      const op = Number(layer.opacity);
      const opacityAttr = Number.isFinite(op) && op < 1 ? ` opacity="${op}"` : "";
      return `  <g id="${escXml(layer.id)}" data-name="${escXml(layer.name || "")}"${opacityAttr}>\n    ${shapes}\n  </g>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `${bg}\n${layerGroups}\n</svg>`
  );
}

module.exports = {
  escXml,
  shapeToSvgElement,
  exportDocumentToSvg
};
