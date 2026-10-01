"use strict";

const layers = require("./architectureLayers");
const rules = require("./layerRules");
const naming = require("./namingRules");
const platform = require("./platformMap");
const systems = require("./platformSystems");
const dataFlow = require("./platformDataFlow");
const principles = require("./architecturePrinciples");

module.exports = {
  ...layers,
  ...rules,
  ...naming,
  ...platform,
  ...systems,
  ...dataFlow,
  ...principles
};
