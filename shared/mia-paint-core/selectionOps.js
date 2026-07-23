"use strict";

function setDocumentSelection(doc, selection) {
  if (!doc) return false;
  doc.selection = selection || null;
  return true;
}

function clearDocumentSelection(doc) {
  return setDocumentSelection(doc, null);
}

function applyCropDocument(doc, cropRect) {
  const x = Math.max(0, Math.round(Number(cropRect.x) || 0));
  const y = Math.max(0, Math.round(Number(cropRect.y) || 0));
  const width = Math.max(1, Math.round(Number(cropRect.width) || 1));
  const height = Math.max(1, Math.round(Number(cropRect.height) || 1));
  const prev = { width: doc.width, height: doc.height, cropX: x, cropY: y };
  doc.width = width;
  doc.height = height;
  clearDocumentSelection(doc);
  return prev;
}

module.exports = {
  setDocumentSelection,
  clearDocumentSelection,
  applyCropDocument
};
