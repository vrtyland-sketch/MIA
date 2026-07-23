"use strict";

const { MIA_PAINT_VERSION, DEFAULT_DPI } = require("./constants");
const { createLayer, nextLayerId } = require("./Layer");
const { createTimeline } = require("./Animation");

let docSeq = 0;

function nextDocumentId() {
  docSeq += 1;
  return `doc_${docSeq}_${Date.now().toString(36)}`;
}

function createDocument(opts = {}) {
  const firstLayer = createLayer({ name: "Pozadí", id: opts.backgroundLayerId });
  return {
    id: opts.id || nextDocumentId(),
    name: opts.name || "Bez názvu",
    version: MIA_PAINT_VERSION,
    width: Math.max(1, Number(opts.width) || 1920),
    height: Math.max(1, Number(opts.height) || 1080),
    dpi: Number(opts.dpi) || DEFAULT_DPI,
    background: opts.background == null ? null : String(opts.background),
    layers: Array.isArray(opts.layers) && opts.layers.length ? opts.layers.slice() : [firstLayer],
    activeLayerId: opts.activeLayerId || firstLayer.id,
    selection: opts.selection || null,
    timeline: opts.timeline || createTimeline(),
    fxParticles: Array.isArray(opts.fxParticles) ? opts.fxParticles.slice() : [],
    meta: {
      author: opts.author || "",
      createdAt: opts.createdAt || new Date().toISOString(),
      modifiedAt: opts.modifiedAt || new Date().toISOString()
    }
  };
}

function getActiveLayer(doc) {
  if (!doc?.layers?.length) return null;
  return doc.layers.find((l) => l.id === doc.activeLayerId) || doc.layers[0];
}

function addLayer(doc, opts = {}) {
  const layer = createLayer(opts);
  doc.layers.push(layer);
  doc.activeLayerId = layer.id;
  touchDocument(doc);
  return layer;
}

function addVectorLayer(doc, opts = {}) {
  const { createVectorLayer } = require("./Layer");
  const layer = createVectorLayer(opts);
  doc.layers.push(layer);
  doc.activeLayerId = layer.id;
  touchDocument(doc);
  return layer;
}

function removeLayer(doc, layerId) {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return false;
  if (doc.layers.length <= 1) return false;
  doc.layers.splice(idx, 1);
  if (doc.activeLayerId === layerId) {
    doc.activeLayerId = doc.layers[Math.max(0, idx - 1)].id;
  }
  touchDocument(doc);
  return true;
}

function setActiveLayer(doc, layerId) {
  if (!doc.layers.some((l) => l.id === layerId)) return false;
  doc.activeLayerId = layerId;
  touchDocument(doc);
  return true;
}

function moveLayer(doc, layerId, toIndex) {
  const from = doc.layers.findIndex((l) => l.id === layerId);
  if (from < 0) return false;
  const clamped = Math.max(0, Math.min(doc.layers.length - 1, toIndex));
  const [layer] = doc.layers.splice(from, 1);
  doc.layers.splice(clamped, 0, layer);
  touchDocument(doc);
  return true;
}

function touchDocument(doc) {
  if (doc?.meta) doc.meta.modifiedAt = new Date().toISOString();
}

function serializeDocument(doc) {
  return JSON.stringify(doc, null, 2);
}

function parseDocument(json) {
  const raw = typeof json === "string" ? JSON.parse(json) : json;
  const { createVectorLayer } = require("./Layer");
  const { createTimeline } = require("./Animation");
  return createDocument({
    ...raw,
    timeline: raw.timeline || createTimeline(),
    fxParticles: raw.fxParticles || [],
    layers: (raw.layers || []).map((l) =>
      l.kind === "vector" ? createVectorLayer(l) : createLayer(l)
    )
  });
}

module.exports = {
  createDocument,
  getActiveLayer,
  addLayer,
  addVectorLayer,
  removeLayer,
  setActiveLayer,
  moveLayer,
  touchDocument,
  serializeDocument,
  parseDocument,
  nextDocumentId
};
