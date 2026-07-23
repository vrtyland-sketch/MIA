"use strict";

const zlib = require("zlib");
const { documentToManifest, manifestToDocument } = require("./manifest");

function packBundle(doc, tilePayload = {}, frameSnapshots = {}) {
  const manifest = documentToManifest(doc);
  return {
    ...manifest,
    tiles: tilePayload,
    frameSnapshots
  };
}

function unpackBundle(bundle, paintCore) {
  const doc = manifestToDocument(bundle, paintCore);
  return {
    doc,
    tiles: bundle?.tiles && typeof bundle.tiles === "object" ? bundle.tiles : {},
    frameSnapshots: bundle?.frameSnapshots || {}
  };
}

function encodeMiapaintFile(bundle) {
  const json = JSON.stringify(bundle);
  return zlib.gzipSync(Buffer.from(json, "utf8"));
}

function decodeMiapaintFile(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let json;
  if (raw[0] === 0x1f && raw[1] === 0x8b) {
    json = zlib.gunzipSync(raw).toString("utf8");
  } else {
    json = raw.toString("utf8");
  }
  return JSON.parse(json);
}

function tilePayloadFromSnapshots(layerSnapshotsByLayer) {
  const tiles = {};
  for (const [layerId, snaps] of Object.entries(layerSnapshotsByLayer || {})) {
    tiles[layerId] = (snaps || []).map((s) => ({
      tx: s.tx,
      ty: s.ty,
      png: s.png
    }));
  }
  return tiles;
}

module.exports = {
  packBundle,
  unpackBundle,
  encodeMiapaintFile,
  decodeMiapaintFile,
  tilePayloadFromSnapshots
};
