"use strict";

const { decodeImageBuffer } = require("./rasterCodec");

/**
 * PSD import — flatten via sharp (composite preview).
 * Vrací RGBA buffer pro vložení jako raster vrstva.
 */
async function importPsdFlat(buffer) {
  const rgba = await decodeImageBuffer(buffer);
  return {
    ok: true,
    width: rgba.width,
    height: rgba.height,
    rgba,
    note: "psd_flat_composite"
  };
}

module.exports = {
  importPsdFlat
};
