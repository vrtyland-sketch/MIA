"use strict";

/**
 * Multi-Platform Integration Layer
 * Adapter contract + registry + tokens + readiness + test harness.
 * Bridges remain source of truth for IO; this layer unifies ops surface.
 */

const adapterStates = require("./adapterStates");
const adapterContract = require("./adapterContract");
const eventKinds = require("./eventKinds");
const tokenStore = require("./tokenStore");
const registry = require("./registry");
const readiness = require("./readiness");
const liveSignals = require("./liveSignals");
const testHarness = require("./testHarness");

module.exports = {
  ...adapterStates,
  ...adapterContract,
  ...eventKinds,
  tokenStore,
  registry,
  readiness,
  liveSignals,
  testHarness,
  assessAll: readiness.assessAll,
  loadDotEnv: readiness.loadDotEnv,
  listPlatforms: registry.listPlatforms,
  streamPlatforms: registry.streamPlatforms,
  getPlatform: registry.getPlatform
};
