"use strict";

const manifest = require("./manifest");
const miapaintBundle = require("./miapaintBundle");
const rasterCodec = require("./rasterCodec");
const psdImport = require("./psdImport");
const flatComposite = require("./flatComposite");

module.exports = {
  ...manifest,
  ...miapaintBundle,
  ...rasterCodec,
  ...psdImport,
  ...flatComposite
};
