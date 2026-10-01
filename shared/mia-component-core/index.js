"use strict";

const lifecycle = require("./componentLifecycle");
const types = require("./componentTypes");
const health = require("./componentHealth");
const schema = require("./componentSchema");
const dependencies = require("./componentDependencies");
const registry = require("./componentRegistry");

module.exports = {
  ...lifecycle,
  ...types,
  ...health,
  ...schema,
  ...dependencies,
  ...registry
};
