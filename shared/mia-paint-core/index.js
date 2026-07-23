"use strict";

const constants = require("./constants");
const { createEventBus } = require("./EventBus");
const layer = require("./Layer");
const document = require("./Document");
const { createHistoryStack } = require("./HistoryStack");
const viewport = require("./Viewport");
const pressureCurve = require("./pressureCurve");
const { createPaintStrokeCommand } = require("./commands/PaintStrokeCommand");
const { createTileSnapshotCommand } = require("./commands/TileSnapshotCommand");
const selection = require("./Selection");
const selectionOps = require("./selectionOps");
const vectorShape = require("./VectorShape");
const svgExport = require("./svgExport");
const svgRender = require("./svgRender");
const animation = require("./Animation");
const timelineClock = require("./timelineClock");
const motion = require("./Motion");
const boneRig = require("./boneRig");
const cameraPresets = require("./cameraPresets");
const fxParticles = require("./FxParticles");
const spriteSheetExport = require("./spriteSheetExport");
const pluginHost = require("./PluginHost");

module.exports = {
  ...constants,
  createEventBus,
  ...layer,
  ...document,
  createHistoryStack,
  ...viewport,
  ...pressureCurve,
  ...selection,
  ...selectionOps,
  ...vectorShape,
  ...svgExport,
  ...svgRender,
  ...animation,
  ...timelineClock,
  ...motion,
  ...boneRig,
  ...cameraPresets,
  ...fxParticles,
  ...require("./particlePresets"),
  ...spriteSheetExport,
  ...pluginHost,
  createPaintStrokeCommand,
  createTileSnapshotCommand
};
