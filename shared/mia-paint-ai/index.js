"use strict";

const imageOps = require("./imageOps");
const constants = require("./constants");
const trueAlpha = require("./trueAlpha");
const visualIdentity = require("./visualIdentity");

module.exports = {
  ...constants,
  ...imageOps,
  ...trueAlpha,
  ...visualIdentity
};
