"use strict";

const environmentPresets = require("./environmentPresets");
const creaturePresets = require("./creaturePresets");
const sceneDirector = require("./sceneDirector");
const streamerCameraRig = require("./streamerCameraRig");
const mattingPipeline = require("./mattingPipeline");
const obsCameraLayout = require("./obsCameraLayout");
const ndiDiscovery = require("./ndiDiscovery");

module.exports = {
  ...environmentPresets,
  ...creaturePresets,
  ...sceneDirector,
  ...streamerCameraRig,
  ...mattingPipeline,
  ...obsCameraLayout,
  ...ndiDiscovery
};
