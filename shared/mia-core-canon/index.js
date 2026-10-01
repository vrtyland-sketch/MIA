"use strict";

const lifecycle = require("./coreLifecycle");
const managers = require("./coreManagers");
const runtimeManager = require("./runtimeManager");
const lifecycleManager = require("./lifecycleManager");

module.exports = {
  ...lifecycle,
  ...managers,
  ...runtimeManager,
  ...lifecycleManager
};