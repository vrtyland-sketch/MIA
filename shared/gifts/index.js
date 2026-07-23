"use strict";

/**
 * shared/gifts — centrální Gift mapa MIA.
 *
 * Platform → Gift Event → Gift Map → hodnota / tier / care / bowl / video / overlay / hlas / XP / …
 * index.js (app) zůstává orchestrátor; veškerá sémantika giftů žije tady.
 */

const resolver = require("./resolver");
const validator = require("./validator");
const runtime = require("./runtime");

module.exports = {
  ...resolver,
  ...validator,
  createRuntime: runtime.createRuntime,
  ingest: runtime.ingest,
  dequeueNext: runtime.dequeueNext,
  peekQueue: runtime.peekQueue,
  getStats: runtime.getStats,
  getViewerMemory: runtime.getViewerMemory,
  getPublicSnapshot: runtime.getPublicSnapshot,
  resetQueue: runtime.resetQueue,
  resolve: resolver.resolveGift
};
