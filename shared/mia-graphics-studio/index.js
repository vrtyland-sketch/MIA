"use strict";

const catalog = require("./commandCatalog");
const templates = require("./exportTemplates");
const pipeline = require("./pipelineRunner");
const aiModules = require("./aiModules");
const motionCommands = require("./motionCommands");
const fxCommands = require("./fxCommands");
const exportCommands = require("./exportCommands");
const animationEncoder = require("./animationEncoder");
const avatarCommands = require("./avatarCommands");
const bodyPartsCatalog = require("./bodyPartsCatalog");
const poseCommands = require("./poseCommands");
const bodyPartState = require("./bodyPartState");
const bodyPublishBridge = require("./bodyPublishBridge");
const bodyLiveSync = require("./bodyLiveSync");
const moodBrain = require("./moodBrain");
const bodyPreviewCommands = require("./bodyPreviewCommands");
const bodyAnimationSync = require("./bodyAnimationSync");
const bodyLiveAudit = require("./bodyLiveAudit");
const bodyPartsAssets = require("./bodyPartsAssets");
const aiAnimationCommands = require("./aiAnimationCommands");
const visualIdentity = require("../mia-paint-ai/visualIdentity");
const bodyHeroPortrait = require("./bodyHeroPortrait");

module.exports = {
  ...catalog,
  ...templates,
  ...pipeline,
  ...aiModules,
  ...motionCommands,
  ...fxCommands,
  ...exportCommands,
  ...animationEncoder,
  ...avatarCommands,
  ...bodyPartsCatalog,
  ...poseCommands,
  ...bodyPartState,
  ...bodyPublishBridge,
  ...bodyLiveSync,
  ...moodBrain,
  ...bodyPreviewCommands,
  ...bodyAnimationSync,
  ...bodyLiveAudit,
  ...bodyPartsAssets,
  ...aiAnimationCommands,
  ...visualIdentity,
  ...bodyHeroPortrait
};
